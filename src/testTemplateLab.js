const fs = require("fs");
const path = require("path");
const { buildBeginnerLab } = require("./templateLab");

const lab = buildBeginnerLab({
  scenarioId: "sports-store",
  title: "Sports Store Product Search XSS",
  theme: "Sports Store",
  description: "A sportswear store search page reflects user input unsafely.",
  route: "/lab",
  param: "input"
});

const outputPath = path.join("generated", `${lab.labId}.json`);
fs.mkdirSync("generated", { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(lab, null, 2));

console.log(`[OK] Template lab written to ${outputPath}`);
