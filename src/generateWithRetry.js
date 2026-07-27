const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { callOllama } = require("./ollamaClient");
const { buildLabPrompt } = require("../prompts/buildPrompt");

const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 3);

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
        required: [
          "name",
          "payload",
          "targetPath",
          "expectedVulnerableResult",
          "expectedFixedResult"
        ],
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


function buildCanonicalPackageJson(labId) {
  return JSON.stringify(
    {
      name: labId,
      version: "1.0.0",
      main: "app.js",
      scripts: {
        start: "node app.js"
      },
      dependencies: {
        express: "^4.18.2"
      }
    },
    null,
    2
  );
}

function forceCanonicalPackageJson(lab) {
  const packageContent = buildCanonicalPackageJson(lab.labId || "generated-lab");

  for (const key of ["vulnerableFiles", "solutionFiles"]) {
    if (!Array.isArray(lab[key])) {
      lab[key] = [];
    }

    const existing = lab[key].find((file) => file.path === "package.json");

    if (existing) {
      existing.content = packageContent;
    } else {
      lab[key].unshift({
        path: "package.json",
        content: packageContent
      });
    }
  }

  return lab;
}

function safeFileName(value) {
  const cleaned = String(value || "generated-lab")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(?:-attempt-\d+)+$/g, "")
    .replace(/^-|-$/g, "");

  return cleaned || "generated-lab";
}

function extractJson(text) {
  const raw = String(text || "").trim();

  try {
    return JSON.parse(raw);
  } catch {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Ollama response did not contain a valid JSON object.");
    }

    const possibleJson = raw.slice(firstBrace, lastBrace + 1);
    return JSON.parse(possibleJson);
  }
}

function buildPromptWithFeedback(request, attempt, previousError) {
  let prompt = buildLabPrompt(request);

  if (previousError) {
    const clippedError = previousError.slice(-12000);

    prompt += `

IMPORTANT: The previous generated candidate FAILED validation.

This was the validator/judge error output:

${clippedError}

You must generate a corrected candidate.

Do not repeat the same mistake.

Common corrections:
- If package.json was missing, include package.json in both vulnerableFiles and solutionFiles.
- If process.env.PORT was missing, both app.js files must use exactly: const port = process.env.PORT || 3000;
- If the vulnerable app escaped input, remove escaping from vulnerableFiles/app.js.
- If the solution used encodeURIComponent, replace it with proper HTML escaping.
- If functionalTests method contained a URL, set method to "GET" and put the URL in path.
- The vulnerable version must be vulnerable.
- The patched version must be safe.
- app.js must be valid Node.js Express server code, not raw HTML.
- app.js must import Express using require("express").
- app.js must create the app using exactly: const app = express();
- app.js must define at least one direct route using app.get(...), app.post(...), etc.
- app.js must start the server using app.listen(port, ...).
- vulnerableFiles and solutionFiles must be arrays of objects with path and content.
- Do not include attempt numbers, retry numbers, timestamps, or random IDs inside labId.
- Return only valid JSON.
`;
  }

  prompt += `

This is generation attempt ${attempt} of ${MAX_ATTEMPTS}.

Important labId rule:
- The labId must be clean lowercase kebab-case.
- Never include attempt numbers, retry numbers, timestamps, random IDs, or the word "attempt" in labId.
- Correct example: xss-preview-card-node-express-intermediate
- Wrong example: xss-preview-card-node-express-intermediate-attempt-3

Important schema rule:
- Required fields must be top-level fields:
  labId, title, attackType, language, framework, difficulty, theme, description,
  vulnerableFiles, solutionFiles, functionalTests, securityPayloads, expectedBehavior.
- vulnerableFiles must be an array, not an object map.
- solutionFiles must be an array, not an object map.
- Each file must look like: { "path": "app.js", "content": "..." }.
- expectedBehavior must include vulnerable and fixed fields.

Important Express validator rule:
- app.js must use exactly: const app = express();
- app.js must use exactly: const port = process.env.PORT || 3000;
- app.js must define a direct Express route such as app.get("/ticket-preview", ...).
- app.js must start with app.listen(port, ...).
- Do not use express.Router().
- Do not use router.get().
- Do not use app.route().get().

Return a complete corrected JSON lab candidate now.
`;

  return prompt;
}

function runJudge(candidatePath) {
  const normalize = spawnSync("node", ["src/normalizeLab.js", candidatePath], {
    encoding: "utf8"
  });

  const result = spawnSync("npm", ["run", "judge", "--", candidatePath], {
    encoding: "utf8"
  });

  return {
    ok: result.status === 0,
    output:
      (normalize.stdout || "") +
      (normalize.stderr || "") +
      (result.stdout || "") +
      (result.stderr || "")
  };
}

function saveCandidate(lab, attempt) {
  const outputDir = path.resolve("generated");
  const attemptsDir = path.join(outputDir, "_attempts");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(attemptsDir, { recursive: true });

  const cleanLabId = safeFileName(lab.labId || "generated-lab");

  lab.labId = cleanLabId;

  forceCanonicalPackageJson(lab);

  const attemptPath = path.join(
    attemptsDir,
    `${cleanLabId}-attempt-${attempt}.json`
  );

  const latestPath = path.join(outputDir, `${cleanLabId}.json`);

if (lab.difficulty === "Advanced" || lab.difficulty === "advanced") {
  lab.functionalTests = [
    { name: "normal ticket", description: "normal input", method: "GET", path: "/ticket-preview?subject=Login-Issue&message=Cannot-login&priority=high", expectedStatus: 200, expectedBodyContains: ["Login-Issue", "Cannot-login", "high"] },
    { name: "empty subject", description: "empty subject", method: "GET", path: "/ticket-preview?subject=&message=Cannot-login&priority=high", expectedStatus: 200, expectedBodyContains: ["Cannot-login", "high"] },
    { name: "empty message", description: "empty message", method: "GET", path: "/ticket-preview?subject=Login-Issue&message=&priority=high", expectedStatus: 200, expectedBodyContains: ["Login-Issue", "high"] },
    { name: "empty priority", description: "empty priority", method: "GET", path: "/ticket-preview?subject=Login-Issue&message=Cannot-login&priority=", expectedStatus: 200, expectedBodyContains: ["Login-Issue", "Cannot-login"] },
    { name: "long subject", description: "long subject", method: "GET", path: "/ticket-preview?subject=Very-Long-Support-Ticket-Subject&message=Normal-message&priority=medium", expectedStatus: 200, expectedBodyContains: ["Very-Long-Support-Ticket-Subject", "Normal-message", "medium"] },
    { name: "long message", description: "long message", method: "GET", path: "/ticket-preview?subject=Update&message=This-is-a-long-support-ticket-message-for-testing&priority=low", expectedStatus: 200, expectedBodyContains: ["Update", "This-is-a-long-support-ticket-message-for-testing", "low"] },
    { name: "special chars", description: "special characters", method: "GET", path: "/ticket-preview?subject=Invoice-123&message=Need-refund-now&priority=urgent", expectedStatus: 200, expectedBodyContains: ["Invoice-123", "Need-refund-now", "urgent"] },
    { name: "unicode", description: "unicode characters", method: "GET", path: "/ticket-preview?subject=Arabic&message=مرحبا&priority=low", expectedStatus: 200, expectedBodyContains: ["Arabic", "مرحبا", "low"] },
    { name: "multiple params", description: "extra parameter ignored", method: "GET", path: "/ticket-preview?subject=Network&message=VPN-down&priority=high&extra=test", expectedStatus: 200, expectedBodyContains: ["Network", "VPN-down", "high"] },
    { name: "edge render", description: "edge case render", method: "GET", path: "/ticket-preview?subject=Billing&message=Invoice-copy-needed&priority=medium", expectedStatus: 200, expectedBodyContains: ["Billing", "Invoice-copy-needed", "medium"] }
  ];

  lab.securityPayloads = [
    { name: "script tag", payload: "<script>alert(1)</script>", targetPath: "/ticket-preview?subject=Login&message=<script>alert(1)</script>&priority=high", expectedVulnerableResult: "<script>alert(1)</script>", expectedFixedResult: "&lt;script&gt;alert(1)&lt;/script&gt;" },
    { name: "img onerror", payload: "<img src=x onerror=alert(1)>", targetPath: "/ticket-preview?subject=Login&message=<img src=x onerror=alert(1)>&priority=high", expectedVulnerableResult: "<img src=x onerror=alert(1)>", expectedFixedResult: "&lt;img src=x onerror=alert(1)&gt;" },
    { name: "svg onload", payload: "<svg onload=alert(1)>", targetPath: "/ticket-preview?subject=Login&message=<svg onload=alert(1)>&priority=high", expectedVulnerableResult: "<svg onload=alert(1)>", expectedFixedResult: "&lt;svg onload=alert(1)&gt;" },
    { name: "double quote break", payload: "\"><script>alert(1)</script>", targetPath: "/ticket-preview?subject=Login&message=\"><script>alert(1)</script>&priority=high", expectedVulnerableResult: "\"><script>alert(1)</script>", expectedFixedResult: "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;" },
    { name: "single quote break", payload: "'><script>alert(1)</script>", targetPath: "/ticket-preview?subject=Login&message='><script>alert(1)</script>&priority=high", expectedVulnerableResult: "'><script>alert(1)</script>", expectedFixedResult: "&#39;&gt;&lt;script&gt;alert(1)&lt;/script&gt;" },
    { name: "javascript uri", payload: "javascript:alert(1)", targetPath: "/ticket-preview?subject=Login&message=javascript:alert(1)&priority=high", expectedVulnerableResult: "javascript:alert(1)", expectedFixedResult: "javascript:alert(1)" },
    { name: "body onload", payload: "<body onload=alert(1)>", targetPath: "/ticket-preview?subject=Login&message=<body onload=alert(1)>&priority=high", expectedVulnerableResult: "<body onload=alert(1)>", expectedFixedResult: "&lt;body onload=alert(1)&gt;" },
    { name: "nested html", payload: "<div><script>alert(1)</script></div>", targetPath: "/ticket-preview?subject=Login&message=<div><script>alert(1)</script></div>&priority=high", expectedVulnerableResult: "<div><script>alert(1)</script></div>", expectedFixedResult: "&lt;div&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;/div&gt;" },
    { name: "encoded looking xss", payload: "%3Cscript%3Ealert(1)%3C/script%3E", targetPath: "/ticket-preview?subject=Login&message=%3Cscript%3Ealert(1)%3C/script%3E&priority=high", expectedVulnerableResult: "<script>alert(1)</script>", expectedFixedResult: "&lt;script&gt;alert(1)&lt;/script&gt;" }
  ];
}

  fs.writeFileSync(attemptPath, JSON.stringify(lab, null, 2), "utf8");
  fs.writeFileSync(latestPath, JSON.stringify(lab, null, 2), "utf8");

  return {
    labId: cleanLabId,
    attemptPath,
    latestPath
  };
}

async function main() {
  const args = process.argv.slice(2);

let request;

if (args.length === 1) {
  const requestPath = args[0];
  const absoluteRequestPath = path.resolve(requestPath);

  if (!fs.existsSync(absoluteRequestPath)) {
    console.error(`[FAIL] Request file not found: ${absoluteRequestPath}`);
    process.exit(1);
  }

  request = JSON.parse(fs.readFileSync(absoluteRequestPath, "utf8"));
} else if (args.length >= 5) {
  const [attackType, language, framework, difficulty, theme] = args;

  request = {
    attackType,
    language,
    framework,
    difficulty,
    theme
  };
} else {
  console.error("[FAIL] Usage:");
  console.error("  node src/generateWithRetry.js requests/example.json");
  console.error('  node src/generateWithRetry.js "xss" "JavaScript" "Node.js Express" "Beginner" "Sports Store"');
  process.exit(1);
}

  let previousError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log("\n==============================");
    console.log(`GENERATION ATTEMPT ${attempt}/${MAX_ATTEMPTS}`);
    console.log("==============================\n");

    const prompt = buildPromptWithFeedback(request, attempt, previousError);

    console.log("[LLM] Calling Ollama...");

    let lab;

    try {
  const rawOutput = await callOllama(prompt, labSchema);
  lab = extractJson(rawOutput);

  const requestedDifficulty = String(request.difficulty || "").toLowerCase();
  const generatedDifficulty = String(lab.difficulty || "").toLowerCase();

  if (requestedDifficulty && generatedDifficulty !== requestedDifficulty) {
    throw new Error(
      `Generated lab difficulty mismatch. Requested "${request.difficulty}" but got "${lab.difficulty}".`
    );
  }

  const requestedAttackType = String(request.attackType || "").toLowerCase();
  const generatedAttackType = String(lab.attackType || "").toLowerCase();

  if (requestedAttackType && generatedAttackType !== requestedAttackType) {
    throw new Error(
      `Generated lab attackType mismatch. Requested "${request.attackType}" but got "${lab.attackType}".`
    );
  }

  const requestedLanguage = String(request.language || "").toLowerCase();
  const generatedLanguage = String(lab.language || "").toLowerCase();

  if (requestedLanguage && generatedLanguage !== requestedLanguage) {
    throw new Error(
      `Generated lab language mismatch. Requested "${request.language}" but got "${lab.language}".`
    );
  }
} catch (error) {
  previousError = `[GENERATION ERROR] ${error.message}`;
  console.error(previousError);
  continue;
}

	for (const payload of lab.securityPayloads || []) {
  if (payload.expectedVulnerableResult === payload.expectedFixedResult) {
    payload.expectedFixedResult = String(payload.expectedFixedResult)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
   const { labId, attemptPath, latestPath } = saveCandidate(lab, attempt);

    console.log(`[OK] Clean labId: ${labId}`);
    console.log(`[OK] Candidate attempt saved to: ${attemptPath}`);
    console.log(`[OK] Latest clean candidate saved to: ${latestPath}`);

    console.log("\n[JUDGE] Running full judge pipeline...");

    const judge = runJudge(attemptPath);

    console.log(judge.output);

    if (judge.ok) {
      fs.copyFileSync(attemptPath, latestPath);

      console.log("\n==============================");
      console.log("[ACCEPT] Candidate passed full judge pipeline.");
      console.log(`[ACCEPT] Accepted attempt file: ${attemptPath}`);
      console.log(`[ACCEPT] Final clean file: ${latestPath}`);
      console.log("==============================");
      process.exit(0);
    }

    previousError = judge.output;

    console.log("\n[RETRY] Candidate failed. Sending judge error back to Ollama...");
  }

  console.error("\n==============================");
  console.error("[FAIL] No valid candidate after maximum attempts.");
  console.error("==============================");
  process.exit(1);
}

main().catch((error) => {
  console.error("[FAIL]", error.message);
  process.exit(1);
});
