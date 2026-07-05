import {
  resolveExpression,
  resolvePath
} from "../dist/index.js";

const scope = {
  request: {
    payload: { taskId: "task-1" },
    params: { id: "param-1" },
    query: { page: "2" }
  },
  actor: {
    id: "user-1",
    roles: ["user"],
    properties: { tenantId: "tenant-1" }
  },
  dependencies: {
    targetTask: {
      id: "task-1",
      userId: "user-1",
      nested: {
        value: 42
      }
    }
  }
};

const scopeWithNullActor = {
  ...scope,
  actor: null
};

function assertResolution(result, expectedValue) {
  if (!result.ok) {
    console.error(`Assertion failed: expected success, got error: ${result.reason}`);
    process.exit(1);
  }
  if (result.value !== expectedValue) {
    console.error(`Assertion failed: expected value ${JSON.stringify(expectedValue)}, got ${JSON.stringify(result.value)}`);
    process.exit(1);
  }
}

function assertFailure(result, expectedReason) {
  if (result.ok) {
    console.error(`Assertion failed: expected failure reason ${expectedReason}, but resolution succeeded with value:`, result.value);
    process.exit(1);
  }
  if (result.reason !== expectedReason) {
    console.error(`Assertion failed: expected failure reason ${expectedReason}, got ${result.reason}`);
    process.exit(1);
  }
}

console.log("Running expression smoke test...");

// 1. "$request.payload.taskId" resolves to "task-1"
assertResolution(resolveExpression({ expression: "$request.payload.taskId", scope }), "task-1");

// 2. "$request.params.id" resolves to "param-1"
assertResolution(resolveExpression({ expression: "$request.params.id", scope }), "param-1");

// 3. "$request.query.page" resolves to "2"
assertResolution(resolveExpression({ expression: "$request.query.page", scope }), "2");

// 4. "$actor.id" resolves to "user-1"
assertResolution(resolveExpression({ expression: "$actor.id", scope }), "user-1");

// 5. "$actor.properties.tenantId" resolves to "tenant-1"
assertResolution(resolveExpression({ expression: "$actor.properties.tenantId", scope }), "tenant-1");

// 6. "$dependencies.targetTask.userId" resolves to "user-1"
assertResolution(resolveExpression({ expression: "$dependencies.targetTask.userId", scope }), "user-1");

// 7. "$dependencies.targetTask.nested.value" resolves to 42
assertResolution(resolveExpression({ expression: "$dependencies.targetTask.nested.value", scope }), 42);

// 8. "$missing.x" returns ok false reason UNKNOWN_SCOPE
assertFailure(resolveExpression({ expression: "$missing.x", scope }), "UNKNOWN_SCOPE");

// 9. "request.payload.taskId" returns ok false reason EXPRESSION_NOT_PATH
assertFailure(resolveExpression({ expression: "request.payload.taskId", scope }), "EXPRESSION_NOT_PATH");

// 10. 123 returns ok false reason EXPRESSION_NOT_STRING
assertFailure(resolveExpression({ expression: 123, scope }), "EXPRESSION_NOT_STRING");

// 11. "$actor.id" with actor null returns ok false reason NULL_SCOPE
assertFailure(resolveExpression({ expression: "$actor.id", scope: scopeWithNullActor }), "NULL_SCOPE");

// 12. "$dependencies.targetTask.missing" returns ok false reason PATH_NOT_FOUND
assertFailure(resolveExpression({ expression: "$dependencies.targetTask.missing", scope }), "PATH_NOT_FOUND");

// 13. "$dependencies.targetTask.id.x" returns ok false reason PATH_NOT_TRAVERSABLE
assertFailure(resolveExpression({ expression: "$dependencies.targetTask.id.x", scope }), "PATH_NOT_TRAVERSABLE");

// 14. resolvePath root object with empty segments returns the root object
const rootObj = { a: 1 };
const pathRes = resolvePath({ root: rootObj, segments: [] });
if (!pathRes.ok) {
  console.error("Assertion failed: resolvePath empty segments failed");
  process.exit(1);
}
if (pathRes.value !== rootObj) {
  console.error("Assertion failed: resolvePath empty segments did not return the exact root object");
  process.exit(1);
}

console.log("Expression smoke verification passed.");
