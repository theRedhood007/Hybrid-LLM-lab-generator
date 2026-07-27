require("dotenv").config();

const fs = require("fs");
const path = require("path");

function writeFileSafe(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function findGeneratedFile(files, wantedName) {
  return files.find((file) => {
    const normalized = file.path.replaceAll("\\", "/");
    return normalized.endsWith(wantedName);
  });
}

function publishToPlatform(jsonPath) {
  const platformLabsDir = process.env.PLATFORM_LABS_DIR;

  if (!platformLabsDir) {
    throw new Error("PLATFORM_LABS_DIR is not set in .env");
  }

  const absoluteJsonPath = path.resolve(jsonPath);
  const lab = JSON.parse(fs.readFileSync(absoluteJsonPath, "utf8"));

  const labId = lab.labId;
  if (!labId) {
    throw new Error("Generated lab JSON has no labId");
  }

  const labDir = path.join(platformLabsDir, labId);

  const vulnerableFiles = lab.vulnerableFiles || [];
  const solutionFiles = lab.solutionFiles || [];

  const appFile =
    findGeneratedFile(vulnerableFiles, "app.js") ||
    findGeneratedFile(vulnerableFiles, "server.js");

  const packageFile = findGeneratedFile(vulnerableFiles, "package.json");

  if (!appFile) {
    throw new Error("Could not find vulnerable app.js/server.js in generated JSON");
  }

  if (!packageFile) {
    throw new Error("Could not find package.json in generated JSON");
  }

  writeFileSafe(
    path.join(labDir, "languages/javascript/app/src/server.js"),
    appFile.content
  );

  writeFileSafe(
    path.join(labDir, "languages/javascript/app/package.json"),
    packageFile.content
  );

  const fixedAppFile =
    findGeneratedFile(solutionFiles, "app.js") ||
    findGeneratedFile(solutionFiles, "server.js");

  if (fixedAppFile) {
    writeFileSafe(
      path.join(labDir, "languages/javascript/solution/src/server.js"),
      fixedAppFile.content
    );
  }

  const functionalTests = lab.functionalTests || [];
  const securityPayloads = lab.securityPayloads || [];

  const functionalBody = functionalTests
    .map((test, index) => {
      return `
def test_generated_functionality_${index + 1}(base_url):
    response = requests.get(base_url + ${JSON.stringify(test.path || "/")})
    assert response.status_code == ${test.expectedStatus || 200}
`;
    })
    .join("\n");

  const functionalPy = `"""
Generated functional tests for ${labId}.
"""

import requests

${functionalBody}
`;

  writeFileSafe(
    path.join(labDir, "tests/functional/test_generated_functionality.py"),
    functionalPy
  );

  const securityBody = securityPayloads
    .map((item, index) => {
      const payload = item.payload || "<script>alert(1)</script>";
      const targetPath = item.targetPath || "/";

      return `
def test_generated_security_${index + 1}(base_url):
    payload = ${JSON.stringify(payload)}
    target_path = ${JSON.stringify(targetPath)}
    response = requests.get(base_url + target_path)
    assert response.status_code == 200
    assert payload not in response.text
`;
    })
    .join("\n");

  const securityPy = `"""
Generated security tests for ${labId}.
"""

import requests

${securityBody}
`;

  writeFileSafe(
    path.join(labDir, "tests/security/test_generated_security.py"),
    securityPy
  );

  const labYaml = `id: ${labId}
slug: ${labId}
title: ${lab.title || labId}
category: ${lab.attackType || "XSS"}
difficulty: ${lab.difficulty || "Advanced"}
language: JavaScript
framework: Node.js Express
description: ${JSON.stringify(lab.description || "Generated XSS lab.")}
`;

  const platformLabYaml = Array.isArray(lab.platformFiles)
    ? lab.platformFiles.find((file) => file.path === "lab.yaml")
    : null;

  writeFileSafe(
    path.join(labDir, "lab.yaml"),
    platformLabYaml ? platformLabYaml.content : labYaml
  );

  fs.copyFileSync(
    absoluteJsonPath,
    path.join(platformLabsDir, `${labId}.json`)
  );

  console.log(`[PUBLISH] Platform lab folder updated: ${labDir}`);
}

const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error("Usage: node src/publishToPlatform.js <generated-lab-json>");
  process.exit(1);
}

publishToPlatform(jsonPath);
