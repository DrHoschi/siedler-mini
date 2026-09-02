/* ============================================================================
 * Datei   : tools/verify-structure.js
 * Projekt : Neue Siedler
 * Version : v2.0.0 (2026-09-02)
 * Zweck   : Prüft ausschliesslich die neue Clean-Runtime-Struktur.
 *           Legacy-/Monolith-Strukturen sind bewusst nicht Teil dieses Gates.
 * ========================================================================== */
import { promises as fs } from "fs";

const MUST_HAVE = [
  "index.html",
  "src/main.js",
  "src/runtime/config.js",
  "src/runtime/event-bus.js",
  "src/runtime/runtime.js",
  "src/runtime/scheduler.js",
  "src/runtime/store.js",
  "src/domain/domain-store.js",
  "src/domain/core-domain-stores.js",
  "src/world/stable-id.js",
  "src/world/world-store.js",
  "src/world/map-structure.js",
  "src/resources/resource-state.js",
  "src/resources/resource-claims.js",
  "src/resources/resource-demands.js",
  "src/resources/resource-matching.js",
  "src/render/renderer.js",
  "src/ui/app.css",
  "src/dev/self-test.js",
  "src/dev/cr-01-freeze-gate.js",
  "src/dev/cr-02-freeze-gate.js",
  "src/dev/cr-03a-self-test.js"
];

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("❌", msg);
}
function ok(msg) { console.log("✅", msg); }

async function checkFiles() {
  for (const file of MUST_HAVE) {
    try {
      await fs.access(file);
      ok(`[file] vorhanden: ${file}`);
    } catch {
      fail(`[file] fehlt: ${file}`);
    }
  }
}

async function checkIndex() {
  try {
    const html = await fs.readFile("index.html", "utf8");
    if (!/<script[^>]+type=["']module["'][^>]+src=["'][^"']*src\/main\.js(?:\?[^"']*)?["']/.test(html)) {
      fail("[index] aktiver Moduleinstieg src/main.js fehlt");
    } else {
      ok("[index] src/main.js als Moduleinstieg vorhanden");
    }
    if (!/<link[^>]+href=["'][^"']*src\/ui\/app\.css(?:\?[^"']*)?["']/.test(html)) {
      fail("[index] aktives Stylesheet src/ui/app.css fehlt");
    } else {
      ok("[index] src/ui/app.css vorhanden");
    }
  } catch (error) {
    fail(`[index] konnte nicht gelesen werden: ${error.message}`);
  }
}

console.log("— verify Clean Runtime structure —");
await checkFiles();
await checkIndex();

if (failures > 0) {
  console.error(`\n❌ Clean-Runtime-Strukturprüfung fehlgeschlagen: ${failures} Blocker`);
  process.exitCode = 1;
} else {
  console.log("\n✅ Clean-Runtime-Strukturprüfung PASS / 0 Blocker");
}
