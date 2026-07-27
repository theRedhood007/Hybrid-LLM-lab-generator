function baseRules(request) {
  return `
You are generating a CANDIDATE secure-coding training lab for a controlled educational platform.

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
      "payload": "<script>alert(1)</script>",
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
- The requested language is JavaScript.
- The requested framework is Node.js Express.
- Both vulnerableFiles/app.js and solutionFiles/app.js must be valid Node.js CommonJS JavaScript.
- Never generate PHP, Python, Java, browser-only JavaScript, or raw HTML as app.js.
- app.js must not contain <?php.
- app.js must not contain $_GET.
- app.js must not contain $_POST.
- app.js must not contain htmlspecialchars.
- app.js must not contain $app.
- app.js must not contain PHP syntax.
- app.js must use require("express").
- app.js must create the Express app using exactly: const app = express();
- app.js must define the port using exactly: const port = process.env.PORT || 3000;
- app.js must use app.get(...).
- app.js must start the server using app.listen(port, ...).
- Never hardcode app.listen(3000).
- Never hardcode app.listen(3001).
- Never omit process.env.PORT.

GLOBAL RULES:
- Generate only XSS labs.
- Generate only Node.js Express labs.
- Use GET routes only.
- Do not use POST routes.
- Do not use PUT routes.
- Do not use PATCH routes.
- Do not use DELETE routes.
- Do not use a database.
- Do not use authentication.
- Do not generate stored XSS yet.
- vulnerableFiles must contain exactly package.json and app.js.
- solutionFiles must contain exactly package.json and app.js.
- Do not include extra files.
- Both app.js files must contain: const port = process.env.PORT || 3000;
- Both app.js files must start the server using app.listen(port).
- Do not use app.listen(3000).
- Do not use app.listen(3001).
- Do not ignore process.env.PORT.
- package.json must include scripts.start: node app.js.
- package.json must include express dependency.

LAB ID RULES:
- labId must be clean lowercase kebab-case.
- Never include attempt numbers in labId.
- Never include retry numbers in labId.
- Never include timestamps in labId.
- Never include random IDs in labId.
- Never include the word "attempt" in labId.
- Correct example: xss-ticket-preview-node-express-advanced.
- Wrong example: xss-ticket-preview-node-express-advanced-attempt-3.

VULNERABLE APP GLOBAL RULES:
- vulnerableFiles/app.js must be intentionally vulnerable.
- vulnerableFiles/app.js must NOT define escapeHtml.
- vulnerableFiles/app.js must NOT call escapeHtml.
- vulnerableFiles/app.js must NOT use encodeURIComponent.
- vulnerableFiles/app.js must NOT use encodeURI.
- vulnerableFiles/app.js must NOT use .replace() to escape HTML.
- vulnerableFiles/app.js must NOT sanitize user input.
- vulnerableFiles/app.js must NOT use htmlspecialchars.
- vulnerableFiles/app.js must reflect the vulnerable parameter directly and unsafely.

SOLUTION APP GLOBAL RULES:
- solutionFiles/app.js must define the full escapeHtml function before the route.
- solutionFiles/app.js must call escapeHtml on every user-controlled query value before rendering.
- solutionFiles/app.js must NOT use encodeURIComponent.
- solutionFiles/app.js must NOT use encodeURI.
- solutionFiles/app.js must NOT use URL encoding as the XSS fix.
- solutionFiles/app.js must NOT use htmlspecialchars because this is not PHP.
- solutionFiles/app.js must fix XSS using HTML escaping.

The solution app.js must include this exact function:

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Both vulnerableFiles/app.js and solutionFiles/app.js must follow this required Node.js Express skeleton:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

// route goes here

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;
}

function scenarioRules(request) {
  const scenario = request.scenario || {};

  return `
SCENARIO RULES:
- You must follow the selected scenario.
- Scenario id: ${scenario.id || "unknown"}
- Scenario title: ${scenario.title || "unknown"}
- Scenario description: ${scenario.description || "unknown"}
- Business context: ${scenario.context || "unknown"}
- Attack surface: ${scenario.attack_surface || "unknown"}
- Expected sink: ${scenario.expected_sink || "unknown"}
- Required feature: ${scenario.required_feature || "unknown"}

The lab title, theme, route names, parameter names, normal test data, and HTML page content must match this scenario.
Do not ignore the selected scenario.
Do not replace it with product search, preview card, or support ticket unless that is the selected scenario.
`;
}


function packageRules(labId) {
  return `
The package.json content in both vulnerableFiles and solutionFiles must be valid JSON text equivalent to:
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
  const labId = "xss-product-search-node-express-beginner";

  return baseRules(request) + scenarioRules(request) + packageRules(labId) + `
BEGINNER LAB ONLY.
Do not generate Intermediate or Advanced routes.
Do not use /preview.
Do not use /ticket-preview.

Required metadata:
- labId must be exactly: xss-product-search-node-express-beginner
- title should be: Product Search XSS Beginner Lab
- attackType must be: XSS
- language must be: JavaScript
- framework must be: Node.js Express
- difficulty must be: Beginner
- theme should be: product search

Required vulnerable route:
GET /search?q=

Required vulnerable behavior:
- Read req.query.q.
- Reflect q directly into the response.
- Do not escape q.

vulnerableFiles/app.js must be valid Node.js Express JavaScript.
vulnerableFiles/app.js must use this complete pattern:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

app.get("/search", (req, res) => {
  const query = req.query.q || "";
  res.send("Search Results: " + query);
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

Required solution behavior:
- Read req.query.q.
- Escape q with escapeHtml.
- Return escaped q.

solutionFiles/app.js must be valid Node.js Express JavaScript.
solutionFiles/app.js must use this complete pattern:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/search", (req, res) => {
  const query = req.query.q || "";
  const safeQuery = escapeHtml(query);
  res.send("Search Results: " + safeQuery);
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

Required functional test:
{
  "name": "Product search returns query",
  "description": "Checks that normal product search works.",
  "method": "GET",
  "path": "/search?q=laptop",
  "expectedStatus": 200,
  "expectedBodyContains": ["Search Results: laptop"]
}

Required security payload:
{
  "name": "Basic reflected XSS payload",
  "payload": "<script>alert(1)</script>",
  "targetPath": "/search?q=<script>alert(1)</script>",
  "expectedVulnerableResult": "Search Results: <script>alert(1)</script>",
  "expectedFixedResult": "Search Results: &lt;script&gt;alert(1)&lt;/script&gt;"
}

Final Beginner checklist:
- app.js is JavaScript, not PHP.
- app.js uses require("express").
- app.js uses const app = express();
- app.js uses const port = process.env.PORT || 3000;
- app.js uses app.listen(port, ...).
- vulnerable route is /search.
- vulnerable app reflects q directly.
- vulnerable app does not use escapeHtml.
- solution app defines escapeHtml.
- solution app escapes q.
- functionalTests path is /search?q=laptop.
- securityPayloads targetPath is /search?q=<script>alert(1)</script>.

Return valid JSON only.
`;
}

function buildIntermediatePrompt(request) {
  const labId = "xss-preview-card-node-express-intermediate";

  return baseRules(request) + scenarioRules(request) + packageRules(labId) + `
INTERMEDIATE LAB ONLY.
Do not generate Beginner route.
Do not use /search.
Do not use /ticket-preview.

Required metadata:
- labId must be exactly: xss-preview-card-node-express-intermediate
- title should be: XSS Preview Card with Node.js Express Intermediate Lab
- attackType must be: XSS
- language must be: JavaScript
- framework must be: Node.js Express
- difficulty must be: Intermediate
- theme should be: preview card

Required vulnerable route:
GET /preview?title=&description=

Required vulnerable behavior:
- Read req.query.title.
- Read req.query.description.
- Reflect title and description directly into HTML.
- The vulnerable parameter is description.
- Do not escape title.
- Do not escape description.

vulnerableFiles/app.js must be valid Node.js Express JavaScript.
vulnerableFiles/app.js must use this complete pattern:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

app.get("/preview", (req, res) => {
  const title = req.query.title || "";
  const description = req.query.description || "";
  res.send("<h1>" + title + "</h1><p>" + description + "</p>");
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

Required solution behavior:
- Read req.query.title.
- Read req.query.description.
- Escape both title and description with escapeHtml.
- Return escaped values.

solutionFiles/app.js must be valid Node.js Express JavaScript.
solutionFiles/app.js must use this complete pattern:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/preview", (req, res) => {
  const title = req.query.title || "";
  const description = req.query.description || "";
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  res.send("<h1>" + safeTitle + "</h1><p>" + safeDescription + "</p>");
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

Required functional test:
{
  "name": "Preview card renders normal input",
  "description": "Checks that normal title and description are rendered.",
  "method": "GET",
  "path": "/preview?title=Phone&description=Nice",
  "expectedStatus": 200,
  "expectedBodyContains": ["Phone", "Nice"]
}

Required security payload:
{
  "name": "XSS in preview description",
  "payload": "<script>alert(1)</script>",
  "targetPath": "/preview?title=Phone&description=<script>alert(1)</script>",
  "expectedVulnerableResult": "<script>alert(1)</script>",
  "expectedFixedResult": "&lt;script&gt;alert(1)&lt;/script&gt;"
}

Final Intermediate checklist:
- app.js is JavaScript, not PHP.
- app.js uses require("express").
- app.js uses const app = express();
- app.js uses const port = process.env.PORT || 3000;
- app.js uses app.listen(port, ...).
- vulnerable route is /preview, not /search.
- vulnerable app reflects description directly.
- vulnerable app does not use escapeHtml.
- solution app defines escapeHtml.
- solution app escapes description.
- functionalTests path is /preview?title=Phone&description=Nice.
- securityPayloads targetPath is /preview?title=Phone&description=<script>alert(1)</script>.

Return valid JSON only.
`;
}

function buildAdvancedPrompt(request) {
  const labId = "xss-ticket-preview-node-express-advanced";

  return baseRules(request) + scenarioRules(request) + packageRules(labId) + `
ADVANCED LAB ONLY.
Do not generate Beginner route.
Do not use /search.
Do not generate Intermediate route.
Do not use /preview.

Required metadata:
- labId must be exactly: xss-ticket-preview-node-express-advanced
- title should be: Support Ticket Preview XSS Advanced Lab
- attackType must be: XSS
- language must be: JavaScript
- framework must be: Node.js Express
- difficulty must be: Advanced
- theme should be: support ticket preview

Required vulnerable route:
GET /ticket-preview?subject=&message=&priority=

IMPORTANT:
Do not change the required app.js code patterns.
Only expand functionalTests and securityPayloads arrays.
vulnerableFiles/app.js must still contain app.get("/ticket-preview", ...).
solutionFiles/app.js must still contain app.get("/ticket-preview", ...).

Required vulnerable behavior:
- Read req.query.subject.
- Read req.query.message.
- Read req.query.priority.
- Reflect subject, message, and priority directly into HTML.
- The vulnerable parameter is message.
- Do not escape subject.
- Do not escape message.
- Do not escape priority.

vulnerableFiles/app.js must be valid Node.js Express JavaScript.
vulnerableFiles/app.js must use this complete pattern exactly:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

app.get("/ticket-preview", (req, res) => {
  const subject = req.query.subject || "";
  const message = req.query.message || "";
  const priority = req.query.priority || "";
  res.send("<h1>" + subject + "</h1><p>" + message + "</p><strong>" + priority + "</strong>");
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

Required solution behavior:
- Read req.query.subject.
- Read req.query.message.
- Read req.query.priority.
- Escape subject, message, and priority with escapeHtml.
- Return escaped values.

solutionFiles/app.js must be valid Node.js Express JavaScript.
solutionFiles/app.js must use this complete pattern exactly:

const express = require("express");
const port = process.env.PORT || 3000;

const app = express();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/ticket-preview", (req, res) => {
  const subject = req.query.subject || "";
  const message = req.query.message || "";
  const priority = req.query.priority || "";
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);
  const safePriority = escapeHtml(priority);
  res.send("<h1>" + safeSubject + "</h1><p>" + safeMessage + "</p><strong>" + safePriority + "</strong>");
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

ADVANCED TEST COVERAGE REQUIREMENTS

Generate at least 10 functionalTests objects.

The functionalTests array must contain:
- normal request
- empty subject
- empty message
- empty priority
- long subject
- long message
- special characters
- unicode characters
- multiple query parameters
- edge case rendering test

Generate at least 9 securityPayloads objects.

The securityPayloads array must contain:
- <script>alert(1)</script>
- <img src=x onerror=alert(1)>
- <svg onload=alert(1)>
- "><script>alert(1)</script>
- '><script>alert(1)</script>
- javascript:alert(1)
- <body onload=alert(1)>
- nested HTML payload
- encoded XSS payload

Do not generate fewer than 10 functionalTests.
Do not generate fewer than 9 securityPayloads.

If fewer are generated, the output is invalid.

Final Advanced checklist:
- app.js is JavaScript, not PHP.
- app.js does not contain <?php.
- app.js does not contain $_GET.
- app.js does not contain htmlspecialchars.
- app.js does not contain $app.
- app.js uses require("express").
- app.js uses const app = express();
- app.js uses const port = process.env.PORT || 3000;
- app.js uses app.listen(port, ...).
- vulnerable route is /ticket-preview, not /search.
- vulnerable route is /ticket-preview, not /preview.
- vulnerable app reflects message directly.
- vulnerable app does not use escapeHtml.
- solution app defines escapeHtml.
- solution app escapes message.
- functionalTests path is /ticket-preview?subject=Login-Issue&message=Cannot-login&priority=high.
- securityPayloads targetPath is /ticket-preview?subject=Login-Issue&message=<script>alert(1)</script>&priority=high.

Return valid JSON only.
`;
}

function buildLabPrompt(request) {
  const difficulty = String(request.difficulty || "Beginner").toLowerCase();

  if (difficulty === "intermediate") {
    return buildIntermediatePrompt(request);
  }

  if (difficulty === "advanced" || difficulty === "hard") {
    return buildAdvancedPrompt(request);
  }

  return buildBeginnerPrompt(request);
}

module.exports = {
  buildLabPrompt
};
