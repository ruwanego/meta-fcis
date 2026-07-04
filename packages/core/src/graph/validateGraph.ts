import { AppGraph } from "./types.js";
import { RuntimeError } from "../errors/RuntimeError.js";

export function validateGraph(graph: unknown): AppGraph {
  if (!graph || typeof graph !== "object") {
    throw new RuntimeError("GRAPH_INVALID", "Graph must be a non-null object");
  }

  const candidate = graph as Record<string, unknown>;

  if (typeof candidate.version !== "string") {
    throw new RuntimeError("GRAPH_INVALID", "Graph version must be a string");
  }

  if (!candidate.routes || typeof candidate.routes !== "object") {
    throw new RuntimeError("GRAPH_INVALID", "Graph routes must be an object");
  }

  const routes = candidate.routes as Record<string, unknown>;

  for (const [key, route] of Object.entries(routes)) {
    if (!route || typeof route !== "object") {
      throw new RuntimeError("GRAPH_INVALID", `Route '${key}' must be a non-null object`);
    }

    const routeConfig = route as Record<string, unknown>;

    if (typeof routeConfig.path !== "string") {
      throw new RuntimeError("GRAPH_INVALID", `Route '${key}' must have a 'path' string`);
    }

    if (typeof routeConfig.pureFunction !== "string") {
      throw new RuntimeError("GRAPH_INVALID", `Route '${key}' must have a 'pureFunction' string`);
    }

    if (routeConfig.auth !== undefined) {
      if (!routeConfig.auth || typeof routeConfig.auth !== "object") {
        throw new RuntimeError("GRAPH_INVALID", `Route '${key}' auth must be an object`);
      }
      const auth = routeConfig.auth as Record<string, unknown>;
      if (auth.required !== undefined && typeof auth.required !== "boolean") {
        throw new RuntimeError("GRAPH_INVALID", `Route '${key}' auth.required must be a boolean`);
      }
      if (auth.roles !== undefined) {
        if (!Array.isArray(auth.roles) || auth.roles.some((r) => typeof r !== "string")) {
          throw new RuntimeError("GRAPH_INVALID", `Route '${key}' auth.roles must be a string array`);
        }
      }
    }

    if (routeConfig.dependencies !== undefined) {
      if (!routeConfig.dependencies || typeof routeConfig.dependencies !== "object") {
        throw new RuntimeError("GRAPH_INVALID", `Route '${key}' dependencies must be an object`);
      }
      const deps = routeConfig.dependencies as Record<string, unknown>;
      for (const [depKey, dep] of Object.entries(deps)) {
        if (!dep || typeof dep !== "object") {
          throw new RuntimeError(
            "GRAPH_INVALID",
            `Dependency '${depKey}' in route '${key}' must be a non-null object`
          );
        }
        const depConfig = dep as Record<string, unknown>;
        if (typeof depConfig.resource !== "string") {
          throw new RuntimeError(
            "GRAPH_INVALID",
            `Dependency '${depKey}' in route '${key}' must have a 'resource' string`
          );
        }
        if (
          depConfig.params !== undefined &&
          (typeof depConfig.params !== "object" || depConfig.params === null)
        ) {
          throw new RuntimeError(
            "GRAPH_INVALID",
            `Dependency '${depKey}' in route '${key}' params must be an object`
          );
        }
      }
    }
  }

  return graph as AppGraph;
}
