/* ============================================================================
 * Datei   : tools/verify-structure.js
 * Projekt : Neue Siedler
 * Version : v1.1.0 (2026-09-02)
 * Zweck   : Prüft Kernstruktur, Import-Reihenfolge und Pflicht-Module.
 *           Fehler liefern einen echten Exit-Code != 0 für CI.
 * ========================================================================== */
import { promises as fs } from "fs";

const MUST_HAVE = [
  "index.html",
  "core/asset.js", "core/registry.js", "core/boot.js", "core/game.js",
  "ui/ui-start.js", "ui/ui-hud.js", "ui/ui-build.js", "ui/ui-inspector.js"
];

const ORDER = [
  "core/asset.js",
  "core/registry.js",
  "core/boot.js",
  "core/game.js",
  "ui/ui-start.js",
  "ui/ui-hud.js",
  "ui/ui-build.js",
  "ui/ui-inspector.js"
];

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("❌", msg);
}
function ok(msg) { console.log("✅", msg); }
function warn(msg) { console.warn("⚠️", msg); }

async function checkFiles() {
  for (const f of MUST_HAVE) {
    try {
      await fs.access(f);
      ok(`[file] vorhanden: ${f}`);
    } catch {
      fail(`[file] fehlt: ${f}`);
    }
  }
}

async function checkIndex() {
  try {
    const html = await fs.readFile("index.html", "utf8");
    const scripts = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)).map(m => m[1]);
    const missing = ORDER.filter(s => !scripts.some(x => x.endsWith(s)));

    if (missing.length) {
      fail(`[index] fehlende <script>: ${missing.join(", ")}`);
      return;
    }

    let lastIdx = -1;
    for (const s of ORDER) {
      const i = scripts.findIndex(x => x.endsWith(s));
      if (i < lastIdx) {
        fail("[index] Reihenfolge fehlerhaft (siehe CODE_STYLE)");
        return;
      }
      lastIdx = i;
    }
    ok("[index] Reihenfolge ok");
  } catch (error) {
    fail(`[index] konnte nicht gelesen werden: ${error.message}`);
  }
}

async function checkHeadersAndLogs() {
  for (const f of MUST_HAVE.filter(x => x.endsWith(".js"))) {
    try {
      const txt = await fs.readFile(f, "utf8");
      if (!/Version\s*:\s*v\d+\.\d+\.\d+/.test(txt)) warn(`[header] Version fehlt in ${f}`);
      if (!/\[.+\]\s+Modul geladen/.test(txt)) warn(`[log] Lade-Log fehlt in ${f}`);
      if (f.endsWith("asset.js") && /assets\.js/.test(txt)) warn(`[rule] asset.js muss singular bleiben (CODE_STYLE)`);
    } catch (error) {
      fail(`[read] ${f}: ${error.message}`);
    }
  }
}

console.log("— verify-structure —");
await checkFiles();
await checkIndex();
await checkHeadersAndLogs();

if (failures > 0) {
  console.error(`\n❌ Strukturprüfung fehlgeschlagen: ${failures} Blocker`);
  process.exitCode = 1;
} else {
  console.log("\n✅ Strukturprüfung PASS / 0 Blocker");
}
