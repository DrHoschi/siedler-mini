/* ============================================================================
 * Datei   : tools/ci-check.mjs
 * Projekt : Neue Siedler
 * Version : v1.1.0 (2026-09-02)
 * Zweck   : Dependency-freier CI-Baseline-Check fuer den Clean-Runtime-Stand.
 *           Legacy-/Altbestand ausserhalb src/ ist bewusst nicht Teil dieses Gates.
 * ========================================================================== */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

const files = trackedFiles();
const activeFiles = files.filter(file =>
  file.startsWith("src/") ||
  file === "tools/ci-check.mjs" ||
  file === "tools/verify-structure.js" ||
  file === "package.json"
);
const jsFiles = activeFiles.filter(file => /\.(?:js|mjs|cjs)$/.test(file));
const jsonFiles = activeFiles.filter(file => /\.json$/.test(file));

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`❌ ${message}`);
}

console.log("— CI Clean Runtime syntax gate —");
console.log(`Active scope: ${activeFiles.length} · JS: ${jsFiles.length} · JSON: ${jsonFiles.length}`);

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    fail(`JavaScript-Syntax: ${file}\n${detail}`);
  }
}

for (const file of jsonFiles) {
  try {
    JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`JSON ungueltig: ${file} — ${error.message}`);
  }
}

const forbiddenWorkflowFragments = [
  "assets/inspector/",
  "assets/core/cblog.polyfill.js",
  "assets/ui/ui-bridge.js"
];
const workflowFiles = files.filter(file => file.startsWith(".github/workflows/") && /\.ya?ml$/.test(file));
for (const file of workflowFiles) {
  const text = readFileSync(file, "utf8");
  for (const fragment of forbiddenWorkflowFragments) {
    if (text.includes(fragment)) fail(`Legacy-Pfad in ${file}: ${fragment}`);
  }
}

if (failures > 0) {
  console.error(`\n❌ CI Clean Runtime syntax gate FAILED / ${failures} Blocker`);
  process.exitCode = 1;
} else {
  console.log("\n✅ CI Clean Runtime syntax gate PASS / 0 Blocker");
}
