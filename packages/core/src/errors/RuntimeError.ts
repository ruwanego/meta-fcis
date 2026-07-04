export type RuntimeErrorCode =
  | "GRAPH_INVALID"
  | "ROUTE_NOT_FOUND"
  | "REQUEST_VALIDATION_FAILED"
  | "AUTHENTICATION_FAILED"
  | "DEPENDENCY_LOAD_FAILED"
  | "PURE_FUNCTION_FAILED"
  | "CORE_OUTPUT_INVALID"
  | "INTERNAL_ERROR";

export class RuntimeError extends Error {
  public readonly code: RuntimeErrorCode;
  public readonly details?: unknown;

  constructor(code: RuntimeErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "RuntimeError";
    Object.setPrototypeOf(this, RuntimeError.prototype);
  }
}
