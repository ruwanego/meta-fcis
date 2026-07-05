import { createShellRuntime } from "@meta-fcis/shell";
import type { TransactionExecutor, TransactionOperationResult } from "@meta-fcis/core";

const tasks = new Map<string, {
  id: string;
  title: string;
  isCompleted: boolean;
  userId: string;
}>([
  [
    "task-1",
    {
      id: "task-1",
      title: "Read the graph",
      isCompleted: false,
      userId: "user-1",
    },
  ],
]);

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

// ponytail: example executor handles UPDATE only — the one op this graph can emit
const transactionExecutor: TransactionExecutor = {
  execute(plan) {
    const operations: TransactionOperationResult[] = plan.operations.map((op) => {
      if (op.kind !== "UPDATE") {
        throw new Error(`Example executor only supports UPDATE, got ${op.kind}`);
      }

      const existing = tasks.get(op.targetId);
      if (!existing) {
        throw new Error(`Task not found: ${op.targetId}`);
      }

      tasks.set(op.targetId, { ...existing, ...op.payload } as typeof existing);

      return {
        kind: op.kind,
        entity: op.entity,
        targetId: op.targetId,
        outcome: "applied",
      };
    });

    return { operations };
  },
};

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
    persistence: {
      loadDependencies(selectors) {
        const taskId = selectors.targetTask?.where.id;
        const userId = selectors.targetTask?.where.userId;
        const task = typeof taskId === "string" ? tasks.get(taskId) : undefined;

        return {
          targetTask: task?.userId === userId ? task : null,
        };
      },
    },
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

if (tasks.get("task-1")?.isCompleted !== true) {
  throw new Error("Expected task-1 to be completed by the executor");
}
