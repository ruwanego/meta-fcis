import { IntentSet } from "../protocol/intent.js";
import { RuntimeError } from "../errors/RuntimeError.js";

export function validateIntentSet(intentSet: unknown): IntentSet {
  if (!intentSet || typeof intentSet !== "object") {
    throw new RuntimeError("CORE_OUTPUT_INVALID", "IntentSet must be a non-null object");
  }

  const candidate = intentSet as Record<string, unknown>;

  if (!Array.isArray(candidate.intents)) {
    throw new RuntimeError("CORE_OUTPUT_INVALID", "IntentSet intents must be an array");
  }

  for (let i = 0; i < candidate.intents.length; i++) {
    const intent = candidate.intents[i];
    if (!intent || typeof intent !== "object") {
      throw new RuntimeError("CORE_OUTPUT_INVALID", `Intent at index ${i} must be a non-null object`);
    }

    const intentConfig = intent as Record<string, unknown>;
    if (typeof intentConfig.name !== "string" || !intentConfig.name.trim()) {
      throw new RuntimeError(
        "CORE_OUTPUT_INVALID",
        `Intent at index ${i} must have a non-empty 'name' string`
      );
    }
  }

  return intentSet as IntentSet;
}
