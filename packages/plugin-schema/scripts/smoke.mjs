import { loadGraph } from "@meta-fcis/core";
import { createShellRuntime } from "@meta-fcis/shell";
import { createMemoryPersistence } from "@meta-fcis/plugin-persistence-memory";
import { createModelSchema } from "../dist/index.js";

function assert(condition, label) {
  if (!condition) {
    console.error(`FAILED: ${label}`);
    process.exit(1);
  }
  console.log(`ok: ${label}`);
}

function expectThrow(label, fn, ...needles) {
  try {
    fn();
  } catch (error) {
    for (const needle of needles) {
      assert(error.message.includes(needle), `${label} (mentions ${needle})`);
    }
    return;
  }
  console.error(`FAILED: ${label}: expected a throw`);
  process.exit(1);
}

const graph = loadGraph({
  irVersion: "meta-fcis.graph.v1",
  application: { name: "SchemaSmoke" },
  engineCompatibility: { min: "0.1.0", max: "0.x" },
  entities: {
    Task: {
      table: "tasks",
      idField: "id",
      deletePolicy: "hard",
      fields: {
        id: { type: "string", required: true, mutable: false, creatable: false, serverOwned: true, isId: true },
        title: { type: "string", required: true, mutable: true, creatable: true, serverOwned: false },
        isCompleted: { type: "boolean", required: true, mutable: true, creatable: true, serverOwned: false },
        userId: { type: "string", required: true, mutable: false, creatable: false, serverOwned: true }
      }
    }
  },
  models: {
    CompleteTaskInput: {
      fields: {
        taskId: { type: "string", required: true },
        note: { type: "string", required: false },
        tags: { type: "array", required: false },
        meta: { type: "object", required: false },
        anything: { type: "unknown", required: false }
      }
    }
  },
  routes: {
    "Tasks.complete": {
      path: "/tasks/complete",
      schema: "CompleteTaskInput",
      pureFunction: "completeTask",
      auth: { required: true },
      input: { bodyModel: "CompleteTaskInput", paramsModel: null, queryModel: null },
      output: { successModel: null, errorModel: null },
      handler: { kind: "pure-function", file: "./tasks.pure.ts", function: "completeTask" },
      dependencies: {
        targetTask: {
          entity: "Task",
          cardinality: "one",
          where: { id: "$request.payload.taskId", userId: "$actor.id" },
          project: ["id", "title", "isCompleted", "userId"],
          onMissing: "null"
        }
      },
      allowedIntents: [
        {
          type: "MUTATE_ENTITY",
          entity: "Task",
          operation: "UPDATE",
          fields: ["isCompleted"],
          targetId: "$request.payload.taskId"
        }
      ]
    }
  }
});

const { schema } = createModelSchema({ graph });

// Direct adapter checks
{
  const payload = {
    taskId: "task-1",
    tags: ["a"],
    meta: { source: "smoke" },
    anything: 42
  };
  assert(schema.validate("CompleteTaskInput", payload) === payload, "valid payload returned unchanged");
}

assert(
  schema.validate("CompleteTaskInput", { taskId: "t" }).taskId === "t",
  "optional fields may be absent"
);

expectThrow("missing required field", () => schema.validate("CompleteTaskInput", {}), "'taskId' is required");

expectThrow("type mismatch", () => schema.validate("CompleteTaskInput", { taskId: 42 }), "'taskId' must be string");

expectThrow(
  "undeclared field rejected",
  () => schema.validate("CompleteTaskInput", { taskId: "t", extra: 1 }),
  "'extra' is not declared"
);

expectThrow(
  "aggregate failures in one message",
  () => schema.validate("CompleteTaskInput", { note: 5, extra: 1 }),
  "'taskId' is required",
  "'note' must be string",
  "'extra' is not declared"
);

expectThrow("unknown model name", () => schema.validate("MissingModel", {}), "MissingModel");

expectThrow("non-object payload", () => schema.validate("CompleteTaskInput", null), "plain object");
expectThrow("array payload", () => schema.validate("CompleteTaskInput", []), "plain object");

assert(
  schema.validate({ fields: { title: { type: "string", required: true } } }, { title: "x" }).title === "x",
  "inline model object accepted"
);
expectThrow(
  "inline model enforced",
  () => schema.validate({ fields: { title: { type: "string", required: true } } }, {}),
  "'title' is required"
);
expectThrow("malformed inline schema", () => schema.validate(7, {}), "model name or an inline");

// executeRoute round-trip: the aggregate message must surface as REQUEST_VALIDATION_FAILED 400
const { persistence, transactionExecutor } = createMemoryPersistence({
  graph,
  seed: {
    Task: [{ id: "task-1", title: "Validate me", isCompleted: false, userId: "user-1" }]
  }
});

const runtime = createShellRuntime({
  graph,
  transactionExecutor,
  adapters: {
    schema,
    auth: {
      authenticate() {
        return { id: "user-1", roles: ["user"], properties: {} };
      }
    },
    persistence,
    pureInvoker: {
      invoke(functionName, context) {
        const task = context.dependencies.targetTask;
        return {
          success: true,
          httpStatus: 200,
          responsePayload: { ok: true, taskId: task.id },
          intents: [
            {
              type: "MUTATE_ENTITY",
              meta: { entityName: "Task", operation: "UPDATE", targetId: task.id },
              payload: { isCompleted: true }
            }
          ]
        };
      }
    }
  }
});

{
  const bad = await runtime.runRoute({
    route: "Tasks.complete",
    payload: { taskId: 42, extra: true },
    params: {},
    query: {},
    headers: {}
  });
  assert(bad.ok === false, "invalid payload fails the route");
  assert(bad.error.code === "REQUEST_VALIDATION_FAILED" && bad.error.status === 400, "surfaced as REQUEST_VALIDATION_FAILED 400");
  assert(bad.error.message.includes("'taskId' must be string"), "route error carries field detail");
  assert(bad.error.message.includes("'extra' is not declared"), "route error carries aggregate detail");
}

{
  const good = await runtime.runRoute({
    route: "Tasks.complete",
    payload: { taskId: "task-1" },
    params: {},
    query: {},
    headers: {}
  });
  assert(good.ok === true, "valid payload passes the full pipeline");
  assert(good.value.execution.operations[0].outcome === "applied", "plan executed after validation");
}

console.log("Model schema smoke verification passed.");
