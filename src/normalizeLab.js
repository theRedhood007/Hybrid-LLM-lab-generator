const fs = require("fs");
const prettier = require("prettier");

async function formatJavaScript(content) {
  try {
    return await prettier.format(content, {
      parser: "babel",
      semi: true,
      singleQuote: false
    });
  } catch {
    return content;
  }
}

async function normalizeFileList(files) {
  if (!Array.isArray(files)) return files;

  for (const file of files) {
    if (!file || typeof file !== "object") continue;

    if (file.path === "app.js" && typeof file.content === "string") {
      file.content = await formatJavaScript(file.content);
    }

    if (file.path === "package.json" && typeof file.content === "string") {
      try {
        const pkg = JSON.parse(file.content);
        file.content = JSON.stringify(pkg, null, 2);
      } catch {
        // Leave it unchanged. Validator will reject invalid package.json.
      }
    }
  }

  return files;
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: node src/normalizeLab.js <lab-json>");
    process.exit(1);
  }

  const lab = JSON.parse(fs.readFileSync(filePath, "utf8"));

  lab.vulnerableFiles = await normalizeFileList(lab.vulnerableFiles);
  lab.solutionFiles = await normalizeFileList(lab.solutionFiles);

  fs.writeFileSync(filePath, JSON.stringify(lab, null, 2));

  console.log(`[NORMALIZE] Formatted candidate: ${filePath}`);
}

main();
