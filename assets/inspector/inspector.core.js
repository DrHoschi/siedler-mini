/* ============================================================================
 * Inspector Core – v18.12.4
 * - Baut das Overlay
 * - Tab-Handling (Logs/Build/Pfade/Tests)
 * - Slots für Submodule (logs-controls, logs-view, build-root, paths-root, tests-root)
 * - Öffnen/Schließen API + Events
 * - Entfernt/unterdrückt evtl. "Fallback"-Fenster
 * ========================================================================== */
(function () {
  "use strict";

  // -------------------- Singleton / Guard -----------------------------------
  if (window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.__ready) {
    // Bereits initialisiert → nur Toggle-Bridge wiederherstellen
    window.GameUI = window.GameUI || {};
    window.GameUI.toggleInspector = () =>
      window.__INSPECTOR_CORE__.toggle();
    return;
  }

  const VER = "v18.12.4";
  const MOD = "[inspector.core]";

  // -------------------- State / Registry ------------------------------------
  const __SLOTS__ = Object.create(null);  // Slots für Submodule
  const __mounted = Object.create(null);  // optionale Unmount-Funktionen
  let isOpen = false;
  let activeTab = "logs";

  // -------------------- Utilities -------------------------------------------
  const on   = (el, ev, fn, opt) => el.addEventListener(ev, fn, opt);
  const $    = (sel, root=document) => root.querySelector(sel);
  const $$   = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const logI = (...a) => (window.CBLog?.info || console.log)(...a);
  const logW = (...a) => (window.CBLog?.warn || console.warn)(...a);

  function dispatchWin(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_){}
  }
  function signal(name, detail) {
    try { document.dispatchEvent(new CustomEvent("ins:" + name, { detail })); } catch(_){}
  }

  // -------------------- DOM: Overlay bauen ----------------------------------
  const root = document.createElement("div");
  root.id = "inspector";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.style.display = "none"; // erst sichtbar wenn geöffnet

  const wrap = document.createElement("div");
  wrap.className = "ins-wrap";

  const panel = document.createElement("div");
  panel.className = "ins-panel";

  // Header
  const head = document.createElement("div");
  head.className = "ins-head";
  head.innerHTML = `
    <div class="ins-title">
      <span>Inspector</span>
      <span class="ins-ver">v${VER}</span>
    </div>
    <div class="ins-tabs" role="tablist" aria-label="Inspector Tabs">
      <button class="ins-tab" data-tab="logs"  role="tab" aria-controls="tab-logs">Logs</button>
      <button class="ins-tab" data-tab="build" role="tab" aria-controls="tab-build">Build</button>
      <button class="ins-tab" data-tab="paths" role="tab" aria-controls="tab-paths">Pfade</button>
      <button class="ins-tab" data-tab="tests" role="tab" aria-controls="tab-tests">Tests</button>
    </div>
    <button class="ins-close" title="Schließen" aria-label="Schließen"></button>
  `;

  // Body (Tab-Fläche)
  const body = document.createElement("div");
  body.className = "ins-body";

  // Pane: Logs (mit Slots)
  const paneLogs = document.createElement("div");
  paneLogs.id = "tab-logs";
  paneLogs.className = "ins-pane";
  paneLogs.setAttribute("role","tabpanel");
  paneLogs.innerHTML = `
    <div id="ins-logs-controls" class="slot-logs-controls"></div>
    <div id="ins-logs-view" class="slot-logs-view"></div>
  `;
  __SLOTS__["logs-controls"] = paneLogs.querySelector("#ins-logs-controls");
  __SLOTS__["logs-view"]     = paneLogs.querySelector("#ins-logs-view");

  // Pane: Build
  const paneBuild = document.createElement("div");
  paneBuild.id = "tab-build";
  paneBuild.className = "ins-pane";
  paneBuild.setAttribute("role","tabpanel");
  paneBuild.innerHTML = `<div id="ins-build-root" class="slot-build-root"></div>`;
  __SLOTS__["build-root"] = paneBuild.querySelector("#ins-build-root");

  // Pane: Pfade
  const panePaths = document.createElement("div");
  panePaths.id = "tab-paths";
  panePaths.className = "ins-pane";
  panePaths.setAttribute("role","tabpanel");
  panePaths.innerHTML = `<div id="ins-paths-root" class="slot-paths-root"></div>`;
  __SLOTS__["paths-root"] = panePaths.querySelector("#ins-paths-root");

  // Pane: Tests
  const paneTests = document.createElement("div");
  paneTests.id = "tab-tests";
  paneTests.className = "ins-pane";
  paneTests.setAttribute("role","tabpanel");
  paneTests.innerHTML = `<div id="ins-tests-root" class="slot-tests-root"></div>`;
  __SLOTS__["tests-root"] = paneTests.querySelector("#ins-tests-root");

  // Footer
  const foot = document.createElement("div");
  foot.className = "ins-foot";
  foot.innerHTML = `<div class="muted">Inspector bereit</div>`;

  // Zusammenbauen
  body.appendChild(paneLogs);
  body.appendChild(paneBuild);
  body.appendChild(panePaths);
  body.appendChild(paneTests);
  panel.appendChild(head);
  panel.appendChild(body);
  panel.appendChild(foot);
  wrap.appendChild(panel);
  root.appendChild(wrap);
  document.body.appendChild(root);

  // -------------------- Tabs aktivieren -------------------------------------
  function setActiveTab(tabId) {
    activeTab = tabId;
    // Buttons
    $$(".ins-tab", head).forEach(btn => {
      const on = btn.dataset.tab === tabId;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");
    });
    // Panes
    [paneLogs, paneBuild, panePaths, paneTests].forEach(p => {
      p.classList.toggle("active", p.id === "tab-" + tabId);
    });
    signal("tab-changed", { tab: tabId });
  }

  setActiveTab("logs");
  $$(".ins-tab", head).forEach(btn => {
    on(btn, "click", () => setActiveTab(btn.dataset.tab));
  });

  // -------------------- API nach außen --------------------------------------
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.version = VER;
  window.__INSPECTOR_CORE__.api = {
    mount(tabId, renderFn){
      if (typeof renderFn === "function"){
        // Da wir nur wenige Tabs haben, direkt ausführen (kein Lazy)
        try {
          const unmount = renderFn() || null;
          __mounted[tabId] = unmount;
        } catch(e){ logW(MOD, "mount error", e); }
      }
    },
    getSlot(name){ return __SLOTS__[name] || null; },
    signal(name, payload){ signal(name, payload); }
  };

  function open() {
    if (isOpen) return;
    isOpen = true;
    // Fallbacks entschärfen
    try {
      $$(".inspector-fallback, #inspector-fallback").forEach(n => n.remove());
    } catch(_){}
    // Sichtbar machen
    root.style.display = "flex";
    document.body.classList.add("inspector-open");
    dispatchWin("cb:inspector-open", { version: VER, tab: activeTab });
    signal("open", { version: VER });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.style.display = "none";
    document.body.classList.remove("inspector-open");
    dispatchWin("cb:inspector-close", { version: VER });
    signal("close");
  }
  function toggle(){ isOpen ? close() : open(); }

  window.__INSPECTOR_CORE__.open   = open;
  window.__INSPECTOR_CORE__.close  = close;
  window.__INSPECTOR_CORE__.toggle = toggle;

  // -------------------- Head-Buttons / ESC ----------------------------------
  on($(".ins-close", head), "click", close);
  on(window, "keydown", (e)=>{
    if (!isOpen) return;
    if (e.key === "Escape"){ e.preventDefault(); close(); }
  });

  // -------------------- GameUI Bridge ---------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;

  // -------------------- Overlay Hooks ---------------------------------------
  // Andere Teile können diese Events feuern:
  on(window, "cb:toggle-inspector", toggle);
  on(window, "cb:open-inspector", open);
  on(window, "cb:close-inspector", close);

  // -------------------- Ready melden ----------------------------------------
  window.__INSPECTOR_CORE__.__ready = true;
  logI(`[inspector.core] bereit ( ${VER} )`);
  dispatchWin("cb:inspector-ready", { version: VER });

})();
