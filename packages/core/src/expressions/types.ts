export type ExpressionScopeName =
  | "request"
  | "actor"
  | "dependencies";

export interface ExpressionScope {
  request: {
    payload: unknown;
    params: Record<string, unknown>;
    query: Record<string, unknown>;
  };
  actor: Record<string, unknown> | null;
  dependencies: Record<string, unknown>;
}

export type ExpressionResolution =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      reason:
        | "EXPRESSION_NOT_STRING"
        | "EXPRESSION_NOT_PATH"
        | "UNKNOWN_SCOPE"
        | "NULL_SCOPE"
        | "PATH_NOT_FOUND"
        | "PATH_NOT_TRAVERSABLE";
      path?: string;
      segment?: string;
    };
