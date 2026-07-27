const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`\n[REJECT] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function section(title) {
  console.log(`\n========== ${title} ==========`);
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`File does not exist: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`Invalid JSON: ${err.message}`);
  }
}

function requireString(obj, key) {
  if (typeof obj[key] !== "string" || obj[key].trim() === "") {
    fail(`Missing or invalid string field: ${key}`);
  }
}

function requireArray(obj, key) {
  if (!Array.isArray(obj[key]) || obj[key].length === 0) {
    fail(`Missing or empty array field: ${key}`);
  }
}

function isSafeRelativePath(filePath) {
  if (typeof filePath !== "string") return false;
  if (filePath.trim() === "") return false;
  if (path.isAbsolute(filePath)) return false;
  if (filePath.includes("..")) return false;
  if (filePath.includes("\\")) return false;
  return true;
}

function hasFile(files, filePath) {
  return files.some((file) => file.path === filePath);
}

function getFile(files, filePath) {
  return files.find((file) => file.path === filePath);
}

function validateFileList(files, label) {
  for (const file of files) {
    if (!file || typeof file !== "object") {
      fail(`${label} contains an invalid file object.`);
    }

    if (!isSafeRelativePath(file.path)) {
      fail(`${label} contains unsafe file path: ${file.path}`);
    }

    if (typeof file.content !== "string" || file.content.trim() === "") {
      fail(`${label}/${file.path} has empty content.`);
    }
  }

  pass(`${label} file paths and contents look safe`);
}

function validatePackageJson(files, label) {
  if (!hasFile(files, "package.json")) {
    fail(`${label} must include package.json for a Node.js Express lab.`);
  }

  const packageFile = getFile(files, "package.json");

  let pkg;
  try {
    pkg = JSON.parse(packageFile.content);
  } catch (err) {
    fail(`${label}/package.json is not valid JSON: ${err.message}`);
  }

  if (!pkg.scripts || typeof pkg.scripts.start !== "string") {
    fail(`${label}/package.json must include scripts.start.`);
  }

  if (!pkg.dependencies || !pkg.dependencies.express) {
    fail(`${label}/package.json must include express dependency.`);
  }

  pass(`${label}/package.json is valid`);
}

function validateExpressAppFile(files, label) {
  if (!hasFile(files, "app.js")) {
    fail(`${label} must include app.js for a Node.js Express lab.`);
  }

  const appFile = getFile(files, "app.js");
  const content = appFile.content || "";
  const trimmed = content.trim();

  if (
    /^<\?php/i.test(trimmed) ||
    /\$_GET|\$_POST|htmlspecialchars|\$app|function\s*\(\s*\$request\s*,\s*\$response\s*\)/i.test(content)
  ) {
    fail(`${label}/app.js contains PHP code. Expected Node.js Express JavaScript.`);
  }

  if (/^<!DOCTYPE html/i.test(trimmed) || /^<html/i.test(trimmed) || /^<script\b/i.test(trimmed)) {
    fail(`${label}/app.js contains raw HTML/browser code. Expected Node.js Express server code.`);
  }

  if (!/require\s*\(\s*["']express["']\s*\)/.test(content)) {
    fail(`${label}/app.js must import Express using require("express").`);
  }

  if (!/const\s+app\s*=\s*express\s*\(\s*\)/.test(content)) {
    fail(`${label}/app.js must create the Express app using: const app = express();`);
  }

  if (!/const\s+port\s*=\s*process\.env\.PORT\s*\|\|\s*3000\s*;/.test(content)) {
    fail(`${label}/app.js must define the port using: const port = process.env.PORT || 3000;`);
  }

  if (!/app\.(get|post|put|patch|delete)\s*\(/.test(content)) {
    fail(`${label}/app.js must define at least one Express route using app.get/app.post/etc.`);
  }

  if (!/app\.listen\s*\(\s*port\s*,/.test(content)) {
    fail(`${label}/app.js must start the server using app.listen(port, ...).`);
  }

  const lineCount = content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "").length;

  if (lineCount < 55) {
    fail(`${label}/app.js is too small (${lineCount} non-empty lines). Generate a realistic lab app with at least 55 non-empty lines.`);
  }

  const routeCount = (content.match(/app\.(get|post|put|patch|delete)\s*\(/g) || []).length;

  if (routeCount < 2) {
    fail(`${label}/app.js must define at least 2 Express routes: a home page route and a scenario route.`);
  }

  if (!/res\.send\s*\(\s*`/.test(content)) {
    fail(`${label}/app.js must render realistic multi-line HTML using a template string passed to res.send(\`...\`).`);
  }

  if (!/<form[\s>]/i.test(content)) {
    fail(`${label}/app.js must include an HTML form for the learner scenario.`);
  }

  if (!/<header[\s>]|<main[\s>]|<section[\s>]/i.test(content)) {
    fail(`${label}/app.js must include a realistic HTML layout using header/main/section elements.`);
  }

  if (!/(const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*\[/.test(content)) {
    fail(`${label}/app.js must include a scenario data array, such as products, tickets, comments, or records.`);
  }

  pass(`${label}/app.js is valid Node.js Express server code`);
}

function validateFunctionalTests(tests) {
  const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

  for (const test of tests) {
    if (!test.name || typeof test.name !== "string") {
      fail("A functional test is missing name.");
    }

    if (!allowedMethods.includes(test.method)) {
      fail(
        `Functional test "${test.name}" has invalid method: ${test.method}. ` +
        `Use only GET, POST, PUT, PATCH, or DELETE.`
      );
    }

    if (typeof test.path !== "string" || !test.path.startsWith("/")) {
      fail(`Functional test "${test.name}" has invalid path. Path must start with "/".`);
    }

    if (typeof test.expectedStatus !== "number") {
      fail(`Functional test "${test.name}" must have numeric expectedStatus.`);
    }

    if (test.method.includes(" ")) {
      fail(
        `Functional test "${test.name}" puts URL inside method. ` +
        `Method must be only "GET", and URL must be in path.`
      );
    }
  }

  pass("Functional test structure is valid");
}

function validateSecurityPayloads(payloads) {
  for (const payload of payloads) {
    if (!payload.name || typeof payload.name !== "string") {
      fail("A security payload is missing name.");
    }

    if (!payload.payload || typeof payload.payload !== "string") {
      fail(`Security payload "${payload.name}" is missing payload value.`);
    }

    if (
      !payload.targetPath ||
      typeof payload.targetPath !== "string" ||
      !payload.targetPath.startsWith("/")
    ) {
      fail(`Security payload "${payload.name}" has invalid targetPath. It must start with "/".`);
    }

    if (
      !payload.expectedVulnerableResult ||
      typeof payload.expectedVulnerableResult !== "string"
    ) {
      fail(`Security payload "${payload.name}" is missing expectedVulnerableResult.`);
    }

    if (!payload.expectedFixedResult || typeof payload.expectedFixedResult !== "string") {
      fail(`Security payload "${payload.name}" is missing expectedFixedResult.`);
    }

    if (payload.expectedVulnerableResult === payload.expectedFixedResult) {
      fail(
        `Security payload "${payload.name}" has identical expectedVulnerableResult and expectedFixedResult. ` +
        `The vulnerable result must show the raw unsafe payload, while the fixed result must show escaped/safe output.`
      );
    }

    if (/<script/i.test(payload.payload)) {
      if (!payload.expectedVulnerableResult.includes("<script")) {
        fail(
          `Security payload "${payload.name}" has incorrect expectedVulnerableResult. ` +
          `For XSS, the vulnerable result must contain the raw unescaped payload, such as <script>alert(1)</script>.`
        );
      }

      if (!payload.expectedFixedResult.includes("&lt;script&gt;")) {
        fail(
          `Security payload "${payload.name}" has incorrect expectedFixedResult. ` +
          `For XSS, the fixed result must contain the escaped script payload, such as &lt;script&gt;alert(1)&lt;/script&gt;.`
        );
      }
    }
  }

  pass("Security payload structure is valid");
}

function validateXssRules(lab) {
  const vulnerableText = JSON.stringify(lab.vulnerableFiles);
  const solutionText = JSON.stringify(lab.solutionFiles);
  const payloadText = JSON.stringify(lab.securityPayloads);

  if (!/<script|onerror|<svg|javascript:/i.test(payloadText)) {
    fail("XSS lab must include at least one obvious XSS payload such as <script>alert(1)</script>.");
  }

  if (!/<script|onerror|<svg|javascript:/i.test(vulnerableText + payloadText)) {
    fail("XSS vulnerable lab does not clearly demonstrate reflected dangerous input.");
  }

  const vulnerableLooksEscaped =
    /escapeHtml/i.test(vulnerableText) ||
    /encodeURIComponent/i.test(vulnerableText) ||
    /encodeURI/i.test(vulnerableText) ||
    /htmlspecialchars/i.test(vulnerableText) ||
    /&lt;|&gt;|&#39;|&quot;|&amp;/i.test(vulnerableText) ||
    /replace\(\/&\/g/i.test(vulnerableText) ||
    /replace\(\/<\/g/i.test(vulnerableText) ||
    /replace\(\/>\/g/i.test(vulnerableText);

  if (vulnerableLooksEscaped) {
    fail(
      "XSS vulnerable app appears to escape or encode user input. " +
      "The vulnerable version must reflect input unsafely."
    );
  }

  if (/encodeURIComponent/i.test(solutionText)) {
    fail("Invalid XSS fix: encodeURIComponent is URL encoding, not HTML escaping.");
  }

  if (/htmlspecialchars/i.test(solutionText)) {
    fail("Invalid XSS fix for JavaScript lab: htmlspecialchars is PHP, not Node.js Express.");
  }

  const solutionDefinesEscapeHtml =
    /function\s+escapeHtml\s*\(/i.test(solutionText) ||
    /const\s+escapeHtml\s*=/i.test(solutionText);

  const solutionCallsEscapeHtml = /escapeHtml\s*\(/i.test(solutionText);

  if (solutionCallsEscapeHtml && !solutionDefinesEscapeHtml) {
    fail("XSS solution calls escapeHtml but does not define the escapeHtml function.");
  }

  if (!solutionDefinesEscapeHtml) {
    fail("XSS solution must define an escapeHtml function.");
  }

  const hasHtmlEscaping =
    /escapeHtml|escape-html|replace\(/i.test(solutionText) ||
    /&lt;|&gt;|&#39;|&quot;|&amp;/i.test(solutionText);

  if (!hasHtmlEscaping) {
    fail("XSS solution must clearly perform HTML escaping.");
  }

  pass("XSS-specific static checks passed");
}

function validatePortSupport(files, label) {
  const combined = files.map((file) => file.content).join("\n");

  if (!/process\.env\.PORT/.test(combined)) {
    fail(`${label} app must support process.env.PORT for dynamic validator-controlled ports.`);
  }

  pass(`${label} supports process.env.PORT`);
}

function main() {
  const candidatePath = process.argv[2];

  if (!candidatePath) {
    fail("Usage: node src/validateLab.js <generated-lab-json>");
  }

  const absolutePath = path.resolve(candidatePath);

  section("LOAD CANDIDATE");
  const lab = loadJson(absolutePath);
  pass(`Loaded ${absolutePath}`);

  section("BASIC SCHEMA CHECKS");

  const requiredStrings = [
    "labId",
    "title",
    "attackType",
    "language",
    "framework",
    "difficulty",
    "theme",
    "description"
  ];

  for (const key of requiredStrings) {
    requireString(lab, key);
  }

  requireArray(lab, "vulnerableFiles");
  requireArray(lab, "solutionFiles");
  requireArray(lab, "functionalTests");
  requireArray(lab, "securityPayloads");

  if (!lab.expectedBehavior || typeof lab.expectedBehavior !== "object") {
    fail("Missing expectedBehavior object.");
  }

  if (!lab.expectedBehavior.vulnerable || !lab.expectedBehavior.fixed) {
    fail("expectedBehavior must include vulnerable and fixed fields.");
  }

  pass("Required fields exist");

  section("LAB ID CHECKS");

  if (/^\d+$/.test(lab.labId)) {
    fail(`Invalid labId "${lab.labId}". labId must not be only numbers.`);
  }

  if (!/^[a-z][a-z0-9-]+$/.test(lab.labId)) {
    fail(
      `Invalid labId "${lab.labId}". ` +
      `Use lowercase kebab-case, for example: xss-product-search-node-express-beginner`
    );
  }

  if (/-attempt-\d+/i.test(lab.labId)) {
    fail(`Invalid labId "${lab.labId}". labId must not include attempt numbers.`);
  }

  pass("labId format is valid");

  section("FILE SAFETY CHECKS");

  validateFileList(lab.vulnerableFiles, "vulnerableFiles");
  validateFileList(lab.solutionFiles, "solutionFiles");

  section("NODE.JS EXPRESS CHECKS");

  const isNodeLab =
    /javascript/i.test(lab.language) ||
    /node/i.test(lab.framework) ||
    /express/i.test(lab.framework);

  if (isNodeLab) {
    validatePackageJson(lab.vulnerableFiles, "vulnerableFiles");
    validatePackageJson(lab.solutionFiles, "solutionFiles");

    validateExpressAppFile(lab.vulnerableFiles, "vulnerableFiles");
    validateExpressAppFile(lab.solutionFiles, "solutionFiles");

    validatePortSupport(lab.vulnerableFiles, "vulnerableFiles");
    validatePortSupport(lab.solutionFiles, "solutionFiles");
  }

  section("TEST STRUCTURE CHECKS");

  validateFunctionalTests(lab.functionalTests);
  validateSecurityPayloads(lab.securityPayloads);

  section("ATTACK-SPECIFIC CHECKS");

  if (lab.attackType.toLowerCase() === "xss") {
    validateXssRules(lab);
  } else {
    console.log(`[WARN] No attack-specific static validator implemented yet for: ${lab.attackType}`);
  }

// Advanced difficulty requirements
if (lab.difficulty === "advanced") {
  const functionalCount = Array.isArray(lab.functionalTests)
    ? lab.functionalTests.length
    : 0;

  const securityCount = Array.isArray(lab.securityPayloads)
    ? lab.securityPayloads.length
    : 0;

  if (functionalCount < 8) {
    throw new Error(
      `Advanced lab rejected: expected at least 8 functional tests, found ${functionalCount}`
    );
  }

  if (securityCount < 8) {
    throw new Error(
      `Advanced lab rejected: expected at least 8 security payloads, found ${securityCount}`
    );
  }

  console.log(
    `[OK] Advanced coverage validated (${functionalCount} functional tests, ${securityCount} security payloads)`
  );
}

  section("FINAL RESULT");
  console.log("[ACCEPT] Candidate passed static validator.");
}

main();
