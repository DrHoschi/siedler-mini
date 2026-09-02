/* ============================================================================
 * Datei   : tools/ci-check.mjs
 * Projekt : Neue Siedler
 * Zweck   : Dependency-freier Syntax-Check fuer die aktive Clean Runtime.
 * ========================================================================== */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const activeFiles = files.filter(file => file.startsWith("src/") || file === "tools/ci-check.mjs" || file === "tools/verify-structure.js" || file === "package.json");
const jsFiles = activeFiles.filter(file => /\.(?:js|mjs|cjs)$/.test(file));
const jsonFiles = activeFiles.filter(file => /\.json$/.test(file));
let failures = 0;
const fail = message => { failures += 1; console.error(`❌ ${message}`); };

console.log("— CI Clean Runtime syntax gate —");
for (const file of jsFiles) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); }
  catch (error) { fail(`JavaScript-Syntax: ${file}\n${error.stderr?.toString().trim() || error.message}`); }
}
for (const file of jsonFiles) {
  try { JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { fail(`JSON ungueltig: ${file} — ${error.message}`); }
}

if (failures > 0) {
  console.error(`\n❌ CI Clean Runtime syntax gate FAILED / ${failures} Blocker`);
  process.exitCode = 1;
} else {
  console.log("\n✅ CI Clean Runtime syntax gate PASS / 0 Blocker");
}
