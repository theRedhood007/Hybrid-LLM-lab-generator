const { getScenarios, pickScenario } = require("./loadScenarioMatrix");

const vulnerability = process.argv[2] || "xss";
const difficulty = process.argv[3] || "beginner";
const scenarioId = process.argv[4];

console.log("=== Available Scenarios ===");
console.log(getScenarios(vulnerability, difficulty));

console.log("\n=== Selected Scenario ===");
console.log(pickScenario(vulnerability, difficulty, scenarioId));
