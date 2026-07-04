import {
  buildTransactionPlan
} from "../dist/index.js";

function createIntent(overrides = {}) {
  return {
    type: "MUTATE_ENTITY",
    meta: {
      entityName: "Task",
      operation: "CREATE",
      ...overrides.meta
    },
    payload: Object.prototype.hasOwnProperty.call(overrides, "payload")
      ? overrides.payload
      : {
          title: "New task",
          isCompleted: false
        }
  };
}

function updateIntent(overrides = {}) {
  return {
    type: "MUTATE_ENTITY",
    meta: {
      entityName: "Task",
      operation: "UPDATE",
      targetId: "task-1",
      ...overrides.meta
    },
    payload: Object.prototype.hasOwnProperty.call(overrides, "payload")
      ? overrides.payload
      : {
          isCompleted: true
        }
  };
}

function deleteIntent(overrides = {}) {
  return {
    type: "MUTATE_ENTITY",
    meta: {
      entityName: "Task",
      operation: "DELETE",
      targetId: "task-1",
      ...overrides.meta
    },
    payload: Object.prototype.hasOwnProperty.call(overrides, "payload")
      ? overrides.payload
      : {}
  };
}

function assertOk(label, result) {
  if (!result.ok) {
    console.error(`${label}: expected ok true, got ${JSON.stringify(result)}`);
    process.exit(1);
  }
}

function assertReason(label, result, reason, index) {
  if (result.ok) {
    console.error(`${label}: expected ok false, got ok true`);
    process.exit(1);
  }

  if (result.error.reason !== reason) {
    console.error(`${label}: expected reason ${reason}, got ${result.error.reason}`);
    process.exit(1);
  }

  if (result.error.index !== index) {
    console.error(`${label}: expected index ${index}, got ${result.error.index}`);
    process.exit(1);
  }
}

const emptyResult = buildTransactionPlan({ intents: [] });
assertOk("A. Empty intents", emptyResult);
if (emptyResult.plan.operations.length !== 0) {
  console.error(`A. Empty intents: expected 0 operations, got ${emptyResult.plan.operations.length}`);
  process.exit(1);
}

const createResult = buildTransactionPlan({
  intents: [
    createIntent()
  ]
});
assertOk("B. CREATE plan", createResult);
if (
  createResult.plan.operations[0].kind !== "CREATE" ||
  createResult.plan.operations[0].entity !== "Task" ||
  createResult.plan.operations[0].payload.title !== "New task"
) {
  console.error(`B. CREATE plan: unexpected operation ${JSON.stringify(createResult.plan.operations[0])}`);
  process.exit(1);
}

const updateResult = buildTransactionPlan({
  intents: [
    updateIntent()
  ]
});
assertOk("C. UPDATE plan", updateResult);
if (
  updateResult.plan.operations[0].kind !== "UPDATE" ||
  updateResult.plan.operations[0].entity !== "Task" ||
  updateResult.plan.operations[0].targetId !== "task-1" ||
  updateResult.plan.operations[0].payload.isCompleted !== true
) {
  console.error(`C. UPDATE plan: unexpected operation ${JSON.stringify(updateResult.plan.operations[0])}`);
  process.exit(1);
}

const deleteResult = buildTransactionPlan({
  intents: [
    deleteIntent()
  ]
});
assertOk("D. DELETE plan", deleteResult);
if (
  deleteResult.plan.operations[0].kind !== "DELETE" ||
  deleteResult.plan.operations[0].entity !== "Task" ||
  deleteResult.plan.operations[0].targetId !== "task-1" ||
  Object.prototype.hasOwnProperty.call(deleteResult.plan.operations[0], "payload")
) {
  console.error(`D. DELETE plan: unexpected operation ${JSON.stringify(deleteResult.plan.operations[0])}`);
  process.exit(1);
}

const orderResult = buildTransactionPlan({
  intents: [
    createIntent(),
    updateIntent(),
    deleteIntent()
  ]
});
assertOk("E. Order preserved", orderResult);
const kinds = orderResult.plan.operations.map((operation) => operation.kind);
if (JSON.stringify(kinds) !== JSON.stringify(["CREATE", "UPDATE", "DELETE"])) {
  console.error(`E. Order preserved: expected CREATE,UPDATE,DELETE, got ${kinds.join(",")}`);
  process.exit(1);
}

assertReason(
  "F. UPDATE missing target",
  buildTransactionPlan({
    intents: [
      updateIntent({ meta: { targetId: undefined } })
    ]
  }),
  "TRANSACTION_TARGET_REQUIRED",
  0
);

assertReason(
  "G. UPDATE empty payload",
  buildTransactionPlan({
    intents: [
      updateIntent({ payload: {} })
    ]
  }),
  "TRANSACTION_PAYLOAD_INVALID",
  0
);

assertReason(
  "H. DELETE non-empty payload",
  buildTransactionPlan({
    intents: [
      deleteIntent({ payload: { x: true } })
    ]
  }),
  "TRANSACTION_PAYLOAD_INVALID",
  0
);

assertReason(
  "I. CREATE with targetId",
  buildTransactionPlan({
    intents: [
      createIntent({ meta: { targetId: "task-1" } })
    ]
  }),
  "TRANSACTION_PAYLOAD_INVALID",
  0
);

assertReason(
  "J. Unsupported intent type defensive test",
  buildTransactionPlan({
    intents: [
      {
        type: "UNKNOWN",
        meta: {
          entityName: "Task",
          operation: "UPDATE",
          targetId: "task-1"
        },
        payload: {}
      }
    ]
  }),
  "TRANSACTION_INTENT_UNSUPPORTED",
  0
);

assertReason(
  "K. Unsupported operation defensive test",
  buildTransactionPlan({
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
  }),
  "TRANSACTION_INTENT_UNSUPPORTED",
  0
);

console.log("Transaction smoke verification passed.");
