/* 
====================================================================================
Datei: ui/ui-build.js
Projekt: Siedler-Mini
Version: v16.6.0
Zweck: Bau-Menü (BuildDock) – unten andocken, max. 1–2 Zeilen sichtbar, Rest scrollt.
Hinweis: Rein UI. Kommunikation nur über Events cb:build:*.
==================================================================================== */

/* ========================= 1) Imports ========================= */
// keine – Modul ist „drop-in“

/* =================== 2) Konstanten & Meta ===================== */
const UI_BUILD_VERSION = "v16.6.0";
const ICON_SIZE_PX     = 64;     // Zielgröße der Bau-Icons
const CARD_MIN_W       = 140;
const CARD_MAX_W       = 180;
const MAX_VISIBLE_ROWS = 2;      // <<— harte Vorgabe: 1–2 Zeilen
const DOCK_ID          = "build-dock";
const GRID_ID          = "build-grid";

/* ===================== 3) Hilfsfunktionen ===================== */
function logOK (m){ (window.CBLog?.ok   || console.log)(`[ui-build] ${m}`); }
function logIn (m){ (window.CBLog?.info || console.log)(`[ui-build] ${m}`); }
function logEr (m){ (window.CBLog?.error|| console.error)(`[ui-build] ${m}`); }

function el(tag, cls, attrs){
  const n = document.createElement(tag);
  if (cls) (Array.isArray(cls)? n.classList.add(...cls): n.classList.add(cls));
  if (attrs) Object.entries(attrs).forEach(([k,v])=> n.setAttribute(k, v));
  return n;
}
function emit(name, detail={}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
function groupByCategory(items){
  const map = new Map();
  for (const it of (items||[])) {
    const c = it.category || "Allg. / Verwaltung";
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(it);
  }
  return map;
}

/* =========================== 4) Klasse ======================== */
class BuildDock {
  constructor(){
    this.root  = null;
    this.grid  = null;
    this.items = [];
    this.isOpen = false;
  }

  init(){
    // Root erzeugen (falls in index.html noch nicht vorhanden)
    this.root = document.getElementById(DOCK_ID) || el("div", "ui-build-dock", { id: DOCK_ID, "aria-label":"Bau-Menü" });
    if (!this.root.parentNode) document.body.appendChild(this.root);

    const header = el("div", "ui-build-header");
    const title  = el("div", "ui-build-title"); title.textContent = "Bauen";
    const spacer = el("div", "ui-build-spacer");
    const close  = el("button", ["ui-btn","ui-build-close"], { "aria-label":"Schließen (ESC/Back)" });
    close.type = "button"; close.textContent = "✕";
    close.addEventListener("click", ()=> this.close("button"));
    header.append(title, spacer, close);

    const body = el("div", "ui-build-body");
    this.grid = el("div", "ui-build-grid", { id: GRID_ID });
    body.appendChild(this.grid);

    this.root.append(header, body);

    // ESC/Back schließt
    window.addEventListener("keydown", ev => { if(this.isOpen && ev.key==="Escape") this.close("esc"); });
    window.addEventListener("cb:back",     () => { if(this.isOpen) this.close("back"); });
    window.addEventListener("resize",      () => this._applyMaxHeight());

    logOK(`Modul geladen (${UI_BUILD_VERSION})`);
  }

  setItems(items){
    this.items = Array.isArray(items)? items : [];
    this._render();
  }

  open(from="HUD"){
    if (!this.root) this.init();
    this.isOpen = true;
    this.root.classList.add("is-open");
    this._applyMaxHeight();
    emit("cb:build:open", { from });
    logIn("geöffnet");
  }

  close(reason="cancel"){
    if (!this.root) return;
    this.isOpen = false;
    this.root.classList.remove("is-open");
    emit("cb:build:close",  { reason });
    emit("cb:build:cancel", { via: reason });
    logIn(`geschlossen (reason=${reason})`);
  }

  _render(){
    if (!this.grid) return;
    this.grid.innerHTML = "";
    const groups = groupByCategory(this.items);

    for (const [cat, arr] of groups.entries()){
      const catEl   = el("div", "ui-build-category");
      const catHead = el("div", "ui-build-category-title"); catHead.textContent = cat;
      const row     = el("div", "ui-build-category-row");

      for (const it of arr) row.appendChild(this._makeCard(it));

      catEl.append(catHead, row);
      this.grid.appendChild(catEl);
    }
    if (groups.size === 0){
      const empty = el("div", "ui-build-empty"); empty.textContent = "Keine Gebäude verfügbar.";
      this.grid.appendChild(empty);
    }
  }

  _makeCard(item){
    const btn = el("button", ["ui-build-item","ui-card"]);
    btn.type  = "button";
    btn.title = item.name || item.id;

    const imgWrap = el("div", "ui-build-item-imgwrap");
    const img     = el("img", "ui-build-item-img", { loading:"lazy", decoding:"async" });
    img.src = item.icon || item.sprite || item.image || "";
    img.alt = item.name || item.id || "building";

    const label = el("div", "ui-build-item-label");
    label.textContent = item.name || item.id;

    imgWrap.appendChild(img);
    btn.append(imgWrap, label);

    btn.addEventListener("click", ()=>{
      emit("cb:build:select", { buildingId: item.id });
      logOK(`select ${item.id}`);
    });

    return btn;
  }

  _applyMaxHeight(){
    if (!this.root) return;
    const safeBottom = Number(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-bottom").replace("px","")) || 0;
    const cardH   = Math.max(ICON_SIZE_PX + 28, 88); // Bild + Label + Paddings
    const headerH = 44;
    const bodyPad = 16;
    const maxH    = headerH + (cardH * MAX_VISIBLE_ROWS) + bodyPad + safeBottom;
    this.root.style.setProperty("--build-dock-max-h", `${maxH}px`);
  }
}

/* ====================== 5) Hauptlogik/API ===================== */
const _UIBUILD = new BuildDock();

window.UIBuild = {
  init(){ _UIBUILD.init(); },
  setItems(items){ _UIBUILD.setItems(items); },
  open(from){ _UIBUILD.open(from); },
  close(r){ _UIBUILD.close(r); },
  version: UI_BUILD_VERSION
};

document.addEventListener("DOMContentLoaded", ()=> _UIBUILD.init());

/* =========================== 6) Export ======================== */
export default window.UIBuild;
