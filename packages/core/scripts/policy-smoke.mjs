import {
  evaluatePolicyExpression,
  evaluatePolicy
} from "../dist/index.js";

const scope = {
  request: {
    payload: {
      taskId: "task-1",
      allowedRoles: ["admin", "user"]
    },
    params: {
      id: "task-1"
    },
    query: {}
  },
  actor: {
    id: "user-1",
    roles: ["user"],
    properties: {
      tenantId: "tenant-1"
    }
  },
  dependencies: {
    targetTask: {
      id: "task-1",
      userId: "user-1",
      tenantId: "tenant-1",
      isCompleted: false
    }
  }
};

const scopeWithNullActor = {
  ...scope,
  actor: null
};

function assertOkTrue(result, label) {
  if (!result.ok) {
    console.error(`${label}: expected ok true, got error: ${JSON.stringify(result.error)}`);
    process.exit(1);
  }
  if (result.value !== true) {
    console.error(`${label}: expected value true, got ${result.value}`);
    process.exit(1);
  }
}

function assertOkFalse(result, label) {
  if (!result.ok) {
    console.error(`${label}: expected ok true (value false), got error: ${JSON.stringify(result.error)}`);
    process.exit(1);
  }
  if (result.value !== false) {
    console.error(`${label}: expected value false, got ${result.value}`);
    process.exit(1);
  }
}

function assertFail(result, expectedReason, label) {
  if (result.ok) {
    console.error(`${label}: expected failure with reason ${expectedReason}, but got ok true with value ${result.value}`);
    process.exit(1);
  }
  if (result.error.reason !== expectedReason) {
    console.error(`${label}: expected reason ${expectedReason}, got ${result.error.reason}`);
    process.exit(1);
  }
}

console.log("Running policy smoke test...");

// A. eq success
assertOkTrue(
  evaluatePolicyExpression({
    expression: { eq: ["$dependencies.targetTask.userId", "$actor.id"] },
    scope
  }),
  "A. eq success"
);

// B. eq false
assertOkFalse(
  evaluatePolicyExpression({
    expression: { eq: ["$dependencies.targetTask.id", "$actor.id"] },
    scope
  }),
  "B. eq false"
);

// C. neq success
assertOkTrue(
  evaluatePolicyExpression({
    expression: { neq: ["$dependencies.targetTask.id", "$actor.id"] },
    scope
  }),
  "C. neq success"
);

// D. and success
assertOkTrue(
  evaluatePolicyExpression({
    expression: {
      and: [
        { eq: ["$dependencies.targetTask.userId", "$actor.id"] },
        { eq: ["$dependencies.targetTask.tenantId", "$actor.properties.tenantId"] }
      ]
    },
    scope
  }),
  "D. and success"
);

// E. and false short-circuit
assertOkFalse(
  evaluatePolicyExpression({
    expression: {
      and: [
        { eq: ["$dependencies.targetTask.id", "wrong"] },
        { eq: ["$missing.scope", "boom"] }
      ]
    },
    scope
  }),
  "E. and false short-circuit"
);

// F. or success short-circuit
assertOkTrue(
  evaluatePolicyExpression({
    expression: {
      or: [
        { eq: ["$dependencies.targetTask.id", "task-1"] },
        { eq: ["$missing.scope", "boom"] }
      ]
    },
    scope
  }),
  "F. or success short-circuit"
);

// G. not
assertOkTrue(
  evaluatePolicyExpression({
    expression: { not: { eq: ["$dependencies.targetTask.id", "wrong"] } },
    scope
  }),
  "G. not"
);

// H. exists true
assertOkTrue(
  evaluatePolicyExpression({
    expression: { exists: "$dependencies.targetTask.userId" },
    scope
  }),
  "H. exists true"
);

// I. exists false on missing path
assertOkFalse(
  evaluatePolicyExpression({
    expression: { exists: "$dependencies.targetTask.missing" },
    scope
  }),
  "I. exists false on missing path"
);

// J. exists false on null actor
assertOkFalse(
  evaluatePolicyExpression({
    expression: { exists: "$actor.id" },
    scope: scopeWithNullActor
  }),
  "J. exists false on null actor"
);

// K. in success
assertOkTrue(
  evaluatePolicyExpression({
    expression: { in: ["user", "$actor.roles"] },
    scope
  }),
  "K. in success"
);

// L. in false
assertOkFalse(
  evaluatePolicyExpression({
    expression: { in: ["owner", "$request.payload.allowedRoles"] },
    scope
  }),
  "L. in false"
);

// M. malformed operator
assertFail(
  evaluatePolicyExpression({
    expression: { eq: ["one"] },
    scope
  }),
  "POLICY_OPERATOR_ARITY_INVALID",
  "M. malformed operator"
);

// N. unknown operator
assertFail(
  evaluatePolicyExpression({
    expression: { gt: [1, 2] },
    scope
  }),
  "POLICY_OPERATOR_UNKNOWN",
  "N. unknown operator"
);

// O. failed value resolution
assertFail(
  evaluatePolicyExpression({
    expression: { eq: ["$dependencies.targetTask.missing", "x"] },
    scope
  }),
  "POLICY_VALUE_RESOLUTION_FAILED",
  "O. failed value resolution"
);

// P. evaluatePolicy undefined
assertOkTrue(
  evaluatePolicy({ policy: undefined, scope }),
  "P. evaluatePolicy undefined"
);

// Q. evaluatePolicy allow true
assertOkTrue(
  evaluatePolicy({
    policy: {
      effect: "allow",
      when: { eq: ["$dependencies.targetTask.userId", "$actor.id"] }
    },
    scope
  }),
  "Q. evaluatePolicy allow true"
);

// R. evaluatePolicy allow false
assertOkFalse(
  evaluatePolicy({
    policy: {
      effect: "allow",
      when: { eq: ["$dependencies.targetTask.id", "$actor.id"] }
    },
    scope
  }),
  "R. evaluatePolicy allow false"
);

// S. evaluatePolicy deny true
assertOkFalse(
  evaluatePolicy({
    policy: {
      effect: "deny",
      when: { eq: ["$dependencies.targetTask.userId", "$actor.id"] }
    },
    scope
  }),
  "S. evaluatePolicy deny true"
);

// T. evaluatePolicy deny false
assertOkTrue(
  evaluatePolicy({
    policy: {
      effect: "deny",
      when: { eq: ["$dependencies.targetTask.id", "$actor.id"] }
    },
    scope
  }),
  "T. evaluatePolicy deny false"
);

console.log("Policy smoke verification passed.");
