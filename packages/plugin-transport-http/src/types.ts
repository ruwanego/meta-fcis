import type { AppGraph, Request } from "@meta-fcis/core";

// Structurally compatible with the shell's ShellRouteResult; declared here so
// the plugin never imports @meta-fcis/shell (no plugins -> shell edge).
export type HttpRouteResult =
  | { ok: true; value: unknown }
  | {
      ok: false;
      error: { code: string; message: string; status: number; details?: unknown };
    };

export interface HttpTransportConfig {
  graph: AppGraph;
  runRoute(request: Request): Promise<HttpRouteResult> | HttpRouteResult;
}

export interface HttpTransport {
  /** Binds the server; resolves with the bound port (ephemeral when omitted or 0). */
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
}
