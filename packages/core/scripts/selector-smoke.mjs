import {
  resolveSelectorWhere,
  resolveDependencySelector,
  resolveDependencySelectors
} from "../dist/index.js";

const scope = {
  request: {
    payload: { taskId: "task-1" },
    params: { ownerId: "user-1" },
    query: { includeDone: "false" }
  },
  actor: {
    id: "user-1",
    roles: ["user"],
    properties: { tenantId: "tenant-1" }
  },
  dependencies: {
    currentTenant: {
      id: "tenant-1"
    }
  }
};

const scopeWithNullActor = {
  ...scope,
  actor: null
};

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

console.log("Running selector smoke test...");

// A. resolveSelectorWhere success
const whereA = {
  id: "$request.payload.taskId",
  userId: "$actor.id",
  tenantId: "$actor.properties.tenantId",
  isCompleted: false,
  literalName: "Task"
};
const resA = resolveSelectorWhere({ where: whereA, scope });
assert(resA.ok === true, "A. resolveSelectorWhere should succeed");
assert(resA.value.id === "task-1", "A. id should be resolved");
assert(resA.value.userId === "user-1", "A. userId should be resolved");
assert(resA.value.tenantId === "tenant-1", "A. tenantId should be resolved");
assert(resA.value.isCompleted === false, "A. isCompleted should remain literal");
assert(resA.value.literalName === "Task", "A. literalName should remain literal");

// B. resolveSelectorWhere keeps non-expression string
const whereB = { title: "Write spec" };
const resB = resolveSelectorWhere({ where: whereB, scope });
assert(resB.ok === true, "B. resolveSelectorWhere should succeed");
assert(resB.value.title === "Write spec", "B. title should remain literal");

// C. resolveSelectorWhere fails on missing expression path
const whereC = { id: "$request.payload.missing" };
const resC = resolveSelectorWhere({ where: whereC, scope });
assert(resC.ok === false, "C. resolveSelectorWhere should fail");
assert(resC.error.reason === "EXPRESSION_RESOLUTION_FAILED", "C. error.reason should be EXPRESSION_RESOLUTION_FAILED");
assert(resC.error.field === "id", "C. error.field should be 'id'");

// D. resolveDependencySelector success
const selectorD = {
  entity: "Task",
  cardinality: "one",
  where: {
    id: "$request.payload.taskId",
    userId: "$actor.id"
  },
  project: ["id", "title", "userId"],
  onMissing: "null"
};
const resD = resolveDependencySelector({ selector: selectorD, scope });
assert(resD.ok === true, "D. resolveDependencySelector should succeed");
assert(resD.value.entity === "Task", "D. entity should match");
assert(resD.value.cardinality === "one", "D. cardinality should match");
assert(resD.value.onMissing === "null", "D. onMissing should match");
assert(resD.value.project.length === 3, "D. project array length should be 3");
assert(resD.value.where.id === "task-1", "D. where.id should resolve");
assert(resD.value.where.userId === "user-1", "D. where.userId should resolve");

// E. resolveDependencySelectors success
const selectorsE = {
  targetTask: selectorD,
  tenant: {
    entity: "Tenant",
    cardinality: "one",
    where: {
      id: "$actor.properties.tenantId"
    },
    project: ["id"],
    onMissing: "null"
  }
};
const resE = resolveDependencySelectors({ selectors: selectorsE, scope });
assert(resE.ok === true, "E. resolveDependencySelectors should succeed");
assert(resE.value.targetTask.where.id === "task-1", "E. targetTask where.id should resolve");
assert(resE.value.tenant.where.id === "tenant-1", "E. tenant where.id should resolve");

// F. resolveDependencySelectors failure includes alias detail
const selectorsF = {
  broken: {
    entity: "Task",
    cardinality: "one",
    where: {
      id: "$request.payload.missing"
    },
    project: ["id"],
    onMissing: "null"
  }
};
const resF = resolveDependencySelectors({ selectors: selectorsF, scope });
assert(resF.ok === false, "F. resolveDependencySelectors should fail");
assert(resF.error.reason === "EXPRESSION_RESOLUTION_FAILED", "F. error.reason should be EXPRESSION_RESOLUTION_FAILED");
assert(resF.error.details && resF.error.details.alias === "broken", "F. error.details.alias should be 'broken'");

// G. null actor expression failure
const whereG = { userId: "$actor.id" };
const resG = resolveSelectorWhere({ where: whereG, scope: scopeWithNullActor });
assert(resG.ok === false, "G. resolveSelectorWhere with null actor should fail");
assert(resG.error.reason === "EXPRESSION_RESOLUTION_FAILED", "G. error.reason should be EXPRESSION_RESOLUTION_FAILED");

console.log("Selector smoke verification passed.");
