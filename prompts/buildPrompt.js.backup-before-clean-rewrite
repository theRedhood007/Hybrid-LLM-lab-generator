function escapeHtmlSnippet() {
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

function baseRules(request) {
  return `
You are generating a secure-coding training lab for a controlled educational platform.

Admin request:
${JSON.stringify(request, null, 2)}

Return ONLY valid JSON.
Do not include markdown.
Do not wrap JSON in triple backticks.
Do not include explanations outside JSON.

Top-level JSON structure must be:
{
  "labId": "string",
  "title": "string",
  "attackType": "XSS",
  "language": "JavaScript",
  "framework": "Node.js Express",
  "difficulty": "string",
  "theme": "string",
  "description": "string",
  "vulnerableFiles": [
    { "path": "package.json", "content": "string" },
    { "path": "app.js", "content": "string" }
  ],
  "solutionFiles": [
    { "path": "package.json", "content": "string" },
    { "path": "app.js", "content": "string" }
  ],
  "functionalTests": [
    {
      "name": "string",
      "description": "string",
      "method": "GET",
      "path": "string",
      "expectedStatus": 200,
      "expectedBodyContains": ["string"]
    }
  ],
  "securityPayloads": [
    {
      "name": "string",
      "payload": "string",
      "targetPath": "string",
      "expectedVulnerableResult": "string",
      "expectedFixedResult": "string"
    }
  ],
  "expectedBehavior": {
    "vulnerable": "string",
    "fixed": "string"
  }
}

STRICT LANGUAGE RULES:
- Generate only JavaScript.
- Generate only Node.js Express.
- app.js must use CommonJS require("express").
- app.js must create the Express app using exactly: const app = express();
- app.js must define the port using exactly: const port = process.env.PORT || 3000;
- app.js must start the server using app.listen(port, ...).
- Never generate PHP, Python, Java, browser-only JavaScript, or raw HTML as app.js.
- Never use <?php, $_GET, $_POST, htmlspecialchars, or PHP syntax.
- Use GET routes only.
- Do not use a database.
- Do not use authentication.
- vulnerableFiles must contain exactly package.json and app.js.
- solutionFiles must contain exactly package.json and app.js.

PACKAGE.JSON RULES:
- package.json must be valid JSON text only.
- package.json must include scripts.start: node app.js.
- package.json must include express dependency.
- package.json must not contain comments, markdown, module.exports, or JavaScript code.

VULNERABILITY RULES:
- This is an XSS lab.
- vulnerableFiles/app.js must be intentionally vulnerable.
- vulnerableFiles/app.js must NOT define escapeHtml.
- vulnerableFiles/app.js must NOT call escapeHtml.
- vulnerableFiles/app.js must NOT use encodeURIComponent.
- vulnerableFiles/app.js must NOT use encodeURI.
- vulnerableFiles/app.js must NOT sanitize user input.
- vulnerableFiles/app.js must reflect at least one query parameter directly and unsafely into HTML.

SOLUTION RULES:
- solutionFiles/app.js must define escapeHtml before routes.
- solutionFiles/app.js must call escapeHtml on every user-controlled query value before rendering.
- solutionFiles/app.js must NOT use encodeURIComponent or encodeURI as the fix.
- solutionFiles/app.js must fix XSS using HTML escaping.

The solution app.js must include this exact function:
${escapeHtmlSnippet()}

QUALITY RULES:
- Do NOT generate a tiny "Result: input" app.
- Do NOT generate a 10-line proof of concept.
- Generate a small realistic training application.
- Include realistic HTML using template strings.
- Include a form.
- Include header/main/section layout.
- Include a scenario data array.
- Include result cards, preview cards, or table rows.
`;
}

function scenarioRules(request) {
  const scenario = request.scenario || {};

  return `
SCENARIO RULES:
- Scenario id: ${scenario.id || "generated"}
- Scenario title: ${scenario.title || "Generated XSS Lab"}
- Scenario description: ${scenario.description || "Generated XSS scenario"}
- Business context: ${scenario.context || "training scenario"}
- Attack surface: ${scenario.attack_surface || "query parameter reflected into HTML"}
- Expected sink: ${scenario.expected_sink || "HTML response"}
- Required feature: ${scenario.required_feature || "preview/search feature"}
- Required route: ${scenario.route || "/lab"}
- Required query parameters: ${(scenario.params || ["input"]).join(", ")}

The title, theme, route names, parameter names, normal test data, and HTML page content must match the selected scenario.
Do not ignore the selected scenario.
`;
}

function packageRules(labId) {
  return `
Both package.json files must contain valid JSON text equivalent to:
{
  "name": "${labId}",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
`;
}

function buildBeginnerPrompt(request) {
  const scenario = request.scenario || {};
  const labId = `xss-${scenario.id || "generated"}-node-express-beginner`;
  const route = scenario.route || "/lab";
  const param = (scenario.params || ["input"])[0] || "input";

  return baseRules(request) + scenarioRules(request) + packageRules(labId) + `
BEGINNER LAB ONLY.

Required metadata:
- labId must be exactly: ${labId}
- difficulty must be: Beginner
- attackType must be: XSS
- language must be: JavaScript
- framework must be: Node.js Express

BEGINNER SOURCE CODE REQUIREMENTS:
- vulnerableFiles/app.js must contain at least 70 non-empty lines.
- solutionFiles/app.js must contain at least 80 non-empty lines.
- Include at least 2 Express routes:
  1. GET /
  2. GET ${route}
- GET / must render a homepage with scenario explanation and a form.
- GET ${route} must read req.query["${param}"].
- Include a scenario data array with at least 5 objects.
- Render realistic HTML with form, heading, instructions, and result cards/list items.
- The vulnerable app must reflect ${param} unsafely inside:
  1. visible text
  2. an input value attribute
- The solution must escape ${param} everywhere it is rendered.

TEST REQUIREMENTS:
- Include at least 3 functionalTests.
- Include at least 3 securityPayloads.
- Security payloads must include:
  1. <script>alert(1)</script>
  2. <img src=x onerror=alert(1)>
  3. " autofocus onfocus="alert(1)

Expected vulnerable result must contain the raw payload.
Expected fixed result must contain the escaped payload.
`;
}

function buildIntermediatePrompt(request) {
  const scenario = request.scenario || {};
  const labId = `xss-${scenario.id || "generated"}-node-express-intermediate`;

  return baseRules(request) + scenarioRules(request) + packageRules(labId) + `
INTERMEDIATE LAB ONLY.

Required metadata:
- labId must be exactly: ${labId}
- difficulty must be: Intermediate
- attackType must be: XSS
- language must be: JavaScript
- framework must be: Node.js Express

INTERMEDIATE SOURCE CODE REQUIREMENTS:
- vulnerableFiles/app.js must contain at least 120 non-empty lines.
- solutionFiles/app.js must contain at least 130 non-empty lines.
- Include at least 3 Express routes.
- Include GET / as a homepage route.
- Include a realistic preview/review workflow.
- Read multiple user-controlled query parameters.
- Reflect multiple query values directly and unsafely into HTML.
- Include a scenario data array with at least 6 objects.
- Render full HTML pages with forms, cards, navigation, and preview output.
- The solution must escape every user-controlled query value before rendering.
- The code must clearly be harder than beginner.

TEST REQUIREMENTS:
- Include at least 5 functionalTests.
- Include at least 5 securityPayloads.
- Security payloads must test more than one reflected field.
`;
}

function buildAdvancedPrompt(request) {
  const scenario = request.scenario || {};
  const labId = `xss-${scenario.id || "generated"}-node-express-advanced`;

  return baseRules(request) + scenarioRules(request) + packageRules(labId) + `
ADVANCED LAB ONLY.

Required metadata:
- labId must be exactly: ${labId}
- difficulty must be: Advanced
- attackType must be: XSS
- language must be: JavaScript
- framework must be: Node.js Express

ADVANCED SOURCE CODE REQUIREMENTS:
- vulnerableFiles/app.js must contain at least 180 non-empty lines.
- solutionFiles/app.js must contain at least 190 non-empty lines.
- Include at least 4 Express routes.
- Include GET / as a homepage/dashboard route.
- Include helper render functions.
- Include a realistic business workflow with multiple fields.
- Read multiple user-controlled query parameters.
- Include a scenario data array with at least 8 objects.
- Render realistic HTML with dashboard, forms, cards/tables, and preview output.
- Include a less obvious XSS sink than beginner/intermediate.
- Reflect at least one user-controlled value directly and unsafely into HTML.
- The solution must escape every user-controlled query value before rendering.
- The code must clearly be harder than intermediate.

TEST REQUIREMENTS:
- Include at least 8 functionalTests.
- Include at least 8 securityPayloads.
- Security payloads must test multiple fields and multiple XSS payload styles.
`;
}

function buildLabPrompt(request) {
  const difficulty = String(request.difficulty || "").toLowerCase();

  if (difficulty === "beginner") {
    return buildBeginnerPrompt(request);
  }

  if (difficulty === "intermediate") {
    return buildIntermediatePrompt(request);
  }

  if (difficulty === "advanced") {
    return buildAdvancedPrompt(request);
  }

  throw new Error(`Unsupported difficulty: ${request.difficulty}`);
}

module.exports = {
  buildLabPrompt
};
