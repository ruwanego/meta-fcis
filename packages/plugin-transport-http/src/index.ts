import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AppGraph, Request, RouteConfig } from "@meta-fcis/core";
import type { HttpRouteResult, HttpTransport, HttpTransportConfig } from "./types.js";

export type { HttpRouteResult, HttpTransport, HttpTransportConfig } from "./types.js";

// Mirrors core's route matching (name or path), plus transport.path.
function matchRoute(graph: AppGraph, pathname: string): RouteConfig | undefined {
  return (
    graph.routes[pathname] ??
    Object.values(graph.routes).find(
      (route) => route.path === pathname || route.transport?.path === pathname
    )
  );
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    // ponytail: no body size cap; add a byte limit before exposing beyond localhost
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function respond(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function respondError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string
): void {
  respond(res, status, { code, message, status });
}

async function handle(
  config: HttpTransportConfig,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");

  const route = matchRoute(config.graph, url.pathname);
  const method = route?.transport?.method;
  if (method !== undefined && method !== req.method) {
    res.setHeader("allow", method);
    respondError(res, 405, "METHOD_NOT_ALLOWED", `Method ${req.method} not allowed; route declares ${method}`);
    return;
  }

  const body = await readBody(req);
  let payload: unknown;
  if (body.length > 0) {
    try {
      payload = JSON.parse(body);
    } catch {
      respondError(res, 400, "REQUEST_MALFORMED", "Request body is not valid JSON");
      return;
    }
  }

  const request: Request = {
    route: url.pathname,
    payload,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(
      Object.entries(req.headers).flatMap(([name, value]) =>
        typeof value === "string" ? [[name, value]] : []
      )
    ),
  };

  const result: HttpRouteResult = await config.runRoute(request);
  if (result.ok) {
    respond(res, 200, result.value);
  } else {
    respond(res, result.error.status, result.error);
  }
}

export function createHttpTransport(config: HttpTransportConfig): HttpTransport {
  const server = createServer((req, res) => {
    handle(config, req, res).catch((cause) => {
      respondError(
        res,
        500,
        "TRANSPORT_INTERNAL_ERROR",
        cause instanceof Error ? cause.message : "Route handler failed"
      );
    });
  });

  return {
    listen(port = 0) {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
          const address = server.address();
          if (address === null || typeof address === "string") {
            reject(new Error("Server did not bind a TCP port"));
            return;
          }
          resolve(address.port);
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
