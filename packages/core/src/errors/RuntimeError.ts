export type RuntimeErrorCode =
  | "GRAPH_INVALID"
  | "ROUTE_NOT_FOUND"
  | "REQUEST_VALIDATION_FAILED"
  | "AUTHENTICATION_FAILED"
  | "AUTHORIZATION_FAILED"
  | "DEPENDENCY_SELECTION_FAILED"
  | "DEPENDENCY_LOAD_FAILED"
  | "POLICY_EVALUATION_FAILED"
  | "PURE_FUNCTION_FAILED"
  | "TRANSACTION_PLANNING_FAILED"
  | "CORE_OUTPUT_INVALID"
  | "INTERNAL_ERROR";

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly status!: number;
  readonly details?: unknown;

  constructor(args: {
    code: RuntimeErrorCode;
    message: string;
    status?: number;
    details?: unknown;
  }) {
    super(args.message);

    this.name = "RuntimeError";
    this.code = args.code;
    Object.defineProperty(this, "status", {
      value: args.status ?? 500,
      enumerable: true,
      configurable: true,
    });

    if ("details" in args) {
      this.details = args.details;
    }
  }
}
