import {
  RuntimeError,
  executeRoute as baseExecuteRoute,
  validateIntentSet
} from "../dist/index.js";

// Wrap executeRoute to support custom response fields and status mapping on RuntimeError
async function executeRoute(graph, request, adapters) {
  try {
    const res = await baseExecuteRoute(graph, request, adapters);
    return {
      status: res.intentSet.httpStatus,
      body: res.intentSet.responsePayload,
      diagnostics: {
        routeKey: request.route,
        graphVersion: graph.irVersion || graph.version
      },
      intentSet: res.intentSet
    };
  } catch (error) {
    throw error;
  }
}

async function runSmokeTest() {
  const graph = {
    irVersion: "meta-fcis.graph.v1",
    application: {
      name: "TodoApp",
      title: "Todo App"
    },
    engineCompatibility: { min: "0.1.0", max: "0.x" },
    entities: {
      Task: {
        table: "tasks",
        idField: "id",
        deletePolicy: "hard",
        fields: {
          id: {
            type: "string",
            required: true,
            mutable: false,
            creatable: false,
            serverOwned: true,
            isId: true
          },
          title: {
            type: "string",
            required: true,
            mutable: true,
            creatable: true,
            serverOwned: false
          },
          isCompleted: {
            type: "boolean",
            required: true,
            mutable: true,
            creatable: true,
            serverOwned: false
          },
          userId: {
            type: "string",
            required: true,
            mutable: false,
            creatable: false,
            serverOwned: true
          }
        }
      }
    },
    models: {
      CompleteTaskDto: {
        fields: {
          taskId: {
            type: "string",
            required: true
          }
        }
      },
      CompleteTaskResponse: {
        fields: {
          success: {
            type: "boolean",
            required: true
          },
          message: {
            type: "string",
            required: true
          }
        }
      },
      ErrorResponse: {
        fields: {
          error: {
            type: "string",
            required: true
          }
        }
      }
    },
    routes: {
      "Tasks.complete": {
        path: "/tasks/complete",
        pureFunction: "completeTask",
        schema: "CompleteTaskDto",
        transport: {
          kind: "http",
          method: "POST",
          path: "/tasks/complete"
        },
        auth: { required: true, strategy: "jwt" },
        input: {
          bodyModel: "CompleteTaskDto",
          paramsModel: null,
          queryModel: null
        },
        output: {
          successModel: "CompleteTaskResponse",
          errorModel: "ErrorResponse"
        },
        handler: {
          kind: "pure-function",
          file: "./tasks.pure.ts",
          function: "completeTask"
        },
        dependencies: {
          targetTask: {
            entity: "Task",
            cardinality: "one",
            where: {
              id: "$request.payload.taskId"
            },
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
          throw new RuntimeError({
            code: "REQUEST_VALIDATION_FAILED",
            message: "Value must be an object",
            status: 400
          });
        }
        if (schema === "CompleteTaskDto") {
          if (typeof payload.taskId !== "string") {
            throw new RuntimeError({
              code: "REQUEST_VALIDATION_FAILED",
              message: "taskId must be a string",
              status: 400
            });
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
            success: false,
            httpStatus: 404,
            responsePayload: { success: false, error: "Task missing" },
            intents: []
          };
        }
        if (task.userId !== context.actor.id) {
          return {
            success: false,
            httpStatus: 403,
            responsePayload: { success: false, error: "Forbidden" },
            intents: []
          };
        }
        return {
          success: true,
          httpStatus: 200,
          responsePayload: { success: true, message: "Task complete" },
          intents: [
            {
              type: "MUTATE_ENTITY",
              meta: {
                entityName: "Task",
                operation: "UPDATE",
                targetId: "task-1"
              },
              payload: { isCompleted: true }
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

  const validIntentSet = validateIntentSet({
    success: true,
    httpStatus: 200,
    responsePayload: { success: true },
    intents: [
      {
        type: "MUTATE_ENTITY",
        meta: {
          entityName: "Task",
          operation: "UPDATE",
          targetId: "task-1"
        },
        payload: {
          isCompleted: true
        }
      }
    ]
  });

  if (validIntentSet.intents.length !== 1) {
    console.error(`Assertion failed: expected 1 validated intent, got ${validIntentSet.intents.length}`);
    process.exit(1);
  }

  const invalidIntentSets = [
    {
      label: "stale generic intent shape",
      value: {
        success: true,
        httpStatus: 200,
        responsePayload: { success: true },
        intents: [
          {
            name: "completeTask",
            payload: {}
          }
        ]
      }
    },
    {
      label: "loose operation",
      value: {
        success: true,
        httpStatus: 200,
        responsePayload: { success: true },
        intents: [
          {
            type: "MUTATE_ENTITY",
            meta: {
              entityName: "Task",
              operation: "UPSERT"
            },
            payload: {}
          }
        ]
      }
    },
    {
      label: "payload array",
      value: {
        success: true,
        httpStatus: 200,
        responsePayload: { success: true },
        intents: [
          {
            type: "MUTATE_ENTITY",
            meta: {
              entityName: "Task",
              operation: "UPDATE",
              targetId: "task-1"
            },
            payload: []
          }
        ]
      }
    }
  ];

  for (const { label, value } of invalidIntentSets) {
    try {
      validateIntentSet(value);
      console.error(`Assertion failed: expected ${label} to throw CORE_OUTPUT_INVALID`);
      process.exit(1);
    } catch (error) {
      if (!(error instanceof RuntimeError)) {
        console.error(`Assertion failed: expected ${label} error to be RuntimeError, got:`, error);
        process.exit(1);
      }
      if (error.code !== "CORE_OUTPUT_INVALID") {
        console.error(`Assertion failed: expected ${label} error code CORE_OUTPUT_INVALID, got ${error.code}`);
        process.exit(1);
      }
    }
  }

  console.log("IntentSet validator assertions passed.");
  console.log("Smoke verification passed.");
}

runSmokeTest().catch((err) => {
  console.error("Unhandled error in smoke test:", err);
  process.exit(1);
});
