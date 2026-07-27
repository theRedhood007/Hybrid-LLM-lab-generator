const fs = require("fs");

const file = process.argv[2];

if (!file) {
  console.error("Usage: node validateSpec.js <spec-file>");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`Spec not found: ${file}`);
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(file, "utf8"));

function requireField(name, value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    throw new Error(`Missing required field: ${name}`);
  }
}

try {
  requireField("schema_version", spec.schema_version);

  requireField("slug", spec.slug);
  requireField("title", spec.title);

  requireField("difficulty", spec.difficulty);
  requireField("vulnerability_type", spec.vulnerability_type);

  requireField("description", spec.description);
  requireField("description.overview", spec.description.overview);
  requireField(
    "description.learning_objectives",
    spec.description.learning_objectives
  );

  requireField("scenario", spec.scenario);
  requireField("scenario.name", spec.scenario.name);
  requireField("scenario.sector", spec.scenario.sector);

  requireField("runtime", spec.runtime);
  requireField("runtime.language", spec.runtime.language);
  requireField("runtime.framework", spec.runtime.framework);
  requireField("runtime.health_endpoint", spec.runtime.health_endpoint);

  requireField("vulnerability", spec.vulnerability);
  requireField("vulnerability.pattern", spec.vulnerability.pattern);

  requireField("required_routes", spec.required_routes);
  requireField("required_files", spec.required_files);

  if (!spec.required_routes.includes("GET /health")) {
    throw new Error("Health endpoint route missing");
  }

  if (!spec.required_files.includes("app.js")) {
    throw new Error("app.js missing");
  }

  if (!spec.required_files.includes("package.json")) {
    throw new Error("package.json missing");
  }

  console.log("[PASS] Spec validation successful");
  console.log(`Slug: ${spec.slug}`);
  console.log(`Difficulty: ${spec.difficulty}`);
  console.log(`Type: ${spec.vulnerability_type}`);
}
catch (err) {
  console.error("[FAIL]");
  console.error(err.message);
  process.exit(1);
}
