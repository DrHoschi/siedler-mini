/**
 * Siedler-Mini — Filelist Generator (minimal)
 * Version: v1.0 (2025-08-25)
 * Zweck: Alle Dateien im ./main Verzeichnis auflisten
 * Output: main/filelist.txt + main/filelist.json
 *
 * ⚠️ Minimal für GitHub Actions optimiert
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

// Root-Ordner (Standard: ./main)
const rootDir = process.argv[2] || "./main";

// rekursiv durchlaufen
async function scan(dir) {
  const out = [];
  const items = await fsp.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    const rel = path.relative(rootDir, full);
    if (it.isDirectory()) {
      out.push({ type: "dir", path: rel });
      out.push(...await scan(full));
    } else {
      const st = await fsp.stat(full);
      out.push({ type: "file", path: rel, size: st.size });
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(rootDir)) {
    console.error("❌ Ordner nicht gefunden:", rootDir);
    process.exit(1);
  }

  const entries = await scan(rootDir);

  // TXT: einfache Liste
  const txt = entries.map(e =>
    e.type === "dir"
      ? `${e.path}/`
      : `${e.path} (${e.size} B)`
  ).join("\n");

  // JSON: maschinenlesbar
  const json = JSON.stringify({
    createdAt: new Date().toISOString(),
    root: rootDir,
    count: entries.length,
    entries
  }, null, 2);

  await fsp.writeFile(path.join(rootDir, "filelist.txt"), txt, "utf8");
  await fsp.writeFile(path.join(rootDir, "filelist.json"), json, "utf8");

  console.log(`✅ Filelist erstellt: ${entries.length} Einträge`);
}

main().catch(err => {
  console.error("❌ Fehler:", err);
  process.exit(1);
});
