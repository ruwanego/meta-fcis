import type { AppGraph, RouteDefinition } from "../graph/types.js";
import type { ExpressionScope } from "../expressions/types.js";
import type { IntentSet, MetaInstruction } from "../protocol/intent.js";

export type IntentAuthorizationErrorReason =
  | "INTENT_TYPE_UNSUPPORTED"
  | "INTENT_ENTITY_UNKNOWN"
  | "INTENT_OPERATION_INVALID"
  | "INTENT_TARGET_REQUIRED"
  | "INTENT_TARGET_FORBIDDEN"
  | "INTENT_PAYLOAD_INVALID"
  | "INTENT_FIELD_UNKNOWN"
  | "INTENT_FIELD_NOT_MUTABLE"
  | "INTENT_FIELD_NOT_CREATABLE"
  | "INTENT_FIELD_SERVER_OWNED"
  | "INTENT_ROUTE_NOT_ALLOWED"
  | "INTENT_TARGET_MISMATCH"
  | "INTENT_TARGET_RESOLUTION_FAILED"
  | "INTENT_DELETE_FORBIDDEN";

export interface IntentAuthorizationError {
  reason: IntentAuthorizationErrorReason;
  entityName?: string;
  operation?: string;
  field?: string;
  details?: unknown;
}

export type IntentAuthorizationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: IntentAuthorizationError;
    };

export interface AuthorizeIntentArgs {
  graph: AppGraph;
  route: RouteDefinition;
  intent: MetaInstruction;
  scope: ExpressionScope;
}

export interface AuthorizeIntentSetArgs {
  graph: AppGraph;
  route: RouteDefinition;
  intentSet: IntentSet;
  scope: ExpressionScope;
}
