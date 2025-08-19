// tools/gen-manifest.mjs
// Node 18+ (ESM). Läuft lokal, erzeugt /assets/manifest.json mit allen erwarteten Pfaden.
// - traversiert Verzeichnisse (assets/, textures/, img/, maps/, ui/ ...)
// - parst Quelltexte (html/js/css/json) und extrahiert Asset-URLs (regex)
// - parst Map-JSONs (start-map.json: tiles[].name; map-pro.json: legend + tileset)
// Ausgabeformat: { expected: ["/assets/…", "/maps/…", …], meta:{...} }

import { promises as fs } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..'); // .. = main/
const POSIX = p => p.split(sep).join('/'); // normalize for web paths

// ---- Konfiguration (bei Bedarf anpassen) ----
const INCLUDE_DIRS = [
  'assets', 'textures', 'img', 'ui', 'maps'
];
const SOURCE_DIRS = [
  '.', 'core', 'tools'  // index.html, boot.js, game.js, core/*, tools/*
];
const ASSET_EXT = new Set(['.png','.jpg','.jpeg','.webp','.gif','.svg','.json','.mp3','.ogg','.wav','.ttf','.otf','.woff','.woff2','.css','.js']);
const SOURCE_EXT = new Set(['.html','.htm','.js','.mjs','.cjs','.css','.json']); // aus denen wir Pfade ziehen

// Heuristik: für Legend-Namen in Maps
const MAP_IMAGE_BASES = [
  '/assets/tiles/', '/assets/terrain/', '/assets/tex/', '/textures/', '/img/'
];

// ---- Helpers ----
async function *walk(dir) {
  const ents = await fs.readdir(dir, { withFileTypes:true });
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}
function extOf(p) {
  const i = p.lastIndexOf('.'); return i<0 ? '' : p.slice(i).toLowerCase();
}
function toWebPath(abs) {
  const rel = POSIX(abs).replace(POSIX(ROOT), '');
  // leading slash:
  return rel.startsWith('/') ? rel : `/${rel}`;
}
function dedupe(arr) {
  return Array.from(new Set(arr)).sort((a,b)=> a.localeCompare(b));
}
function collectMatches(text, basePath) {
  const results = [];
  // 1) "generic" Zitate mit asset-typischen Endungen
  const exts = '\\.(png|jpg|jpeg|webp|gif|svg|json|js|css|mp3|ogg|wav|ttf|otf|woff2?|map)\\b';
  const RE_GENERIC = new RegExp(`["'\`](?!data:)([^"'\\\`]*${exts}(?:\\?[^"'\\\`]*)?)["'\`]`, 'ig');
  const RE_FETCH   = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/ig;
  const RE_IMPORT  = /import\s*\(\s*["'`]([^"'`]+)["'`]/ig;
  const RE_SCRIPT  = /<script\b[^>]*?src\s*=\s*["'`]([^"'`]+)["'`]/ig;
  const RE_LINK    = /<link\b[^>]*?href\s*=\s*["'`]([^"'`]+)["'`]/ig;
  const RE_IMG     = /<img\b[^>]*?src\s*=\s*["'`]([^"'`]+)["'`]/ig;
  const RE_STYLE   = /url\(\s*["']?([^"')]+)["']?\s*\)/ig;

  const all = [RE_GENERIC, RE_FETCH, RE_IMPORT, RE_SCRIPT, RE_LINK, RE_IMG, RE_STYLE];
  for (const re of all) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(text))) {
      const raw = (m[1] || '').trim();
      if (!raw || raw.startsWith('data:')) continue;
      results.push(resolveLike(basePath, raw));
    }
  }
  return results.filter(Boolean);
}
function resolveLike(fromFile, ref) {
  // Web-ähnliche Auflösung relativ zur Datei
  try {
    if (/^https?:\/\//i.test(ref)) return null; // extern ignorieren
    const base = 'file://' + POSIX(fromFile);
    const url = new URL(ref, base);
    const abs = url.pathname; // absolute posix path
    const disk = abs.replace(/^\/([A-Za-z]:)/, '$1'); // Windows drive fix
    const full = resolve('/', disk); // ensure root
    // Map zurück auf Projekt-ROOT
    const rel = POSIX(full).startsWith('/') ? POSIX(full) : '/' + POSIX(full);
    // file URL war relativ zu fromFile; wir brauchen File-System-Path:
    const fsPath = resolve(dirname(fromFile), ref);
    return toWebPath(fsPath);
  } catch {
    // Fallback: relative Pfade grob behandeln
    const fsPath = resolve(dirname(fromFile), ref);
    return toWebPath(fsPath);
  }
}

// ---- Map-Parser ----
async function parseMapJson(absPath) {
  const out = new Set();
  const txt = await fs.readFile(absPath, 'utf8');
  let json; try { json = JSON.parse(txt); } catch { return out; }

  // Variante A: start-map.json -> tiles:[{name:"*.png"}]
  if (Array.isArray(json.tiles)) {
    for (const t of json.tiles) {
      const name = t && (t.name || t.file || t.src);
      if (name) {
        if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(name)) {
          for (const base of MAP_IMAGE_BASES) out.add(base + name);
        } else {
          for (const base of MAP_IMAGE_BASES) out.add(base + name + '.png');
          for (const base of MAP_IMAGE_BASES) out.add(base + name + '.webp');
        }
      }
    }
  }

  // Variante B: map-pro.json -> legend:{ "0":"grass", … }, optional tileset
  if (json.legend && typeof json.legend === 'object') {
    const names = new Set(Object.values(json.legend).map(String));
    for (const n of names) {
      for (const base of MAP_IMAGE_BASES) out.add(base + n + '.png');
      for (const base of MAP_IMAGE_BASES) out.add(base + n + '.webp');
    }
  }

  // tileset ggf. nachladen
  if (json.tileset && typeof json.tileset === 'string') {
    try {
      const tsPath = resolve(dirname(absPath), json.tileset);
      const tsRaw = await fs.readFile(tsPath, 'utf8');
      const ts = JSON.parse(tsRaw);
      if (Array.isArray(ts.images)) ts.images.forEach(n => {
        for (const base of MAP_IMAGE_BASES) out.add(base + n);
      });
      if (Array.isArray(ts.tiles)) ts.tiles.forEach(t => {
        const name = t && (t.name || t.file || t.src);
        if (name) {
          const withExt = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(name) ? [name] : [name + '.png', name + '.webp'];
          for (const base of MAP_IMAGE_BASES) withExt.forEach(w => out.add(base + w));
        }
      });
    } catch {}
  }

  return out;
}

// ---- Main ----
async function main() {
  const expected = new Set();

  // 1) rohe Dateibäume durchlaufen
  for (const dir of INCLUDE_DIRS) {
    const absDir = join(ROOT, dir);
    try {
      for await (const p of walk(absDir)) {
        if (ASSET_EXT.has(extOf(p))) expected.add(toWebPath(p));
      }
    } catch {}
  }

  // 2) Quellen parsen → referenzierte Pfade extrahieren
  for (const dir of SOURCE_DIRS) {
    const absDir = join(ROOT, dir);
    try {
      for await (const p of walk(absDir)) {
        if (!SOURCE_EXT.has(extOf(p))) continue;
        try {
          const txt = await fs.readFile(p, 'utf8');
          collectMatches(txt, p).forEach(u => expected.add(u));
        } catch {}
      }
    } catch {}
  }

  // 3) Map-JSONs speziell auswerten
  const mapsDir = join(ROOT, 'maps');
  try {
    for await (const p of walk(mapsDir)) {
      if (extOf(p) !== '.json') continue;
      const set = await parseMapJson(p);
      set.forEach(u => expected.add(u));
    }
  } catch {}

  // 4) Ergebnis zusammenstellen
  const list = dedupe([...expected].map(p => p.replace(/\\/g, '/')));

  // 5) schreiben
  const outDir = join(ROOT, 'assets');
  await fs.mkdir(outDir, { recursive:true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    root: '/',
    expected: list
  };
  await fs.writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // optional: flache Liste für Tools
  await fs.writeFile(join(outDir, '__filelist.txt'), list.join('\n') + '\n', 'utf8');

  console.log(`✔ Manifest geschrieben: /assets/manifest.json  (Einträge: ${list.length})`);
}

main().catch(err => {
  console.error('Manifest-Error:', err);
  process.exit(1);
});
