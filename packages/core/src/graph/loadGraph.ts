import { AppGraph } from "./types.js";
import { validateGraph } from "./validateGraph.js";
import { RuntimeError } from "../errors/RuntimeError.js";
import { ENGINE_VERSION } from "../version.js";

type VersionTriple = [number, number, number];

function parseVersion(value: string): VersionTriple | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a: VersionTriple, b: VersionTriple): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  return 0;
}

function invalid(path: string, message: string, value: unknown): never {
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

function incompatible(min: string, max: string): never {
  throw new RuntimeError({
    code: "GRAPH_INCOMPATIBLE",
    message: `Graph requires engine between ${min} and ${max}, but engine version is ${ENGINE_VERSION}`,
    status: 500,
    details: {
      engineVersion: ENGINE_VERSION,
      min,
      max,
    },
  });
}

function checkEngineCompatibility(graph: AppGraph): void {
  const { min, max } = graph.engineCompatibility;
  const engine = parseVersion(ENGINE_VERSION) as VersionTriple;

  const minVersion = parseVersion(min);
  if (!minVersion) {
    invalid(
      "engineCompatibility.min",
      "engineCompatibility.min must be a version of the form X.Y.Z",
      min
    );
  }

  if (compareVersions(engine, minVersion) < 0) {
    incompatible(min, max);
  }

  const wildcard = /^(\d+)\.x$/.exec(max) ?? /^(\d+)\.(\d+)\.x$/.exec(max);
  if (wildcard) {
    if (Number(wildcard[1]) !== engine[0]) {
      incompatible(min, max);
    }
    if (wildcard[2] !== undefined && Number(wildcard[2]) !== engine[1]) {
      incompatible(min, max);
    }
    return;
  }

  const maxVersion = parseVersion(max);
  if (!maxVersion) {
    invalid(
      "engineCompatibility.max",
      "engineCompatibility.max must be a version of the form X.Y.Z or a wildcard like X.x or X.Y.x",
      max
    );
  }

  if (compareVersions(engine, maxVersion) > 0) {
    incompatible(min, max);
  }
}

export function loadGraph(input: unknown): AppGraph {
  let candidate = input;

  if (typeof input === "string") {
    try {
      candidate = JSON.parse(input);
    } catch (err) {
      throw new RuntimeError({
        code: "GRAPH_INVALID",
        message: `Graph JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
        status: 500,
        details: err,
      });
    }
  }

  const graph = validateGraph(candidate);
  checkEngineCompatibility(graph);
  return graph;
}
