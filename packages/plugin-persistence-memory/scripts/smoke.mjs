import { executeRoute } from "@meta-fcis/core";
import { createMemoryPersistence } from "../dist/index.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

function expectThrow(fn, message) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  console.error(`Assertion failed: ${message}: expected throw`);
  process.exit(1);
}

const taskFields = {
  id: { type: "string", required: true, mutable: false, creatable: false, serverOwned: true, isId: true },
  title: { type: "string", required: true, mutable: true, creatable: true, serverOwned: false },
  rank: { type: "number", required: true, mutable: true, creatable: true, serverOwned: false },
  isCompleted: { type: "boolean", required: true, mutable: true, creatable: true, serverOwned: false },
  userId: { type: "string", required: true, mutable: false, creatable: false, serverOwned: true }
};

const graph = {
  irVersion: "meta-fcis.graph.v1",
  application: { name: "PluginSmoke" },
  engineCompatibility: { min: "0.1.0", max: "0.x" },
  entities: {
    Task: { table: "tasks", idField: "id", deletePolicy: "hard", fields: taskFields }
  },
  models: {},
  routes: {}
};

const seed = {
  Task: [
    { id: "t1", title: "alpha", rank: 2, isCompleted: false, userId: "u1" },
    { id: "t2", title: "beta", rank: 1, isCompleted: false, userId: "u1" },
    { id: "t3", title: "gamma", rank: 1, isCompleted: true, userId: "u1" },
    { id: "t4", title: "delta", rank: 3, isCompleted: false, userId: "u2" }
  ]
};

console.log("Running memory persistence plugin smoke test...");

let nextId = 0;
const { persistence, transactionExecutor } = createMemoryPersistence({
  graph,
  seed,
  idGenerator: () => `gen-${++nextId}`
});

// Seeded load + filter + sort (rank asc, title asc) + limit + project
const loaded = persistence.loadDependencies({
  mine: {
    entity: "Task",
    cardinality: "many",
    where: { userId: "u1" },
    project: ["id", "rank"],
    orderBy: [{ field: "rank", direction: "asc" }, { field: "title", direction: "asc" }],
    limit: 2,
    onMissing: "empty"
  }
});
assert(Array.isArray(loaded.mine) && loaded.mine.length === 2, "filter+limit should yield 2 rows");
assert(loaded.mine[0].id === "t2" && loaded.mine[1].id === "t3", "sort should order by rank then title");
assert(!("title" in loaded.mine[0]), "projection should drop unlisted fields");

// Descending sort
const desc = persistence.loadDependencies({
  all: { entity: "Task", cardinality: "many", where: {}, project: ["id"], orderBy: [{ field: "rank", direction: "desc" }], onMissing: "empty" }
});
assert(desc.all[0].id === "t4", "desc sort should put rank 3 first");

// Cardinality one
const one = persistence.loadDependencies({
  t1: { entity: "Task", cardinality: "one", where: { id: "t1" }, project: ["id", "title"], onMissing: "null" }
});
assert(one.t1.title === "alpha", "cardinality one should return a single row");

// onMissing: null / empty / error
const missNull = persistence.loadDependencies({
  x: { entity: "Task", cardinality: "one", where: { id: "nope" }, project: ["id"], onMissing: "null" }
});
assert(missNull.x === null, "onMissing null should yield null");
const missEmpty = persistence.loadDependencies({
  x: { entity: "Task", cardinality: "many", where: { id: "nope" }, project: ["id"], onMissing: "empty" }
});
assert(Array.isArray(missEmpty.x) && missEmpty.x.length === 0, "onMissing empty should yield []");
const missErr = expectThrow(
  () => persistence.loadDependencies({ x: { entity: "Task", cardinality: "one", where: { id: "nope" }, project: ["id"], onMissing: "error" } }),
  "onMissing error"
);
assert(String(missErr.message).includes("'x'"), "onMissing error should name the selector");

// Unknown entity throws
expectThrow(
  () => persistence.loadDependencies({ x: { entity: "Ghost", cardinality: "one", where: {}, project: [], onMissing: "null" } }),
  "unknown entity selector"
);

// No live references
one.t1.title = "mutated";
const reread = persistence.loadDependencies({
  t1: { entity: "Task", cardinality: "one", where: { id: "t1" }, project: ["title"], onMissing: "null" }
});
assert(reread.t1.title === "alpha", "mutating a returned row must not affect the store");

// Executor: CREATE reports generated id, readable back
const created = transactionExecutor.execute({
  operations: [{ kind: "CREATE", entity: "Task", payload: { title: "new", rank: 9, isCompleted: false } }]
});
assert(created.operations[0].outcome === "applied", "create should be applied");
assert(created.operations[0].targetId === "gen-1", "create should report the generated id");
const readBack = persistence.loadDependencies({
  x: { entity: "Task", cardinality: "one", where: { id: "gen-1" }, project: ["id", "title"], onMissing: "error" }
});
assert(readBack.x.title === "new", "created row should be readable through the adapter");

// UPDATE merge + DELETE
transactionExecutor.execute({
  operations: [
    { kind: "UPDATE", entity: "Task", targetId: "t1", payload: { isCompleted: true } },
    { kind: "DELETE", entity: "Task", targetId: "t4" }
  ]
});
const afterWrite = persistence.loadDependencies({
  t1: { entity: "Task", cardinality: "one", where: { id: "t1" }, project: ["title", "isCompleted"], onMissing: "error" },
  t4: { entity: "Task", cardinality: "one", where: { id: "t4" }, project: ["id"], onMissing: "null" }
});
assert(afterWrite.t1.isCompleted === true && afterWrite.t1.title === "alpha", "update should shallow-merge");
assert(afterWrite.t4 === null, "deleted row should be gone");

// UPDATE missing row throws
expectThrow(
  () => transactionExecutor.execute({ operations: [{ kind: "UPDATE", entity: "Task", targetId: "nope", payload: { rank: 1 } }] }),
  "update missing row"
);

// Atomicity: CREATE then failing DELETE leaves no trace of the CREATE
expectThrow(
  () => transactionExecutor.execute({
    operations: [
      { kind: "CREATE", entity: "Task", payload: { title: "ghost", rank: 0, isCompleted: false } },
      { kind: "DELETE", entity: "Task", targetId: "nope" }
    ]
  }),
  "mid-plan failure"
);
const ghost = persistence.loadDependencies({
  x: { entity: "Task", cardinality: "many", where: { title: "ghost" }, project: ["id"], onMissing: "empty" }
});
assert(ghost.x.length === 0, "failed plan must leave the store untouched");

// Full core round-trip: route load -> plan -> execute through the plugin
const routeGraph = {
  ...graph,
  models: { CompleteTaskInput: { fields: { taskId: { type: "string", required: true } } } },
  routes: {
    "Tasks.complete": {
      path: "/tasks/:taskId/complete",
      pureFunction: "completeTask",
      auth: { required: true },
      input: { bodyModel: null, paramsModel: null, queryModel: null },
      output: { successModel: null, errorModel: null },
      handler: { kind: "pure-function", file: "./tasks.pure.ts", function: "completeTask" },
      dependencies: {
        targetTask: {
          entity: "Task",
          cardinality: "one",
          where: { id: "$request.params.taskId" },
          project: ["id", "title", "isCompleted", "userId"],
          onMissing: "error"
        }
      },
      allowedIntents: [
        { type: "MUTATE_ENTITY", entity: "Task", operation: "UPDATE", fields: ["isCompleted"], targetId: "$request.params.taskId" }
      ]
    }
  }
};

const roundTrip = createMemoryPersistence({ graph: routeGraph, seed });
const result = await executeRoute(
  routeGraph,
  { route: "Tasks.complete", payload: {}, params: { taskId: "t2" }, query: {} },
  {
    schema: { validate: (_s, p) => p },
    auth: { authenticate: () => ({ id: "u1", roles: [], properties: {} }) },
    persistence: roundTrip.persistence,
    pureInvoker: {
      invoke: (_fn, context) => ({
        success: true,
        httpStatus: 200,
        responsePayload: { ok: true },
        intents: [
          { type: "MUTATE_ENTITY", meta: { entityName: "Task", operation: "UPDATE", targetId: context.dependencies.targetTask.id }, payload: { isCompleted: true } }
        ]
      })
    }
  }
);
roundTrip.transactionExecutor.execute(result.transactionPlan);
const finalState = roundTrip.persistence.loadDependencies({
  t2: { entity: "Task", cardinality: "one", where: { id: "t2" }, project: ["isCompleted"], onMissing: "error" }
});
assert(finalState.t2.isCompleted === true, "round-trip should complete the task through the plugin");

console.log("Memory persistence plugin smoke verification passed.");
