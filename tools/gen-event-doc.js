#!/usr/bin/env node
/**
 * ============================================================================
 * Datei   : tools/gen-event-doc.js
 * Projekt : Neue Siedler
 * Version : v1.0.0
 * Zweck   : Events (cb:/req:/emit:) in allen Quellcodes scannen und
 *           docs/event-protocol.md automatisch erzeugen/aktualisieren.
 * Autor   : A. Mann & GPT-5
 * Datum   : (auto, Laufzeit – Europe/Berlin)
 * ----------------------------------------------------------------------------
 * CODE-STYLE: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * HINWEIS   : Sehr ausführlich kommentiert (deutsch), damit Wartung leicht fällt.
 * ============================================================================
 */

/* =============================[ Imports ]================================== */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

/* ============================[ Konstanten ]================================= */
// Standard-Pfade (können per CLI übersteuert werden)
const DEFAULT_ROOT = process.cwd();
const DEFAULT_OUT  = path.join(DEFAULT_ROOT, 'docs', 'event-protocol.md');

// Standard-Ausschlüsse (Ordner werden beim Scannen ignoriert)
const DEFAULT_EXCLUDES = [
  'node_modules', '.git', '.github', 'Archive', 'archive', 'dist', 'build', 'out', 'temp', 'tmp'
];

// Dateiendungen, die berücksichtigt werden
const FILE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts'];

// Regex zum Auffinden von Event-Strings in Anführungszeichen.
// Erlaubt Segmente wie cb:res:change oder emit:build:confirm usw.
const EVENT_REGEX = /['"`]\s*(cb|req|emit):([a-z0-9_.-]+(?::[a-z0-9_.-]+)+)\s*['"`]/ig;

// Regex um bei bestehender MD die Version/Gültigkeitsdaten zu finden
const MD_VERSION_REGEX = /^\*\*Version:\*\*\s*v(\d+)\.(\d+)\.(\d+)/mi;
const MD_STAND_REGEX   = /^\*\*Stand:\*\*\s*(\d{4}-\d{2}-\d{2})/mi;

// CLI: --root, --out, --exclude=foo,bar, --bump=patch|minor|major, --dry-run
const args = parseArgs(process.argv.slice(2));

/* =========================[ Hilfsfunktionen ]=============================== */

/** CLI-Argumente parsen (sehr simpel). */
function parseArgs(argv) {
  const out = { root: DEFAULT_ROOT, out: DEFAULT_OUT, bump: 'patch', dryRun: false, excludes: [...DEFAULT_EXCLUDES] };
  for (const a of argv) {
    if (a.startsWith('--root=')) out.root = path.resolve(a.split('=')[1]);
    else if (a.startsWith('--out=')) out.out = path.resolve(a.split('=')[1]);
    else if (a.startsWith('--exclude=')) {
      const extra = a.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
      out.excludes.push(...extra);
    } else if (a.startsWith('--bump=')) out.bump = (a.split('=')[1] || 'patch').toLowerCase();
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

/** Liefert lokales Datum (Europe/Berlin) als YYYY-MM-DD. */
function getLocalISODate() {
  const now = new Date();
  const tzNow = new Date(now.toLocaleString('en-CA', { timeZone: 'Europe/Berlin' }));
  const y = tzNow.getFullYear();
  const m = String(tzNow.getMonth() + 1).padStart(2, '0');
  const d = String(tzNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Ordner rekursiv durchlaufen und alle relevanten Dateien sammeln. */
async function collectFiles(root, excludes) {
  const files = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel  = path.relative(root, full);
      // Ausschlüsse
      if (excludes.some(ex => rel.split(path.sep).includes(ex))) continue;

      if (e.isDirectory()) {
        await walk(full);
      } else if (FILE_EXTENSIONS.includes(path.extname(e.name))) {
        files.push(full);
      }
    }
  }
  await walk(root);
  return files;
}

/** Datei zeilenweise lesen und Events extrahieren (inkl. Zeilennr & Kontext). */
async function extractEventsFromFile(file) {
  const content = await fsp.readFile(file, 'utf8');
  const events = [];
  let match;
  while ((match = EVENT_REGEX.exec(content)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1];           // cb | req | emit
    const rest   = match[2];           // z.B. res:change, build:confirm
    const eventName = `${prefix}:${rest}`;

    // Zeilennummer bestimmen (grob, via Index zählen bis match.index)
    const before = content.slice(0, match.index);
    const line = (before.match(/\n/g)?.length || 0) + 1;

    // Kurzer Kontext (die ganze Zeile)
    const ctxStart = content.lastIndexOf('\n', match.index) + 1;
    const ctxEnd   = content.indexOf('\n', match.index);
    const lineText = content.slice(ctxStart, ctxEnd === -1 ? content.length : ctxEnd).trim();

    events.push({
      name: eventName,
      prefix,
      domain: rest.split(':')[0] || 'misc',
      file,
      line,
      lineText
    });
  }
  return events;
}

/** Bestehendes MD einlesen und Version/Stand erkennen. */
async function readExistingMd(pathMd) {
  try {
    const md = await fsp.readFile(pathMd, 'utf8');
    const vMatch = md.match(MD_VERSION_REGEX);
    const sMatch = md.match(MD_STAND_REGEX);
    const version = vMatch ? { major: +vMatch[1], minor: +vMatch[2], patch: +vMatch[3] } : null;
    const stand   = sMatch ? sMatch[1] : null;
    return { md, version, stand };
  } catch {
    return { md: null, version: null, stand: null };
  }
}

/** Version hochzählen. */
function bumpVersion(prev, kind = 'patch') {
  const v = prev ? { ...prev } : { major: 1, minor: 0, patch: 0 };
  if (!prev) return v; // v1.0.0 beim Erst-Create
  if (kind === 'major') { v.major++; v.minor = 0; v.patch = 0; }
  else if (kind === 'minor') { v.minor++; v.patch = 0; }
  else { v.patch++; }
  return v;
}

/** Markdown erzeugen. */
function buildMarkdown({ version, date, groups, filesScanned, totalCount }) {
  const versionStr = `v${version.major}.${version.minor}.${version.patch}`;
  const domains = Object.keys(groups).sort((a,b) => a.localeCompare(b));

  // Tabellen je Domäne bauen
  const sections = domains.map(domain => {
    const items = groups[domain].sort((a,b) => a.name.localeCompare(b.name));
    const rows = items.map(ev => `| \`${ev.name}\` | ${ev.prefix.toUpperCase()} | ${ev.fileRel} : ${ev.line} | ${ev.lineText.replace(/\|/g,'\\|')} |`).join('\n');
    return [
      `### 🔹 ${domain}`,
      `| Event | Typ | Fundstelle | Kontext |`,
      `|:------|:----|:-----------|:--------|`,
      rows || `| _(keine Einträge gefunden)_ |  |  |  |`
    ].join('\n');
  }).join('\n\n');

  return `# 📘 Event-Protokoll – Standardübersicht
**Projekt:** Neue Siedler  
**Datei:** \`docs/event-protocol.md\`  
**Version:** ${versionStr}  
**Stand:** ${date}  
**Autor:** A. Mann & GPT-5  
**Zweck:** Einheitliche Dokumentation aller internen Event-Kanäle  
*(cb: Callback / Broadcast, req: Request, emit: Signal)*

---

## 🧭 Grundprinzip

Drei Präfixe legen Richtung und Bedeutung fest:

| Kürzel | Richtung | Bedeutung | Beschreibung |
|:-------|:----------|:-----------|:--------------|
| \`cb:\`  | System → Module | **Callback / Broadcast** | Das System meldet etwas, was passiert ist (z. B. Laden abgeschlossen, Änderung erfolgt). |
| \`req:\` | Module → System | **Request / Anfrage** | Ein Modul fordert aktiv Daten, Zustände oder Aktionen an. |
| \`emit:\`| beliebig | **Emit / Signal** | Ein Modul löst aktiv ein Ereignis aus, das andere abonnieren können. |

---

## 📦 Scan-Ergebnis (Auto-Generated)
- **Dateien gescannt:** ${filesScanned}  
- **Gefundene Events:** ${totalCount}

> Hinweis: Diese Liste wird automatisch generiert. Bitte bei neuen Events \`gen-event-doc.js\` erneut laufen lassen.

---

${sections}

---

## 📅 Änderungsverlauf (auto)
| Version | Datum | Änderungen |
|:--------|:------|:-----------|
| ${versionStr} | ${date} | Auto-Update durch \`tools/gen-event-doc.js\` |

**Ende der Datei**
`;
}

/** Map der Events nach Domain aufbereiten und relative Pfade setzen. */
function groupEvents(root, events) {
  const groups = {};
  for (const ev of events) {
    const key = ev.domain || 'misc';
    const fileRel = path.relative(root, ev.file).split(path.sep).join('/');
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...ev, fileRel });
  }
  return groups;
}

/** Sicherstellen, dass Zielordner existiert. */
async function ensureDirForFile(file) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
}

/* =============================[ Hauptlogik ]================================ */
(async function main() {
  const root = args.root;
  const outPath = args.out;
  const excludes = Array.from(new Set(args.excludes));

  console.log(`[gen-event-doc] Root: ${root}`);
  console.log(`[gen-event-doc] Out : ${outPath}`);
  console.log(`[gen-event-doc] Excl: ${excludes.join(', ')}`);
  console.log(`[gen-event-doc] Bump: ${args.bump}${args.dryRun ? ' (dry-run)' : ''}`);

  // 1) Dateien sammeln
  const files = await collectFiles(root, excludes);

  // 2) Events extrahieren
  let all = [];
  for (const file of files) {
    const events = await extractEventsFromFile(file);
    if (events.length) all.push(...events);
  }

  // 3) Gruppen bilden
  const groups = groupEvents(root, all);

  // 4) Vorhandene MD lesen und Version ermitteln
  const existing = await readExistingMd(outPath);
  const nextVer = bumpVersion(existing.version, existing.version ? args.bump : null);
  const dateStr = getLocalISODate();

  // 5) Markdown bauen
  const md = buildMarkdown({
    version: nextVer,
    date: dateStr,
    groups,
    filesScanned: files.length,
    totalCount: all.length
  });

  // 6) Schreiben (oder Dry-Run)
  if (args.dryRun) {
    console.log('\n----- GENERATED MARKDOWN (preview) -----\n');
    console.log(md);
    console.log('\n----- END PREVIEW -----\n');
  } else {
    await ensureDirForFile(outPath);
    await fsp.writeFile(outPath, md, 'utf8');
    console.log(`[gen-event-doc] Wrote ${outPath}`);
  }
})().catch(err => {
  console.error('[gen-event-doc] Fehler:', err);
  process.exit(1);
});

/* =============================[ Exports ]=================================== */
// Dieses Skript wird als CLI-Tool genutzt – kein Export notwendig.
