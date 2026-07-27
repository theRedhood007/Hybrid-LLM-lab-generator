const fs = require("fs");
const path = require("path");

const difficulties = require("./profiles/difficulties");
const scenarios = require("./profiles/scenarios");

const [, , vulnerabilityType, difficultyKey, scenarioKey] = process.argv;

if (!vulnerabilityType || !difficultyKey || !scenarioKey) {
  console.error("Usage: node createSpec.js <vulnerabilityType> <difficulty> <scenario>");
  console.error("Example: node createSpec.js xss beginner sports_store");
  process.exit(1);
}

const difficulty = difficulties[difficultyKey];
const scenario = scenarios[scenarioKey];

if (!difficulty) {
  console.error(`Unknown difficulty: ${difficultyKey}`);
  console.error(`Available: ${Object.keys(difficulties).join(", ")}`);
  process.exit(1);
}

if (!scenario) {
  console.error(`Unknown scenario: ${scenarioKey}`);
  console.error(`Available: ${Object.keys(scenarios).join(", ")}`);
  process.exit(1);
}

const routes = scenario.routes[difficultyKey];

if (!routes) {
  console.error(`Scenario ${scenarioKey} has no routes for ${difficultyKey}`);
  process.exit(1);
}

const slug = `${vulnerabilityType}-${difficulty.pattern}-${scenarioKey}-${difficultyKey}`;

const spec = {
  schema_version: "hybrid-lab-v1",
  slug,
  title: `${difficultyKey.toUpperCase()} ${vulnerabilityType.toUpperCase()} Lab - ${scenario.name}`,
  difficulty: difficultyKey,
  vulnerability_type: `${vulnerabilityType}-${difficulty.pattern}`,

  description: {
    overview: `This lab demonstrates ${difficulty.pattern} ${vulnerabilityType.toUpperCase()} in a ${scenario.name}.`,
    learning_objectives: difficulty.learningObjectives,
    student_task: "Find the unsafe handling of user-controlled input and patch it securely.",
    expected_fix: "Apply safe output encoding before rendering user-controlled input."
  },

  scenario: {
    sector: scenario.sector,
    name: scenario.name,
    story: `A ${scenario.name} allows users to submit or view user-controlled content.`,
    attacker_goal: `Exploit ${difficulty.pattern} ${vulnerabilityType.toUpperCase()} through unsafe user input handling.`,
    real_world_impact: "Account compromise, phishing, session exposure, admin compromise, or malicious redirection."
  },

  runtime: {
    language: "javascript",
    framework: "node-express",
    port_env: "PORT",
    start_command: "npm start",
    health_endpoint: "/health"
  },

  vulnerability: {
    pattern: difficulty.pattern,
    complexity: difficulty.complexity,
    payload: difficulty.defaultPayload,
    vulnerable_behavior: "User-controlled input reaches an HTML/DOM sink without proper escaping.",
    secure_behavior: "User-controlled input is safely encoded before reaching the sink."
  },

  required_routes: routes,

  required_files: [
    "package.json",
    "app.js",
    "Dockerfile",
    "tests/functional/test_functionality.py",
    "tests/security/test_security.py"
  ],

  docker: {
    base_image: "node:20-alpine",
    readonly_rootfs_compatible: true,
    non_root_user: true
  }
};

fs.mkdirSync("phase1-specs", { recursive: true });

const outputPath = path.join("phase1-specs", `${slug}.json`);
fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

console.log(`[PASS] Spec generated: ${outputPath}`);
console.log(`Slug: ${slug}`);
console.log(`Type: ${spec.vulnerability_type}`);
console.log(`Difficulty: ${difficultyKey}`);
console.log(`Scenario: ${scenario.name}`);
