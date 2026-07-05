import { createShellRuntime } from "../dist/index.js";

const graph = {
  irVersion: "meta-fcis.graph.v1",
  application: {
    name: "ShellSmoke"
  },
  engineCompatibility: {
    min: "0.1.0",
    max: "0.x"
  },
  entities: {},
  models: {},
  routes: {
    "System.ping": {
      path: "/ping",
      pureFunction: "ping",
      auth: {
        required: true
      },
      input: {
        bodyModel: null,
        paramsModel: null,
        queryModel: null
      },
      output: {
        successModel: null,
        errorModel: null
      },
      handler: {
        kind: "pure-function",
        file: "./system.pure.ts",
        function: "ping"
      },
      dependencies: {},
      allowedIntents: []
    }
  }
};

let persistenceCalled = false;

const adapters = {
  schema: {
    validate: (_schema, payload) => payload
  },
  auth: {
    authenticate: () => ({
      id: "user-1",
      roles: ["system"],
      properties: {}
    })
  },
  persistence: {
    loadDependencies: () => {
      persistenceCalled = true;
      return {};
    }
  },
  pureInvoker: {
    invoke: (functionName, context) => {
      if (functionName !== "ping") {
        throw new Error(`Unknown pure function: ${functionName}`);
      }
      return {
        success: true,
        httpStatus: 200,
        responsePayload: {
          ok: true,
          actorId: context.actor.id
        },
        intents: []
      };
    }
  }
};

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

console.log("Running shell smoke test...");

const runtime = createShellRuntime({ graph, adapters });

const success = await runtime.runRoute({
  route: "System.ping",
  payload: {}
});

assert(success.ok === true, "route execution should succeed");
assert(success.value.intentSet.httpStatus === 200, "httpStatus should be 200");
assert(success.value.intentSet.responsePayload.ok === true, "responsePayload.ok should be true");
assert(success.value.intentSet.responsePayload.actorId === "user-1", "actorId should come from adapter actor");
assert(Array.isArray(success.value.transactionPlan.operations), "transactionPlan.operations should be an array");
assert(success.value.transactionPlan.operations.length === 0, "transaction plan should be empty");
assert(persistenceCalled === false, "persistence should not be called for empty dependencies");

const missingRoute = await runtime.runRoute({
  route: "System.missing",
  payload: {}
});

assert(missingRoute.ok === false, "missing route should return a shell error result");
assert(missingRoute.error.code === "ROUTE_NOT_FOUND", "missing route code should be ROUTE_NOT_FOUND");
assert(missingRoute.error.status === 404, "missing route status should be 404");

// Without executor: no execution field
assert(!("execution" in success.value), "no executor configured should mean no execution field");

// With executor: plan handed over, execution present
let executorCalls = 0;
const executor = {
  execute(plan) {
    executorCalls++;
    return {
      operations: plan.operations.map((op) => ({ ...op, outcome: "applied" }))
    };
  }
};

const executingRuntime = createShellRuntime({ graph, adapters, transactionExecutor: executor });

const executed = await runtime.runRoute({ route: "System.ping", payload: {} });
const executedWith = await executingRuntime.runRoute({ route: "System.ping", payload: {} });

assert(executed.ok === true && !("execution" in executed.value), "plain runtime stays executor-free");
assert(executedWith.ok === true, "executor runtime should succeed");
assert(Array.isArray(executedWith.value.execution.operations), "execution result should carry operations");
assert(executorCalls === 1, "executor should be invoked exactly once");

// Pipeline failure: executor not invoked
const failed = await executingRuntime.runRoute({ route: "System.missing", payload: {} });
assert(failed.ok === false, "missing route should fail on executor runtime too");
assert(executorCalls === 1, "executor must not run when the pipeline fails");

// Executor throws: converted at the boundary
const throwingRuntime = createShellRuntime({
  graph,
  adapters,
  transactionExecutor: {
    execute() {
      throw new Error("boom");
    }
  }
});

const executionFailure = await throwingRuntime.runRoute({ route: "System.ping", payload: {} });
assert(executionFailure.ok === false, "throwing executor should produce an error result");
assert(executionFailure.error.code === "TRANSACTION_EXECUTION_FAILED", "code should be TRANSACTION_EXECUTION_FAILED");
assert(executionFailure.error.status === 500, "execution failure status should be 500");
assert(Array.isArray(executionFailure.error.details.plan.operations), "details should carry the plan");

console.log("Shell smoke verification passed.");
