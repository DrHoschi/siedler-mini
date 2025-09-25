/* ============================================================================
 * Datei: ui/ui-build.js
 * Version: v18.8.0 (2025-09-25)
 * Zweck: Baumenü (Build-Dock) – Render/Interaktion
 * Leitplanken:
 *   - API: UIBuild.init(root), UIBuild.open(), UIBuild.close(), UIBuild.rerender()
 *   - Events: cb:UIBuild:ready (1x), reagiert auf cb:build:open/close
 *   - Datenquelle: Registry (type="building"); fehlende Registry → leer + Warnung
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (DOM/Render)
 *   (3) Render-Pipeline
 *   (4) API (open/close/rerender/init)
 *   (5) Event-Wiring
 *   (6) Exports + Ready-Event
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[ui-build] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten/State ------------------------------------------------------- */
const UIB_MOD = "[ui-build]";
const UIB_VER = "v18.8.0";

const UIB_STATE = {
  root: null,          // Root-Element (#build-dock)
  isOpen: false,
  list: [],            // gerenderte Items (aus Registry)
  selected: null
};

/* (2) Helper (DOM/Render) --------------------------------------------------- */
function $(sel, root=document){ return root.querySelector(sel); }
function el(tag, cls, html=""){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }

function buildIconMarkup(b){
  // Icon: bevorzugt b.icon/b.sprite (Registry-Patch), sonst Platzhalter
  const src = b.icon || b.sprite || "assets/icons/placeholder.png";
  const alt = b.name || b.id || "Building";
  return `<img class="build-icon" src="${src}" alt="${alt}" loading="lazy">`;
}

function buildItem(b){
  const btn = el("button", "build-item");
  btn.type = "button";
  btn.setAttribute("data-id", b.id);
  btn.innerHTML = `
    ${buildIconMarkup(b)}
    <span class="label">${b.name || b.id}</span>
  `;
  btn.addEventListener("click", ()=> {
    UIB_STATE.selected = b.id;
    window.dispatchEvent(new CustomEvent("cb:build:select", { detail:{ id:b.id }}));
    (window.CBLog?.info||console.log)(`${UIB_MOD} ausgewählt: ${b.id}`);
  });
  return btn;
}

function emptyStateMarkup(reason){
  const box = el("div", "build-empty", `
    <div class="msg">
      <div class="title">Kein Baumenü verfügbar</div>
      <div class="reason">${reason}</div>
    </div>
  `);
  return box;
}

/* (3) Render-Pipeline -------------------------------------------------------- */
function collectBuildings(){
  if (!window.Registry || typeof Registry.list !== "function") {
    CBLog.warn(`${UIB_MOD} Registry nicht verfügbar – render leere Liste`);
    return [];
  }
  const items = Registry.list("building");  // kann [] sein
  if (!Array.isArray(items) || !items.length) {
    CBLog.warn(`${UIB_MOD} keine buildings in Registry gefunden`);
    return [];
  }
  return items;
}

function renderList(root){
  root.innerHTML = "";
  UIB_STATE.list = collectBuildings();

  if (!UIB_STATE.list.length) {
    root.appendChild( emptyStateMarkup("Registry nicht geladen oder leer.") );
    return;
  }

  // Option: Gruppierung nach Kategorie (falls vorhanden)
  const groups = new Map(); // cat -> items
  for (const b of UIB_STATE.list) {
    const cat = b.category || "misc";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(b);
  }

  for (const [cat, arr] of groups.entries()){
    const section = el("section","build-section");
    section.appendChild( el("h3","build-cat", cat) );
    const row = el("div","build-row");
    arr.forEach(b => row.appendChild( buildItem(b) ));
    section.appendChild(row);
    root.appendChild(section);
  }
}

/* (4) API (open/close/rerender/init) ---------------------------------------- */
const UIBuild = {
  open(){
    UIB_STATE.isOpen = true;
    if (UIB_STATE.root) {
      UIB_STATE.root.removeAttribute("hidden");
    }
    window.dispatchEvent(new CustomEvent("cb:build:open"));
  },
  close(){
    UIB_STATE.isOpen = false;
    if (UIB_STATE.root) {
      UIB_STATE.root.setAttribute("hidden","");
    }
    window.dispatchEvent(new CustomEvent("cb:build:close"));
  },
  rerender(){
    if (!UIB_STATE.root) return;
    renderList(UIB_STATE.root);
  },
  init(root){
    UIB_STATE.root = root || $("#build-dock");
    if (!UIB_STATE.root) {
      CBLog.error(`${UIB_MOD} Root #build-dock fehlt`);
      return;
    }
    renderList(UIB_STATE.root);
    CBLog.ok(`${UIB_MOD} init abgeschlossen (${UIB_VER})`);
  }
};

/* (5) Event-Wiring ----------------------------------------------------------- */
// Auf Open/Close reagieren (Index setzt Sichtbarkeit via body-Klasse zusätzlich)
window.addEventListener("cb:build:open",  ()=> { if (UIB_STATE.root) UIB_STATE.root.removeAttribute("hidden"); });
window.addEventListener("cb:build:close", ()=> { if (UIB_STATE.root) UIB_STATE.root.setAttribute("hidden",""); });

// Nach UI-Ready init, falls noch nicht geschehen
window.addEventListener("cb:ui-ready", ()=>{
  if (!UIB_STATE.root) UIBuild.init();
});

// Optional: Nach Spielstart neu rendern (Registry sollte dann gefüllt sein)
window.addEventListener("cb:game-start", ()=>{
  if (UIB_STATE.root) UIBuild.rerender();
});

/* (6) Exports + Ready-Event -------------------------------------------------- */
window.UIBuild = window.UIBuild || UIBuild;
try {
  window.dispatchEvent(new CustomEvent("cb:UIBuild:ready"));
  CBLog.ok(`${UIB_MOD} bereit (Ready-Event gesendet)`);
} catch(e) { /* ignore */ }
