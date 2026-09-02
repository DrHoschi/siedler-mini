/* ============================================================================
 * Datei   : tools/ci-check.mjs
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2026-09-02)
 * Zweck   : Dependency-freier CI-Baseline-Check für getrackte JS-/JSON-Dateien.
 * ========================================================================== */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

const files = trackedFiles();
const jsFiles = files.filter(file => /\.(?:js|mjs|cjs)$/.test(file));
const jsonFiles = files.filter(file => /\.json$/.test(file));

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`❌ ${message}`);
}

console.log(`— CI syntax gate —`);
console.log(`Tracked: ${files.length} · JS: ${jsFiles.length} · JSON: ${jsonFiles.length}`);

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
    fail(`JSON ungültig: ${file} — ${error.message}`);
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
  console.error(`\n❌ CI syntax gate FAILED / ${failures} Blocker`);
  process.exitCode = 1;
} else {
  console.log("\n✅ CI syntax gate PASS / 0 Blocker");
}
