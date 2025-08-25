/**
 * Siedler-Mini — Filelist Generator (minimal)
 * Version: v1.0 (2025-08-25)
 * Zweck: Alle Dateien im ./main Verzeichnis auflisten
 * Output: main/filelist.txt + main/filelist.json
 *
 * ⚙️ Lokal:  node tools/filelist-node.mjs ./main
 * ⚙️ Actions: wird vom Workflow aufgerufen
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const rootDir = process.argv[2] || "./main";

async function scan(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  // Ordner vor Dateien, alphabetisch
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel  = path.relative(rootDir, full);
    if (e.isDirectory()) {
      out.push({ type: "dir", path: rel + "/" });
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

  const txt = entries.map(e =>
    e.type === "dir"
      ? e.path
      : `${e.path} (${e.size} B)`
  ).join("\n") + "\n";

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
