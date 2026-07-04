import {
  authorizeIntent,
  authorizeIntentSet
} from "../dist/index.js";

const graph = {
  irVersion: "meta-fcis.graph.v1",
  application: { name: "TodoApp" },
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
        }
      }
    },
    LockedThing: {
      table: "locked_things",
      idField: "id",
      deletePolicy: "forbidden",
      fields: {
        id: {
          type: "string",
          required: true,
          mutable: false,
          creatable: false,
          serverOwned: true,
          isId: true
        },
        name: {
          type: "string",
          required: true,
          mutable: true,
          creatable: true,
          serverOwned: false
        }
      }
    }
  },
  models: {},
  routes: {}
};

const route = {
  auth: { required: true },
  input: {},
  output: {},
  handler: {
    kind: "pure-function",
    file: "./tasks.pure.ts",
    function: "completeTask"
  },
  dependencies: {},
  allowedIntents: [
    {
      type: "MUTATE_ENTITY",
      entity: "Task",
      operation: "UPDATE",
      fields: ["isCompleted", "title"],
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
    },
    {
      type: "MUTATE_ENTITY",
      entity: "LockedThing",
      operation: "DELETE",
      fields: [],
      targetId: "$request.payload.lockedId"
    }
  ]
};

const scope = {
  request: {
    payload: {
      taskId: "task-1",
      lockedId: "locked-1"
    },
    params: {},
    query: {}
  },
  actor: {
    id: "user-1",
    role: "user",
    claims: {}
  },
  dependencies: {}
};

function updateIntent(overrides = {}) {
  const payload = Object.prototype.hasOwnProperty.call(overrides, "payload")
    ? overrides.payload
    : { isCompleted: true };

  return {
    type: "MUTATE_ENTITY",
    meta: {
      entityName: "Task",
      operation: "UPDATE",
      targetId: "task-1",
      ...overrides.meta
    },
    payload
  };
}

function createIntent(overrides = {}) {
  const payload = Object.prototype.hasOwnProperty.call(overrides, "payload")
    ? overrides.payload
    : {
        title: "New task",
        isCompleted: false
      };

  return {
    type: "MUTATE_ENTITY",
    meta: {
      entityName: "Task",
      operation: "CREATE",
      ...overrides.meta
    },
    payload
  };
}

function deleteIntent(overrides = {}) {
  const payload = Object.prototype.hasOwnProperty.call(overrides, "payload")
    ? overrides.payload
    : {};

  return {
    type: "MUTATE_ENTITY",
    meta: {
      entityName: "Task",
      operation: "DELETE",
      targetId: "task-1",
      ...overrides.meta
    },
    payload
  };
}

function runAuthorizeIntent(intent, testRoute = route) {
  return authorizeIntent({
    graph,
    route: testRoute,
    intent,
    scope
  });
}

function assertOk(label, result) {
  if (!result.ok) {
    console.error(`${label}: expected ok true, got ${JSON.stringify(result)}`);
    process.exit(1);
  }
}

function assertReason(label, result, expectedReason) {
  if (result.ok) {
    console.error(`${label}: expected ok false, got ok true`);
    process.exit(1);
  }

  const expectedReasons = Array.isArray(expectedReason) ? expectedReason : [expectedReason];
  if (!expectedReasons.includes(result.error.reason)) {
    console.error(
      `${label}: expected reason ${expectedReasons.join(" or ")}, got ${result.error.reason}`
    );
    process.exit(1);
  }
}

assertOk("A. UPDATE allowed", runAuthorizeIntent(updateIntent()));

assertOk(
  "B. UPDATE multiple allowed fields",
  runAuthorizeIntent(updateIntent({ payload: { isCompleted: true, title: "Done" } }))
);

assertReason(
  "C. UPDATE unknown entity",
  runAuthorizeIntent(updateIntent({ meta: { entityName: "Missing" } })),
  "INTENT_ENTITY_UNKNOWN"
);

assertReason(
  "D. UPDATE immutable field",
  runAuthorizeIntent(updateIntent({ payload: { userId: "user-2" } })),
  "INTENT_FIELD_NOT_MUTABLE"
);

assertReason(
  "E. UPDATE unknown field",
  runAuthorizeIntent(updateIntent({ payload: { missing: true } })),
  "INTENT_FIELD_UNKNOWN"
);

const routeTitleNotAllowed = {
  ...route,
  allowedIntents: route.allowedIntents.map((allowedIntent) =>
    allowedIntent.type === "MUTATE_ENTITY" &&
    allowedIntent.entity === "Task" &&
    allowedIntent.operation === "UPDATE"
      ? {
          ...allowedIntent,
          fields: ["isCompleted"]
        }
      : allowedIntent
  )
};

assertReason(
  "F. UPDATE route not allowed field",
  runAuthorizeIntent(updateIntent({ payload: { title: "Done" } }), routeTitleNotAllowed),
  "INTENT_ROUTE_NOT_ALLOWED"
);

assertReason(
  "G. UPDATE target mismatch",
  runAuthorizeIntent(updateIntent({ meta: { targetId: "task-2" } })),
  "INTENT_TARGET_MISMATCH"
);

const updateMissingTarget = updateIntent();
delete updateMissingTarget.meta.targetId;
assertReason(
  "H. UPDATE missing target",
  runAuthorizeIntent(updateMissingTarget),
  "INTENT_TARGET_REQUIRED"
);

assertReason(
  "I. UPDATE empty payload",
  runAuthorizeIntent(updateIntent({ payload: {} })),
  "INTENT_PAYLOAD_INVALID"
);

assertOk("J. CREATE allowed", runAuthorizeIntent(createIntent()));

assertReason(
  "K. CREATE server owned field rejected",
  runAuthorizeIntent(createIntent({ payload: { id: "client-id", title: "New task" } })),
  "INTENT_FIELD_SERVER_OWNED"
);

assertReason(
  "L. CREATE non-creatable field rejected",
  runAuthorizeIntent(createIntent({ payload: { userId: "user-1", title: "New task" } })),
  ["INTENT_FIELD_SERVER_OWNED", "INTENT_FIELD_NOT_CREATABLE"]
);

assertReason(
  "M. CREATE targetId forbidden",
  runAuthorizeIntent(createIntent({ meta: { targetId: "task-1" } })),
  "INTENT_TARGET_FORBIDDEN"
);

assertOk("N. DELETE allowed", runAuthorizeIntent(deleteIntent()));

assertReason(
  "O. DELETE forbidden by entity policy",
  runAuthorizeIntent(deleteIntent({ meta: { entityName: "LockedThing", targetId: "locked-1" } })),
  "INTENT_DELETE_FORBIDDEN"
);

assertReason(
  "P. DELETE payload invalid",
  runAuthorizeIntent(deleteIntent({ payload: { x: true } })),
  "INTENT_PAYLOAD_INVALID"
);

assertReason(
  "Q. DELETE target mismatch",
  runAuthorizeIntent(deleteIntent({ meta: { targetId: "task-2" } })),
  "INTENT_TARGET_MISMATCH"
);

assertOk(
  "R. authorizeIntentSet success",
  authorizeIntentSet({
    graph,
    route,
    intentSet: {
      intents: [
        updateIntent(),
        createIntent()
      ]
    },
    scope
  })
);

const intentSetFailure = authorizeIntentSet({
  graph,
  route,
  intentSet: {
    intents: [
      updateIntent(),
      updateIntent({ payload: { missing: true } })
    ]
  },
  scope
});

assertReason("S. authorizeIntentSet failure includes index", intentSetFailure, "INTENT_FIELD_UNKNOWN");
if (intentSetFailure.error.details.index !== 1) {
  console.error(
    `S. authorizeIntentSet failure includes index: expected index 1, got ${intentSetFailure.error.details.index}`
  );
  process.exit(1);
}

const routeMissingTargetExpression = {
  ...route,
  allowedIntents: route.allowedIntents.map((allowedIntent) =>
    allowedIntent.type === "MUTATE_ENTITY" &&
    allowedIntent.entity === "Task" &&
    allowedIntent.operation === "UPDATE"
      ? {
          ...allowedIntent,
          targetId: "$request.payload.missing"
        }
      : allowedIntent
  )
};

assertReason(
  "T. target expression resolution failure",
  runAuthorizeIntent(updateIntent(), routeMissingTargetExpression),
  "INTENT_TARGET_RESOLUTION_FAILED"
);

console.log("Intent authorization smoke verification passed.");
