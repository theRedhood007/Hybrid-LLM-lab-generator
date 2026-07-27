const fs = require("fs");
const path = require("path");

const { buildBeginnerLab } = require("./templateLab");

const scenarios = [
  {
    scenarioId: "sports-store",
    title: "Sports Store Product Search XSS",
    theme: "Sports Store",
    description: "A sportswear store search page reflects user input unsafely."
  },
  {
    scenarioId: "government-portal",
    title: "Government Portal Search XSS",
    theme: "Government Portal",
    description: "A government portal reflects search input without escaping."
  },
  {
    scenarioId: "hospital-patient-system",
    title: "Hospital Patient Search XSS",
    theme: "Hospital Patient System",
    description: "A patient lookup page reflects user input unsafely."
  }
];

fs.mkdirSync("generated", { recursive: true });

for (const scenario of scenarios) {
  const lab = buildBeginnerLab(scenario);

  const outputPath = path.join(
    "generated",
    `${lab.labId}.json`
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(lab, null, 2)
  );

  console.log(`[OK] Generated ${lab.labId}`);
}

console.log("\n[DONE] Template batch generation completed.");
