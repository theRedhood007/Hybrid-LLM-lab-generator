const fs = require("fs");
const path = require("path");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:1.5b";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function extractJson(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in Ollama response.");
  }

  return text.slice(first, last + 1);
}

function buildPrompt(request) {
  return `
You are generating ONLY a lab specification JSON.

DO NOT generate source code.
DO NOT generate app.js.
DO NOT generate package.json.
DO NOT generate Dockerfile.
DO NOT generate tests.
DO NOT use markdown.
DO NOT wrap output in code fences.

Return exactly one valid JSON object.

The JSON must match this structure:

{
  "title": "string",
  "scenarioId": "string-kebab-case",
  "vulnerabilityType": "xss",
  "difficulty": "beginner",
  "businessContext": "string",
  "summary": "string",
  "learningObjectives": ["string", "string", "string"],
  "winConditions": ["string", "string"],
  "route": "/lab",
  "method": "GET",
  "params": ["input"],
  "scenarioItems": [
    {
      "name": "string",
      "category": "string",
      "description": "string"
    }
  ],
  "normalInputs": ["hello", "shoes", "jersey"],
  "xssPayloads": [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>"
  ]
}

Rules:
- vulnerabilityType must be "xss".
- difficulty must be "${request.difficulty || "beginner"}".
- scenarioId must be kebab-case.
- route must be "/lab".
- method must be "GET".
- params must be ["input"].
- normalInputs must contain at least 3 safe user inputs.
- xssPayloads must contain at least 3 realistic reflected XSS payloads.
- summary must describe the business scenario, not the code.
- learningObjectives must explain what the learner will practice.
- winConditions must explain how the learner knows the patch worked.

User request:
${JSON.stringify(request, null, 2)}
`.trim();
}


function normalizeSpec(spec, request) {
  const fallbackScenarioId = request.scenarioId || "sports-store-search";

  spec.title = spec.title || "Sports Store Product Search XSS";
  spec.scenarioId = spec.scenarioId || fallbackScenarioId;
  spec.scenarioId = String(spec.scenarioId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-xss$/g, "");

  spec.vulnerabilityType = "xss";
  spec.difficulty = request.difficulty || spec.difficulty || "beginner";
  spec.businessContext = spec.businessContext || request.businessContext || "Online sportswear store";

  spec.summary = spec.summary || "An online sportswear store lets customers search for products such as shoes, jerseys, gloves, and training equipment. The search page reflects the user's search term into the HTML response.";

  spec.learningObjectives = Array.isArray(spec.learningObjectives) ? spec.learningObjectives : [];
  while (spec.learningObjectives.length < 3) {
    const defaults = [
      "Understand how reflected XSS happens when user input is inserted into HTML without escaping.",
      "Identify the vulnerable reflection point in a Node.js Express route.",
      "Fix the vulnerability by applying proper HTML escaping before rendering user input."
    ];
    spec.learningObjectives.push(defaults[spec.learningObjectives.length]);
  }

  spec.winConditions = Array.isArray(spec.winConditions) ? spec.winConditions : [];
  while (spec.winConditions.length < 2) {
    const defaults = [
      "Normal product searches still render correctly.",
      "XSS payloads are displayed as harmless escaped text instead of executable HTML."
    ];
    spec.winConditions.push(defaults[spec.winConditions.length]);
  }

  spec.route = "/lab";
  spec.method = "GET";
  spec.params = ["input"];

  spec.scenarioItems = Array.isArray(spec.scenarioItems) ? spec.scenarioItems : [];
  const fallbackItems = [
    {
      name: "Sprint Runner Shoes",
      category: "Footwear",
      description: "Lightweight running shoes for daily training and sprint workouts."
    },
    {
      name: "Pro Match Jersey",
      category: "Teamwear",
      description: "Breathable football jersey designed for match days and practice sessions."
    },
    {
      name: "Grip Training Gloves",
      category: "Accessories",
      description: "Durable gym gloves with wrist support for strength training."
    }
  ];

  for (const item of fallbackItems) {
    if (spec.scenarioItems.length >= 3) break;
    spec.scenarioItems.push(item);
  }

  spec.normalInputs = Array.isArray(spec.normalInputs) ? spec.normalInputs : [];
  const fallbackInputs = ["shoes", "jersey", "gloves"];
  for (const input of fallbackInputs) {
    if (spec.normalInputs.length >= 3) break;
    if (!spec.normalInputs.includes(input)) spec.normalInputs.push(input);
  }

  spec.xssPayloads = Array.isArray(spec.xssPayloads) ? spec.xssPayloads : [];
  const fallbackPayloads = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "\"><svg onload=alert(1)>"
  ];

  for (const payload of fallbackPayloads) {
    if (spec.xssPayloads.length >= 3) break;
    if (!spec.xssPayloads.includes(payload)) spec.xssPayloads.push(payload);
  }

  return spec;
}

async function callOllama(prompt) {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        top_p: 0.8
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || "";
}

async function main() {
  const requestFile = process.argv[2];

  if (!requestFile) {
    console.error("Usage: node src/generateLabSpec.js <request.json>");
    process.exit(1);
  }

  const request = readJson(requestFile);
  const prompt = buildPrompt(request);

  console.log("[SPEC] Calling Ollama for labSpec.json only...");
  const raw = await callOllama(prompt);

  let spec;
  try {
    spec = JSON.parse(extractJson(raw));
  } catch (err) {
    console.error("[SPEC] Failed to parse Ollama JSON.");
    console.error(raw);
    throw err;
  }

  spec = normalizeSpec(spec, request);

  const outDir = path.join("generated-specs");
  fs.mkdirSync(outDir, { recursive: true });

  const slugBase = spec.scenarioId || request.scenarioId || "xss-generated-lab";
  const outFile = path.join(outDir, `${slugBase}.labSpec.json`);

  fs.writeFileSync(outFile, JSON.stringify(spec, null, 2));
  console.log(`[SPEC] Wrote ${outFile}`);
}

main().catch((err) => {
  console.error("[SPEC ERROR]", err.message);
  process.exit(1);
});
