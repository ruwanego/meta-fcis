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

console.log("Shell smoke verification passed.");
