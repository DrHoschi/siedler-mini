/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.10.9
 *
 * Zweck:
 *  - Inspector-Overlay (Vollbild, Safe-Area, hoher z-index)
 *  - Tabs (Logs/Build/Pfade/Tests)
 *  - Slots für Submodule (z.B. logs-controls, logs-view)
 *  - Öffnen/Schließen/Toggle + Events (cb:inspector-open/close)
 *
 * Öffentliche Schnittstellen:
 *  - window.__INSPECTOR_API__ : { open, close, toggle, version, logs:{} }
 *  - window.__INSPECTOR_CORE__.api :
 *      • mount(tabId, renderFn)        -> Submodule registrieren Render-Fn
 *      • getSlot(name)                 -> Slot-Element
 *      • signal(name, payload?)        -> optionale Signale (CustomEvent)
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.9";

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------
  let root;               // #inspector (Overlay)
  let contentWrap;        // Scrollbare Fläche für Pane-Inhalte
  let tabsBar;            // Tab-Leiste
  let currentTab = "logs";
  const RENDERERS = Object.create(null);   // tabId -> () => unmountFn|void
  const UNMOUNTERS = Object.create(null);  // tabId -> unmountFn
  const __SLOTS__ = Object.create(null);   // slotName -> HTMLElement

  // sanfte Logger
  const ok   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  // ---------------------------------------------------------------------------
  // Core-API (für Submodule)
  // ---------------------------------------------------------------------------
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = {
    mount(tabId, renderFn){
      if (typeof renderFn === "function") {
        RENDERERS[tabId] = renderFn;
        // Falls Tab bereits aktiv ist (z.B. Logs als Standard), sofort mounten
        if (tabId === currentTab && root && !UNMOUNTERS[tabId]) {
          const un = safeCall(renderFn);
          if (typeof un === "function") UNMOUNTERS[tabId] = un;
        }
      }
    },
    getSlot(name){ return __SLOTS__[name] || null; },
    signal(name, payload){
      try{ document.dispatchEvent(new CustomEvent("ins:"+name,{detail:payload})); }catch(_){}
    }
  };

  // ---------------------------------------------------------------------------
  // Öffentliche API für ui-bridge & Diagnose
  // ---------------------------------------------------------------------------
  const API = {
    version: VER,
    open, close, toggle,
    // Platzhalter, wird von logs.js erweitert (Safety-Hook nutzt das):
    logs: { push(){}, render(){} }
  };
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || API;
  Object.assign(window.__INSPECTOR_API__, API); // aktualisieren/vereinigen

  // ---------------------------------------------------------------------------
  // Overlay bauen (einmalig) – bewusst **sofort** beim Laden,
  // damit iOS/Viewport nicht „unter“ die Browserleiste rutscht.
  // ---------------------------------------------------------------------------
  buildOverlay();
  ok("bereit", VER);

  // ---------------------------------------------------------------------------
  // Funktionen
  // ---------------------------------------------------------------------------
  function buildOverlay(){
    if (root) return;

    // Wrapper
    root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-label","Inspector");
    root.style.display = "none"; // geschlossen starten

    // Kopf (Tabs + Close)
    const header = document.createElement("div");
    header.className = "ins-header";

    tabsBar = document.createElement("div");
    tabsBar.className = "ins-tabs";

    const tabs = [
      {id:"logs",  label:"Logs"},
      {id:"build", label:"Build"},
      {id:"paths", label:"Pfade"},
      {id:"tests", label:"Tests"},
    ];
    tabs.forEach(t=>{
      const b = document.createElement("button");
      b.className = "ins-tab";
      b.dataset.tab = t.id;
      b.textContent = t.label;
      b.addEventListener("click", ()=>switchTab(t.id));
      tabsBar.appendChild(b);
    });

    const closeBtn = document.createElement("button");
    closeBtn.className = "ins-close";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", close);

    header.appendChild(tabsBar);
    header.appendChild(closeBtn);

    // Inhalt
    contentWrap = document.createElement("div");
    contentWrap.className = "ins-content";

    // --- LOGS-PANE mit Slots -------------------------------------------------
    const paneLogs = document.createElement("div");
    paneLogs.id = "tab-logs";
    paneLogs.className = "ins-pane ins-pane-logs active";
    paneLogs.setAttribute("role","tabpanel");
    paneLogs.innerHTML = `
      <div id="ins-logs-controls" class="slot-logs-controls"></div>
      <div id="ins-logs-view" class="slot-logs-view"></div>
    `;
    __SLOTS__["logs-controls"] = paneLogs.querySelector("#ins-logs-controls");
    __SLOTS__["logs-view"]     = paneLogs.querySelector("#ins-logs-view");

    // --- weitere, leere Panes (Platzhalter) ---------------------------------
    const paneBuild = document.createElement("div");
    paneBuild.id = "tab-build";
    paneBuild.className = "ins-pane";
    paneBuild.setAttribute("role","tabpanel");

    const panePaths = document.createElement("div");
    panePaths.id = "tab-paths";
    panePaths.className = "ins-pane";
    panePaths.setAttribute("role","tabpanel");

    const paneTests = document.createElement("div");
    paneTests.id = "tab-tests";
    paneTests.className = "ins-pane";
    paneTests.setAttribute("role","tabpanel");

    contentWrap.append(paneLogs, paneBuild, panePaths, paneTests);

    // Footer (Version/Badge klein rechts)
    const footer = document.createElement("div");
    footer.className = "ins-footer";
    footer.textContent = `Inspector v${VER}`;

    // Zusammenbauen
    root.append(header, contentWrap, footer);
    document.body.appendChild(root);

    // Start-Tab markieren
    refreshTabButtons();
  }

  function switchTab(tabId){
    if (tabId === currentTab) return;
    // altes Pane unmounten
    if (UNMOUNTERS[currentTab]){
      safeCall(UNMOUNTERS[currentTab]);
      UNMOUNTERS[currentTab] = null;
    }
    // Sichtbarkeit umschalten
    for (const pane of contentWrap.children){
      pane.classList.toggle("active", pane.id === "tab-"+tabId);
    }
    currentTab = tabId;
    refreshTabButtons();

    // neuen Tab mounten (falls Renderer registriert)
    if (RENDERERS[tabId] && !UNMOUNTERS[tabId]){
      const un = safeCall(RENDERERS[tabId]);
      if (typeof un === "function") UNMOUNTERS[tabId] = un;
    }
  }

  function refreshTabButtons(){
    const buttons = tabsBar.querySelectorAll(".ins-tab");
    buttons.forEach(b=> b.classList.toggle("active", b.dataset.tab === currentTab));
  }

  function open(){
    if (!root) buildOverlay();
    root.style.display = "block";
    document.body.classList.add("inspector-open");
    try{ window.dispatchEvent(new CustomEvent("cb:inspector-open")); }catch(_){}
  }

  function close(){
    if (!root) return;
    root.style.display = "none";
    document.body.classList.remove("inspector-open");
    try{ window.dispatchEvent(new CustomEvent("cb:inspector-close")); }catch(_){}
  }

  function toggle(force){
    const willOpen = (force == null)
      ? (root?.style.display !== "block")
      : !!force;
    willOpen ? open() : close();
  }

  function safeCall(fn){
    try{ return fn() || null; }
    catch(e){ warn("Renderer-Fehler:", e && e.message); return null; }
  }
})();
