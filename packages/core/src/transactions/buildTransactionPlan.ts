import type { MetaInstruction } from "../protocol/intent.js";
import type {
  TransactionOperation,
  TransactionPlanError,
  TransactionPlanResult,
} from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(error: TransactionPlanError): TransactionPlanResult {
  return {
    ok: false,
    error,
  };
}

function targetRequired(index: number, intent: MetaInstruction): TransactionPlanResult {
  return failure({
    reason: "TRANSACTION_TARGET_REQUIRED",
    index,
    details: intent,
  });
}

function payloadInvalid(index: number, details: unknown): TransactionPlanResult {
  return failure({
    reason: "TRANSACTION_PAYLOAD_INVALID",
    index,
    details,
  });
}

export function buildTransactionPlan(args: {
  intents: MetaInstruction[];
}): TransactionPlanResult {
  const operations: TransactionOperation[] = [];

  for (let index = 0; index < args.intents.length; index++) {
    const intent = args.intents[index] as MetaInstruction & {
      type: string;
      meta: {
        entityName: string;
        operation: string;
        targetId?: string;
      };
      payload: unknown;
    };

    if (intent.type !== "MUTATE_ENTITY") {
      return failure({
        reason: "TRANSACTION_INTENT_UNSUPPORTED",
        index,
        details: intent,
      });
    }

    const { entityName, operation, targetId } = intent.meta;

    if (operation === "CREATE") {
      if (targetId !== undefined) {
        return payloadInvalid(index, {
          intent,
          message: "CREATE targetId must be absent",
        });
      }

      if (!isPlainObject(intent.payload)) {
        return payloadInvalid(index, intent);
      }

      operations.push({
        kind: "CREATE",
        entity: entityName,
        payload: intent.payload,
      });
      continue;
    }

    if (operation === "UPDATE") {
      if (typeof targetId !== "string" || targetId.length === 0) {
        return targetRequired(index, intent);
      }

      if (!isPlainObject(intent.payload) || Object.keys(intent.payload).length === 0) {
        return payloadInvalid(index, intent);
      }

      operations.push({
        kind: "UPDATE",
        entity: entityName,
        targetId,
        payload: intent.payload,
      });
      continue;
    }

    if (operation === "DELETE") {
      if (typeof targetId !== "string" || targetId.length === 0) {
        return targetRequired(index, intent);
      }

      if (!isPlainObject(intent.payload) || Object.keys(intent.payload).length !== 0) {
        return payloadInvalid(index, intent);
      }

      operations.push({
        kind: "DELETE",
        entity: entityName,
        targetId,
      });
      continue;
    }

    return failure({
      reason: "TRANSACTION_INTENT_UNSUPPORTED",
      index,
      details: intent,
    });
  }

  return {
    ok: true,
    plan: {
      operations,
    },
  };
}
