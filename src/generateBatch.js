import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const attacks = ["xss"];

const frameworks = [
  {
    language: "JavaScript",
    framework: "Node.js Express"
  }
];

const difficulties = ["Beginner", "Intermediate", "Advanced"];

const scenarios = [
  "Sports Store",
  "Government Portal",
  "Hospital Patient System"
];

for (const attack of attacks) {
  for (const stack of frameworks) {
    for (const difficulty of difficulties) {
      for (const scenario of scenarios) {
        console.log("\n==============================");
        console.log(`[GENERATING] ${attack} | ${stack.framework} | ${difficulty} | ${scenario}`);
        console.log("==============================\n");

        const command = `node src/generateWithRetry.js "${attack}" "${stack.language}" "${stack.framework}" "${difficulty}" "${scenario}"`;

        try {
          execSync(command, { stdio: "inherit" });
        } catch (err) {
          console.error(`[FAILED] ${attack} ${difficulty} ${scenario}`);
        }
      }
    }
  }
}

console.log("\n[DONE] Batch generation finished.");
