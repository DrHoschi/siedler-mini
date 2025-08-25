/**
 * Siedler-Mini — Filelist Generator (root)
 * Version: v1.1 (2025-08-25)
 * Zweck: Alle Dateien ab Repo-Root (.) rekursiv listen
 * Output: filelist.txt + filelist.json im Repo-Root
 *
 * Nutzung:
 *   node tools/filelist-node.mjs
 *   node tools/filelist-node.mjs .         // explizit Root
 *   node tools/filelist-node.mjs ./assets  // optional anderer Startpfad
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const START = process.argv[2] || ".";
const EXCLUDE_DIR = new Set([".git", "node_modules"]); // .github darf drin bleiben (Workflows)
const OUTPUT_DIR = "."; // ins Repo-Root schreiben

async function scan(dir, root) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  // Ordner vor Dateien, alphabetisch
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel  = path.relative(root, full);

    if (e.isDirectory()) {
      if (EXCLUDE_DIR.has(e.name)) continue;
      out.push({ type: "dir", path: rel + "/" });
      out.push(...await scan(full, root));
    } else {
      const st = await fsp.stat(full);
      out.push({ type: "file", path: rel, size: st.size });
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(START)) {
    console.error("❌ Startpfad nicht gefunden:", START);
    process.exit(1);
  }

  const rootAbs = path.resolve(START);
  const entries = await scan(rootAbs, rootAbs);

  const txt = entries.map(e =>
    e.type === "dir" ? e.path : `${e.path} (${e.size} B)`
  ).join("\n") + "\n";

  const json = JSON.stringify({
    createdAt: new Date().toISOString(),
    root: path.relative(process.cwd(), rootAbs) || ".",
    count: entries.length,
    entries
  }, null, 2);

  await fsp.writeFile(path.join(OUTPUT_DIR, "filelist.txt"), txt, "utf8");
  await fsp.writeFile(path.join(OUTPUT_DIR, "filelist.json"), json, "utf8");

  console.log(`✅ Filelist erstellt (${entries.length} Einträge):
  - ${path.join(OUTPUT_DIR, "filelist.txt")}
  - ${path.join(OUTPUT_DIR, "filelist.json")}`);
}

main().catch(err => {
  console.error("❌ Fehler:", err);
  process.exit(1);
});
