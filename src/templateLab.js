function buildPackageJson(labId) {
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

function escapeHtmlFunction() {
  return `
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
`;
}

function buildBeginnerLab({ scenarioId, title, theme, description, route = "/lab", param = "input" }) {
  const labId = `xss-${scenarioId}-node-express-beginner`;

  const vulnerableApp = `const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

app.get("${route}", (req, res) => {
  const input = req.query["${param}"] || "";
  res.send("Result: " + input);
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;

  const solutionApp = `const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

${escapeHtmlFunction()}

app.get("${route}", (req, res) => {
  const input = req.query["${param}"] || "";
  const safeInput = escapeHtml(input);
  res.send("Result: " + safeInput);
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;

  return {
    labId,
    title,
    attackType: "XSS",
    language: "JavaScript",
    framework: "Node.js Express",
    difficulty: "Beginner",
    theme,
    description,
    vulnerableFiles: [
      { path: "package.json", content: buildPackageJson(labId) },
      { path: "app.js", content: vulnerableApp }
    ],
    solutionFiles: [
      { path: "package.json", content: buildPackageJson(labId) },
      { path: "app.js", content: solutionApp }
    ],
    functionalTests: [
      {
        name: "Scenario page returns input",
        description: "Checks that normal scenario input is reflected.",
        method: "GET",
        path: `${route}?${param}=hello`,
        expectedStatus: 200,
        expectedBodyContains: ["Result: hello"]
      }
    ],
    securityPayloads: [
      {
        name: "Basic reflected XSS payload",
        payload: "<script>alert(1)</script>",
        targetPath: `${route}?${param}=<script>alert(1)</script>`,
        expectedVulnerableResult: "Result: <script>alert(1)</script>",
        expectedFixedResult: "Result: &lt;script&gt;alert(1)&lt;/script&gt;"
      }
    ],
    expectedBehavior: {
      vulnerable: "Reflects user input directly without escaping.",
      fixed: "Escapes user input before rendering it."
    }
  };
}

module.exports = {
  buildBeginnerLab
};
