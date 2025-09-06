/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.11.0
 *
 * Zweck:
 *   - Zentrales Inspector-Overlay (Vollbild, Tabs, Slots)
 *   - Öffnen/Schließen + sichere Z-Order + Fokus-Falle
 *   - Stabile Slot-Struktur für Submodule (logs, build, paths, tests)
 *
 * Öffentliche API (window.__INSPECTOR_CORE__):
 *   core.api.mount(tabId, renderFn)         → Submodule registrieren
 *   core.api.getSlot(name)                  → Slot-Element liefern
 *   core.api.signal(name, payload?)         → einfache Events
 *   core.api.select(tabId)                  → Tab wechseln (optional)
 *
 * Events:
 *   send:  cb:inspector-open / cb:inspector-close
 *   recv:  cb:inspector:open / cb:inspector:close  (optional extern)
 *
 * Hinweise:
 *   - Keine body-Appends außerhalb dieses Moduls.
 *   - Defensive gegenüber fehlender Styles (funktional > hübsch).
 * ========================================================================== */
(function(){
  "use strict";

  var MOD = "[inspector.core]";
  var VER = "v18.11.0";

  // ---------- Logging (sanft) -----------------------------------------------
  var log   = (...a)=> (window.CBLog?.info || console.log)(MOD, ...a);
  var warn  = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);
  var error = (...a)=> (window.CBLog?.err  || console.error)(MOD, ...a);

  // ---------- DOM Grundgerüst ------------------------------------------------
  var root, header, titleEl, closeBtn, tabsBar, bodyWrap;
  var currentTab = "logs";
  var mounted = {};          // tabId → unmountFn
  var renders = {};          // tabId → renderFn (von Submodulen)
  var slots   = {};          // name → HTMLElement
  var isOpen  = false;

  function ensureRoot(){
    if (root) return;
    root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-modal","true");
    root.style.cssText = "" +
      "position:fixed;inset:0;z-index:2147483646;display:none;" +
      "background:rgba(11,14,12,.82);backdrop-filter:blur(6px)";

    // Header
    header = document.createElement("div");
    header.className = "ins-header";
    header.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);";

    titleEl = document.createElement("div");
    titleEl.className = "ins-title";
    titleEl.textContent = "Inspector";
    titleEl.style.cssText = "font-weight:700;letter-spacing:.2px;opacity:.95;";

    // kleine Versions-Badge
    var verEl = document.createElement("span");
    verEl.className = "ins-version";
    verEl.textContent = VER;
    verEl.style.cssText = "margin-left:8px;font:12px/1 system-ui;opacity:.65;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.08)";

    // Tabs
    tabsBar = document.createElement("div");
    tabsBar.className = "ins-tabs";
    tabsBar.style.cssText = "display:flex; gap:6px; margin-left:auto;";

    function mkTab(id, label){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ins-tab";
      b.textContent = label;
      b.dataset.tab = id;
      b.style.cssText = "border:none;border-radius:8px;padding:6px 10px;background:rgba(255,255,255,.10);color:#eee;cursor:pointer";
      b.addEventListener("click", function(){ selectTab(id); });
      return b;
    }

    tabsBar.appendChild(mkTab("logs","Logs"));
    tabsBar.appendChild(mkTab("build","Build"));
    tabsBar.appendChild(mkTab("paths","Pfade"));
    tabsBar.appendChild(mkTab("tests","Tests"));

    // Close
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "ins-close";
    closeBtn.textContent = "Schließen";
    closeBtn.style.cssText = "margin-left:12px;border:none;border-radius:8px;padding:6px 10px;background:rgba(255,255,255,.12);color:#eee;cursor:pointer";
    closeBtn.addEventListener("click", closeInspector);

    header.appendChild(titleEl);
    header.appendChild(verEl);
    header.appendChild(tabsBar);
    header.appendChild(closeBtn);

    // Body mit Slots
    bodyWrap = document.createElement("div");
    bodyWrap.className = "ins-body";
    bodyWrap.style.cssText = "position:absolute;inset:48px 12px 12px 12px;display:grid;grid-template-rows:auto 1fr auto;gap:10px;";

    // Slots für Logs
    slots["logs-controls"] = createSlot("logs-controls");
    slots["logs-view"]     = createSlot("logs-view");
    slots["logs-footer"]   = createSlot("logs-footer");

    // Für andere Tabs auch generische Slots
    slots["build"] = createSlot("build");
    slots["paths"] = createSlot("paths");
    slots["tests"] = createSlot("tests");

    // Standard: nur aktiver Tab sichtbar
    reflectTabVisibility();

    root.appendChild(header);
    root.appendChild(bodyWrap);
    document.body.appendChild(root);

    // Diagnose: Body-Klasse steuern (für externe Styles)
    document.addEventListener("cb:inspector-open", ()=>document.body.classList.add("inspector-open"));
    document.addEventListener("cb:inspector-close",()=>document.body.classList.remove("inspector-open"));

    log("bereit ("+VER+")");
  }

  function createSlot(name){
    var el = document.createElement("div");
    el.className = "slot-"+name;
    // Scroll nur in Views; Controls/Footer bleiben auto
    if (name.endsWith("view")) {
      el.style.cssText = "min-height:0;overflow:auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;";
    } else {
      el.style.cssText = "display:block;";
    }
    bodyWrap.appendChild(el);
    return el;
  }

  function reflectTabVisibility(){
    // Logs-Layout = 3 Reihen, andere Tabs = 1 Slot full
    Object.keys(slots).forEach(function(k){
      var el = slots[k];
      if (k.startsWith("logs-")){
        el.style.display = (currentTab === "logs") ? "block" : "none";
      } else {
        el.style.display = "none";
      }
    });
    // Aktiver Nicht-Logs-Tab: zeige seinen Slot im Body an
    if (currentTab !== "logs"){
      var key = currentTab;
      if (slots[key]) {
        slots["logs-controls"].style.display = "none";
        slots["logs-view"].style.display     = "none";
        slots["logs-footer"].style.display   = "none";
        slots[key].style.display             = "block";
        // Größe vollflächig
        slots[key].style.gridRow             = "1 / span 3";
        slots[key].style.minHeight           = "0";
        slots[key].style.overflow            = "auto";
      }
    } else {
      // Logs-Tab: Slots normal zeigen
      slots["logs-controls"].style.gridRow = "1 / span 1";
      slots["logs-view"].style.gridRow     = "2 / span 1";
      slots["logs-footer"].style.gridRow   = "3 / span 1";
    }

    // Tab-Buttons aktiv setzen
    Array.from(tabsBar.querySelectorAll(".ins-tab")).forEach(function(b){
      b.classList.toggle("active", b.dataset.tab === currentTab);
      if (b.classList.contains("active")) {
        b.style.background = "rgba(120,200,255,.22)";
      } else {
        b.style.background = "rgba(255,255,255,.10)";
      }
    });
  }

  // ---------- Öffnen/Schließen ----------------------------------------------
  function openInspector(){
    ensureRoot();
    if (isOpen){ reflectTabVisibility(); return; }
    isOpen = true;
    titleEl.textContent = "Inspector"; // Text; Version steht im Badge
    root.style.display = "block";
    root.scrollTop = 0;

    // Fokus auf Close für schnelle Bedienung
    try{ closeBtn.focus({ preventScroll:true }); }catch(_){}

    try{ window.dispatchEvent(new Event("cb:inspector-open")); }catch(_){}
  }
  function closeInspector(){
    if (!root || !isOpen) return;
    isOpen = false;
    root.style.display = "none";
    try{ window.dispatchEvent(new Event("cb:inspector-close")); }catch(_){}
  }
  function toggleInspector(force){
    if (force == null) return isOpen ? closeInspector() : openInspector();
    return force ? openInspector() : closeInspector();
  }

  // ---------- Tabs -----------------------------------------------------------
  function selectTab(tabId){
    ensureRoot();
    if (!tabId) tabId = "logs";
    if (tabId === currentTab){
      reflectTabVisibility();
      return;
    }
    // unmount alten Tab, falls nötig
    try{
      var un = mounted[currentTab];
      if (typeof un === "function"){ un(); }
    }catch(_){}
    mounted[currentTab] = null;

    currentTab = tabId;
    reflectTabVisibility();

    // render neuen Tab
    mountCurrentTab();
  }

  function mountCurrentTab(){
    var fn = renders[currentTab];
    if (typeof fn === "function"){
      // renderFn darf optional eine unmount-Funktion zurückgeben
      try{
        mounted[currentTab] = fn() || null;
      }catch(e){
        error("Tab '"+currentTab+"' Renderfehler:", e && e.message);
      }
    }
  }

  // ---------- Submodule API --------------------------------------------------
  var API = {
    // Submodule registrieren
    mount: function(tabId, renderFn){
      renders[tabId] = renderFn;
      // Wenn Submodul zur aktuellen Auswahl gehört und Inspector offen → (re)mount
      if (isOpen && tabId === currentTab){
        mountCurrentTab();
      }
    },
    // Slots liefern
    getSlot: function(name){
      ensureRoot();
      return slots[name] || null;
    },
    // kleine Signal-Bus-Funktion
    signal: function(name, payload){
      try{
        root?.dispatchEvent(new CustomEvent(String(name), { detail: payload||null }));
      }catch(_){}
    },
    // Tab wechseln (optional)
    select: function(tabId){
      selectTab(tabId);
    }
  };

  // ---------- Export + Bridge -----------------------------------------------
  window.__INSPECTOR_CORE__ = { api: API, version: VER };

  // Bridge für die FAB/extern:
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open   = openInspector;
  window.__INSPECTOR_API__.close  = closeInspector;
  window.__INSPECTOR_API__.toggle = toggleInspector;

  // Events von außen respektieren
  try{
    window.addEventListener("cb:inspector:open",  ()=>openInspector());
    window.addEventListener("cb:inspector:close", ()=>closeInspector());
  }catch(_){}

  // Standard: Auf Logs starten, aber erst rendern, sobald Submodule registriert sind.
  // (Das Logs-Modul sorgt zusätzlich dafür, beim Öffnen sofort seinen Puffer zu füllen.)
  selectTab("logs");

  log("bereit ("+VER+")");
})();
