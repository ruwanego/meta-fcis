import { loadGraph } from "@meta-fcis/core";
import { createShellRuntime } from "@meta-fcis/shell";
import { createMemoryPersistence } from "@meta-fcis/plugin-persistence-memory";

const graph = {
  irVersion: "meta-fcis.graph.v1",
  application: {
    name: "BasicTodo",
  },
  engineCompatibility: {
    min: "0.1.0",
    max: "0.x",
  },
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
          isId: true,
        },
        title: {
          type: "string",
          required: true,
          mutable: true,
          creatable: true,
          serverOwned: false,
        },
        isCompleted: {
          type: "boolean",
          required: true,
          mutable: true,
          creatable: true,
          serverOwned: false,
        },
        userId: {
          type: "string",
          required: true,
          mutable: false,
          creatable: false,
          serverOwned: true,
        },
      },
    },
  },
  models: {
    CompleteTaskInput: {
      fields: {
        taskId: {
          type: "string",
          required: true,
        },
      },
    },
  },
  routes: {
    "Tasks.complete": {
      path: "/tasks/:taskId/complete",
      schema: "CompleteTaskInput",
      pureFunction: "completeTask",
      auth: {
        required: true,
      },
      input: {
        bodyModel: "CompleteTaskInput",
        paramsModel: null,
        queryModel: null,
      },
      output: {
        successModel: null,
        errorModel: null,
      },
      handler: {
        kind: "pure-function",
        file: "./tasks.pure.ts",
        function: "completeTask",
      },
      dependencies: {
        targetTask: {
          entity: "Task",
          cardinality: "one",
          where: {
            id: "$request.params.taskId",
            userId: "$actor.id",
          },
          project: ["id", "title", "isCompleted", "userId"],
          onMissing: "null",
        },
      },
      policy: {
        effect: "allow",
        when: {
          eq: ["$dependencies.targetTask.userId", "$actor.id"],
        },
      },
      allowedIntents: [
        {
          type: "MUTATE_ENTITY",
          entity: "Task",
          operation: "UPDATE",
          fields: ["isCompleted"],
          targetId: "$request.params.taskId",
        },
      ],
    },
  },
};

const appGraph = loadGraph(graph);

const { persistence, transactionExecutor } = createMemoryPersistence({
  graph: appGraph,
  seed: {
    Task: [
      {
        id: "task-1",
        title: "Read the graph",
        isCompleted: false,
        userId: "user-1",
      },
    ],
  },
});

const runtime = createShellRuntime({
  graph: appGraph,
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
          Array.isArray(payload) ||
          typeof (payload as { taskId?: unknown }).taskId !== "string"
        ) {
          throw new Error("taskId must be a string");
        }

        return payload;
      },
    },
    auth: {
      authenticate() {
        return {
          id: "user-1",
          roles: ["user"],
          properties: {},
        };
      },
    },
    persistence,
    pureInvoker: {
      invoke(functionName, context) {
        if (functionName !== "completeTask") {
          throw new Error(`Unknown pure function: ${functionName}`);
        }

        const task = context.dependencies.targetTask;
        if (!task || typeof task !== "object" || Array.isArray(task)) {
          return {
            success: false,
            httpStatus: 404,
            responsePayload: {
              ok: false,
              error: "Task not found",
            },
            intents: [],
          };
        }

        return {
          success: true,
          httpStatus: 200,
          responsePayload: {
            ok: true,
            taskId: (task as { id: string }).id,
            message: "Task completion planned",
          },
          intents: [
            {
              type: "MUTATE_ENTITY",
              meta: {
                entityName: "Task",
                operation: "UPDATE",
                targetId: (task as { id: string }).id,
              },
              payload: {
                isCompleted: true,
              },
            },
          ],
        };
      },
    },
  },
});

const result = await runtime.runRoute({
  route: "Tasks.complete",
  payload: {
    taskId: "task-1",
  },
  params: {
    taskId: "task-1",
  },
  query: {},
  headers: {},
});

if (!result.ok) {
  throw new Error(`Route failed: ${JSON.stringify(result.error, null, 2)}`);
}

console.log(JSON.stringify({
  responsePayload: result.value.intentSet.responsePayload,
  transactionPlan: result.value.transactionPlan,
  execution: result.value.execution,
}, null, 2));

// Smoke self-check: the executor must have applied the plan
if (result.value.execution?.operations[0]?.outcome !== "applied") {
  throw new Error("Expected execution result with applied outcome");
}

const stored = persistence.loadDependencies({
  check: {
    entity: "Task",
    cardinality: "one",
    where: { id: "task-1" },
    project: ["isCompleted"],
    onMissing: "error",
  },
}) as { check: { isCompleted: boolean } };

if (stored.check.isCompleted !== true) {
  throw new Error("Expected task-1 to be completed in the plugin store");
}
