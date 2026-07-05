import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadGraph, ENGINE_VERSION, RuntimeError } from "../dist/index.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

function expectError(fn, code, message) {
  try {
    fn();
  } catch (err) {
    assert(err instanceof RuntimeError, `${message}: should throw RuntimeError`);
    assert(err.code === code, `${message}: expected ${code}, got ${err.code}`);
    return err;
  }
  console.error(`Assertion failed: ${message}: expected throw`);
  process.exit(1);
}

function makeGraph(compatibility) {
  return {
    irVersion: "meta-fcis.graph.v1",
    application: { name: "LoadSmoke" },
    engineCompatibility: compatibility,
    entities: {},
    models: {},
    routes: {}
  };
}

console.log("Running graph load smoke test...");

// ENGINE_VERSION matches package.json
const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")
);
assert(
  ENGINE_VERSION === packageJson.version,
  `ENGINE_VERSION (${ENGINE_VERSION}) must match package.json version (${packageJson.version})`
);

// Object input, compatible range
const compatible = makeGraph({ min: "0.1.0", max: "0.x" });
assert(loadGraph(compatible) === compatible, "compatible graph object should load");

// JSON string input
const fromString = loadGraph(JSON.stringify(compatible));
assert(fromString.application.name === "LoadSmoke", "JSON string graph should load");

// Plain max version accepted
assert(
  loadGraph(makeGraph({ min: "0.0.1", max: "0.1.0" })).irVersion === "meta-fcis.graph.v1",
  "plain max version equal to engine should load"
);

// Malformed JSON
expectError(() => loadGraph("{not json"), "GRAPH_INVALID", "malformed JSON");

// Structural failure delegated to validateGraph
expectError(() => loadGraph({}), "GRAPH_INVALID", "structural failure");

// Engine below min
expectError(
  () => loadGraph(makeGraph({ min: "9.0.0", max: "9.x" })),
  "GRAPH_INCOMPATIBLE",
  "engine below min"
);

// Wildcard max line mismatch
const aboveMax = expectError(
  () => loadGraph(makeGraph({ min: "0.1.0", max: "1.x" })),
  "GRAPH_INCOMPATIBLE",
  "wildcard max line mismatch"
);
assert(aboveMax.details.engineVersion === ENGINE_VERSION, "details should carry engineVersion");
assert(aboveMax.details.min === "0.1.0" && aboveMax.details.max === "1.x", "details should carry min and max");

// Engine above plain max
expectError(
  () => loadGraph(makeGraph({ min: "0.0.1", max: "0.0.2" })),
  "GRAPH_INCOMPATIBLE",
  "engine above plain max"
);

// Malformed min
const badMin = expectError(
  () => loadGraph(makeGraph({ min: "banana", max: "0.x" })),
  "GRAPH_INVALID",
  "malformed min"
);
assert(badMin.details.path === "engineCompatibility.min", "malformed min should name the path");

// Malformed max
expectError(
  () => loadGraph(makeGraph({ min: "0.1.0", max: "latest" })),
  "GRAPH_INVALID",
  "malformed max"
);

console.log("Graph load smoke verification passed.");
