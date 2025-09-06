/* ============================================================================
 * Inspector Core – v18.11.3
 *  - Vollbild-Overlay + Tabs (Logs / Build / Pfade / Tests)
 *  - Einheitliche Pane-Größe + eigener Scroller pro Tab
 *  - Slots-Registry für Submodule (logs.js, build.js, …)
 *  - Stabile Open/Close-API (window.__INSPECTOR_API__)
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.11.3";

  // --- sanfte Logger ---------------------------------------------------------
  const ok   = (...a) => (window.CBLog?.ok   || console.log   )(`${MOD}`, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn  )(`${MOD}`, ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error )(`${MOD}`, ...a);

  // --- State -----------------------------------------------------------------
  let isOpen   = false;
  let mounted  = Object.create(null);    // tabId -> unmountFn | null
  let activeId = "logs";

  // --- Slots-Registry (für Submodule wie logs/build/paths/tests) -------------
  const __SLOTS__ = Object.create(null);

  // --- DOM aufbauen ----------------------------------------------------------
  const el = {
    root: null, wrap: null, panel: null,
    head: null, title: null, ver: null, tabs: null, close: null,
    body: null,
    panes: Object.create(null), // {logs, build, paths, tests}
    foot: null
  };

  function buildDOM() {
    if (el.root) return;

    // root (Vollbild)
    const root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.style.display = "none"; // erst durch open() sichtbar

    // wrap (zentriert, füllt aber fast die Seite)
    const wrap  = document.createElement("div");
    wrap.className = "ins-wrap";

    const panel = document.createElement("section");
    panel.className = "ins-panel";

    // ---- Header -------------------------------------------------------------
    const head  = document.createElement("header");
    head.className = "ins-head";

    const title = document.createElement("div");
    title.className = "ins-title";
    title.innerHTML = `<strong>Inspector</strong> <span class="ins-ver">v${VER}</span>`;

    const tabs  = document.createElement("nav");
    tabs.className = "ins-tabs";
    tabs.innerHTML = `
      <button class="ins-tab active" data-tab="logs">Logs</button>
      <button class="ins-tab" data-tab="build">Build</button>
      <button class="ins-tab" data-tab="paths">Pfade</button>
      <button class="ins-tab" data-tab="tests">Tests</button>
    `;

    const btnClose = document.createElement("button");
    btnClose.className = "ins-close";
    btnClose.type = "button";
    btnClose.setAttribute("aria-label", "Schließen");

    head.append(title, tabs, btnClose);

    // ---- Body (Tab-Fläche) --------------------------------------------------
    const body = document.createElement("div");
    body.className = "ins-body";

    // Logs-Pane + Slots
    const paneLogs = document.createElement("div");
    paneLogs.id = "tab-logs";
    paneLogs.className = "ins-pane active";
    paneLogs.setAttribute("role", "tabpanel");
    paneLogs.innerHTML = `
      <div id="ins-logs-controls" class="slot-logs-controls"></div>
      <div id="ins-logs-view" class="slot-logs-view"></div>
    `;
    __SLOTS__["logs-controls"] = paneLogs.querySelector("#ins-logs-controls");
    __SLOTS__["logs-view"]     = paneLogs.querySelector("#ins-logs-view");

    // Build-Pane (Slot = ganzer Body des Tabs)
    const paneBuild = document.createElement("div");
    paneBuild.id = "tab-build";
    paneBuild.className = "ins-pane";
    paneBuild.setAttribute("role", "tabpanel");
    paneBuild.innerHTML = `<div id="ins-build" class="slot-build"></div>`;
    __SLOTS__["build"] = paneBuild.querySelector("#ins-build");

    // Paths-Pane
    const panePaths = document.createElement("div");
    panePaths.id = "tab-paths";
    panePaths.className = "ins-pane";
    panePaths.setAttribute("role", "tabpanel");
    panePaths.innerHTML = `<div id="ins-paths" class="slot-paths"></div>`;
    __SLOTS__["paths"] = panePaths.querySelector("#ins-paths");

    // Tests-Pane
    const paneTests = document.createElement("div");
    paneTests.id = "tab-tests";
    paneTests.className = "ins-pane";
    paneTests.setAttribute("role", "tabpanel");
    paneTests.innerHTML = `<div id="ins-tests" class="slot-tests"></div>`;
    __SLOTS__["tests"] = paneTests.querySelector("#ins-tests");

<!-- im <section id="tab-build" …> -->
<div class="pane-inner">
  <div class="slot-build-controls"></div>
  <div class="slot-build-view">
    <div class="ins-empty">Build-Werkzeuge kommen hierhin …</div>
  </div>
</div>

<!-- im <section id="tab-paths" …> -->
<div class="pane-inner">
  <div class="slot-paths-controls"></div>
  <div class="slot-paths-view">
    <div class="ins-empty">Pfade/Resolver folgen …</div>
  </div>
</div>

<!-- im <section id="tab-tests" …> -->
<div class="pane-inner">
  <div class="slot-tests-controls"></div>
  <div class="slot-tests-view">
    <div class="ins-empty">Tests/Checks folgen …</div>
  </div>
</div>
    
    body.append(paneLogs, paneBuild, panePaths, paneTests);

    // ---- Footer -------------------------------------------------------------
    const foot = document.createElement("footer");
    foot.className = "ins-foot";
    foot.innerHTML = `<span class="muted">Inspector bereit</span>`;

    // zusammensetzen
    panel.append(head, body, foot);
    wrap.append(panel);
    root.append(wrap);
    document.body.appendChild(root);

    // referenzen speichern
    el.root  = root;
    el.wrap  = wrap;
    el.panel = panel;
    el.head  = head;
    el.title = title;
    el.ver   = title.querySelector(".ins-ver");
    el.tabs  = tabs;
    el.close = btnClose;
    el.body  = body;
    el.panes.logs  = paneLogs;
    el.panes.build = paneBuild;
    el.panes.paths = panePaths;
    el.panes.tests = paneTests;

    // Interaktionen
    btnClose.addEventListener("click", close, {passive: true});
    root.addEventListener("click", (e)=>{
      // Klick in den „dunklen“ Bereich schließt ebenfalls
      if (e.target === root) close();
    }, {passive:true});
    tabs.addEventListener("click", onTabClick, {passive:true});

    ok("bereit", VER);
  }

  function onTabClick(ev) {
    const btn = ev.target.closest(".ins-tab");
    if (!btn) return;
    const id = btn.dataset.tab;
    if (!id) return;
    setActiveTab(id);
  }

  function setActiveTab(id) {
    if (!el.root) buildDOM();

    // Tabs umschalten
    el.tabs.querySelectorAll(".ins-tab").forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === id);
    });

    // Pane sichtbar schalten (alle gleich groß)
    Object.entries(el.panes).forEach(([pid, pane])=>{
      pane.classList.toggle("active", pid === id);
    });

    // Tab mounten (lazy)
    ensureMounted(id);
    activeId = id;
  }

  // --- Mount-API für Submodule ----------------------------------------------
  const CoreAPI = {
    mount(tabId, renderFn){
      if (typeof renderFn === "function") {
        // Einfach direkt ausführen (wir haben wenige Tabs).
        mounted[tabId] = renderFn() || null;
      }
    },
    getSlot(name){ return __SLOTS__[name] || null; },
    signal(name, payload){
      try { document.dispatchEvent(new CustomEvent("ins:"+name, {detail: payload})); }
      catch(_){}
    }
  };

  function ensureMounted(tabId){
    if (!mounted[tabId] && window.__INSPECTOR_CORE__?.__mounts?.[tabId]) {
      try {
        mounted[tabId] = window.__INSPECTOR_CORE__.__mounts[tabId]() || null;
      } catch(e){ warn("mount %s: %s", tabId, e && e.message); }
    }
  }

  // --- Public Open/Close -----------------------------------------------------
  function open() {
    if (!el.root) buildDOM();
    if (isOpen) return;
    isOpen = true;
    el.root.style.display = "flex";
    document.body.classList.add("inspector-open");

    // immer sicherstellen, dass der aktive Tab sichtbar + gemountet ist
    setActiveTab(activeId || "logs");

    window.dispatchEvent(new CustomEvent("cb:inspector-open"));
    ok("geöffnet (v%s)", VER);
  }

  function close() {
    if (!el.root || !isOpen) return;
    isOpen = false;
    el.root.style.display = "none";
    document.body.classList.remove("inspector-open");
    window.dispatchEvent(new CustomEvent("cb:inspector-close"));
    ok("geschlossen");
  }

  function toggle(force) {
    (force == null ? !isOpen : !!force) ? open() : close();
  }

  // --- Export ---------------------------------------------------------------
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.version = VER;
  window.__INSPECTOR_CORE__.api     = CoreAPI;
  // optionaler Mount-Cache (für Lazy-Mount von extern)
  window.__INSPECTOR_CORE__.__mounts = window.__INSPECTOR_CORE__.__mounts || {};

  // Kompatible, kleine Fassade (von ui-bridge genutzt)
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open   = open;
  window.__INSPECTOR_API__.close  = close;
  window.__INSPECTOR_API__.toggle = toggle;
  window.__INSPECTOR_API__.version= VER;

  // Auto-Build, damit wir sofort einsatzbereit sind
  buildDOM();
})();
