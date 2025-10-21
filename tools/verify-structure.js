/* ============================================================================
 * Datei   : tools/verify-structure.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-10-21)
 * Zweck   : Prüft Kernstruktur, Import-Reihenfolge, Pflicht-Module und simple Exports
 * ========================================================================== */
import { promises as fs } from "fs";

const MUST_HAVE = [
  "index.html",
  "core/asset.js","core/registry.js","core/boot.js","core/game.js",
  "ui/ui-start.js","ui/ui-hud.js","ui/ui-build.js","ui/ui-inspector.js"
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

function fail(msg){ console.log("❌", msg); }
function ok(msg){ console.log("✅", msg); }
function warn(msg){ console.log("⚠️", msg); }

async function checkFiles(){
  let okAll = true;
  for(const f of MUST_HAVE){
    try{ await fs.access(f); ok(`[file] vorhanden: ${f}`); }
    catch{ fail(`[file] fehlt: ${f}`); okAll = false; }
  }
  return okAll;
}

async function checkIndex(){
  try{
    const html = await fs.readFile("index.html","utf8");
    const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map(m=>m[1]);
    const missing = ORDER.filter(s => !scripts.some(x=>x.endsWith(s)));
    if(missing.length){ return fail(`[index] fehlende <script>: ${missing.join(", ")}`); }
    // Grobe Reihenfolge-Prüfung: jeder muss vor dem nächsten stehen
    let lastIdx = -1, orderOK = true;
    for(const s of ORDER){
      const i = scripts.findIndex(x=>x.endsWith(s));
      if(i < lastIdx){ orderOK = false; break; }
      lastIdx = i;
    }
    orderOK ? ok("[index] Reihenfolge ok (Startpanel-Regel erfüllt)") :
              fail("[index] Reihenfolge fehlerhaft (siehe CODE_STYLE)");
  }catch(e){ fail(`[index] konnte nicht gelesen werden: ${e.message}`); }
}

async function checkHeadersAndLogs(){
  for(const f of MUST_HAVE.filter(x=>x.endsWith(".js"))){
    const txt = await fs.readFile(f,"utf8");
    if(!/Version\s*:\s*v\d+\.\d+\.\d+/.test(txt)) warn(`[header] Version fehlt in ${f}`);
    if(!/\[.+\]\s+Modul geladen/.test(txt))        warn(`[log] Lade-Log fehlt in ${f}`);
    if(f.endsWith("asset.js") && /assets\.js/.test(txt)) warn(`[rule] asset.js muss singular bleiben (CODE_STYLE)`);
  }
}

(async function(){
  console.log("— verify-structure —");
  const filesOK = await checkFiles();
  await checkIndex();
  await checkHeadersAndLogs();
  if(filesOK) ok("Basisstruktur vorhanden ✅");
})();
