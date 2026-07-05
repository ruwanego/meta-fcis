import type {
  ExecuteRouteResult,
  Request,
  RuntimeAdapters,
  RuntimeErrorCode,
} from "@meta-fcis/core";

export interface ShellRuntimeConfig {
  graph: unknown;
  adapters: RuntimeAdapters;
}

export interface ShellRuntime {
  runRoute(request: Request): Promise<ShellRouteResult>;
}

export interface ShellRunRouteArgs extends ShellRuntimeConfig {
  request: Request;
}

export type ShellErrorCode = RuntimeErrorCode | "SHELL_INTERNAL_ERROR";

export interface ShellError {
  code: ShellErrorCode;
  message: string;
  status: number;
  details?: unknown;
}

export type ShellRouteResult =
  | {
      ok: true;
      value: ExecuteRouteResult;
    }
  | {
      ok: false;
      error: ShellError;
    };
