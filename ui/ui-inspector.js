/* ============================================================================
 * Datei: ui/ui-inspector.js
 * Version: v18.9.0 (2025-09-26)
 * Zweck: Einheitliche Inspector-UI + API-Wrapper (Fallback inkl.)
 * Leitplanken:
 *   - Zentrale CBLog-Nutzung (kommt aus index)
 *   - KEIN ReferenceError mehr: nutzt nur InspectorAPI/Wrapper, nie nacktes "Inspector"
 *   - Tabs: Logs | Tests | Ressourcen | Pfade (Fallback-UI); echte Module dürfen übernehmen
 *   - Events (neu + legacy): cb:inspector:open|close|tab:change (sowie cb:inspector-open|close)
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) DOM-Setup (ensureRoot, basic UI)
 *   (3) Tabs/Render (setTab, Logs-Stream)
 *   (4) Öffnen/Schließen/Toggle (API)
 *   (5) Event-Wiring (cb:log, ESC, Ready-Signale)
 *   (6) Exports (window.UIInspector) + Ready-Event
 * ============================================================================ */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[ui-inspector] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten/State ------------------------------------------------------- */
const UINS_MOD = "[ui-inspector]";
const UINS_VER = "v18.9.0";

const UINS_STATE = {
  root: null,        // Overlay-Root (Fallback-UI), #inspector-root / .inspector-root
  body: null,        // Body-Container
  tabs: null,        // Tabs-Container
  isOpen: false,
  activeTab: "logs",
  logs: []           // In-Memory Log-Buffer für Fallback-Logs
};

/* (2) DOM-Setup (ensureRoot, basic UI) -------------------------------------- */
function ensureRoot(){
  // vorhandene Container (#inspector oder #inspector-root) bevorzugen
  let r = document.getElementById("inspector-root")
       || document.querySelector(".inspector-root")
       || document.getElementById("inspector"); // falls altes Root existiert

  if (!r) {
    r = document.createElement("div");
    r.id = "inspector-root";
    r.className = "inspector-root";
    r.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(8,12,18,.92);color:#cfe0f2;display:none;";
    r.setAttribute("role","dialog");
    r.setAttribute("aria-modal","true");

    // Kopf
    const head = document.createElement("div");
    head.className = "inspector-head";
    head.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);";
    const hTitle = document.createElement("div");
    hTitle.textContent = "Inspector";
    hTitle.style.cssText = "font-weight:700;font-size:16px;";
    const spacer = document.createElement("div"); spacer.style.flex = "1";
    const btnClose = document.createElement("button");
    btnClose.textContent = "✕";
    btnClose.setAttribute("aria-label","Inspector schließen (ESC)");
    btnClose.style.cssText = "background:#263346;color:#cfe0f2;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;";
    btnClose.addEventListener("click", ()=> UIInspector.close("button"));
    head.append(hTitle, spacer, btnClose);

    // Tabs
    const tabs = document.createElement("div");
    tabs.className = "inspector-tabs";
    tabs.style.cssText = "display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06);";
    const tabNames = ["Logs","Tests","Ressourcen","Pfade"];
    tabNames.forEach((name,idx)=>{
      const t = document.createElement("button");
      t.textContent = name;
      t.dataset.tab = name.toLowerCase();
      t.style.cssText = "background:#314259;color:#e8f2ff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;";
      if(idx===0) t.classList.add("is-active");
      t.addEventListener("click", ()=>{
        tabs.querySelectorAll("button").forEach(b=>b.classList.remove("is-active"));
        t.classList.add("is-active");
        setTab(t.dataset.tab);
      });
      tabs.appendChild(t);
    });

    // Body
    const body = document.createElement("div");
    body.id = "inspector-body";
    body.style.cssText = "padding:12px;max-height:calc(100vh - 110px);overflow:auto;";

    r.append(head, tabs, body);
    document.body.appendChild(r);

    // ESC schließt
    window.addEventListener("keydown", (ev)=>{ if(r.style.display!=="none" && ev.key==="Escape") UIInspector.close("esc"); });
  }

  UINS_STATE.root = r;
  UINS_STATE.body = r.querySelector("#inspector-body") || r.querySelector(".inspector-body") || r;
  UINS_STATE.tabs = r.querySelector(".inspector-tabs");
  return r;
}

/* (3) Tabs/Render (setTab, Logs-Stream) ------------------------------------- */
function renderLogs(){
  // Fallback-Logliste (einfache Tabelle/Pre)
  if (!UINS_STATE.body) return;
  if (UINS_STATE.activeTab !== "logs") return;

  const rows = UINS_STATE.logs.slice(-500).map(l=>{
    const ts = new Date(l.t||Date.now()).toLocaleTimeString();
    const icon = l.icon || ""; // icon kommt aus index-CBLog via detail.icon
    return `<div class="log-row level-${l.level||'info'}" style="padding:2px 0;">
      <span class="ts" style="opacity:.7;margin-right:.5em;">${ts}</span>
      <span class="ic" style="margin-right:.4em;">${icon}</span>
      <span class="msg">${l.msg||""}</span>
    </div>`;
  }).join("");
  UINS_STATE.body.innerHTML = `
    <div class="log-panel">
      <div class="log-list" style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.35">${rows||"<em>Log-Stream aktiv…</em>"}</div>
    </div>
  `;
}

function setTab(tab){
  UINS_STATE.activeTab = tab;
  if (!UINS_STATE.body) return;

  if (tab === "logs") {
    renderLogs();
  } else if (tab === "tests") {
    UINS_STATE.body.innerHTML = `
      <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
        <button onclick="window.dispatchEvent(new CustomEvent('cb:test:paths:toggle'))">Pfade-Overlay umschalten</button>
        <button onclick="window.dispatchEvent(new CustomEvent('cb:test:heatmap:toggle'))">Heatmap umschalten</button>
        <button onclick="window.dispatchEvent(new CustomEvent('cb:test:perf:tick'))">Perf-Tick</button>
      </div>
    `;
  } else if (tab === "ressourcen") {
    UINS_STATE.body.innerHTML = "<div>Ressourcen-Übersicht (Fallback). Echte Ansicht liefert inspector.resources.js</div>";
  } else if (tab === "pfade") {
    UINS_STATE.body.innerHTML = "<div>Pfad-Tools (Fallback). Echte Tools liefert inspector.paths.js</div>";
  } else {
    UINS_STATE.body.innerHTML = "<div>Wähle einen Tab.</div>";
  }

  // Events (neu + legacy)
  try {
    window.dispatchEvent(new CustomEvent("cb:inspector:tab:change", { detail:{ tab } }));
    window.dispatchEvent(new CustomEvent("cb:inspector-tab-change",  { detail:{ tab } })); // legacy
  } catch(_) {}
}

/* (4) Öffnen/Schließen/Toggle (API) ----------------------------------------- */
function doOpen(origin){
  // Wenn echter Core existiert, delegieren
  if (window.InspectorAPI?.open) { try { window.InspectorAPI.open(); return; } catch(_){} }

  const r = ensureRoot();
  r.style.display = "block";
  r.classList.add("is-open");
  UINS_STATE.isOpen = true;
  setTab(UINS_STATE.activeTab || "logs");

  try {
    window.dispatchEvent(new CustomEvent("cb:inspector:open", { detail:{ from:origin||"UI" } }));
    window.dispatchEvent(new CustomEvent("cb:inspector-open",   { detail:{ from:origin||"UI" } })); // legacy
  } catch(_) {}

  (window.CBLog?.ok||console.log)(`${UINS_MOD} geöffnet (${UINS_VER})`);
}

function doClose(reason){
  if (window.InspectorAPI?.close) { try { window.InspectorAPI.close(); return; } catch(_){} }

  const r = ensureRoot();
  r.style.display = "none";
  r.classList.remove("is-open");
  UINS_STATE.isOpen = false;

  try {
    window.dispatchEvent(new CustomEvent("cb:inspector:close", { detail:{ reason:reason||"cancel" } }));
    window.dispatchEvent(new CustomEvent("cb:inspector-close", { detail:{ reason:reason||"cancel" } })); // legacy
  } catch(_) {}

  (window.CBLog?.ok||console.log)(`${UINS_MOD} geschlossen`);
}

function doToggle(){
  if (window.InspectorAPI?.toggle) { try { window.InspectorAPI.toggle(); return; } catch(_){} }

  const r = ensureRoot();
  const isHidden = (r.style.display === "none" || !r.style.display);
  if (isHidden) doOpen("toggle"); else doClose("toggle");
}

/* (5) Event-Wiring (cb:log, ESC, Ready-Signale) ----------------------------- */
// Logs einsammeln (für Fallback-Logs-Tab)
window.addEventListener("cb:log", (ev)=>{
  const { level, msg, t, icon } = ev.detail || {};
  UINS_STATE.logs.push({ level, msg, t, icon });
  // Nur neu rendern, wenn Tab „logs“ aktiv ist
  if (UINS_STATE.activeTab === "logs" && UINS_STATE.isOpen) renderLogs();
});

// Optionale Reaktion auf index-Ready (kann genutzt werden, um DOM lazy zu bauen)
window.addEventListener("cb:ui-ready", ()=>{
  // Root vorhalten (nichts anzeigen)
  ensureRoot();
  (window.CBLog?.info||console.log)(`${UINS_MOD} bereit (UI-Ready)`);
});

// Wenn der „echte“ Inspector-Core fertig ist, darf er übernehmen
window.addEventListener("cb:inspector:core-ready", ()=>{
  (window.CBLog?.ok||console.log)(`${UINS_MOD} echter Core signalisiert readiness`);
});

/* (6) Exports (UIInspector) + Ready-Event ----------------------------------- */
window.UIInspector = {
  open:   doOpen,
  close:  doClose,
  toggle: doToggle,
  setTab: (name)=> setTab((name||"").toLowerCase()),
  version: UINS_VER
};

// Ready-Event für alle, die darauf warten
try {
  window.dispatchEvent(new CustomEvent("cb:inspector:UI-ready", { detail:{ ver: UINS_VER }}));
} catch(_) {}
