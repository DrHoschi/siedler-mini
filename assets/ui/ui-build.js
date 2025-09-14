/* 
====================================================================================
Datei: assets/ui/ui-build.js
Projekt: Neue Siedler
Version: v17.9.12
Zweck: Bau-Menü (BuildDock) – unten andocken, max. 1–2 Zeilen sichtbar, Rest scrollt.
Hinweis: Rein UI. Kommunikation nur über Events cb:build:*.
Kompatibilität: akzeptiert #build-dock ODER #build-panel; emittiert zusätzlich cb:build-open/close.
==================================================================================== */

/* =================== Konstanten & Meta =================== */
var UI_BUILD_VERSION = "v17.9.12";
var ICON_SIZE_PX     = 64;     // Zielgröße der Bau-Icons
var CARD_MIN_W       = 140;
var CARD_MAX_W       = 180;
var MAX_VISIBLE_ROWS = 2;      // hart: 1–2 Zeilen

/* ====================== Hilfsfunktionen =================== */
function _logOK (m){ (window.CBLog?.ok   || console.log)(`[ui-build] ${m}`); }
function _logIn (m){ (window.CBLog?.info || console.log)(`[ui-build] ${m}`); }
function _logEr (m){ (window.CBLog?.error|| console.error)(`[ui-build] ${m}`); }

function _el(tag, cls, attrs){
  var n = document.createElement(tag);
  if (cls) (Array.isArray(cls)? n.classList.add.apply(n.classList, cls): n.classList.add(cls));
  if (attrs) Object.keys(attrs).forEach(function(k){ n.setAttribute(k, attrs[k]); });
  return n;
}
function _emit(name, detail){
  try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch(e){}
}
function _emitBoth(base, detail){
  // Standard
  _emit(`cb:${base}`, detail);
  // Fallback (Bindestrich-Variante)
  _emit(`cb:${base.replace(/:/g,"-")}`, detail);
}
function _groupByCategory(items){
  var map = new Map();
  (items||[]).forEach(function(it){
    var c = it.category || "Allg. / Verwaltung";
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(it);
  });
  return map;
}

/* =========================== Klasse ====================== */
function BuildDock(){
  this.root = null;
  this.grid = null;
  this.items = [];
  this.isOpen = false;
}
BuildDock.prototype._findRoot = function(){
  // akzeptiere beide IDs
  var r = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!r){
    r = _el("div", "ui-build-dock", { id: "build-dock", "aria-label":"Bau-Menü" });
    document.body.appendChild(r);
  } else {
    r.classList.add("ui-build-dock"); // falls alt ohne Klasse
  }
  return r;
};
BuildDock.prototype.init = function(){
  this.root = this._findRoot();

  var header = _el("div", "ui-build-header");
  var title  = _el("div", "ui-build-title"); title.textContent = "Bauen";
  var spacer = _el("div", "ui-build-spacer");
  var close  = _el("button", ["ui-btn","ui-build-close"], { "aria-label":"Schließen (ESC/Back)" });
  close.type = "button"; close.textContent = "✕";
  close.addEventListener("click", this.close.bind(this, "button"));
  header.appendChild(title); header.appendChild(spacer); header.appendChild(close);

  var body = _el("div", "ui-build-body");
  this.grid = _el("div", "ui-build-grid", { id: "build-grid" });
  body.appendChild(this.grid);

  this.root.innerHTML = "";
  this.root.appendChild(header);
  this.root.appendChild(body);

  // ESC/Back
  window.addEventListener("keydown", (ev)=>{ if(this.isOpen && ev.key==="Escape") this.close("esc"); });
  window.addEventListener("cb:back", ()=>{ if(this.isOpen) this.close("back"); });
  window.addEventListener("resize", ()=> this._applyMaxHeight());

  _logOK("Modul geladen ("+UI_BUILD_VERSION+")");
};
BuildDock.prototype.setItems = function(items){
  this.items = Array.isArray(items)? items : [];
  this._render();
};
BuildDock.prototype.open = function(from){
  if (!this.root) this.init();
  this.isOpen = true;
  this.root.classList.add("is-open");
  this._applyMaxHeight();
  _emitBoth("build:open", { from: from || "UI" });
  _logIn("geöffnet");
};
BuildDock.prototype.close = function(reason){
  if (!this.root) return;
  this.isOpen = false;
  this.root.classList.remove("is-open");
  _emitBoth("build:close",  { reason: reason || "cancel" });
  _emitBoth("build:cancel", { via: reason || "cancel" });
  _logIn("geschlossen (reason="+(reason||"cancel")+")");
};
BuildDock.prototype._render = function(){
  if (!this.grid) return;
  this.grid.innerHTML = "";
  var groups = _groupByCategory(this.items);
  if (groups.size === 0){
    var empty = _el("div", "ui-build-empty"); empty.textContent = "Keine Gebäude verfügbar.";
    this.grid.appendChild(empty);
    return;
  }
  groups.forEach((arr, cat)=>{
    var catEl   = _el("div", "ui-build-category");
    var catHead = _el("div", "ui-build-category-title"); catHead.textContent = cat;
    var row     = _el("div", "ui-build-category-row");
    arr.forEach((it)=> row.appendChild(this._makeCard(it)) );
    catEl.appendChild(catHead); catEl.appendChild(row);
    this.grid.appendChild(catEl);
  });
};
BuildDock.prototype._makeCard = function(item){
  var btn = _el("button", ["ui-build-item","ui-card"]);
  btn.type  = "button";
  btn.title = item.name || item.id;

  var imgWrap = _el("div", "ui-build-item-imgwrap");
  var img     = _el("img", "ui-build-item-img", { loading:"lazy", decoding:"async" });
  img.src = item.icon || item.sprite || item.image || "";
  img.alt = item.name || item.id || "building";

  var label = _el("div", "ui-build-item-label");
  label.textContent = item.name || item.id;

  imgWrap.appendChild(img);
  btn.appendChild(imgWrap);
  btn.appendChild(label);

  btn.addEventListener("click", function(){
    _emit("cb:build:select", { buildingId: item.id });
    _logOK("select "+item.id);
  });

  return btn;
};
BuildDock.prototype._applyMaxHeight = function(){
  if (!this.root) return;
  var cs = getComputedStyle(document.documentElement);
  var safeBottom = Number((cs.getPropertyValue("--safe-area-bottom")||"").replace("px","")) || 0;
  var cardH   = Math.max(ICON_SIZE_PX + 28, 88); // Bild + Label + Paddings
  var headerH = 44;
  var bodyPad = 16;
  var maxH    = headerH + (cardH * MAX_VISIBLE_ROWS) + bodyPad + safeBottom;
  this.root.style.setProperty("--build-dock-max-h", maxH + "px");
};

/* =========================== API ========================= */
(function(){
  var _UIBUILD = new BuildDock();

  window.UIBuild = {
    init: function(){ _UIBUILD.init(); },
    setItems: function(items){ _UIBUILD.setItems(items); },
    open: function(from){ _UIBUILD.open(from); },
    close: function(r){ _UIBUILD.close(r); },
    version: UI_BUILD_VERSION
  };

  // Auto-Init
  document.addEventListener("DOMContentLoaded", function(){
    _UIBUILD.init();

    // Items aus Datenquelle übernehmen (wenn vorhanden)
    if (Array.isArray(window.__buildItems)) {
      _UIBUILD.setItems(window.__buildItems);
      _logOK("Items gesetzt (__buildItems: "+window.__buildItems.length+")");
    } else if (Array.isArray(window.BuildAssets?.items)) {
      _UIBUILD.setItems(window.BuildAssets.items);
      _logOK("Items gesetzt (BuildAssets.items: "+window.BuildAssets.items.length+")");
    }
  });

  // Optionale Hotkeys: B = öffnen, ESC wird in Klasse behandelt
  window.addEventListener("keydown", function(ev){
    if (ev.key && ev.key.toLowerCase() === "b") window.UIBuild.open("hotkey");
  });

})();
