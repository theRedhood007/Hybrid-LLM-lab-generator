const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function titleCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeForJs(value) {
  return JSON.stringify(value);
}

function buildSlug(spec) {
  return `xss-${spec.scenarioId}-node-express-${spec.difficulty}`;
}

function buildPackageJson(slug) {
  return JSON.stringify({
    name: slug,
    version: "1.0.0",
    main: "app.js",
    scripts: {
      start: "node app.js"
    },
    dependencies: {
      express: "^4.18.2"
    }
  }, null, 2);
}


function buildDockerfile() {
  return `
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY app.js ./

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
`.trim();
}

function buildVulnerableApp(spec) {
  const items = JSON.stringify(spec.scenarioItems, null, 2);

  return `
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const products = ${items};

function findProducts(input) {
  const value = String(input || "").toLowerCase();
  if (!value) {
    return products;
  }

  return products.filter((product) => {
    const text = [
      product.name,
      product.category,
      product.description
    ].join(" ").toLowerCase();

    return text.includes(value);
  });
}

function renderProductCards(list) {
  return list.map((product) => \`
    <article class="product-card">
      <h3>\${product.name}</h3>
      <p><strong>Category:</strong> \${product.category}</p>
      <p>\${product.description}</p>
    </article>
  \`).join("");
}

app.get("/", (req, res) => {
  const cards = renderProductCards(products);

  res.send(\`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${spec.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 960px;
      margin: 40px auto;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
    }
    header, main, section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 18px;
    }
    input {
      padding: 10px;
      width: 320px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    button {
      padding: 10px 14px;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
    }
    .product-card {
      border-top: 1px solid #e2e8f0;
      padding: 12px 0;
    }
  </style>
</head>
<body>
  <header>
    <h1>${spec.title}</h1>
    <p>${spec.summary}</p>
  </header>

  <main>
    <section>
      <h2>Product Search</h2>
      <form action="/lab" method="GET">
        <label for="input">Search the sports store catalog</label>
        <br>
        <input id="input" name="input" placeholder="Try shoes, jersey, gloves">
        <button type="submit">Search</button>
      </form>
    </section>

    <section>
      <h2>Featured Products</h2>
      \${cards}
    </section>
  </main>
</body>
</html>
  \`);
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.get("/lab", (req, res) => {
  const input = req.query.input || "";
  const matches = findProducts(input);
  const cards = renderProductCards(matches);

  res.send(\`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Search Results - ${spec.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 960px;
      margin: 40px auto;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
    }
    header, main, section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 18px;
    }
    .warning {
      background: #ffedd5;
      border: 1px solid #fdba74;
      border-radius: 8px;
      padding: 12px;
    }
    .product-card {
      border-top: 1px solid #e2e8f0;
      padding: 12px 0;
    }
  </style>
</head>
<body>
  <header>
    <h1>Search Results</h1>
    <p class="warning">Training lab: this page intentionally reflects user input unsafely.</p>
  </header>

  <main>
    <section>
      <h2>Search Term</h2>
      <p>You searched for: \${input}</p>
    </section>

    <section>
      <h2>Matching Products</h2>
      \${cards || "<p>No matching products were found.</p>"}
    </section>

    <section>
      <a href="/">Back to store</a>
    </section>
  </main>
</body>
</html>
  \`);
});

app.listen(port, () => {
  console.log(\`Lab server running on port \${port}\`);
});
`.trim();
}

function buildSolutionApp(spec) {
  const items = JSON.stringify(spec.scenarioItems, null, 2);

  return `
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const products = ${items};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findProducts(input) {
  const value = String(input || "").toLowerCase();
  if (!value) {
    return products;
  }

  return products.filter((product) => {
    const text = [
      product.name,
      product.category,
      product.description
    ].join(" ").toLowerCase();

    return text.includes(value);
  });
}

function renderProductCards(list) {
  return list.map((product) => \`
    <article class="product-card">
      <h3>\${escapeHtml(product.name)}</h3>
      <p><strong>Category:</strong> \${escapeHtml(product.category)}</p>
      <p>\${escapeHtml(product.description)}</p>
    </article>
  \`).join("");
}

app.get("/", (req, res) => {
  const cards = renderProductCards(products);

  res.send(\`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${spec.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 960px;
      margin: 40px auto;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
    }
    header, main, section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 18px;
    }
    input {
      padding: 10px;
      width: 320px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    button {
      padding: 10px 14px;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
    }
    .product-card {
      border-top: 1px solid #e2e8f0;
      padding: 12px 0;
    }
  </style>
</head>
<body>
  <header>
    <h1>${spec.title}</h1>
    <p>${spec.summary}</p>
  </header>

  <main>
    <section>
      <h2>Product Search</h2>
      <form action="/lab" method="GET">
        <label for="input">Search the sports store catalog</label>
        <br>
        <input id="input" name="input" placeholder="Try shoes, jersey, gloves">
        <button type="submit">Search</button>
      </form>
    </section>

    <section>
      <h2>Featured Products</h2>
      \${cards}
    </section>
  </main>
</body>
</html>
  \`);
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.get("/lab", (req, res) => {
  const input = req.query.input || "";
  const safeInput = escapeHtml(input);
  const matches = findProducts(input);
  const cards = renderProductCards(matches);

  res.send(\`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Search Results - ${spec.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 960px;
      margin: 40px auto;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
    }
    header, main, section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 18px;
    }
    .success {
      background: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 12px;
    }
    .product-card {
      border-top: 1px solid #e2e8f0;
      padding: 12px 0;
    }
  </style>
</head>
<body>
  <header>
    <h1>Search Results</h1>
    <p class="success">User input is safely escaped before rendering.</p>
  </header>

  <main>
    <section>
      <h2>Search Term</h2>
      <p>You searched for: \${safeInput}</p>
    </section>

    <section>
      <h2>Matching Products</h2>
      \${cards || "<p>No matching products were found.</p>"}
    </section>

    <section>
      <a href="/">Back to store</a>
    </section>
  </main>
</body>
</html>
  \`);
});

app.listen(port, () => {
  console.log(\`Lab server running on port \${port}\`);
});
`.trim();
}

function buildFunctionalTestsMeta(spec) {
  const normalInput = spec.normalInputs[0] || "shoes";

  return [
    {
      name: "Home page loads",
      description: "Checks that the sports store home page loads successfully.",
      method: "GET",
      path: "/",
      expectedStatus: 200,
      expectedBodyContains: [spec.title]
    },
    {
      name: "Health endpoint works",
      description: "Checks that the lab container health endpoint responds.",
      method: "GET",
      path: "/health",
      expectedStatus: 200,
      expectedBodyContains: ["ok"]
    },
    {
      name: "Scenario page returns normal input",
      description: "Checks that normal search input is reflected in the result page.",
      method: "GET",
      path: `/lab?input=${encodeURIComponent(normalInput)}`,
      expectedStatus: 200,
      expectedBodyContains: ["You searched for:", normalInput]
    },
    {
      name: "Empty search still renders",
      description: "Checks that the search page works without an input value.",
      method: "GET",
      path: "/lab",
      expectedStatus: 200,
      expectedBodyContains: ["Search Results"]
    },
    {
      name: "Business context is visible",
      description: "Checks that the page keeps the sports store scenario visible.",
      method: "GET",
      path: "/",
      expectedStatus: 200,
      expectedBodyContains: ["Featured Products"]
    }
  ];
}

function buildSecurityPayloadsMeta(spec) {
  const payloads = spec.xssPayloads && spec.xssPayloads.length >= 3
    ? spec.xssPayloads
    : [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "\"><svg onload=alert(1)>"
      ];

  return payloads.slice(0, 5).map((payload, index) => ({
    name: `Reflected XSS payload ${index + 1}`,
    payload,
    targetPath: `/lab?input=${encodeURIComponent(payload)}`,
    expectedVulnerableResult: `You searched for: ${payload}`,
    expectedFixedResult: `You searched for: ${String(payload)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")}`
  }));
}


function buildExpectedBehavior(spec) {
  const normalInput = spec.normalInputs[0] || "shoes";
  const payload = spec.xssPayloads[0] || "<script>alert(1)</script>";

  const escapedPayload = String(payload)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return {
    vulnerable: {
      description: "The vulnerable version reflects the search input directly into the HTML response without escaping.",
      normalInput,
      xssPayload: payload,
      expectedNormalResult: `You searched for: ${normalInput}`,
      expectedVulnerableResult: `You searched for: ${payload}`
    },
    fixed: {
      description: "The fixed version escapes user-controlled input before rendering it into the HTML response.",
      normalInput,
      xssPayload: payload,
      expectedNormalResult: `You searched for: ${normalInput}`,
      expectedFixedResult: `You searched for: ${escapedPayload}`
    }
  };
}


function buildFunctionalTest(spec) {
  if (typeof buildFunctionalPytest === "function") {
    return buildFunctionalPytest(spec);
  }

  const normalInput = spec.normalInputs && spec.normalInputs[0] ? spec.normalInputs[0] : "shoes";

  return `
import requests

BASE_URL = "http://localhost:3000"

def test_home_page_loads():
    response = requests.get(BASE_URL + "/")
    assert response.status_code == 200
    assert ${JSON.stringify("${spec.title}")} in response.text

def test_health_endpoint():
    response = requests.get(BASE_URL + "/health")
    assert response.status_code == 200
    assert "ok" in response.text

def test_lab_route_reflects_normal_input():
    response = requests.get(BASE_URL + "/lab", params={"input": ${JSON.stringify("${normalInput}")}})
    assert response.status_code == 200
    assert "You searched for:" in response.text
`.trim();
}

function buildSecurityTest(spec) {
  if (typeof buildSecurityPytest === "function") {
    return buildSecurityPytest(spec);
  }

  const payload = spec.xssPayloads && spec.xssPayloads[0] ? spec.xssPayloads[0] : "<script>alert(1)</script>";
  const escaped = String(payload)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return `
import requests

BASE_URL = "http://localhost:3000"

def test_xss_payload_is_reflected_in_vulnerable_version():
    payload = ${JSON.stringify("${payload}")}
    response = requests.get(BASE_URL + "/lab", params={"input": payload})
    assert response.status_code == 200
    assert payload in response.text

def test_xss_payload_is_escaped_in_fixed_version():
    payload = ${JSON.stringify("${payload}")}
    response = requests.get(BASE_URL + "/lab", params={"input": payload})
    assert response.status_code == 200
    assert ${JSON.stringify("${escaped}")} in response.text
`.trim();
}

function buildPytestIni() {
  return `[pytest]
testpaths =
    functional
    security
python_files = test_*.py
`;
}

function buildRequirements() {
  return `requests==2.31.0
pytest==7.4.3
`;
}



function buildLabYaml(spec, slug) {
  const title = String(spec.title || "Generated XSS Lab").replace(/"/g, '\\"');
  const description = String(spec.summary || "Generated reflected XSS lab.").replace(/"/g, '\\"');
  const difficulty = spec.difficulty || "beginner";

  return `
schema_version: 1
id: ${slug}
slug: ${slug}
title: "${title}"
description: "${description}"
vulnerability_type: xss
difficulty: ${difficulty}
estimated_time_minutes: ${difficulty === "advanced" ? 60 : difficulty === "intermediate" ? 45 : 30}
points: ${difficulty === "advanced" ? 200 : difficulty === "intermediate" ? 150 : 100}
definition_source: yaml
is_active: true

runtime:
  memory_limit: "256m"
  cpu_limit: "0.5"
  timeout_sec: 30

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
      dockerfile: languages/javascript/app/Dockerfile
      internal_port: 3000
      health_path: /health
      env:
        PORT: "3000"
      patchable_files:
        - app.js
`.trim();
}

function main() {
  const specFile = process.argv[2];

  if (!specFile) {
    console.error("Usage: node src/compileSpecToLab.js <labSpec.json>");
    process.exit(1);
  }

  const spec = readJson(specFile);
  const slug = buildSlug(spec);

  const lab = {
    labId: slug,
    slug,
    title: spec.title,
    attackType: "XSS",
    vulnerabilityType: "xss",
    language: "JavaScript",
    framework: "Node.js Express",
    difficulty: titleCase(spec.difficulty),
    theme: spec.businessContext,
    description: spec.summary,
    learningObjectives: spec.learningObjectives,
    winConditions: spec.winConditions,
    route: spec.route,
    params: spec.params,
    scenarioItems: spec.scenarioItems,

    functionalTests: buildFunctionalTestsMeta(spec),
    securityPayloads: buildSecurityPayloadsMeta(spec),
    expectedBehavior: buildExpectedBehavior(spec),

    vulnerableFiles: [
      {
        path: "package.json",
        content: buildPackageJson(slug)
      },
      {
        path: "app.js",
        content: buildVulnerableApp(spec)
      },
      {
        path: "Dockerfile",
        content: buildDockerfile()
      }
    ],

    solutionFiles: [
      {
        path: "package.json",
        content: buildPackageJson(slug)
      },
      {
        path: "app.js",
        content: buildSolutionApp(spec)
      },
      {
        path: "Dockerfile",
        content: buildDockerfile()
      }
    ],

    testFiles: [
      {
        path: "tests/functional/test_generated_functionality.py",
        content: buildFunctionalTest(spec)
      },
      {
        path: "tests/security/test_generated_security.py",
        content: buildSecurityTest(spec)
      },
      {
        path: "tests/pytest.ini",
        content: buildPytestIni()
      },
      {
        path: "tests/requirements.txt",
        content: buildRequirements()
      }
    ],

    platformFiles: [
      {
        path: "lab.yaml",
        content: buildLabYaml(spec, slug)
      }
    ]
  };

  fs.mkdirSync("generated", { recursive: true });

  const outFile = path.join("generated", `${slug}.json`);
  fs.writeFileSync(outFile, JSON.stringify(lab, null, 2));

  console.log(`[COMPILE PASS] ${outFile}`);
}

main();
