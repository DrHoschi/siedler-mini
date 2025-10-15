// ============================================================================
// Datei   : ui/inspector.events.js
// Projekt : Neue Siedler
// Version : v1.0.0 (2025-10-15)
// Zweck   : Inspector-Tab "Events" – scannt cb:/req:/emit: in Projektdateien,
//           zeigt Tabelle + Markdown, Export (MD/JSON), optional Node-Hook.
// Autor   : A. Mann & GPT-5
// ----------------------------------------------------------------------------
// CODE-STYLE: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
// ============================================================================

/* =============================[ Imports ]================================== */
// (keine externen Importe; nur Browser-APIs)

/* ============================[ Konstanten ]================================= */

// Standard-Ort deiner Fileliste (kannst du gern anpassen):
// - Variante A: Plaintext mit je einer Zeile pro Pfad (empfohlen)
// - Variante B: JSON-Array ["core/game.js", "ui/ui-hud.js", ...]
const FILELIST_URLS = [
  'filelist.txt',                 // bevorzugt
  'filelist.json',                // Fallback
];

// Welche Dateiendungen wir scannen
const FILE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts'];

// Verzeichnisse, die wir clientseitig ignorieren (kannst du erweitern)
const DEFAULT_EXCLUDES = ['Archive', 'archive', 'dist', 'build', 'out', 'node_modules', '.git', '.github', 'tmp', 'temp'];

// Regex wie im Node-Tool
const EVENT_REGEX = /['"`]\s*(cb|req|emit):([a-z0-9_.-]+(?::[a-z0-9_.-]+)+)\s*['"`]/ig;

// Optionaler Dev-Server-Hook, falls du das Node-Skript remote triggern willst.
// Lass leer, wenn du das nicht brauchst (Browser-Scan reicht völlig).
const OPTIONAL_NODE_HOOK = ''; // z.B. '/dev/gen-event-doc' (POST)

/* =========================[ Hilfsfunktionen ]=============================== */

/** Kleines Util: String endet mit einer der erlaubten Endungen? */
function hasAllowedExt(p) {
  const lower = p.toLowerCase();
  return FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/** Pfad enthält einen der ausgeschlossenen Ordner? */
function isExcluded(p, excludes = DEFAULT_EXCLUDES) {
  const seg = p.split('/').filter(Boolean);
  return excludes.some(ex => seg.includes(ex));
}

/** Versuch: filelist.txt (Text) laden */
async function tryLoadFilelistTxt(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const txt = await res.text();
  return txt.split('\n')
    .map(s => s.trim().replace(/^\.\//, ''))
    .filter(Boolean);
}

/** Versuch: filelist.json (Array) laden */
async function tryLoadFilelistJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('filelist.json ist kein Array.');
  return arr.map(s => String(s).trim().replace(/^\.\//, '')).filter(Boolean);
}

/** Filelist laden (robust, beide Varianten, erstes Treffer-Prinzip) */
async function loadFilelist() {
  for (const url of FILELIST_URLS) {
    try {
      if (url.endsWith('.txt')) return await tryLoadFilelistTxt(url);
      if (url.endsWith('.json')) return await tryLoadFilelistJson(url);
    } catch { /* ignore and continue */ }
  }
  // Fallback: naive, gängige Pfade probieren (nur wenn keine filelist vorhanden)
  console.warn('[Inspector-Events] Keine filelist gefunden – nutze heuristische Pfade.');
  return [
    'core/asset.js',
    'core/registry.js',
    'core/game.js',
    'core/map-runtime.js',
    'ui/ui-hud.js',
    'ui/ui-build.js',
    'ui/ui-start.js',
    'ui/inspector.js',
    'ui/inspector.events.js',
  ];
}

/** Einzeldatei holen */
async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return await res.text();
}

/** Events aus Text extrahieren (mit Zeilennummer & Kontext) */
function extractEventsFromText(text, file) {
  const events = [];
  let match;
  while ((match = EVENT_REGEX.exec(text)) !== null) {
    const prefix = match[1];
    const rest   = match[2];
    const name   = `${prefix}:${rest}`;

    const before = text.slice(0, match.index);
    const line = (before.match(/\n/g)?.length || 0) + 1;

    const ctxStart = text.lastIndexOf('\n', match.index) + 1;
    const ctxEnd   = text.indexOf('\n', match.index);
    const lineText = text.slice(ctxStart, ctxEnd === -1 ? text.length : ctxEnd).trim();

    events.push({
      name, prefix,
      domain: rest.split(':')[0] || 'misc',
      file, line, lineText
    });
  }
  return events;
}

/** Gruppen nach Domäne bilden + sortieren */
function groupEvents(root, list) {
  const groups = {};
  for (const ev of list) {
    const key = ev.domain || 'misc';
    const fileRel = ev.file; // bereits relativ
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...ev, fileRel });
  }
  // Sortierung pro Gruppe
  for (const k of Object.keys(groups)) {
    groups[k].sort((a,b) => a.name.localeCompare(b.name) || a.fileRel.localeCompare(b.fileRel) || a.line - b.line);
  }
  return groups;
}

/** Local ISO Date (Europe/Berlin) */
function getLocalISODate() {
  const now = new Date();
  const tzNow = new Date(now.toLocaleString('en-CA', { timeZone: 'Europe/Berlin' }));
  const y = tzNow.getFullYear();
  const m = String(tzNow.getMonth() + 1).padStart(2, '0');
  const d = String(tzNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Versuch, bestehendes docs/event-protocol.md zu laden, um Version zu lesen */
async function tryReadExistingMdVersion() {
  try {
    const res = await fetch('docs/event-protocol.md', { cache: 'no-store' });
    if (!res.ok) return null;
    const md = await res.text();
    const m = md.match(/\*\*Version:\*\*\s*v(\d+)\.(\d+)\.(\d+)/i);
    if (!m) return null;
    return { major: +m[1], minor: +m[2], patch: +m[3] };
  } catch { return null; }
}

/** Patch-Version erhöhen (oder v1.0.0, falls keine vorhanden) */
function bumpPatch(prev) {
  if (!prev) return { major: 1, minor: 0, patch: 0 };
  return { major: prev.major, minor: prev.minor, patch: prev.patch + 1 };
}

/** Markdown erzeugen (wie im Node-Tool) */
function buildMarkdown({ version, date, groups, filesScanned, totalCount }) {
  const versionStr = `v${version.major}.${version.minor}.${version.patch}`;
  const domains = Object.keys(groups).sort((a,b) => a.localeCompare(b));
  const sections = domains.map(domain => {
    const items = groups[domain];
    const rows = items.map(ev =>
      `| \`${ev.name}\` | ${ev.prefix.toUpperCase()} | ${ev.fileRel} : ${ev.line} | ${ev.lineText.replace(/\|/g,'\\|')} |`
    ).join('\n');
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

> Hinweis: Diese Liste wird clientseitig im Inspector erzeugt. Für persistente Datei-Updates nutze zusätzlich das Node-Tool \`tools/gen-event-doc.js\`.

---

${sections}

---

## 📅 Änderungsverlauf (auto)
| Version | Datum | Änderungen |
|:--------|:------|:-----------|
| ${versionStr} | ${date} | Auto-Update (Inspector-Scan) |

**Ende der Datei**
`;
}

/** Datei-Download im Browser auslösen */
function triggerDownload(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===============================[ Klassen ]================================ */

/**
 * InspectorEventsTab
 * - kümmert sich um UI (Buttons, Tabs), Scan und Rendering
 */
class InspectorEventsTab {
  constructor() {
    this.rootEl = null;
    this.tableEl = null;
    this.mdEl = null;
    this.statusEl = null;
    this.result = null; // { groups, filesScanned, totalCount, version, date }
  }

  /** UI erstellen */
  createUI() {
    const wrap = document.createElement('div');
    wrap.className = 'insp-events-wrap';
    wrap.innerHTML = `
      <div class="insp-events-toolbar">
        <button class="btn scan">Scan starten</button>
        <button class="btn export-md" disabled>Als MD herunterladen</button>
        <button class="btn export-json" disabled>Als JSON herunterladen</button>
        ${OPTIONAL_NODE_HOOK ? '<button class="btn trigger-node">Node-Generierung</button>' : ''}
        <span class="status"></span>
      </div>

      <details class="insp-events-summary" open>
        <summary>Scan-Ergebnis</summary>
        <div class="insp-events-result">
          <div class="insp-events-table"></div>
          <h3>Markdown-Vorschau</h3>
          <textarea class="insp-events-md" readonly rows="16"></textarea>
        </div>
      </details>
    `;
    this.rootEl = wrap;
    this.tableEl = wrap.querySelector('.insp-events-table');
    this.mdEl = wrap.querySelector('.insp-events-md');
    this.statusEl = wrap.querySelector('.status');

    // Events
    wrap.querySelector('.btn.scan').addEventListener('click', () => this.runScan());
    const btnMd = wrap.querySelector('.btn.export-md');
    const btnJson = wrap.querySelector('.btn.export-json');
    btnMd?.addEventListener('click', () => {
      if (!this.result) return;
      const md = this.mdEl.value;
      triggerDownload('event-protocol.md', 'text/markdown;charset=utf-8', md);
    });
    btnJson?.addEventListener('click', () => {
      if (!this.result) return;
      const payload = JSON.stringify(this.result, null, 2);
      triggerDownload('event-scan.json', 'application/json;charset=utf-8', payload);
    });

    // Optionaler Node-Hook
    if (OPTIONAL_NODE_HOOK) {
      wrap.querySelector('.btn.trigger-node')?.addEventListener('click', () => this.triggerNode());
    }

    return wrap;
  }

  /** Statuszeile kurz setzen */
  setStatus(msg) {
    if (this.statusEl) this.statusEl.textContent = msg || '';
  }

  /** Tabelle rendern */
  renderTable(groups) {
    const container = this.tableEl;
    container.innerHTML = '';
    const domains = Object.keys(groups).sort((a,b)=>a.localeCompare(b));

    if (!domains.length) {
      container.innerHTML = '<p><em>Keine Einträge gefunden.</em></p>';
      return;
    }

    for (const domain of domains) {
      const box = document.createElement('div');
      box.className = 'insp-events-domain';
      const items = groups[domain];

      const h = document.createElement('h3');
      h.textContent = `🔹 ${domain}  (${items.length})`;
      box.appendChild(h);

      const table = document.createElement('table');
      table.className = 'insp-events-table-grid';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Event</th>
            <th>Typ</th>
            <th>Fundstelle</th>
            <th>Kontext</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');

      for (const ev of items) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${ev.name}</code></td>
          <td>${ev.prefix.toUpperCase()}</td>
          <td>${ev.fileRel} : ${ev.line}</td>
          <td><pre>${ev.lineText}</pre></td>
        `;
        tbody.appendChild(tr);
      }

      box.appendChild(table);
      container.appendChild(box);
    }
  }

  /** Haupt-Scan */
  async runScan() {
    try {
      this.setStatus('Scan läuft …');
      if (window.GameEvents) window.GameEvents.emit?.('emit:inspector:events:scan-started');

      // 1) filelist laden
      let files = await loadFilelist();
      // 2) filtern
      files = files
        .map(p => p.replace(/\\/g, '/'))
        .filter(p => hasAllowedExt(p) && !isExcluded(p));

      // 3) holen & parsen
      let results = [];
      for (const f of files) {
        try {
          const txt = await fetchText(f);
          const evs = extractEventsFromText(txt, f);
          if (evs.length) results.push(...evs);
        } catch (e) {
          // still weiter; wir melden nur in der Statuszeile kurz
          console.warn('[Inspector-Events] Datei übersprungen:', f, e);
        }
      }

      // 4) gruppieren + MD bauen
      const groups = groupEvents('.', results);
      const filesScanned = files.length;
      const totalCount = results.length;

      // Version aus bestehender MD lesen und Patch bumpen
      const prev = await tryReadExistingMdVersion();
      const version = bumpPatch(prev);
      const date = getLocalISODate();

      const md = buildMarkdown({ version, date, groups, filesScanned, totalCount });

      // 5) UI aktualisieren
      this.renderTable(groups);
      this.mdEl.value = md;
      this.rootEl.querySelector('.btn.export-md')?.removeAttribute('disabled');
      this.rootEl.querySelector('.btn.export-json')?.removeAttribute('disabled');

      // 6) Merker für JSON-Export
      this.result = { version, date, groups, filesScanned, totalCount };

      this.setStatus(`Fertig: ${totalCount} Events in ${filesScanned} Dateien.`);
      if (window.GameEvents) window.GameEvents.emit?.('emit:inspector:events:scan-finished', { totalCount, filesScanned });
    } catch (err) {
      console.error('[Inspector-Events] Scan-Fehler:', err);
      this.setStatus('Fehler beim Scan (Details in Konsole).');
    }
  }

  /** Optional: Node-Hook triggern (z. B. dein Dev-Server startet das Node-Skript) */
  async triggerNode() {
    if (!OPTIONAL_NODE_HOOK) return;
    try {
      this.setStatus('Node-Generierung wird ausgelöst …');
      const res = await fetch(OPTIONAL_NODE_HOOK, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.setStatus('Node-Generierung ausgelöst.');
    } catch (e) {
      console.warn('[Inspector-Events] Node-Hook fehlgeschlagen:', e);
      this.setStatus('Node-Hook fehlgeschlagen (siehe Konsole).');
    }
  }

  /** Mount in Inspector-Tab */
  mount(container) {
    const ui = this.createUI();
    container.appendChild(ui);
  }
}

/* =============================[ Hauptlogik ]================================ */

// Tab-Instanz
const _inspEventsTab = new InspectorEventsTab();

// Registrierung im Inspector über dein Event-System ODER Fallback-API:
function registerInspectorTab() {
  const regPayload = {
    id: 'events',
    title: 'Events',
    // Einige Implementationen wollen direkt ein Element, andere eine Mount-Funktion:
    mount: (el) => _inspEventsTab.mount(el),
    element: null
  };

  if (window.GameEvents && typeof window.GameEvents.emit === 'function') {
    // Bevorzugt: über dein Event-Protokoll anmelden
    window.GameEvents.emit('req:inspector:addTab', regPayload);
  } else if (window.Inspector && typeof window.Inspector.addTab === 'function') {
    // Fallback: direkte API
    window.Inspector.addTab(regPayload);
  } else {
    // Notlösung: eigenes, schlichtes Panel anlegen (z. B. rechts unten)
    console.warn('[Inspector-Events] Kein Inspector gefunden – fallback Panel.');
    const fallback = document.createElement('div');
    fallback.style.cssText = 'position:fixed;right:8px;bottom:8px;left:8px;top:50%;background:rgba(20,20,25,.95);color:#eee;padding:8px;z-index:99999;overflow:auto;border:1px solid #444;';
    const h = document.createElement('h2');
    h.textContent = 'Inspector (Fallback) – Events';
    fallback.appendChild(h);
    _inspEventsTab.mount(fallback);
    document.body.appendChild(fallback);
  }
}

// Wenn dein Inspector ein Ready-Event sendet, hängen wir uns dort dran;
// ansonsten registrieren wir direkt nach DOMContentLoaded.
if (window.GameEvents && typeof window.GameEvents.on === 'function') {
  window.GameEvents.on?.('cb:inspector:ready', () => registerInspectorTab());
} 
document.addEventListener('DOMContentLoaded', () => {
  // Falls cb:inspector:ready nie kommt, trotzdem versuchen:
  setTimeout(registerInspectorTab, 0);
});

/* ===============================[ Exports ]================================= */
// kein Export nötig – Modul initialisiert sich selbst
