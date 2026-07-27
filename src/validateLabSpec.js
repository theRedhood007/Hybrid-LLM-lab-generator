const fs = require("fs");

function fail(message) {
  console.error(`[SPEC REJECT] ${message}`);
  process.exit(1);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isArrayOfStrings(value, min) {
  return Array.isArray(value) &&
    value.length >= min &&
    value.every((item) => isNonEmptyString(item));
}

function main() {
  const file = process.argv[2];

  if (!file) {
    console.error("Usage: node src/validateLabSpec.js <labSpec.json>");
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    fail(`Invalid JSON: ${err.message}`);
  }

  if (!isNonEmptyString(spec.title)) fail("Missing title.");
  if (!isNonEmptyString(spec.scenarioId)) fail("Missing scenarioId.");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(spec.scenarioId)) {
    fail("scenarioId must be kebab-case.");
  }

  if (spec.vulnerabilityType !== "xss") fail('vulnerabilityType must be "xss".');

  const allowedDifficulties = ["beginner", "intermediate", "advanced"];
  if (!allowedDifficulties.includes(spec.difficulty)) {
    fail("difficulty must be beginner, intermediate, or advanced.");
  }

  if (!isNonEmptyString(spec.businessContext)) fail("Missing businessContext.");
  if (!isNonEmptyString(spec.summary)) fail("Missing summary.");

  if (!isArrayOfStrings(spec.learningObjectives, 3)) {
    fail("learningObjectives must contain at least 3 strings.");
  }

  if (!isArrayOfStrings(spec.winConditions, 2)) {
    fail("winConditions must contain at least 2 strings.");
  }

  if (spec.route !== "/lab") fail('route must be "/lab".');
  if (spec.method !== "GET") fail('method must be "GET".');

  if (!Array.isArray(spec.params) || spec.params.length !== 1 || spec.params[0] !== "input") {
    fail('params must be ["input"].');
  }

  if (!Array.isArray(spec.scenarioItems) || spec.scenarioItems.length < 3) {
    fail("scenarioItems must contain at least 3 items.");
  }

  for (const [index, item] of spec.scenarioItems.entries()) {
    if (!isNonEmptyString(item.name)) fail(`scenarioItems[${index}].name missing.`);
    if (!isNonEmptyString(item.category)) fail(`scenarioItems[${index}].category missing.`);
    if (!isNonEmptyString(item.description)) fail(`scenarioItems[${index}].description missing.`);
  }

  if (!isArrayOfStrings(spec.normalInputs, 3)) {
    fail("normalInputs must contain at least 3 strings.");
  }

  if (!isArrayOfStrings(spec.xssPayloads, 3)) {
    fail("xssPayloads must contain at least 3 strings.");
  }

  const hasScriptPayload = spec.xssPayloads.some((p) => p.includes("<") && p.includes(">"));
  if (!hasScriptPayload) {
    fail("xssPayloads must include HTML/script-like payloads.");
  }

  console.log(`[SPEC PASS] ${file}`);
}

main();
