const fs = require("fs");
const path = require("path");

const vulnerableApp = `const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const products = [
  { name: "Velocity Running Shoes", category: "Footwear", price: "$89" },
  { name: "Training Gloves", category: "Gym", price: "$24" },
  { name: "Pro Team Jersey", category: "Clothing", price: "$49" },
  { name: "Fitness Resistance Bands", category: "Training", price: "$15" }
];

app.get("/health", (req, res) => res.status(200).send("OK"));

app.get("/", (req, res) => {
  res.send(\`
    <h1>Sports Store</h1>
    <p>Search for shoes, jerseys, gloves, and training gear.</p>
    <form action="/search" method="GET">
      <input name="q" placeholder="Search products" />
      <button type="submit">Search</button>
    </form>
  \`);
});

app.get("/search", (req, res) => {
  const q = req.query.q || "";
  const matches = products.filter((p) =>
    p.name.toLowerCase().includes(String(q).toLowerCase()) ||
    p.category.toLowerCase().includes(String(q).toLowerCase())
  );

  const productHtml = matches.map((p) => \`
    <li>
      <strong>\${p.name}</strong>
      <span>\${p.category}</span>
      <em>\${p.price}</em>
    </li>
  \`).join("");

  res.send(\`
    <h1>Sports Store Search</h1>
    <p>Search results for: \${q}</p>
    <ul>\${productHtml || "<li>No products found</li>"}</ul>
    <a href="/">Back to home</a>
  \`);
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;

const solutionApp = vulnerableApp.replace(
  'const app = express();',
  `const app = express();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}`
).replace(
  '<p>Search results for: ${q}</p>',
  '<p>Search results for: ${escapeHtml(q)}</p>'
);

const pkg = `{
  "name": "sports-store-product-search-xss",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}`;

const lab = {
  labId: "xss-sports-store-search-node-express-beginner",
  title: "Sports Store Product Search XSS",
  attackType: "XSS",
  language: "JavaScript",
  framework: "Node.js Express",
  difficulty: "Beginner",
  theme: "Sports Store",
  description:
    "An online sportswear store has a product search page that reflects the search query into the HTML response. Students must identify and fix the reflected XSS vulnerability.",
  vulnerableFiles: [
    { path: "package.json", content: pkg },
    { path: "app.js", content: vulnerableApp }
  ],
  solutionFiles: [
    { path: "package.json", content: pkg },
    { path: "app.js", content: solutionApp }
  ],
  functionalTests: [
    {
      name: "Homepage loads search form",
      description: "Checks that the sports store homepage is available.",
      method: "GET",
      path: "/",
      expectedStatus: 200,
      expectedBodyContains: ["Sports Store", "Search products"]
    },
    {
      name: "Search page returns normal input",
      description: "Checks that normal search input is reflected.",
      method: "GET",
      path: "/search?q=shoes",
      expectedStatus: 200,
      expectedBodyContains: ["Sports Store Search", "Search results for: shoes"]
    }
  ],
  securityPayloads: [
    {
      name: "Basic reflected XSS payload",
      payload: "<script>alert(1)</script>",
      targetPath: "/search?q=<script>alert(1)</script>",
      expectedVulnerableResult: "Search results for: <script>alert(1)</script>",
      expectedFixedResult: "Search results for: &lt;script&gt;alert(1)&lt;/script&gt;"
    }
  ],
  expectedBehavior: {
    vulnerable: "The search query is reflected directly into the HTML response.",
    fixed: "The search query is escaped before being rendered in HTML."
  }
};

const out = path.join(__dirname, "..", "generated", "xss-sports-store-search-node-express-beginner.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(lab, null, 2));
console.log(`[OK] Wrote ${out}`);
