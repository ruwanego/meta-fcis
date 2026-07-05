import type {
  ExecuteRouteResult,
  Request,
  RuntimeAdapters,
  RuntimeErrorCode,
  TransactionExecutionResult,
  TransactionExecutor,
} from "@meta-fcis/core";

export interface ShellRuntimeConfig {
  graph: unknown;
  adapters: RuntimeAdapters;
  transactionExecutor?: TransactionExecutor;
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

export interface ShellRouteSuccess extends ExecuteRouteResult {
  execution?: TransactionExecutionResult;
}

export type ShellRouteResult =
  | {
      ok: true;
      value: ShellRouteSuccess;
    }
  | {
      ok: false;
      error: ShellError;
    };
