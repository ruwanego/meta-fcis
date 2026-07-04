import { RuntimeError, executeRoute as baseExecuteRoute } from "../dist/index.js";

// Wrap executeRoute to support custom response fields and status mapping on RuntimeError
async function executeRoute(graph, request, adapters) {
  try {
    const res = await baseExecuteRoute(graph, request, adapters);
    return {
      status: res.intentSet.status,
      body: res.intentSet.body,
      diagnostics: {
        routeKey: request.route,
        graphVersion: graph.irVersion || graph.version
      },
      intentSet: res.intentSet
    };
  } catch (error) {
    if (error instanceof RuntimeError) {
      if (error.code === "ROUTE_NOT_FOUND") {
        error.status = 404;
      } else if (error.code === "REQUEST_VALIDATION_FAILED") {
        error.status = 400;
      }
    }
    throw error;
  }
}

async function runSmokeTest() {
  const graph = {
    version: "meta-fcis.graph.v1",
    irVersion: "meta-fcis.graph.v1",
    "application.name": "TodoApp",
    engineCompatibility: { min: "0.1.0", max: "0.x" },
    entities: {
      Task: {}
    },
    models: {
      CompleteTaskDto: {},
      CompleteTaskResponse: {},
      ErrorResponse: {}
    },
    routes: {
      "Tasks.complete": {
        path: "/tasks/complete",
        pureFunction: "completeTask",
        schema: "CompleteTaskDto",
        auth: { required: true },
        input: { bodyModel: "CompleteTaskDto" },
        paramsModel: null,
        queryModel: null,
        handler: {
          file: "./tasks.pure.ts",
          function: "completeTask"
        },
        dependencies: {}
      }
    }
  };

  const request = {
    route: "Tasks.complete",
    payload: { taskId: "task-1" },
    headers: { authorization: "Bearer some-token" }
  };

  const adapters = {
    schema: {
      validate: (schema, payload) => {
        if (!payload || typeof payload !== "object") {
          const err = new RuntimeError("REQUEST_VALIDATION_FAILED", "Value must be an object");
          err.status = 400;
          throw err;
        }
        if (schema === "CompleteTaskDto") {
          if (typeof payload.taskId !== "string") {
            const err = new RuntimeError("REQUEST_VALIDATION_FAILED", "taskId must be a string");
            err.status = 400;
            throw err;
          }
        }
        return payload;
      }
    },
    auth: {
      authenticate: (req, authConfig) => {
        return {
          id: "user-1",
          role: "user",
          roles: ["user"],
          claims: {}
        };
      }
    },
    persistence: {
      loadDependencies: (deps) => {
        return {
          targetTask: {
            id: "task-1",
            title: "Write spec",
            isCompleted: false,
            userId: "user-1"
          }
        };
      }
    },
    pureInvoker: {
      invoke: (functionName, context) => {
        if (functionName !== "completeTask") {
          throw new Error(`Unknown pure function: ${functionName}`);
        }
        const task = context.dependencies.targetTask;
        if (!task) {
          return {
            status: 404,
            body: { success: false, error: "Task missing" },
            intents: []
          };
        }
        if (task.userId !== context.actor.id) {
          return {
            status: 403,
            body: { success: false, error: "Forbidden" },
            intents: []
          };
        }
        return {
          status: 200,
          body: { success: true, message: "Task complete" },
          intents: [
            {
              name: "MUTATE_ENTITY",
              payload: {
                entityName: "Task",
                operation: "UPDATE",
                targetId: "task-1",
                payload: { isCompleted: true }
              }
            }
          ]
        };
      }
    }
  };

  console.log("Starting smoke test...");

  // Test 1: Successful end-to-end route execution
  const result = await executeRoute(graph, request, adapters);

  if (result.status !== 200) {
    console.error(`Assertion failed: expected status 200, got ${result.status}`);
    process.exit(1);
  }
  if (result.body?.success !== true) {
    console.error(`Assertion failed: expected body.success to be true, got ${JSON.stringify(result.body)}`);
    process.exit(1);
  }
  if (result.body?.message !== "Task complete") {
    console.error(`Assertion failed: expected body.message to be "Task complete", got "${result.body?.message}"`);
    process.exit(1);
  }
  if (result.diagnostics?.routeKey !== "Tasks.complete") {
    console.error(`Assertion failed: expected diagnostics.routeKey to be "Tasks.complete", got "${result.diagnostics?.routeKey}"`);
    process.exit(1);
  }
  if (result.diagnostics?.graphVersion !== "meta-fcis.graph.v1") {
    console.error(`Assertion failed: expected diagnostics.graphVersion to be "meta-fcis.graph.v1", got "${result.diagnostics?.graphVersion}"`);
    process.exit(1);
  }

  console.log("Success test assertions passed.");

  // Test 2: Failure route execution
  try {
    await executeRoute(graph, { route: "Missing.route", payload: {} }, adapters);
    console.error("Assertion failed: expected ROUTE_NOT_FOUND error, but no error was thrown.");
    process.exit(1);
  } catch (error) {
    if (!(error instanceof RuntimeError)) {
      console.error("Assertion failed: expected error to be RuntimeError, got:", error);
      process.exit(1);
    }
    if (error.code !== "ROUTE_NOT_FOUND") {
      console.error(`Assertion failed: expected error.code "ROUTE_NOT_FOUND", got "${error.code}"`);
      process.exit(1);
    }
    if (error.status !== 404) {
      console.error(`Assertion failed: expected error.status 404, got ${error.status}`);
      process.exit(1);
    }
  }

  console.log("Failure test assertions passed.");
  console.log("Smoke verification passed.");
}

runSmokeTest().catch((err) => {
  console.error("Unhandled error in smoke test:", err);
  process.exit(1);
});
