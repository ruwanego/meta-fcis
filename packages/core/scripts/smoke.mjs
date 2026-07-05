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
      intentSet: res.intentSet,
      transactionPlan: res.transactionPlan
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
          },
          tenantId: {
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
              id: "$request.params.taskId",
              payloadTaskId: "$request.payload.taskId",
              tenantId: "$actor.properties.tenantId",
              includeCompleted: "$request.query.includeCompleted"
            },
            project: ["id", "title", "isCompleted", "userId", "tenantId"],
            onMissing: "null"
          }
        },
        policy: {
          effect: "allow",
          when: {
            and: [
              { eq: ["$dependencies.targetTask.userId", "$actor.id"] },
              { eq: ["$dependencies.targetTask.tenantId", "$actor.properties.tenantId"] }
            ]
          }
        },
        allowedIntents: [
          {
            type: "MUTATE_ENTITY",
            entity: "Task",
            operation: "UPDATE",
            fields: ["isCompleted"],
            targetId: "$request.params.taskId"
          }
        ]
      }
    }
  };

  const request = {
    route: "Tasks.complete",
    payload: { taskId: "task-1" },
    params: { taskId: "task-1" },
    query: { includeCompleted: "false" },
    headers: { authorization: "Bearer some-token" }
  };

  let persistenceSawResolvedSelectors = false;

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
          roles: ["user"],
          properties: {
            tenantId: "tenant-1"
          }
        };
      }
    },
    persistence: {
      loadDependencies: (deps) => {
        const where = deps.targetTask?.where;
        if (!where) {
          throw new Error("targetTask selector missing");
        }
        if (
          where.id !== "task-1" ||
          where.payloadTaskId !== "task-1" ||
          where.tenantId !== "tenant-1" ||
          where.includeCompleted !== "false"
        ) {
          throw new Error(`selector where was not resolved before persistence: ${JSON.stringify(where)}`);
        }
        if (Object.values(where).some((value) => typeof value === "string" && value.startsWith("$"))) {
          throw new Error(`persistence received raw selector expressions: ${JSON.stringify(where)}`);
        }
        persistenceSawResolvedSelectors = true;
        return {
          targetTask: {
            id: "task-1",
            title: "Write spec",
            isCompleted: false,
            userId: "user-1",
            tenantId: "tenant-1"
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
  if (!Array.isArray(result.transactionPlan?.operations)) {
    console.error("Assertion failed: expected transactionPlan.operations to be an array");
    process.exit(1);
  }
  if (result.transactionPlan.operations.length !== 1) {
    console.error(`Assertion failed: expected 1 transaction operation, got ${result.transactionPlan.operations.length}`);
    process.exit(1);
  }
  const operation = result.transactionPlan.operations[0];
  if (operation.kind !== "UPDATE" || operation.entity !== "Task" || operation.targetId !== "task-1") {
    console.error("Assertion failed: unexpected transaction operation:", operation);
    process.exit(1);
  }
  if (operation.payload?.isCompleted !== true) {
    console.error("Assertion failed: expected transaction payload.isCompleted to be true:", operation.payload);
    process.exit(1);
  }

  console.log("Success test assertions passed.");
  if (!persistenceSawResolvedSelectors) {
    console.error("Assertion failed: persistence did not receive resolved dependency selectors");
    process.exit(1);
  }

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

  const dependencySelectionFailureGraph = JSON.parse(JSON.stringify(graph));
  dependencySelectionFailureGraph.routes["Tasks.complete"].dependencies.targetTask.where.id =
    "$request.payload.missing";
  let persistenceCalledForSelectionFailure = false;

  try {
    await executeRoute(dependencySelectionFailureGraph, request, {
      ...adapters,
      persistence: {
        loadDependencies: () => {
          persistenceCalledForSelectionFailure = true;
          return {};
        }
      }
    });
    console.error("Assertion failed: expected DEPENDENCY_SELECTION_FAILED for unresolved selector.");
    process.exit(1);
  } catch (error) {
    if (!(error instanceof RuntimeError)) {
      console.error("Assertion failed: expected dependency selection error to be RuntimeError, got:", error);
      process.exit(1);
    }
    if (error.code !== "DEPENDENCY_SELECTION_FAILED") {
      console.error(`Assertion failed: expected dependency selection code DEPENDENCY_SELECTION_FAILED, got "${error.code}"`);
      process.exit(1);
    }
    if (error.status !== 500) {
      console.error(`Assertion failed: expected dependency selection status 500, got ${error.status}`);
      process.exit(1);
    }
    if (persistenceCalledForSelectionFailure) {
      console.error("Assertion failed: persistence should not run after selector resolution failure.");
      process.exit(1);
    }
  }

  console.log("Dependency selector pipeline assertions passed.");

  const policyDeniedGraph = JSON.parse(JSON.stringify(graph));
  policyDeniedGraph.routes["Tasks.complete"].policy = {
    effect: "deny",
    when: true
  };

  try {
    await executeRoute(policyDeniedGraph, request, adapters);
    console.error("Assertion failed: expected AUTHORIZATION_FAILED for route policy denial.");
    process.exit(1);
  } catch (error) {
    if (!(error instanceof RuntimeError)) {
      console.error("Assertion failed: expected policy denial error to be RuntimeError, got:", error);
      process.exit(1);
    }
    if (error.code !== "AUTHORIZATION_FAILED") {
      console.error(`Assertion failed: expected policy denial code AUTHORIZATION_FAILED, got "${error.code}"`);
      process.exit(1);
    }
    if (error.status !== 403) {
      console.error(`Assertion failed: expected policy denial status 403, got ${error.status}`);
      process.exit(1);
    }
  }

  const unauthorizedIntentAdapters = {
    ...adapters,
    pureInvoker: {
      invoke: () => ({
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
            payload: { title: "Unauthorized title update" }
          }
        ]
      })
    }
  };

  try {
    await executeRoute(graph, request, unauthorizedIntentAdapters);
    console.error("Assertion failed: expected AUTHORIZATION_FAILED for unauthorized intent.");
    process.exit(1);
  } catch (error) {
    if (!(error instanceof RuntimeError)) {
      console.error("Assertion failed: expected intent authorization error to be RuntimeError, got:", error);
      process.exit(1);
    }
    if (error.code !== "AUTHORIZATION_FAILED") {
      console.error(`Assertion failed: expected intent authorization code AUTHORIZATION_FAILED, got "${error.code}"`);
      process.exit(1);
    }
    if (error.status !== 403) {
      console.error(`Assertion failed: expected intent authorization status 403, got ${error.status}`);
      process.exit(1);
    }
  }

  console.log("Semantic wiring assertions passed.");

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
