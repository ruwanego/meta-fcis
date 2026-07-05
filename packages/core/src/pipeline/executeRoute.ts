import { AppGraph } from "../graph/types.js";
import { validateGraph } from "../graph/validateGraph.js";
import { Request } from "../protocol/request.js";
import { ExecuteRouteResult } from "../protocol/response.js";
import { ContextBundle } from "../protocol/context.js";
import { RuntimeAdapters } from "../adapters/types.js";
import { RuntimeError } from "../errors/RuntimeError.js";
import { ExpressionScope } from "../expressions/types.js";
import { evaluatePolicy } from "../policies/evaluatePolicy.js";
import { authorizeIntentSet } from "../intents/authorizeIntentSet.js";
import { buildTransactionPlan } from "../transactions/buildTransactionPlan.js";
import { validateIntentSet } from "./validateIntentSet.js";

function buildExpressionScope(args: {
  actor: unknown;
  payload: unknown;
  dependencies: Record<string, unknown>;
}): ExpressionScope {
  return {
    request: {
      payload: args.payload,
      params: {},
      query: {},
    },
    actor: args.actor as Record<string, unknown>,
    dependencies: args.dependencies,
  };
}

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

    const scope = buildExpressionScope({
      actor,
      payload: validatedPayload,
      dependencies: loadedDependencies,
    });

    // 7. evaluate route policy
    const policyResult = evaluatePolicy({
      policy: routeConfig.policy,
      scope,
    });

    if (!policyResult.ok) {
      throw new RuntimeError({
        code: "POLICY_EVALUATION_FAILED",
        message: "Route policy evaluation failed",
        status: 500,
        details: policyResult.error,
      });
    }

    if (!policyResult.value) {
      throw new RuntimeError({
        code: "AUTHORIZATION_FAILED",
        message: "Route policy denied the request",
        status: 403,
        details: {
          reason: "ROUTE_POLICY_DENIED",
          route: request.route,
        },
      });
    }

    // 8. invoke pure function through pureInvoker
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

    // 9. validate IntentSet shape
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

    // 10. authorize intents against graph and route semantics
    const authorizationResult = authorizeIntentSet({
      graph: validatedGraph,
      route: routeConfig,
      intentSet: validatedIntentSet,
      scope,
    });

    if (!authorizationResult.ok) {
      throw new RuntimeError({
        code: "AUTHORIZATION_FAILED",
        message: "Intent authorization failed",
        status: 403,
        details: authorizationResult.error,
      });
    }

    // 11. build transaction plan without executing it
    const transactionPlanResult = buildTransactionPlan({
      intents: validatedIntentSet.intents,
    });

    if (!transactionPlanResult.ok) {
      throw new RuntimeError({
        code: "TRANSACTION_PLANNING_FAILED",
        message: "Transaction planning failed",
        status: 500,
        details: transactionPlanResult.error,
      });
    }

    // 12. return ExecuteRouteResult
    return {
      intentSet: validatedIntentSet,
      transactionPlan: transactionPlanResult.plan,
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
