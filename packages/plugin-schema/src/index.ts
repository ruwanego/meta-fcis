import type {
  AppGraph,
  FieldType,
  ModelDefinition,
  SchemaAdapter,
} from "@meta-fcis/core";

export interface ModelSchemaConfig {
  graph: AppGraph;
}

export interface ModelSchema {
  schema: SchemaAdapter;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const typeChecks: Record<FieldType, (value: unknown) => boolean> = {
  string: (value) => typeof value === "string",
  number: (value) => typeof value === "number",
  boolean: (value) => typeof value === "boolean",
  object: isPlainObject,
  array: Array.isArray,
  unknown: () => true,
};

function resolveModel(graph: AppGraph, schema: unknown): ModelDefinition {
  if (typeof schema === "string") {
    const model = graph.models[schema];
    if (!model) {
      throw new Error(`Schema references unknown model: '${schema}'`);
    }
    return model;
  }
  if (isPlainObject(schema) && isPlainObject(schema.fields)) {
    return schema as unknown as ModelDefinition;
  }
  throw new Error("Schema must be a model name or an inline { fields } object");
}

function checkPayload(model: ModelDefinition, payload: unknown): void {
  if (!isPlainObject(payload)) {
    throw new Error("Payload must be a plain object");
  }

  const failures: string[] = [];

  for (const [name, field] of Object.entries(model.fields)) {
    if (!(name in payload)) {
      if (field.required) {
        failures.push(`'${name}' is required`);
      }
      continue;
    }
    if (!typeChecks[field.type](payload[name])) {
      failures.push(`'${name}' must be ${field.type}`);
    }
  }

  for (const name of Object.keys(payload)) {
    if (!(name in model.fields)) {
      failures.push(`'${name}' is not declared in the model`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Payload validation failed: ${failures.join("; ")}`);
  }
}

export function createModelSchema(config: ModelSchemaConfig): ModelSchema {
  return {
    schema: {
      validate(schema, payload) {
        checkPayload(resolveModel(config.graph, schema), payload);
        return payload;
      },
    },
  };
}
