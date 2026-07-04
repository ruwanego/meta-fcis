import {
  RuntimeError,
  validateGraph
} from "../dist/index.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const validGraph = {
  irVersion: "meta-fcis.graph.v1",
  application: {
    name: "TodoApp",
    title: "Todo App"
  },
  engineCompatibility: {
    min: "0.1.0",
    max: "0.x"
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
      transport: {
        kind: "http",
        method: "POST",
        path: "/tasks/complete"
      },
      auth: {
        required: true,
        strategy: "jwt"
      },
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
      policy: {
        effect: "allow",
        when: {
          eq: ["$dependencies.targetTask.userId", "$actor.id"]
        }
      },
      allowedIntents: [
        {
          type: "MUTATE_ENTITY",
          entity: "Task",
          operation: "UPDATE",
          fields: ["isCompleted"],
          targetId: "$request.payload.taskId"
        },
        {
          type: "MUTATE_ENTITY",
          entity: "Task",
          operation: "CREATE",
          fields: ["title", "isCompleted"]
        },
        {
          type: "MUTATE_ENTITY",
          entity: "Task",
          operation: "DELETE",
          fields: [],
          targetId: "$request.payload.taskId"
        }
      ]
    }
  }
};

function assertGraphInvalid(label, mutate) {
  const graph = clone(validGraph);
  mutate(graph);

  try {
    validateGraph(graph);
    console.error(`${label}: expected GRAPH_INVALID, but validation passed`);
    process.exit(1);
  } catch (error) {
    if (!(error instanceof RuntimeError)) {
      console.error(`${label}: expected RuntimeError, got:`, error);
      process.exit(1);
    }
    if (error.code !== "GRAPH_INVALID") {
      console.error(`${label}: expected GRAPH_INVALID, got ${error.code}`);
      process.exit(1);
    }
  }
}

const validated = validateGraph(validGraph);
if (validated.irVersion !== "meta-fcis.graph.v1") {
  console.error(`A. valid graph passes: expected irVersion meta-fcis.graph.v1, got ${validated.irVersion}`);
  process.exit(1);
}

assertGraphInvalid("B. missing irVersion fails", (graph) => {
  delete graph.irVersion;
});

assertGraphInvalid("C. entity idField missing from fields fails", (graph) => {
  delete graph.entities.Task.fields.id;
});

assertGraphInvalid("D. id field without isId true fails", (graph) => {
  graph.entities.Task.fields.id.isId = false;
});

assertGraphInvalid("E. route bodyModel references missing model fails", (graph) => {
  graph.routes["Tasks.complete"].input.bodyModel = "MissingDto";
});

assertGraphInvalid("F. dependency selector unknown entity fails", (graph) => {
  graph.routes["Tasks.complete"].dependencies.targetTask.entity = "Missing";
});

assertGraphInvalid("G. dependency project unknown field fails", (graph) => {
  graph.routes["Tasks.complete"].dependencies.targetTask.project.push("missing");
});

assertGraphInvalid("H. onMissing/cardinality mismatch fails", (graph) => {
  graph.routes["Tasks.complete"].dependencies.targetTask.cardinality = "one";
  graph.routes["Tasks.complete"].dependencies.targetTask.onMissing = "empty";
});

assertGraphInvalid("I. allowedIntent unknown entity fails", (graph) => {
  graph.routes["Tasks.complete"].allowedIntents[0].entity = "Missing";
});

assertGraphInvalid("J. allowedIntent UPDATE without targetId fails", (graph) => {
  delete graph.routes["Tasks.complete"].allowedIntents[0].targetId;
});

assertGraphInvalid("K. allowedIntent UPDATE immutable field fails", (graph) => {
  graph.routes["Tasks.complete"].allowedIntents[0].fields = ["userId"];
});

assertGraphInvalid("L. allowedIntent CREATE serverOwned field fails", (graph) => {
  graph.routes["Tasks.complete"].allowedIntents[1].fields = ["id"];
});

assertGraphInvalid("M. allowedIntent DELETE with fields fails", (graph) => {
  graph.routes["Tasks.complete"].allowedIntents[2].fields = ["title"];
});

assertGraphInvalid("N. allowedIntent DELETE forbidden policy fails", (graph) => {
  graph.entities.Task.deletePolicy = "forbidden";
});

assertGraphInvalid("O. policy invalid effect fails", (graph) => {
  graph.routes["Tasks.complete"].policy.effect = "maybe";
});

assertGraphInvalid("P. orderBy unknown field fails", (graph) => {
  graph.routes["Tasks.complete"].dependencies.targetTask.orderBy = [
    { field: "missing", direction: "asc" }
  ];
});

assertGraphInvalid("Q. limit zero fails", (graph) => {
  graph.routes["Tasks.complete"].dependencies.targetTask.limit = 0;
});

console.log("Graph validator smoke verification passed.");
