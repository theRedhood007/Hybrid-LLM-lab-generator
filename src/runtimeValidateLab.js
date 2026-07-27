const fs = require("fs-extra");
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(PROJECT_ROOT, ".runtime-runs");

function section(title) {
  console.log(`\n========== ${title} ==========`);
}

function fail(message) {
  throw new Error(message);
}

function isSafeRelativePath(filePath) {
  if (typeof filePath !== "string") return false;
  if (filePath.trim() === "") return false;
  if (path.isAbsolute(filePath)) return false;
  if (filePath.includes("..")) return false;
  if (filePath.includes("\\")) return false;
  return true;
}

function loadCandidate(candidatePath) {
  const absolutePath = path.resolve(candidatePath);

  if (!fs.existsSync(absolutePath)) {
    fail(`Candidate file not found: ${absolutePath}`);
  }

  let lab;

  try {
    lab = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON: ${error.message}`);
  }

  return {
    lab,
    absolutePath
  };
}

async function materializeFiles(files, outputDir) {
  await fs.remove(outputDir);
  await fs.ensureDir(outputDir);

  for (const file of files) {
    if (!isSafeRelativePath(file.path)) {
      fail(`Unsafe file path rejected: ${file.path}`);
    }

    if (typeof file.content !== "string") {
      fail(`Invalid file content for: ${file.path}`);
    }

    const fullPath = path.join(outputDir, file.path);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, file.content, "utf8");
  }
}

function readPackageJson(appDir) {
  const packagePath = path.join(appDir, "package.json");

  if (!fs.existsSync(packagePath)) {
    fail(`Missing package.json in ${appDir}`);
  }

  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch (error) {
    fail(`Invalid package.json in ${appDir}: ${error.message}`);
  }
}

function enforceDependencyAllowlist(appDir, label) {
  const pkg = readPackageJson(appDir);

  const allowedDependencies = new Set([
    "express",
    "escape-html",
    "ejs",
    "body-parser",
    "cookie-parser"
  ]);

  const dependencyGroups = [
    pkg.dependencies || {},
    pkg.devDependencies || {}
  ];

  for (const group of dependencyGroups) {
    for (const dependencyName of Object.keys(group)) {
      if (!allowedDependencies.has(dependencyName)) {
        fail(`${label} uses dependency "${dependencyName}", which is not in the validator allowlist.`);
      }
    }
  }

  if (!pkg.scripts || typeof pkg.scripts.start !== "string") {
    fail(`${label} package.json must include scripts.start.`);
  }
}

function runCommand(command, args, cwd, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          )
        );
        return;
      }

      resolve({
        stdout,
        stderr
      });
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address.port;

      server.close(() => {
        resolve(port);
      });
    });
  });
}

function startApp(appDir, port, label) {
  const child = spawn("npm", ["start"], {
    cwd: appDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test"
    },
    shell: false,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  child.on("exit", (code, signal) => {
    if (code !== null && code !== 0 && signal !== "SIGKILL") {
      console.error(`[WARN] ${label} app exited with code ${code}`);
      console.error(stderr);
    }
  });

  return {
    child,
    getLogs: () => ({
      stdout,
      stderr
    })
  };
}

function stopApp(app) {
  if (!app || !app.child || !app.child.pid) {
    return;
  }

  try {
    process.kill(-app.child.pid, "SIGKILL");
  } catch {
    try {
      app.child.kill("SIGKILL");
    } catch {
      // already stopped
    }
  }
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(baseUrl, testPath, timeoutMs = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const url = new URL(testPath, baseUrl);
      const response = await fetch(url);

      if (response.status < 500) {
        return;
      }
    } catch {
      // retry
    }

    await wait(400);
  }

  fail(`Server did not become ready at ${baseUrl}`);
}

async function requestText(baseUrl, method, requestPath) {
  const url = new URL(requestPath, baseUrl);

  const response = await fetch(url, {
    method
  });

  const body = await response.text();

  return {
    status: response.status,
    body,
    url: url.toString()
  };
}

async function runFunctionalTests(baseUrl, tests, label) {
  section(`FUNCTIONAL TESTS: ${label}`);

  for (const test of tests) {
    const result = await requestText(baseUrl, test.method, test.path);

    if (result.status !== test.expectedStatus) {
      fail(
        `${label} functional test failed: ${test.name}. Expected status ${test.expectedStatus}, got ${result.status}. URL: ${result.url}`
      );
    }

    for (const expectedText of test.expectedBodyContains || []) {
      if (!result.body.includes(expectedText)) {
        fail(
          `${label} functional test failed: ${test.name}. Missing expected text: ${expectedText}\nResponse body:\n${result.body}`
        );
      }
    }

    console.log(`[PASS] ${test.name}`);
  }
}

function getTrustedPayloads(attackType) {
  const normalized = String(attackType || "").toLowerCase();

  if (normalized === "xss") {
    return [
      {
        name: "trusted-script-tag",
        payload: "<script>alert(1)</script>"
      },
      {
        name: "trusted-img-onerror",
        payload: "\"><img src=x onerror=alert(1)>"
      }
    ];
  }

  if (normalized === "sqli" || normalized === "sql injection") {
    return [
      {
        name: "trusted-basic-sqli",
        payload: "' OR '1'='1' --"
      }
    ];
  }

  if (normalized === "path traversal") {
    return [
      {
        name: "trusted-linux-path-traversal",
        payload: "../../../../etc/passwd"
      }
    ];
  }

  return [];
}

function buildPayloadPath(payloadTemplate, replacementPayload) {
  const originalTargetPath = payloadTemplate.targetPath;
  const originalPayload = payloadTemplate.payload;

  if (originalTargetPath.includes(originalPayload)) {
    return originalTargetPath.replace(originalPayload, replacementPayload);
  }

  const dummyBase = "http://127.0.0.1";
  const url = new URL(originalTargetPath, dummyBase);

  if (url.searchParams.has("q")) {
    url.searchParams.set("q", replacementPayload);
    return url.pathname + url.search;
  }

  return originalTargetPath;
}

function responseContainsRawXss(body) {
  const text = String(body);

  return (
    /<\s*script\b/i.test(text) ||
    /<\s*img\b[^>]*\bonerror\s*=/i.test(text) ||
    /<\s*svg\b[^>]*\bonload\s*=/i.test(text) ||
    /<\s*[^>]+\s(onerror|onload|onclick|onmouseover)\s*=/i.test(text) ||
    /<\s*[^>]+\s(href|src)\s*=\s*["']?\s*javascript\s*:/i.test(text)
  );
}

async function runXssSecurityTests(baseUrl, lab, mode) {
  section(`XSS SECURITY TESTS: ${mode}`);

  const generatedPayloads = lab.securityPayloads || [];
  const trustedPayloads = getTrustedPayloads(lab.attackType);

  if (generatedPayloads.length === 0) {
    fail("No LLM-generated security payloads found.");
  }

  const payloadTemplates = generatedPayloads;

  for (const template of payloadTemplates) {
    const payloadsToTest = [
      {
        source: "llm-generated",
        name: template.name,
        payload: template.payload
      },
      ...trustedPayloads.map((payload) => ({
        source: "validator-trusted",
        name: payload.name,
        payload: payload.payload
      }))
    ];

    for (const payload of payloadsToTest) {
      const testPath = buildPayloadPath(template, payload.payload);
      const result = await requestText(baseUrl, "GET", testPath);

      if (result.status >= 500) {
        fail(`${mode} XSS test crashed server for payload ${payload.name}. Status: ${result.status}`);
      }

      const hasRawXss = responseContainsRawXss(result.body);

      if (mode === "vulnerable") {
        if (!hasRawXss) {
          fail(
            `Expected vulnerable app to reflect raw XSS for payload "${payload.name}", but it did not.\nURL: ${result.url}\nResponse body:\n${result.body}`
          );
        }
      }

      if (mode === "patched") {
        if (hasRawXss) {
          fail(
            `Patched app still reflects raw XSS for payload "${payload.name}".\nURL: ${result.url}\nResponse body:\n${result.body}`
          );
        }
      }

      console.log(`[PASS] ${payload.source}: ${payload.name}`);
    }
  }
}

async function runSecurityTests(baseUrl, lab, mode) {
  const attackType = String(lab.attackType || "").toLowerCase();

  if (attackType === "xss") {
    await runXssSecurityTests(baseUrl, lab, mode);
    return;
  }

  fail(`Runtime security validator is not implemented yet for attack type: ${lab.attackType}`);
}

async function validateApp(appDir, lab, mode) {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const app = startApp(appDir, port, mode);

  try {
    const readinessPath = lab.functionalTests?.[0]?.path || "/";
    await waitForServer(baseUrl, readinessPath);

    console.log(`[OK] ${mode} app running at ${baseUrl}`);

    await runFunctionalTests(baseUrl, lab.functionalTests, mode);
    await runSecurityTests(baseUrl, lab, mode);
  } finally {
    stopApp(app);
  }
}

async function main() {
  const candidatePath = process.argv[2];

  if (!candidatePath) {
    console.error("Usage: node src/runtimeValidateLab.js <generated-lab-json>");
    process.exit(1);
  }

  section("LOAD CANDIDATE");

  const { lab, absolutePath } = loadCandidate(candidatePath);

  console.log(`[OK] Loaded ${absolutePath}`);

  const runId = `${lab.labId || "lab"}-${Date.now()}`;
  const runRoot = path.join(RUNS_DIR, runId);
  const vulnerableDir = path.join(runRoot, "vulnerable");
  const patchedDir = path.join(runRoot, "patched");

  section("MATERIALIZE FILES");

  await materializeFiles(lab.vulnerableFiles, vulnerableDir);
  await materializeFiles(lab.solutionFiles, patchedDir);

  console.log(`[OK] Vulnerable app materialized at: ${vulnerableDir}`);
  console.log(`[OK] Patched app materialized at: ${patchedDir}`);

  section("DEPENDENCY SAFETY CHECKS");

  enforceDependencyAllowlist(vulnerableDir, "vulnerable");
  enforceDependencyAllowlist(patchedDir, "patched");

  console.log("[OK] Dependencies are allowed");

  section("INSTALL DEPENDENCIES");

  console.log("[INFO] Installing vulnerable app dependencies...");
  await runCommand("npm", ["install", "--ignore-scripts"], vulnerableDir);

  console.log("[INFO] Installing patched app dependencies...");
  await runCommand("npm", ["install", "--ignore-scripts"], patchedDir);

  console.log("[OK] Dependencies installed");

  section("VALIDATE VULNERABLE APP");

  await validateApp(vulnerableDir, lab, "vulnerable");

  section("VALIDATE PATCHED APP");

  await validateApp(patchedDir, lab, "patched");

  section("FINAL RESULT");

  console.log("[ACCEPT] Runtime validation passed.");
  console.log(`[INFO] Runtime artifacts saved at: ${runRoot}`);
}

main().catch((error) => {
  console.error(`\n[REJECT] ${error.message}`);
  process.exit(1);
});
