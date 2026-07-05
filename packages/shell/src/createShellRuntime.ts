import { executeRoute, RuntimeError } from "@meta-fcis/core";
import type {
  ShellError,
  ShellRunRouteArgs,
  ShellRouteResult,
  ShellRuntime,
  ShellRuntimeConfig,
} from "./types.js";

function toShellError(error: unknown): ShellError {
  if (error instanceof RuntimeError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details,
    };
  }

  return {
    code: "SHELL_INTERNAL_ERROR",
    message: error instanceof Error ? error.message : String(error),
    status: 500,
    details: error,
  };
}

export async function runRoute(args: ShellRunRouteArgs): Promise<ShellRouteResult> {
  let value;
  try {
    value = await executeRoute(args.graph, args.request, args.adapters);
  } catch (error) {
    return {
      ok: false,
      error: toShellError(error),
    };
  }

  if (!args.transactionExecutor) {
    return {
      ok: true,
      value,
    };
  }

  try {
    const execution = await args.transactionExecutor.execute(value.transactionPlan);
    return {
      ok: true,
      value: {
        ...value,
        execution,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "TRANSACTION_EXECUTION_FAILED",
        message: `Transaction execution failed: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
        details: {
          plan: value.transactionPlan,
          cause: error,
        },
      },
    };
  }
}

export function createShellRuntime(config: ShellRuntimeConfig): ShellRuntime {
  return {
    runRoute(request) {
      return runRoute({
        graph: config.graph,
        adapters: config.adapters,
        transactionExecutor: config.transactionExecutor,
        request,
      });
    },
  };
}
