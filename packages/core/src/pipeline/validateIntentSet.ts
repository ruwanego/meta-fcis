import { IntentSet } from "../protocol/intent.js";
import { RuntimeError } from "../errors/RuntimeError.js";

const operations = new Set(["CREATE", "UPDATE", "DELETE"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string, details?: unknown): never {
  const error = new RuntimeError("CORE_OUTPUT_INVALID", message, details) as RuntimeError & {
    status: number;
  };
  error.status = 500;
  throw error;
}

export function validateIntentSet(value: unknown): IntentSet {
  if (!isPlainObject(value)) {
    invalid("IntentSet must be a plain object");
  }

  const candidate = value;

  if (typeof candidate.success !== "boolean") {
    invalid("IntentSet success must be a boolean");
  }

  if (
    !Number.isInteger(candidate.httpStatus) ||
    typeof candidate.httpStatus !== "number" ||
    candidate.httpStatus < 100 ||
    candidate.httpStatus > 599
  ) {
    invalid("IntentSet httpStatus must be an integer between 100 and 599");
  }

  if (!isPlainObject(candidate.responsePayload)) {
    invalid("IntentSet responsePayload must be a plain object");
  }

  if (!Array.isArray(candidate.intents)) {
    invalid("IntentSet intents must be an array");
  }

  for (let i = 0; i < candidate.intents.length; i++) {
    const intent = candidate.intents[i];
    if (!isPlainObject(intent)) {
      invalid(`Intent at index ${i} must be a plain object`);
    }

    if (intent.type !== "MUTATE_ENTITY") {
      invalid(`Intent at index ${i} type must be MUTATE_ENTITY`);
    }

    if (!isPlainObject(intent.meta)) {
      invalid(`Intent at index ${i} meta must be a plain object`);
    }

    const meta = intent.meta;

    if (typeof meta.entityName !== "string" || meta.entityName.length === 0) {
      invalid(`Intent at index ${i} meta.entityName must be a non-empty string`);
    }

    if (typeof meta.operation !== "string" || !operations.has(meta.operation)) {
      invalid(`Intent at index ${i} meta.operation must be CREATE, UPDATE, or DELETE`);
    }

    if (
      Object.prototype.hasOwnProperty.call(meta, "targetId") &&
      typeof meta.targetId !== "string"
    ) {
      invalid(`Intent at index ${i} meta.targetId must be a string when present`);
    }

    if (!isPlainObject(intent.payload)) {
      invalid(`Intent at index ${i} payload must be a plain object`);
    }
  }

  return value as unknown as IntentSet;
}
