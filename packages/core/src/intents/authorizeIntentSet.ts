import { authorizeIntent } from "./authorizeIntent.js";
import type { MetaInstruction } from "../protocol/intent.js";
import type {
  AuthorizeIntentSetArgs,
  IntentAuthorizationResult,
} from "./types.js";

export function authorizeIntentSet(args: AuthorizeIntentSetArgs): IntentAuthorizationResult {
  const { graph, route, intentSet, scope } = args;

  for (let index = 0; index < intentSet.intents.length; index++) {
    const intent = intentSet.intents[index] as MetaInstruction;
    const result = authorizeIntent({
      graph,
      route,
      intent,
      scope,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: {
          ...result.error,
          details: {
            index,
            cause: result.error,
          },
        },
      };
    }
  }

  return {
    ok: true,
  };
}
