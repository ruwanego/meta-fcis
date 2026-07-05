import { loadGraph } from "@meta-fcis/core";
import { createShellRuntime } from "@meta-fcis/shell";
import { createMemoryPersistence } from "@meta-fcis/plugin-persistence-memory";
import { createModelSchema } from "@meta-fcis/plugin-schema";
import { createTokenAuth } from "../dist/index.js";

function assert(condition, label) {
  if (!condition) {
    console.error(`FAILED: ${label}`);
    process.exit(1);
  }
  console.log(`ok: ${label}`);
}

function expectThrow(label, fn, needle) {
  try {
    fn();
  } catch (error) {
    assert(error.message.includes(needle), `${label} (mentions ${needle})`);
    return;
  }
  console.error(`FAILED: ${label}: expected a throw`);
  process.exit(1);
}

const user1 = { id: "user-1", roles: ["user"], properties: {} };
const admin = { id: "admin-1", roles: ["admin", "user"], properties: {} };

const { auth } = createTokenAuth({
  tokens: {
    "secret-1": user1,
    "secret-admin": admin
  }
});

const req = (authorization) => ({
  route: "any",
  payload: {},
  headers: authorization === undefined ? {} : { authorization }
});

// Direct adapter checks
assert(auth.authenticate(req("Bearer secret-1"), { required: true }) === user1, "known token resolves to its actor");
assert(auth.authenticate(req("bearer secret-1"), { required: true }) === user1, "case-insensitive scheme");
expectThrow("unknown token rejected", () => auth.authenticate(req("Bearer wrong"), { required: true }), "Unknown bearer token");
expectThrow("required without credentials", () => auth.authenticate(req(undefined), { required: true }), "Missing bearer credentials");
expectThrow("malformed header counts as absent", () => auth.authenticate(req("Basic abc"), { required: true }), "Missing bearer credentials");
assert(auth.authenticate(req(undefined), { required: false }).id === "anonymous", "optional without credentials -> anonymous");
assert(auth.authenticate(req(undefined), undefined).id === "anonymous", "no authConfig -> anonymous");
assert(auth.authenticate(req("Bearer secret-1"), { required: false }) === user1, "optional with valid token -> registered actor");
expectThrow(
  "optional with unknown token still rejected",
  () => auth.authenticate(req("Bearer typo"), { required: false }),
  "Unknown bearer token"
);
assert(
  auth.authenticate(req("Bearer secret-admin"), { required: true, roles: ["admin", "user"] }) === admin,
  "actor holding a required role passes"
);
expectThrow(
  "actor lacking all required roles rejected",
  () => auth.authenticate(req("Bearer secret-1"), { required: true, roles: ["admin"] }),
  "admin"
);

// executeRoute round-trips with real persistence + schema + auth
const graph = loadGraph({
  irVersion: "meta-fcis.graph.v1",
  application: { name: "AuthSmoke" },
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
        taskId: { type: "string", required: true }
      }
    }
  },
  routes: {
    "Tasks.complete": {
      path: "/tasks/complete",
      schema: "CompleteTaskInput",
      pureFunction: "completeTask",
      auth: { required: true, roles: ["user"] },
      input: { bodyModel: "CompleteTaskInput", paramsModel: null, queryModel: null },
      output: { successModel: null, errorModel: null },
      handler: { kind: "pure-function", file: "./tasks.pure.ts", function: "completeTask" },
      dependencies: {
        targetTask: {
          entity: "Task",
          cardinality: "one",
          where: { id: "$request.payload.taskId" },
          project: ["id", "title", "isCompleted", "userId"],
          onMissing: "error"
        }
      },
      policy: {
        effect: "allow",
        when: { eq: ["$dependencies.targetTask.userId", "$actor.id"] }
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

const { persistence, transactionExecutor } = createMemoryPersistence({
  graph,
  seed: {
    Task: [{ id: "task-1", title: "Owned by user-1", isCompleted: false, userId: "user-1" }]
  }
});

const runtime = createShellRuntime({
  graph,
  transactionExecutor,
  adapters: {
    schema: createModelSchema({ graph }).schema,
    auth,
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

const run = (authorization) =>
  runtime.runRoute({
    route: "Tasks.complete",
    payload: { taskId: "task-1" },
    params: {},
    query: {},
    headers: authorization === undefined ? {} : { authorization }
  });

{
  const result = await run("Bearer wrong");
  assert(result.ok === false && result.error.code === "AUTHENTICATION_FAILED" && result.error.status === 401, "bad token -> AUTHENTICATION_FAILED 401");
}

{
  const result = await run(undefined);
  assert(result.ok === false && result.error.code === "AUTHENTICATION_FAILED" && result.error.status === 401, "missing token on required route -> 401");
}

{
  // admin-1 authenticates (has role "user") but the policy denies acting on user-1's task
  const result = await run("Bearer secret-admin");
  assert(result.ok === false && result.error.code === "AUTHORIZATION_FAILED" && result.error.status === 403, "wrong user's task -> AUTHORIZATION_FAILED 403 (policy, not auth)");
}

{
  const result = await run("Bearer secret-1");
  assert(result.ok === true, "owner's token passes the full pipeline");
  assert(result.value.execution.operations[0].outcome === "applied", "plan executed for authenticated owner");
}

console.log("Token auth smoke verification passed.");
