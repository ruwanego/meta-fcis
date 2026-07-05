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
  try {
    const value = await executeRoute(args.graph, args.request, args.adapters);
    return {
      ok: true,
      value,
    };
  } catch (error) {
    return {
      ok: false,
      error: toShellError(error),
    };
  }
}

export function createShellRuntime(config: ShellRuntimeConfig): ShellRuntime {
  return {
    runRoute(request) {
      return runRoute({
        graph: config.graph,
        adapters: config.adapters,
        request,
      });
    },
  };
}
