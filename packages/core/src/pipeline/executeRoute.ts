import { AppGraph } from "../graph/types.js";
import { validateGraph } from "../graph/validateGraph.js";
import { Request } from "../protocol/request.js";
import { ExecuteRouteResult } from "../protocol/response.js";
import { ContextBundle } from "../protocol/context.js";
import { RuntimeAdapters } from "../adapters/types.js";
import { RuntimeError } from "../errors/RuntimeError.js";
import { validateIntentSet } from "./validateIntentSet.js";

export async function executeRoute(
  graph: unknown,
  request: Request,
  adapters: RuntimeAdapters
): Promise<ExecuteRouteResult> {
  try {
    // 1. validate graph
    const validatedGraph = validateGraph(graph);

    // 2. find route
    const routeConfig =
      validatedGraph.routes[request.route] ||
      Object.values(validatedGraph.routes).find((r) => r.path === request.route);

    if (!routeConfig) {
      throw new RuntimeError({
        code: "ROUTE_NOT_FOUND",
        message: `Route not found for path or name: '${request.route}'`,
        status: 404,
        details: { routeKey: request.route },
      });
    }

    // 3. validate request through schema adapter
    let validatedPayload = request.payload;
    if (routeConfig.schema !== undefined) {
      try {
        validatedPayload = await adapters.schema.validate(routeConfig.schema, request.payload);
      } catch (err) {
        throw new RuntimeError({
          code: "REQUEST_VALIDATION_FAILED",
          message: `Request payload validation failed: ${err instanceof Error ? err.message : String(err)}`,
          status: 400,
          details: err,
        });
      }
    }

    // 4. authenticate through auth adapter
    let actor;
    try {
      actor = await adapters.auth.authenticate(request, routeConfig.auth);
    } catch (err) {
      throw new RuntimeError({
        code: "AUTHENTICATION_FAILED",
        message: `Authentication failed: ${err instanceof Error ? err.message : String(err)}`,
        status: 401,
        details: err,
      });
    }

    // 5. load dependencies through persistence adapter
    let loadedDependencies = {};
    if (routeConfig.dependencies) {
      try {
        loadedDependencies = await adapters.persistence.loadDependencies(
          routeConfig.dependencies
        );
      } catch (err) {
        throw new RuntimeError({
          code: "DEPENDENCY_LOAD_FAILED",
          message: `Failed to load dependencies: ${err instanceof Error ? err.message : String(err)}`,
          status: 500,
          details: err,
        });
      }
    }

    // 6. build ContextBundle
    const context: ContextBundle = {
      actor,
      data: validatedPayload,
      dependencies: loadedDependencies,
    };

    // 7. invoke pure function through pureInvoker
    let intentSet;
    try {
      intentSet = await adapters.pureInvoker.invoke(routeConfig.pureFunction, context);
    } catch (err) {
      throw new RuntimeError({
        code: "PURE_FUNCTION_FAILED",
        message: `Pure function invocation failed: ${err instanceof Error ? err.message : String(err)}`,
        status: 500,
        details: err,
      });
    }

    // 8. validate IntentSet shape
    let validatedIntentSet;
    try {
      validatedIntentSet = validateIntentSet(intentSet);
    } catch (err) {
      if (err instanceof RuntimeError) {
        throw err;
      }
      throw new RuntimeError({
        code: "CORE_OUTPUT_INVALID",
        message: `IntentSet validation failed: ${err instanceof Error ? err.message : String(err)}`,
        status: 500,
        details: err,
      });
    }

    // 9. return ExecuteRouteResult
    return {
      intentSet: validatedIntentSet,
    };
  } catch (err) {
    if (err instanceof RuntimeError) {
      throw err;
    }
    throw new RuntimeError({
      code: "INTERNAL_ERROR",
      message: `An unexpected internal error occurred: ${err instanceof Error ? err.message : String(err)}`,
      status: 500,
      details: err,
    });
  }
}
