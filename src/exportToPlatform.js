const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`[INFO] ${message}`);
}

function ok(message) {
  console.log(`[OK] ${message}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function safeKebab(value) {
  return String(value || "generated-lab")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFile(files, filePath) {
  return files.find((file) => file.path === filePath);
}

function requireGeneratedFile(files, filePath, label) {
  const file = getFile(files, filePath);

  if (!file || typeof file.content !== "string" || file.content.trim() === "") {
    fail(`${label} is missing ${filePath}`);
  }

  return file.content;
}

function escapeYamlString(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function difficultyToPoints(difficulty) {
  const normalized = String(difficulty || "").toLowerCase();

  if (normalized === "beginner") return 100;
  if (normalized === "intermediate") return 150;
  if (normalized === "advanced") return 200;

  return 100;
}

function difficultyToMinutes(difficulty) {
  const normalized = String(difficulty || "").toLowerCase();

  if (normalized === "beginner") return 30;
  if (normalized === "intermediate") return 40;
  if (normalized === "advanced") return 60;

  return 30;
}

function buildDockerIgnore() {
  return `**/node_modules
**/.venv
**/venv
**/__pycache__
**/.pytest_cache
**/*.pyc
**/vendor
`;
}

function buildDockerfile() {
  return `FROM node:18-alpine

RUN addgroup -S labuser && \\
    adduser -S -G labuser -h /app labuser

WORKDIR /app

COPY --chown=labuser:labuser languages/javascript/app/package*.json ./

RUN npm install --omit=dev

COPY --chown=labuser:labuser languages/javascript/app/ .
COPY runtime-guards/node/node-runtime-guard.js /opt/sctp/node-runtime-guard.js
RUN chmod 0444 /opt/sctp/node-runtime-guard.js

USER labuser

ENV NODE_OPTIONS=--require=/opt/sctp/node-runtime-guard.js

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \\
    CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "src/server.js"]
`;
}

function buildRuntimeGuard() {
  return `// Runtime guard placeholder for generated Node.js labs.
// The platform Dockerfile requires this file through NODE_OPTIONS.
// Keep this file lightweight so generated labs can run safely.

"use strict";
`;
}

function buildPackageJson(labId) {
  return JSON.stringify(
    {
      name: labId,
      version: "1.0.0",
      description: "Generated secure coding training lab app",
      main: "src/server.js",
      scripts: {
        start: "node src/server.js",
        dev: "node src/server.js"
      },
      dependencies: {
        express: "^4.18.2"
      }
    },
    null,
    2
  ) + "\n";
}

function stripGeneratedServerBoilerplate(appJs) {
  let code = String(appJs || "");

  code = code.replace(/const\s+express\s*=\s*require\s*\(\s*['"]express['"]\s*\)\s*;?/g, "");
  code = code.replace(/const\s+port\s*=\s*process\.env\.PORT\s*\|\|\s*3000\s*;?/gi, "");
  code = code.replace(/const\s+PORT\s*=\s*process\.env\.PORT\s*\|\|\s*3000\s*;?/g, "");
  code = code.replace(/const\s+app\s*=\s*express\s*\(\s*\)\s*;?/g, "");

  code = code.replace(
    /app\.listen\s*\(\s*(port|PORT)\s*,[\s\S]*?\}\s*\)\s*;?/g,
    ""
  );

  code = code
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  return code;
}

function buildPlatformServer(lab, vulnerableAppJs) {
  const routeCode = stripGeneratedServerBoilerplate(vulnerableAppJs);

  return `const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const REQUEST_LOG_PREFIX = "SCTP_REQUEST_LOG ";
const SKIP_LOG_PATHS = new Set(["/health", "/favicon.ico", "/styles.css", "/lab-theme.css"]);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  const rawBody = serializeBody(req.body);

  res.on("finish", () => {
    if (shouldSkipLog(req.path)) {
      return;
    }

    const event = {
      time: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query && Object.keys(req.query).length ? req.query : "",
      status: res.statusCode,
      duration_ms: Date.now() - startedAt,
      body: rawBody.body,
      body_truncated: rawBody.truncated,
    };

    console.log(\`\${REQUEST_LOG_PREFIX}\${JSON.stringify(event)}\`);
  });

  next();
});

app.use(express.static(path.join(__dirname, "../public")));

function shouldSkipLog(pathname) {
  return SKIP_LOG_PATHS.has(pathname);
}

function serializeBody(body) {
  if (body == null || body === "") {
    return { body: "", truncated: false };
  }

  let serialized = typeof body === "string" ? body : JSON.stringify(body);

  if (serialized === undefined) {
    serialized = "";
  }

  const truncated = serialized.length > 4096;

  if (truncated) {
    serialized = serialized.slice(0, 4096);
  }

  return { body: serialized, truncated };
}

app.get("/", (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtmlForTemplate(lab.title || lab.labId)}</title>
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <main class="container">
        <h1>${escapeHtmlForTemplate(lab.title || lab.labId)}</h1>
        <p>${escapeHtmlForTemplate(lab.description || "Generated secure coding lab.")}</p>
        <p>Use the lab route described in the instructions to reproduce and patch the issue.</p>
      </main>
    </body>
    </html>
  \`);
});

// Generated vulnerable route code starts here.
${routeCode}
// Generated vulnerable route code ends here.

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    lab: process.env.LAB_SLUG || "${safeKebab(lab.labId)}",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
  console.log("Press Ctrl+C to stop");
});
`;
}

function escapeHtmlForTemplate(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildLabYaml(lab) {
  const labId = safeKebab(lab.labId);
  const difficulty = String(lab.difficulty || "beginner").toLowerCase();
  const points = difficultyToPoints(difficulty);
  const estimatedMinutes = difficultyToMinutes(difficulty);
  const title = escapeYamlString(lab.title || labId);
  const description = String(lab.description || "Generated secure coding lab.")
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");

  return `schema_version: 1

id: ${labId}
slug: ${labId}
title: "${title}"
description: |
${description}

  Learning objectives:
  - Reproduce the vulnerability
  - Patch unsafe output handling
  - Validate the fix with functionality and security tests

  Win condition:
  - All functionality tests must pass
  - All security checks must block known attack payloads

vulnerability_type: ${String(lab.attackType || "xss").toLowerCase()}
difficulty: ${difficulty}
estimated_time_minutes: ${estimatedMinutes}
points: ${points}

runtime:
  memory_limit: "512m"
  cpu_limit: "0.5"
  timeout_sec: 3600

tests:
  functional: tests/functional
  security: tests/security

languages:
  default: javascript
  items:
    - key: javascript
      label: "JavaScript (Node/Express)"
      status: ready
      execution_modes:
        - docker
      app_dir: languages/javascript/app
      dockerfile: languages/javascript/Dockerfile
      internal_port: 3000
      health_path: "/health"
      env: {}
      patchable_files:
        - src/server.js
`;
}

function pythonLiteral(value) {
  return JSON.stringify(value);
}

function buildFunctionalTests(lab) {
  const tests = Array.isArray(lab.functionalTests) ? lab.functionalTests : [];

  const testMethods = tests.map((test, index) => {
    const name = safePythonName(test.name || `functional_test_${index + 1}`);
    const method = String(test.method || "GET").upperCase;
    const actualMethod = String(test.method || "GET").toLowerCase();
    const requestPath = test.path || "/";
    const expectedStatus = Number(test.expectedStatus || 200);
    const contains = Array.isArray(test.expectedBodyContains) ? test.expectedBodyContains : [];

    const containsAssertions = contains.map((text) => {
      return `        assert ${pythonLiteral(text)} in response.text`;
    }).join("\n");

    return `    def test_${name}(self):
        response = requests.${actualMethod}(f"{BASE_URL}${requestPath}")
        assert response.status_code == ${expectedStatus}
${containsAssertions || "        assert response.text is not None"}
`;
  }).join("\n");

  return `"""
Generated functional tests for ${lab.labId}.
"""

import os
import pytest
import requests


BASE_URL = os.getenv("LAB_BASE_URL", "http://localhost:3001")


class TestGeneratedFunctionality:
${testMethods || `    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
`}

    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in {"healthy", "ok"}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
`;
}

function buildSecurityTests(lab) {
  const payloads = Array.isArray(lab.securityPayloads) ? lab.securityPayloads : [];

  const testMethods = payloads.map((payload, index) => {
    const name = safePythonName(payload.name || `security_payload_${index + 1}`);
    const targetPath = payload.targetPath || "/";
    const rawExpected = payload.expectedVulnerableResult || payload.payload || "";
    const fixedExpected = payload.expectedFixedResult || "";

    return `    def test_${name}_blocked(self):
        response = requests.get(f"{BASE_URL}${targetPath}")
        assert response.status_code == 200

        raw_payload = ${pythonLiteral(rawExpected)}
        escaped_payload = ${pythonLiteral(fixedExpected)}

        assert raw_payload not in response.text
        assert escaped_payload in response.text
`;
  }).join("\n");

  return `"""
Generated security tests for ${lab.labId}.
"""

import os
import pytest
import requests


BASE_URL = os.getenv("LAB_BASE_URL", "http://localhost:3001")


class TestGeneratedSecurity:
${testMethods || `    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
`}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
`;
}

function safePythonName(value) {
  return String(value || "test")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    || "generated_test";
}

function buildPytestIni() {
  return `[pytest]
testpaths = functional security
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
`;
}

function buildTestRequirements() {
  return `pytest==7.4.3
requests==2.31.0
`;
}

function main() {
  const candidatePath = process.argv[2];
  const platformRoot = process.argv[3];
  const force = process.argv.includes("--force");

  if (!candidatePath || !platformRoot) {
    fail(
      "Usage: node src/exportToPlatform.js <generated-lab-json> <platform-root> [--force]"
    );
  }

  const absoluteCandidatePath = path.resolve(candidatePath);
  const absolutePlatformRoot = path.resolve(platformRoot);

  if (!fs.existsSync(absolutePlatformRoot)) {
    fail(`Platform root not found: ${absolutePlatformRoot}`);
  }

  const labsRoot = path.join(absolutePlatformRoot, "labs");

  if (!fs.existsSync(labsRoot)) {
    fail(`Platform labs directory not found: ${labsRoot}`);
  }

  const lab = readJson(absoluteCandidatePath);
  const labId = safeKebab(lab.labId);

  if (!labId) {
    fail("Generated lab is missing labId.");
  }

  lab.labId = labId;

  const vulnerableAppJs = requireGeneratedFile(lab.vulnerableFiles || [], "app.js", "vulnerableFiles");

  const outputRoot = path.join(labsRoot, labId);

  if (fs.existsSync(outputRoot) && !force) {
    fail(`Output lab already exists: ${outputRoot}. Use --force to overwrite.`);
  }

  if (fs.existsSync(outputRoot) && force) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }

  info(`Exporting ${absoluteCandidatePath}`);
  info(`Platform root: ${absolutePlatformRoot}`);
  info(`Output lab: ${outputRoot}`);

  writeFile(path.join(outputRoot, ".dockerignore"), buildDockerIgnore());
  writeFile(path.join(outputRoot, "lab.yaml"), buildLabYaml(lab));

  writeFile(
    path.join(outputRoot, "languages/javascript/Dockerfile"),
    buildDockerfile()
  );

  writeFile(
    path.join(outputRoot, "languages/javascript/app/package.json"),
    buildPackageJson(labId)
  );

  writeFile(
    path.join(outputRoot, "languages/javascript/app/public/styles.css"),
    '@import url("/lab-theme.css");\n'
  );

  writeFile(
    path.join(outputRoot, "languages/javascript/app/src/server.js"),
    buildPlatformServer(lab, vulnerableAppJs)
  );

  writeFile(
    path.join(outputRoot, "runtime-guards/node/node-runtime-guard.js"),
    buildRuntimeGuard()
  );

  writeFile(
    path.join(outputRoot, "tests/pytest.ini"),
    buildPytestIni()
  );

  writeFile(
    path.join(outputRoot, "tests/requirements.txt"),
    buildTestRequirements()
  );

  writeFile(
    path.join(outputRoot, "tests/functional/test_generated_functionality.py"),
    buildFunctionalTests(lab)
  );

  writeFile(
    path.join(outputRoot, "tests/security/test_generated_security.py"),
    buildSecurityTests(lab)
  );

  ok(`Export complete: ${outputRoot}`);
  ok("Next: inspect the generated platform lab folder before running it.");
}

main();
