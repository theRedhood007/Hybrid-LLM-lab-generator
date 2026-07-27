require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function publishAcceptedLab(finalPath) {
  const platformLabsDir = process.env.PLATFORM_LABS_DIR;

  if (!platformLabsDir) {
    console.log("[PUBLISH] Skipped: PLATFORM_LABS_DIR is not set.");
    return;
  }

  fs.mkdirSync(platformLabsDir, { recursive: true });

  const publishPath = path.join(platformLabsDir, path.basename(finalPath));

  fs.copyFileSync(finalPath, publishPath);

  console.log(`[PUBLISH] Lab copied to platform: ${publishPath}`);
}

const PROJECT_ROOT = path.resolve(__dirname, "..");

function runStage(stageName, scriptName, candidatePath) {
  console.log(`\n\n==============================`);
  console.log(`RUNNING STAGE: ${stageName}`);
  console.log(`==============================\n`);

  const result = spawnSync(process.execPath, [path.join("src", scriptName), candidatePath], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    console.error(`\n[FAIL] Stage failed: ${stageName}`);
    process.exit(result.status || 1);
  }

  console.log(`\n[OK] Stage passed: ${stageName}`);
}

function main() {
  const candidatePath = process.argv[2];

  if (!candidatePath) {
    console.error("Usage: node src/judgeLab.js <generated-lab-json>");
    process.exit(1);
  }

  runStage("Static Validation", "validateLab.js", candidatePath);
  runStage("Runtime Validation", "runtimeValidateLab.js", candidatePath);

  console.log("\n==============================");
  console.log("[ACCEPT] Candidate passed full judge pipeline.");
  publishAcceptedLab(candidatePath);

const publishResult = spawnSync(process.execPath, [path.join("src", "publishToPlatform.js"), candidatePath], {
  cwd: PROJECT_ROOT,
  stdio: "inherit",
  shell: false
});

if (publishResult.status !== 0) {
  console.error("[PUBLISH] Failed to publish lab folder to platform.");
  process.exit(1);
}
  console.log("==============================");
}

main();
