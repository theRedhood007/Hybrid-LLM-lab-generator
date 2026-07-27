const fs = require("fs");
const path = require("path");

function loadScenarioMatrix(vulnerabilityType) {
  const filePath = path.join(
    __dirname,
    `${vulnerabilityType.toLowerCase()}.json`
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Scenario matrix not found for: ${vulnerabilityType}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function getScenarios(vulnerabilityType, difficulty) {
  const matrix = loadScenarioMatrix(vulnerabilityType);

  const scenarios = matrix.difficulties[difficulty.toLowerCase()];

  if (!scenarios || scenarios.length === 0) {
    throw new Error(
      `No scenarios found for ${vulnerabilityType}/${difficulty}`
    );
  }

  return scenarios;
}

function pickScenario(vulnerabilityType, difficulty, scenarioId) {
  const scenarios = getScenarios(vulnerabilityType, difficulty);

  if (scenarioId) {
    const selected = scenarios.find((s) => s.id === scenarioId);

    if (!selected) {
      throw new Error(
        `Scenario '${scenarioId}' not found for ${vulnerabilityType}/${difficulty}`
      );
    }

    return selected;
  }

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

module.exports = {
  loadScenarioMatrix,
  getScenarios,
  pickScenario,
};
