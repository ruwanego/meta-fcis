import { loadGraph } from "@meta-fcis/core";
import { createShellRuntime } from "@meta-fcis/shell";
import { createMemoryPersistence } from "@meta-fcis/plugin-persistence-memory";
import { createHttpTransport } from "../dist/index.js";

const graph = loadGraph({
  irVersion: "meta-fcis.graph.v1",
  application: { name: "TransportSmoke" },
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
      transport: { kind: "http", method: "POST", path: "/tasks/complete" },
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
    },
    "Tasks.list": {
      path: "/tasks/list",
      pureFunction: "listTasks",
      auth: { required: true },
      input: { bodyModel: null, paramsModel: null, queryModel: null },
      output: { successModel: null, errorModel: null },
      handler: { kind: "pure-function", file: "./tasks.pure.ts", function: "listTasks" },
      dependencies: {
        tasks: {
          entity: "Task",
          cardinality: "many",
          where: { userId: "$actor.id" },
          project: ["id", "title", "isCompleted"],
          onMissing: "empty"
        }
      },
      allowedIntents: []
    }
  }
});

const { persistence, transactionExecutor } = createMemoryPersistence({
  graph,
  seed: {
    Task: [{ id: "task-1", title: "Serve HTTP", isCompleted: false, userId: "user-1" }]
  }
});

const runtime = createShellRuntime({
  graph,
  transactionExecutor,
  adapters: {
    schema: {
      validate(schema, payload) {
        if (schema !== "CompleteTaskInput") {
          return payload;
        }
        if (
          typeof payload !== "object" ||
          payload === null ||
          typeof payload.taskId !== "string"
        ) {
          throw new Error("taskId must be a string");
        }
        return payload;
      }
    },
    auth: {
      authenticate() {
        return { id: "user-1", roles: ["user"], properties: {} };
      }
    },
    persistence,
    pureInvoker: {
      invoke(functionName, context) {
        if (functionName === "listTasks") {
          return {
            success: true,
            httpStatus: 200,
            responsePayload: { ok: true, tasks: context.dependencies.tasks },
            intents: []
          };
        }
        const task = context.dependencies.targetTask;
        if (!task) {
          return {
            success: false,
            httpStatus: 404,
            responsePayload: { ok: false, error: "Task not found" },
            intents: []
          };
        }
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

function assert(condition, label) {
  if (!condition) {
    console.error(`FAILED: ${label}`);
    process.exit(1);
  }
  console.log(`ok: ${label}`);
}

const transport = createHttpTransport({
  graph,
  runRoute: (request) => runtime.runRoute(request)
});

const port = await transport.listen();
assert(Number.isInteger(port) && port > 0, "listen() resolves with an ephemeral port");
const base = `http://127.0.0.1:${port}`;

// 1. Method mismatch -> 405, before touching the pipeline
{
  const res = await fetch(`${base}/tasks/complete`);
  const body = await res.json();
  assert(res.status === 405, "GET on POST route -> 405");
  assert(body.code === "METHOD_NOT_ALLOWED", "405 body carries METHOD_NOT_ALLOWED");
  assert(res.headers.get("allow") === "POST", "405 carries allow: POST header");
}

// 2. Malformed JSON body -> 400 REQUEST_MALFORMED
{
  const res = await fetch(`${base}/tasks/complete`, { method: "POST", body: "{not json" });
  const body = await res.json();
  assert(res.status === 400 && body.code === "REQUEST_MALFORMED", "malformed body -> 400 REQUEST_MALFORMED");
}

// 3. Schema rejection propagates with its engine status
{
  const res = await fetch(`${base}/tasks/complete`, {
    method: "POST",
    body: JSON.stringify({ taskId: 42 })
  });
  const body = await res.json();
  assert(res.status === 400 && body.code === "REQUEST_VALIDATION_FAILED", "invalid payload -> 400 REQUEST_VALIDATION_FAILED");
}

// 4. Unknown path falls through to core -> 404 ROUTE_NOT_FOUND
{
  const res = await fetch(`${base}/nope`, { method: "POST", body: "{}" });
  const body = await res.json();
  assert(res.status === 404 && body.code === "ROUTE_NOT_FOUND", "unknown path -> 404 ROUTE_NOT_FOUND");
}

// 5. Happy path: POST completes the task and the plan is executed
{
  const res = await fetch(`${base}/tasks/complete`, {
    method: "POST",
    body: JSON.stringify({ taskId: "task-1" })
  });
  const body = await res.json();
  assert(res.status === 200, "valid POST -> 200");
  assert(body.intentSet.responsePayload.taskId === "task-1", "response carries pipeline payload");
  assert(body.execution.operations[0].outcome === "applied", "execution result included");
}

// 6. Bodyless GET on a route without transport block (any method allowed)
{
  const res = await fetch(`${base}/tasks/list`);
  const body = await res.json();
  assert(res.status === 200, "bodyless GET on open route -> 200");
  assert(
    body.intentSet.responsePayload.tasks[0].isCompleted === true,
    "list reflects the earlier write (round-trip through the store)"
  );
}

await transport.close();
console.log("transport closed");

// 7. Handler crash containment on a fresh transport
{
  const crashing = createHttpTransport({
    graph,
    runRoute: () => {
      throw new Error("boom");
    }
  });
  const crashPort = await crashing.listen();
  const first = await fetch(`http://127.0.0.1:${crashPort}/tasks/list`);
  const firstBody = await first.json();
  assert(first.status === 500 && firstBody.code === "TRANSPORT_INTERNAL_ERROR", "thrown handler -> 500 TRANSPORT_INTERNAL_ERROR");
  const second = await fetch(`http://127.0.0.1:${crashPort}/tasks/list`);
  assert(second.status === 500, "server keeps serving after a handler crash");
  await crashing.close();
}

console.log("HTTP transport smoke verification passed.");
