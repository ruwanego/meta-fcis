import { AppGraph } from "./types.js";
import { RuntimeError } from "../errors/RuntimeError.js";

const fieldTypes = new Set(["string", "number", "boolean", "object", "array", "unknown"]);
const deletePolicies = new Set(["hard", "soft", "forbidden"]);
const cardinalities = new Set(["one", "many"]);
const onMissingBehaviors = new Set(["null", "empty", "error"]);
const sortDirections = new Set(["asc", "desc"]);
const intentOperations = new Set(["CREATE", "UPDATE", "DELETE"]);
const policyEffects = new Set(["allow", "deny"]);

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(path: string, message: string, value?: unknown): never {
  throw new RuntimeError({
    code: "GRAPH_INVALID",
    message,
    status: 500,
    details: {
      path,
      value,
    },
  });
}

function requirePlainObject(value: unknown, path: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    invalid(path, `${path} must be a plain object`, value);
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    invalid(path, `${path} must be a non-empty string`, value);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    invalid(path, `${path} must be a boolean`, value);
  }
  return value;
}

function requireStringOrNullIfPresent(value: unknown, path: string): string | null | undefined {
  if (value !== undefined && value !== null && typeof value !== "string") {
    invalid(path, `${path} must be a string or null when present`, value);
  }
  return value as string | null | undefined;
}

function requireKnownValue(value: unknown, allowed: Set<string>, path: string): string {
  const stringValue = requireNonEmptyString(value, path);
  if (!allowed.has(stringValue)) {
    invalid(path, `${path} must be one of: ${Array.from(allowed).join(", ")}`, value);
  }
  return stringValue;
}

function validateTopLevel(graph: Record<string, unknown>): void {
  requireNonEmptyString(graph.irVersion, "irVersion");

  const application = requirePlainObject(graph.application, "application");
  requireNonEmptyString(application.name, "application.name");
  if (hasOwn(application, "title") && typeof application.title !== "string") {
    invalid("application.title", "application.title must be a string when present", application.title);
  }

  const compatibility = requirePlainObject(graph.engineCompatibility, "engineCompatibility");
  requireNonEmptyString(compatibility.min, "engineCompatibility.min");
  requireNonEmptyString(compatibility.max, "engineCompatibility.max");

  requirePlainObject(graph.entities, "entities");
  requirePlainObject(graph.models, "models");
  requirePlainObject(graph.routes, "routes");

  if (hasOwn(graph, "plugins")) {
    requirePlainObject(graph.plugins, "plugins");
  }
}

function validateFieldDefinition(field: unknown, path: string): void {
  const definition = requirePlainObject(field, path);
  requireKnownValue(definition.type, fieldTypes, `${path}.type`);
  requireBoolean(definition.required, `${path}.required`);
  requireBoolean(definition.mutable, `${path}.mutable`);
  requireBoolean(definition.creatable, `${path}.creatable`);
  requireBoolean(definition.serverOwned, `${path}.serverOwned`);
  if (hasOwn(definition, "isId") && typeof definition.isId !== "boolean") {
    invalid(`${path}.isId`, `${path}.isId must be a boolean when present`, definition.isId);
  }
}

function validateEntities(entities: Record<string, unknown>): void {
  for (const [entityName, entityValue] of Object.entries(entities)) {
    const entityPath = `entities.${entityName}`;
    requireNonEmptyString(entityName, "entities key");
    const entity = requirePlainObject(entityValue, entityPath);

    requireNonEmptyString(entity.table, `${entityPath}.table`);
    const idField = requireNonEmptyString(entity.idField, `${entityPath}.idField`);
    requireKnownValue(entity.deletePolicy, deletePolicies, `${entityPath}.deletePolicy`);

    const fields = requirePlainObject(entity.fields, `${entityPath}.fields`);
    const fieldEntries = Object.entries(fields);
    if (fieldEntries.length === 0) {
      invalid(`${entityPath}.fields`, `${entityPath}.fields must contain at least one field`, fields);
    }
    if (!hasOwn(fields, idField)) {
      invalid(`${entityPath}.fields.${idField}`, `${entityPath}.fields must contain idField`, fields);
    }

    for (const [fieldName, fieldValue] of fieldEntries) {
      requireNonEmptyString(fieldName, `${entityPath}.fields key`);
      validateFieldDefinition(fieldValue, `${entityPath}.fields.${fieldName}`);
    }

    const idFieldDefinition = requirePlainObject(fields[idField], `${entityPath}.fields.${idField}`);
    if (idFieldDefinition.isId !== true) {
      invalid(
        `${entityPath}.fields.${idField}.isId`,
        `${entityPath}.fields.${idField}.isId must be true`,
        idFieldDefinition.isId
      );
    }
  }
}

function validateModels(models: Record<string, unknown>): void {
  for (const [modelName, modelValue] of Object.entries(models)) {
    const modelPath = `models.${modelName}`;
    requireNonEmptyString(modelName, "models key");
    const model = requirePlainObject(modelValue, modelPath);
    const fields = requirePlainObject(model.fields, `${modelPath}.fields`);

    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      const fieldPath = `${modelPath}.fields.${fieldName}`;
      requireNonEmptyString(fieldName, `${modelPath}.fields key`);
      const field = requirePlainObject(fieldValue, fieldPath);
      requireKnownValue(field.type, fieldTypes, `${fieldPath}.type`);
      requireBoolean(field.required, `${fieldPath}.required`);
    }
  }
}

function validateModelReference(
  value: unknown,
  path: string,
  models: Record<string, unknown>
): void {
  const reference = requireStringOrNullIfPresent(value, path);
  if (typeof reference === "string" && !hasOwn(models, reference)) {
    invalid(path, `${path} must reference an existing model`, value);
  }
}

function validateTransport(route: Record<string, unknown>, routePath: string): void {
  if (!hasOwn(route, "transport")) {
    return;
  }

  const transport = requirePlainObject(route.transport, `${routePath}.transport`);
  if (transport.kind !== "http") {
    invalid(`${routePath}.transport.kind`, `${routePath}.transport.kind must be http`, transport.kind);
  }
  const method = requireNonEmptyString(transport.method, `${routePath}.transport.method`);
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    invalid(
      `${routePath}.transport.method`,
      `${routePath}.transport.method must be one of GET, POST, PUT, PATCH, DELETE`,
      method
    );
  }
  requireNonEmptyString(transport.path, `${routePath}.transport.path`);
}

function validateDependencySelector(
  selectorValue: unknown,
  path: string,
  entities: Record<string, unknown>
): void {
  const selector = requirePlainObject(selectorValue, path);
  const entityName = requireNonEmptyString(selector.entity, `${path}.entity`);
  if (!hasOwn(entities, entityName)) {
    invalid(`${path}.entity`, `${path}.entity must reference an existing entity`, selector.entity);
  }

  const entity = requirePlainObject(entities[entityName], `entities.${entityName}`);
  const fields = requirePlainObject(entity.fields, `entities.${entityName}.fields`);
  const cardinality = requireKnownValue(selector.cardinality, cardinalities, `${path}.cardinality`);

  const where = requirePlainObject(selector.where, `${path}.where`);
  for (const key of Object.keys(where)) {
    requireNonEmptyString(key, `${path}.where key`);
  }

  if (!Array.isArray(selector.project)) {
    invalid(`${path}.project`, `${path}.project must be an array`, selector.project);
  }
  if (selector.project.length === 0) {
    invalid(`${path}.project`, `${path}.project must contain at least one field`, selector.project);
  }
  selector.project.forEach((field, index) => {
    const fieldPath = `${path}.project[${index}]`;
    const fieldName = requireNonEmptyString(field, fieldPath);
    if (!hasOwn(fields, fieldName)) {
      invalid(fieldPath, `${fieldPath} must reference an entity field`, field);
    }
  });

  if (hasOwn(selector, "limit")) {
    if (
      typeof selector.limit !== "number" ||
      !Number.isInteger(selector.limit) ||
      selector.limit <= 0
    ) {
      invalid(`${path}.limit`, `${path}.limit must be an integer greater than 0`, selector.limit);
    }
  }

  if (hasOwn(selector, "orderBy")) {
    if (!Array.isArray(selector.orderBy)) {
      invalid(`${path}.orderBy`, `${path}.orderBy must be an array`, selector.orderBy);
    }
    selector.orderBy.forEach((item, index) => {
      const orderPath = `${path}.orderBy[${index}]`;
      const order = requirePlainObject(item, orderPath);
      const fieldName = requireNonEmptyString(order.field, `${orderPath}.field`);
      if (!hasOwn(fields, fieldName)) {
        invalid(`${orderPath}.field`, `${orderPath}.field must reference an entity field`, order.field);
      }
      requireKnownValue(order.direction, sortDirections, `${orderPath}.direction`);
    });
  }

  const onMissing = requireKnownValue(selector.onMissing, onMissingBehaviors, `${path}.onMissing`);
  if (onMissing === "null" && cardinality !== "one") {
    invalid(`${path}.onMissing`, `${path}.onMissing null is valid only with cardinality one`, onMissing);
  }
  if (onMissing === "empty" && cardinality !== "many") {
    invalid(`${path}.onMissing`, `${path}.onMissing empty is valid only with cardinality many`, onMissing);
  }
}

function validatePolicy(policyValue: unknown, path: string): void {
  const policy = requirePlainObject(policyValue, path);
  requireKnownValue(policy.effect, policyEffects, `${path}.effect`);
  if (!hasOwn(policy, "when")) {
    invalid(`${path}.when`, `${path}.when is required`, policy);
  }
}

function validateAllowedIntent(
  intentValue: unknown,
  path: string,
  entities: Record<string, unknown>
): void {
  const intent = requirePlainObject(intentValue, path);
  if (intent.type !== "MUTATE_ENTITY") {
    invalid(`${path}.type`, `${path}.type must be MUTATE_ENTITY`, intent.type);
  }

  const entityName = requireNonEmptyString(intent.entity, `${path}.entity`);
  if (!hasOwn(entities, entityName)) {
    invalid(`${path}.entity`, `${path}.entity must reference an existing entity`, intent.entity);
  }

  const entity = requirePlainObject(entities[entityName], `entities.${entityName}`);
  const fields = requirePlainObject(entity.fields, `entities.${entityName}.fields`);
  const operation = requireKnownValue(intent.operation, intentOperations, `${path}.operation`);

  if (!Array.isArray(intent.fields)) {
    invalid(`${path}.fields`, `${path}.fields must be an array`, intent.fields);
  }
  if ((operation === "CREATE" || operation === "UPDATE") && intent.fields.length === 0) {
    invalid(`${path}.fields`, `${path}.fields must contain at least one field`, intent.fields);
  }
  if (operation === "DELETE" && intent.fields.length !== 0) {
    invalid(`${path}.fields`, `${path}.fields must be empty for DELETE`, intent.fields);
  }

  intent.fields.forEach((field, index) => {
    const fieldPath = `${path}.fields[${index}]`;
    const fieldName = requireNonEmptyString(field, fieldPath);
    if (!hasOwn(fields, fieldName)) {
      invalid(fieldPath, `${fieldPath} must reference an entity field`, field);
    }
    const fieldDefinition = requirePlainObject(fields[fieldName], `entities.${entityName}.fields.${fieldName}`);
    if (operation === "CREATE") {
      if (fieldDefinition.creatable !== true) {
        invalid(fieldPath, `${fieldPath} must reference a creatable field`, field);
      }
      if (fieldDefinition.serverOwned === true) {
        invalid(fieldPath, `${fieldPath} must not reference a server-owned field`, field);
      }
    }
    if (operation === "UPDATE" && fieldDefinition.mutable !== true) {
      invalid(fieldPath, `${fieldPath} must reference a mutable field`, field);
    }
  });

  if (hasOwn(intent, "targetId") && typeof intent.targetId !== "string") {
    invalid(`${path}.targetId`, `${path}.targetId must be a string when present`, intent.targetId);
  }
  if (operation === "CREATE" && hasOwn(intent, "targetId")) {
    invalid(`${path}.targetId`, `${path}.targetId must be absent for CREATE`, intent.targetId);
  }
  if ((operation === "UPDATE" || operation === "DELETE") && typeof intent.targetId !== "string") {
    invalid(`${path}.targetId`, `${path}.targetId is required for ${operation}`, intent.targetId);
  }
  if ((operation === "UPDATE" || operation === "DELETE") && intent.targetId === "") {
    invalid(`${path}.targetId`, `${path}.targetId must be non-empty`, intent.targetId);
  }
  if (operation === "DELETE" && entity.deletePolicy === "forbidden") {
    invalid(`${path}.operation`, `${path}.operation DELETE is forbidden by entity deletePolicy`, intent.operation);
  }
}

function validateRoutes(
  routes: Record<string, unknown>,
  models: Record<string, unknown>,
  entities: Record<string, unknown>
): void {
  for (const [routeName, routeValue] of Object.entries(routes)) {
    const routePath = `routes.${routeName}`;
    requireNonEmptyString(routeName, "routes key");
    const route = requirePlainObject(routeValue, routePath);

    validateTransport(route, routePath);

    const auth = requirePlainObject(route.auth, `${routePath}.auth`);
    requireBoolean(auth.required, `${routePath}.auth.required`);
    if (hasOwn(auth, "strategy") && typeof auth.strategy !== "string") {
      invalid(`${routePath}.auth.strategy`, `${routePath}.auth.strategy must be a string when present`, auth.strategy);
    }

    const input = requirePlainObject(route.input, `${routePath}.input`);
    validateModelReference(input.bodyModel, `${routePath}.input.bodyModel`, models);
    validateModelReference(input.paramsModel, `${routePath}.input.paramsModel`, models);
    validateModelReference(input.queryModel, `${routePath}.input.queryModel`, models);

    const output = requirePlainObject(route.output, `${routePath}.output`);
    validateModelReference(output.successModel, `${routePath}.output.successModel`, models);
    validateModelReference(output.errorModel, `${routePath}.output.errorModel`, models);

    const handler = requirePlainObject(route.handler, `${routePath}.handler`);
    if (handler.kind !== "pure-function") {
      invalid(`${routePath}.handler.kind`, `${routePath}.handler.kind must be pure-function`, handler.kind);
    }
    requireNonEmptyString(handler.file, `${routePath}.handler.file`);
    requireNonEmptyString(handler.function, `${routePath}.handler.function`);

    const dependencies = requirePlainObject(route.dependencies, `${routePath}.dependencies`);
    for (const [alias, selector] of Object.entries(dependencies)) {
      requireNonEmptyString(alias, `${routePath}.dependencies key`);
      validateDependencySelector(selector, `${routePath}.dependencies.${alias}`, entities);
    }

    if (hasOwn(route, "policy")) {
      validatePolicy(route.policy, `${routePath}.policy`);
    }

    if (!Array.isArray(route.allowedIntents)) {
      invalid(`${routePath}.allowedIntents`, `${routePath}.allowedIntents must be an array`, route.allowedIntents);
    }
    route.allowedIntents.forEach((intent, index) => {
      validateAllowedIntent(intent, `${routePath}.allowedIntents[${index}]`, entities);
    });
  }
}

export function validateGraph(graph: unknown): AppGraph {
  const candidate = requirePlainObject(graph, "graph");
  validateTopLevel(candidate);

  const entities = requirePlainObject(candidate.entities, "entities");
  validateEntities(entities);

  const models = requirePlainObject(candidate.models, "models");
  validateModels(models);

  const routes = requirePlainObject(candidate.routes, "routes");
  validateRoutes(routes, models, entities);

  return graph as AppGraph;
}
