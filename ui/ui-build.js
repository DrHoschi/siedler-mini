/* ============================================================================
 * Datei: ui/ui-build.js
 * Version: v18.9.2 (2025-09-26)
 * Zweck: Baumenü (Build-Dock) – Render/Interaktion
 * Leitplanken:
 *   - API: UIBuild.init(root), UIBuild.open(), UIBuild.close(), UIBuild.rerender()
 *   - Events: cb:UIBuild:ready (1x), reagiert auf cb:build:open/close, cb:registry:ready
 *   - Datenquelle: Registry (type="building"); fehlende Registry → leer + Warnung
 *   - Tooltip/Hover: liefert data-* Attribute (id/label/desc) für ui-tooltip.js
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (DOM/Normalize/Render)
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
const UIB_VER = "v18.9.2";

const UIB_STATE = {
  root: null,          // Root-Element (#build-dock)
  wrap: null,          // #build-dock .wrap (Render-Ziel)
  isOpen: false,
  list: [],            // normalisierte Items (aus Registry)
  selected: null
};

/* (2) Helper (DOM/Normalize/Render) ----------------------------------------- */
const $ = (sel, root=document)=> root.querySelector(sel);
function el(tag, cls, html=""){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }

function ensureWrap(root){
  let w = $(".wrap", root);
  if (!w){
    w = el("div","wrap","");
    root.appendChild(w);
  }
  UIB_STATE.wrap = w;
  return w;
}

// robustes Icon: bevorzugt icon/sprite im Objekt; sonst Fallback
function iconUrl(b){
  return b.icon || b.sprite || b.img || b.image || "assets/icons/placeholder.png";
}

// Registry-Normalisierung: unterstützt mehrere Layouts
function normalizeBuilding(raw){
  if (!raw) return null;
  const id   = raw.id || raw.key || raw.slug || null;
  const name = raw.name || raw.title || id || "Unbenannt";
  const desc = raw.desc || raw.description || raw.info || "";
  const icon = iconUrl(raw);
  const cat  = raw.category || raw.cat || "misc";
  const disabled = !!raw.disabled;
  return { id, name, desc, icon, category: cat, disabled };
}

// Registry-Auflösung (verschiedene Formen zulassen)
function fetchBuildingsFromRegistry(){
  const R = window.Registry || {};
  try{
    if (typeof R.list === "function"){
      return R.list("building") || [];
    }
    if (typeof R.getAll === "function"){
      return R.getAll("building") || [];
    }
    if (R.data && Array.isArray(R.data.buildings)){
      return R.data.buildings;
    }
    if (Array.isArray(R.buildings)){
      return R.buildings;
    }
  }catch(e){
    (window.CBLog?.warn||console.warn)(`${UIB_MOD} Registry read error`, e);
  }
  return [];
}

// A11y-Label für Buttons
function ariaLabel(b){
  return `Bauen: ${b.name}`;
}

// Ein einzelnes Item (Button) bauen
function buildItem(b){
  const btn = el("button", "build-item");
  btn.type = "button";
  btn.setAttribute("role","listitem");
  btn.dataset.id    = b.id || "";
  btn.dataset.label = b.name || "";
  if (b.desc) btn.dataset.desc = b.desc;

  btn.innerHTML = `
    <img class="build-icon" src="${iconUrl(b)}" alt="${b.name || b.id || "Building"}" loading="lazy">
    <span class="label">${b.name || b.id}</span>
  `;
  btn.setAttribute("aria-label", ariaLabel(b));
  if (b.disabled){
    btn.classList.add("is-disabled");
    btn.setAttribute("disabled","disabled");
  }

  btn.addEventListener("click", ()=>{
    if (btn.disabled) return;
    UIB_STATE.selected = b.id;
    try {
      window.dispatchEvent(new CustomEvent("cb:build:select", { detail:{ id:b.id }}));
    } catch(_) {}
    (window.CBLog?.info||console.log)(`${UIB_MOD} ausgewählt: ${b.id}`);
    // Optional: Visual Selected
    $(".build-item.is-selected", UIB_STATE.wrap)?.classList.remove("is-selected");
    btn.classList.add("is-selected");
  });

  return btn;
}

// Kategorie mit Header + Grid
function renderCategory(cat, arr){
  const section = el("section","build-cat");
  // Header
  const head = el("div","build-header","");
  const title = el("h4","build-title", cat);
  const count = el("span","build-count", String(arr.length));
  head.append(title, count);
  // Liste
  const list = el("div","build-list","");
  list.setAttribute("role","list");
  arr.forEach(b => list.appendChild(buildItem(b)));

  section.append(head, list);
  return section;
}

// Leerer Zustand
function emptyStateMarkup(reason){
  const box = el("div", "build-empty", `
    <div class="msg" style="padding:10px 12px;">
      <div class="title" style="font-weight:700;margin-bottom:4px;">Kein Baumenü verfügbar</div>
      <div class="reason" style="opacity:.8">${reason}</div>
    </div>
  `);
  return box;
}

/* (3) Render-Pipeline -------------------------------------------------------- */
function collectBuildings(){
  const raws = fetchBuildingsFromRegistry();
  if (!Array.isArray(raws) || !raws.length){
    CBLog.warn(`${UIB_MOD} keine buildings in Registry gefunden`);
    return [];
  }
  const norm = raws.map(normalizeBuilding).filter(Boolean);
  return norm;
}

function renderList(root){
  const wrap = ensureWrap(root);
  wrap.innerHTML = "";
  UIB_STATE.list = collectBuildings();

  if (!UIB_STATE.list.length) {
    wrap.appendChild( emptyStateMarkup("Registry nicht geladen oder leer.") );
    return;
  }

  // Gruppieren
  const groups = new Map(); // cat -> items
  for (const b of UIB_STATE.list) {
    const cat = b.category || "misc";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(b);
  }

  // Alphabetische Reihenfolge der Kategorien
  const cats = Array.from(groups.keys()).sort((a,b)=> (""+a).localeCompare(""+b));

  for (const cat of cats){
    const arr = groups.get(cat);
    wrap.appendChild( renderCategory(cat, arr) );
  }
}

/* (4) API (open/close/rerender/init) ---------------------------------------- */
const UIBuild = {
  open(){
    UIB_STATE.isOpen = true;
    if (UIB_STATE.root) UIB_STATE.root.removeAttribute("hidden");
    try { window.dispatchEvent(new CustomEvent("cb:build:open")); } catch(_) {}
  },
  close(){
    UIB_STATE.isOpen = false;
    if (UIB_STATE.root) UIB_STATE.root.setAttribute("hidden","");
    try { window.dispatchEvent(new CustomEvent("cb:build:close")); } catch(_) {}
  },
  rerender(){
    if (!UIB_STATE.root) return;
    renderList(UIB_STATE.root);
  },
  init(root){
    if (UIB_STATE.root) return; // idempotent
    UIB_STATE.root = root || $("#build-dock");
    if (!UIB_STATE.root) {
      CBLog.error(`${UIB_MOD} Root #build-dock fehlt`);
      return;
    }
    ensureWrap(UIB_STATE.root);
    renderList(UIB_STATE.root);
    CBLog.ok(`${UIB_MOD} init abgeschlossen (${UIB_VER})`);
  }
};

/* (5) Event-Wiring ----------------------------------------------------------- */
// Sichtbarkeit (Index setzt zusätzlich body-Klasse; doppelt schadlos)
window.addEventListener("cb:build:open",  ()=> { if (UIB_STATE.root) UIB_STATE.root.removeAttribute("hidden"); });
window.addEventListener("cb:build:close", ()=> { if (UIB_STATE.root) UIB_STATE.root.setAttribute("hidden",""); });

// Init nach UI-Ready (falls noch nicht geschehen)
window.addEventListener("cb:ui-ready", ()=>{
  if (!UIB_STATE.root) UIBuild.init();
});

// Nach Registry-Ready neu rendern (Garant, dass Descriptions/Icons da sind)
window.addEventListener("cb:registry:ready", ()=>{
  if (UIB_STATE.root) UIBuild.rerender();
});

// Optional: Nach Spielstart auch einmal frisch rendern
window.addEventListener("cb:game-start", ()=>{
  if (UIB_STATE.root) UIBuild.rerender();
});

/* (6) Exports + Ready-Event -------------------------------------------------- */
window.UIBuild = window.UIBuild || UIBuild;
try {
  window.dispatchEvent(new CustomEvent("cb:UIBuild:ready"));
  CBLog.ok(`${UIB_MOD} bereit (Ready-Event gesendet)`);
} catch(e) { /* ignore */ }
