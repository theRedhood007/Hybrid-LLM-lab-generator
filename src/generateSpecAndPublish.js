const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(command, args) {
  console.log(`\n[RUN] ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function newestFile(dir, suffix) {
  const files = fs.readdirSync(dir)
    .filter((file) => file.endsWith(suffix))
    .map((file) => ({
      file,
      fullPath: path.join(dir, file),
      mtime: fs.statSync(path.join(dir, file)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new Error(`No ${suffix} files found in ${dir}`);
  }

  return files[0].fullPath;
}

function main() {
  const requestFile = process.argv[2];

  if (!requestFile) {
    console.error("Usage: node src/generateSpecAndPublish.js <request.json>");
    process.exit(1);
  }

  run("node", ["src/generateLabSpec.js", requestFile]);

  const specFile = newestFile("generated-specs", ".labSpec.json");

  run("node", ["src/validateLabSpec.js", specFile]);
  run("node", ["src/compileSpecToLab.js", specFile]);

  const labFile = newestFile("generated", ".json");

  run("node", ["src/validateLab.js", labFile]);
  run("node", ["src/publishToPlatform.js", labFile]);

  console.log("\n[DONE] Spec generated, compiled, validated, and published.");
  console.log(`[SPEC] ${specFile}`);
  console.log(`[LAB]  ${labFile}`);
}

main();
