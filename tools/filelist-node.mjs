/**
 * Siedler-Mini — Filelist Checker (Node)
 * Version: v1.0 (2025-08-25)
 * Usage:   node tools/filelist-node.mjs ./main
 * Output:  ./main/filelist.txt  +  ./main/filelist.json
 * Hinweis: Läuft lokal, keine Netzwerkzugriffe.
 */

// ───────────────────────────────────────────────────────────────────────────
// SECTION: Imports
// ───────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// ───────────────────────────────────────────────────────────────────────────
// SECTION: Konstanten
// ───────────────────────────────────────────────────────────────────────────
const CODE_EXT = new Set([".js",".mjs",".cjs",".ts",".json",".jsonc",".html",".htm",".css",".md",".yaml",".yml",".svg"]);
const EXCLUDE_DIR = new Set([".git",".github","node_modules",".DS_Store","__pycache__"]);

// ───────────────────────────────────────────────────────────────────────────
// SECTION: Hilfsfunktionen
// ───────────────────────────────────────────────────────────────────────────
const extOf = (name)=> {
  const e = path.extname(name || "");
  return e ? e.toLowerCase() : "";
};

async function sha1(filePath) {
  return new Promise((resolve, reject)=>{
    const h = crypto.createHash("sha1");
    const s = fs.createReadStream(filePath);
    s.on("error", reject);
    s.on("data", d => h.update(d));
    s.on("end", ()=> resolve(h.digest("hex")));
  });
}

function isExcludedDir(name) { return EXCLUDE_DIR.has(name); }

function formatTree(entries, rootAbs) {
  const lines = [];
  for (const e of entries) {
    const rel = path.relative(rootAbs, e.abs);
    if (e.type === "dir") lines.push(rel || ".");
    else lines.push(`${rel}  (${e.size} B)`);
  }
  return lines.join("\n");
}

// ───────────────────────────────────────────────────────────────────────────
// SECTION: Rekursives Scannen
// ───────────────────────────────────────────────────────────────────────────
async function scanDir(absDir, out=[]) {
  const items = await fsp.readdir(absDir, { withFileTypes:true });
  // Ordner zuerst, dann Dateien, alphabetisch
  items.sort((a,b)=> {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const it of items) {
    const abs = path.join(absDir, it.name);
    if (it.isDirectory()) {
      if (isExcludedDir(it.name)) continue;
      out.push({ type:"dir", abs });
      await scanDir(abs, out);
    } else {
      const st = await fsp.stat(abs);
      const ext = extOf(it.name);
      const isCode = CODE_EXT.has(ext);
      const hash = isCode ? await sha1(abs) : null;
      out.push({
        type: "file",
        abs,
        size: st.size,
        mtime: st.mtimeMs,
        ext,
        isCode,
        hash
      });
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// SECTION: Main
// ───────────────────────────────────────────────────────────────────────────
async function main() {
  const target = process.argv[2] || "./main";
  const rootAbs = path.resolve(target);
  const exists = fs.existsSync(rootAbs);
  if (!exists) {
    console.error(`❌ Pfad nicht gefunden: ${target}`);
    process.exit(1);
  }

  console.log(`📁 Scanne: ${rootAbs}`);
  const entries = await scanDir(rootAbs);

  // Text-Ausgabe (tree-ähnlich)
  const text = formatTree(entries, rootAbs) + "\n";

  // JSON-Ausgabe
  const json = JSON.stringify({
    createdAt: new Date().toISOString(),
    root: rootAbs,
    entries: entries.map(e => (e.type==="dir" ? e : {
      ...e,
      rel: path.relative(rootAbs, e.abs)
    }))
  }, null, 2);

  // Dateien schreiben
  const txtPath = path.join(rootAbs, "filelist.txt");
  const jsonPath = path.join(rootAbs, "filelist.json");
  await fsp.writeFile(txtPath, text, "utf8");
  await fsp.writeFile(jsonPath, json, "utf8");

  console.log(`✅ Fertig:
  - ${txtPath}
  - ${jsonPath}`);
}

main().catch(err => {
  console.error("❌ Fehler:", err);
  process.exit(1);
});
