import type { Actor, AuthAdapter, Request } from "@meta-fcis/core";

export interface TokenAuthConfig {
  // ponytail: plain-config token registry; a signed-token plugin when tokens cross trust boundaries
  tokens: Record<string, Actor>;
}

export interface TokenAuth {
  auth: AuthAdapter;
}

const ANONYMOUS: Actor = { id: "anonymous", roles: [] };

function bearerToken(request: Request): string | undefined {
  const header = request.headers?.authorization;
  if (typeof header !== "string") {
    return undefined;
  }
  const [scheme, token, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    // Malformed header counts as no credentials; required routes fail on absence.
    return undefined;
  }
  return token;
}

export function createTokenAuth(config: TokenAuthConfig): TokenAuth {
  return {
    auth: {
      authenticate(request, authConfig) {
        const token = bearerToken(request);

        if (token === undefined) {
          if (authConfig?.required) {
            throw new Error("Missing bearer credentials");
          }
          return ANONYMOUS;
        }

        const actor = config.tokens[token];
        if (!actor) {
          // Presented credentials are always verified, even on optional routes.
          throw new Error("Unknown bearer token");
        }

        const roles = authConfig?.roles;
        if (roles && roles.length > 0 && !roles.some((role) => actor.roles.includes(role))) {
          throw new Error(`Actor lacks required role(s): ${roles.join(", ")}`);
        }

        return actor;
      },
    },
  };
}
