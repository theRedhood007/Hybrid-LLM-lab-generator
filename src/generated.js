const fs = require("fs");
const path = require("path");
const { callOllama } = require("./ollamaClient");
const { buildLabPrompt } = require("../prompts/buildPrompt");

const labSchema = {
  type: "object",
  required: [
    "labId",
    "title",
    "attackType",
    "language",
    "framework",
    "difficulty",
    "theme",
    "description",
    "vulnerableFiles",
    "solutionFiles",
    "functionalTests",
    "securityPayloads",
    "expectedBehavior"
  ],
  properties: {
    labId: { type: "string" },
    title: { type: "string" },
    attackType: { type: "string" },
    language: { type: "string" },
    framework: { type: "string" },
    difficulty: { type: "string" },
    theme: { type: "string" },
    description: { type: "string" },

    vulnerableFiles: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "content"],
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        }
      }
    },

    solutionFiles: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "content"],
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        }
      }
    },

    functionalTests: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "description", "method", "path", "expectedStatus"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          method: { type: "string" },
          path: { type: "string" },
          expectedStatus: { type: "number" },
          expectedBodyContains: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    },

    securityPayloads: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "payload", "targetPath", "expectedVulnerableResult", "expectedFixedResult"],
        properties: {
          name: { type: "string" },
          payload: { type: "string" },
          targetPath: { type: "string" },
          expectedVulnerableResult: { type: "string" },
          expectedFixedResult: { type: "string" }
        }
      }
    },

    expectedBehavior: {
      type: "object",
      required: ["vulnerable", "fixed"],
      properties: {
        vulnerable: { type: "string" },
        fixed: { type: "string" }
      }
    }
  }
};

async function main() {
  const requestPath = process.argv[2];

  if (!requestPath) {
    console.error("Usage: node src/generateLab.js <request-json>");
    process.exit(1);
  }

  const absoluteRequestPath = path.resolve(requestPath);

  if (!fs.existsSync(absoluteRequestPath)) {
    console.error(`[FAIL] Request file not found: ${absoluteRequestPath}`);
    process.exit(1);
  }

  const request = JSON.parse(fs.readFileSync(absoluteRequestPath, "utf8"));
  const prompt = buildLabPrompt(request);

  console.log("[LLM] Calling Ollama...");

  const rawOutput = await callOllama(prompt, labSchema);

  let parsed;

  try {
    parsed = JSON.parse(rawOutput);
  } catch (error) {
    console.error("[FAIL] Ollama did not return valid JSON.");
    console.error(rawOutput);
    process.exit(1);
  }

  const outputDir = path.resolve("generated");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${parsed.labId || "generated-lab"}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), "utf8");

  console.log(`[OK] Candidate lab saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error("[FAIL]", error.message);
  process.exit(1);
});
