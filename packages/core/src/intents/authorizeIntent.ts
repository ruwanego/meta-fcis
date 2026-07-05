import { resolveExpression } from "../expressions/resolveExpression.js";
import type { AllowedIntentDefinition, EntityDefinition } from "../graph/types.js";
import type {
  AuthorizeIntentArgs,
  IntentAuthorizationError,
  IntentAuthorizationResult,
} from "./types.js";

const supportedOperations = new Set(["CREATE", "UPDATE", "DELETE"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function failure(error: IntentAuthorizationError): IntentAuthorizationResult {
  return {
    ok: false,
    error,
  };
}

function hasOwnKey(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function fieldAllowed(candidates: AllowedIntentDefinition[], field: string): boolean {
  return candidates.some((candidate) => candidate.fields.includes(field));
}

function authorizeTarget(args: {
  candidates: AllowedIntentDefinition[];
  targetId: string;
  scope: AuthorizeIntentArgs["scope"];
  entityName: string;
  operation: string;
}): IntentAuthorizationResult {
  const { candidates, targetId, scope, entityName, operation } = args;

  for (const candidate of candidates) {
    if (!hasOwnKey(candidate as unknown as Record<string, unknown>, "targetId")) {
      continue;
    }

    const resolution = resolveExpression({
      expression: candidate.targetId,
      scope,
    });

    if (!resolution.ok || typeof resolution.value !== "string") {
      return failure({
        reason: "INTENT_TARGET_RESOLUTION_FAILED",
        entityName,
        operation,
        details: resolution,
      });
    }

    if (Object.is(resolution.value, targetId)) {
      return {
        ok: true,
      };
    }
  }

  return failure({
    reason: "INTENT_TARGET_MISMATCH",
    entityName,
    operation,
  });
}

function authorizeCreate(args: {
  intentMeta: AuthorizeIntentArgs["intent"]["meta"];
  entity: EntityDefinition;
  entityName: string;
  payload: Record<string, unknown>;
  candidates: AllowedIntentDefinition[];
}): IntentAuthorizationResult {
  const { intentMeta, entity, entityName, payload, candidates } = args;

  if (hasOwnKey(intentMeta, "targetId")) {
    return failure({
      reason: "INTENT_TARGET_FORBIDDEN",
      entityName,
      operation: "CREATE",
    });
  }

  for (const field of Object.keys(payload)) {
    const fieldDefinition = entity.fields[field];

    if (!fieldDefinition) {
      return failure({
        reason: "INTENT_FIELD_UNKNOWN",
        entityName,
        operation: "CREATE",
        field,
      });
    }

    if (fieldDefinition.serverOwned) {
      return failure({
        reason: "INTENT_FIELD_SERVER_OWNED",
        entityName,
        operation: "CREATE",
        field,
      });
    }

    if (!fieldDefinition.creatable) {
      return failure({
        reason: "INTENT_FIELD_NOT_CREATABLE",
        entityName,
        operation: "CREATE",
        field,
      });
    }

    if (!fieldAllowed(candidates, field)) {
      return failure({
        reason: "INTENT_ROUTE_NOT_ALLOWED",
        entityName,
        operation: "CREATE",
        field,
      });
    }
  }

  return {
    ok: true,
  };
}

function authorizeUpdate(args: {
  targetId: string | undefined;
  entity: EntityDefinition;
  entityName: string;
  payload: Record<string, unknown>;
  candidates: AllowedIntentDefinition[];
  scope: AuthorizeIntentArgs["scope"];
}): IntentAuthorizationResult {
  const { targetId, entity, entityName, payload, candidates, scope } = args;

  if (typeof targetId !== "string" || targetId.length === 0) {
    return failure({
      reason: "INTENT_TARGET_REQUIRED",
      entityName,
      operation: "UPDATE",
    });
  }

  if (Object.keys(payload).length === 0) {
    return failure({
      reason: "INTENT_PAYLOAD_INVALID",
      entityName,
      operation: "UPDATE",
    });
  }

  for (const field of Object.keys(payload)) {
    const fieldDefinition = entity.fields[field];

    if (!fieldDefinition) {
      return failure({
        reason: "INTENT_FIELD_UNKNOWN",
        entityName,
        operation: "UPDATE",
        field,
      });
    }

    if (!fieldDefinition.mutable) {
      return failure({
        reason: "INTENT_FIELD_NOT_MUTABLE",
        entityName,
        operation: "UPDATE",
        field,
      });
    }

    if (!fieldAllowed(candidates, field)) {
      return failure({
        reason: "INTENT_ROUTE_NOT_ALLOWED",
        entityName,
        operation: "UPDATE",
        field,
      });
    }
  }

  return authorizeTarget({
    candidates,
    targetId,
    scope,
    entityName,
    operation: "UPDATE",
  });
}

function authorizeDelete(args: {
  targetId: string | undefined;
  entity: EntityDefinition;
  entityName: string;
  payload: Record<string, unknown>;
  candidates: AllowedIntentDefinition[];
  scope: AuthorizeIntentArgs["scope"];
}): IntentAuthorizationResult {
  const { targetId, entity, entityName, payload, candidates, scope } = args;

  if (typeof targetId !== "string" || targetId.length === 0) {
    return failure({
      reason: "INTENT_TARGET_REQUIRED",
      entityName,
      operation: "DELETE",
    });
  }

  if (entity.deletePolicy === "forbidden") {
    return failure({
      reason: "INTENT_DELETE_FORBIDDEN",
      entityName,
      operation: "DELETE",
    });
  }

  if (Object.keys(payload).length > 0) {
    return failure({
      reason: "INTENT_PAYLOAD_INVALID",
      entityName,
      operation: "DELETE",
    });
  }

  return authorizeTarget({
    candidates,
    targetId,
    scope,
    entityName,
    operation: "DELETE",
  });
}

export function authorizeIntent(args: AuthorizeIntentArgs): IntentAuthorizationResult {
  const { graph, route, intent, scope } = args;

  if (intent.type !== "MUTATE_ENTITY") {
    return failure({
      reason: "INTENT_TYPE_UNSUPPORTED",
      details: {
        type: intent.type,
      },
    });
  }

  const intentMeta = intent.meta;
  const entityName = intentMeta.entityName;
  const operation = intentMeta.operation;
  const entity = graph.entities[entityName];

  if (!entity) {
    return failure({
      reason: "INTENT_ENTITY_UNKNOWN",
      entityName,
    });
  }

  if (!supportedOperations.has(operation)) {
    return failure({
      reason: "INTENT_OPERATION_INVALID",
      entityName,
      operation,
    });
  }

  if (!isPlainObject(intent.payload)) {
    return failure({
      reason: "INTENT_PAYLOAD_INVALID",
      entityName,
      operation,
    });
  }

  const candidates = route.allowedIntents.filter(
    (allowedIntent) =>
      allowedIntent.type === "MUTATE_ENTITY" &&
      allowedIntent.entity === entityName &&
      allowedIntent.operation === operation
  );

  if (candidates.length === 0) {
    return failure({
      reason: "INTENT_ROUTE_NOT_ALLOWED",
      entityName,
      operation,
    });
  }

  if (operation === "CREATE") {
    return authorizeCreate({
      intentMeta,
      entity,
      entityName,
      payload: intent.payload,
      candidates,
    });
  }

  if (operation === "UPDATE") {
    return authorizeUpdate({
      targetId: intentMeta.targetId,
      entity,
      entityName,
      payload: intent.payload,
      candidates,
      scope,
    });
  }

  return authorizeDelete({
    targetId: intentMeta.targetId,
    entity,
    entityName,
    payload: intent.payload,
    candidates,
    scope,
  });
}
