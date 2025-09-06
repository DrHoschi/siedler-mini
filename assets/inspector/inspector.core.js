/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini – Inspector Core
 * Version: v18.10.10
 *
 * Aufgaben
 *  - Overlay (Vollbild) + Tab-Navigation (Logs/Build/Pfade/Tests)
 *  - Persistente Panes: Tab-Wechsel blendet nur um (kein Neuaufbau)
 *  - Slots-API für Submodule: mount(tabId, renderFn) + getSlot(name)
 *  - Events: cb:inspector-open / cb:inspector-close
 *  - Fallback-sicher: läuft weiter, auch wenn Submodule fehlen
 * -------------------------------------------------------------------------- */

(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.10";

  const log   = (...a) => (window.CBLog?.ok   || console.log).apply(console, [MOD, ...a]);
  const warn  = (...a) => (window.CBLog?.warn || console.warn).apply(console, [MOD, ...a]);

  // ---------------------------------------------------------------------------
  // globaler Core-Container + API Expose
  // ---------------------------------------------------------------------------
  const __SLOTS__   = Object.create(null);       // named DOM-Slots
  const __MOUNTED__ = Object.create(null);       // tabId -> unmountFn|true
  const __RENDER__  = Object.create(null);       // tabId -> renderFn

  // Exporte für Submodule
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = {
    // Submodule registrieren ihren Renderer
    mount(tabId, renderFn){
      if (typeof renderFn !== "function") return;
      __RENDER__[tabId] = renderFn;
      // falls Pane & Tab schon sichtbar sind, sofort (einmalig) mounten
      if (__activeTab === tabId && !__MOUNTED__[tabId]) {
        __MOUNTED__[tabId] = renderFn() || true;
      }
    },
    // Slot-Lookup (Logs: 'logs-controls', 'logs-view', …)
    getSlot(name){ return __SLOTS__[name] || null; },
    // optionale Signale
    signal(name, payload){ try { document.dispatchEvent(new CustomEvent("ins:"+name, {detail: payload})); } catch(_){ } },
    // (optional) programmatic tab select
    selectTab(id){ selectTab(id); }
  };

  // ---------------------------------------------------------------------------
  // Overlay-Bau
  // ---------------------------------------------------------------------------
  let overlay, header, contentWrap, footer, closeBtn;
  let __activeTab = "logs";
  const TABS = [
    { id: "logs",  label: "Logs"  },
    { id: "build", label: "Build" },
    { id: "paths", label: "Pfade" },
    { id: "tests", label: "Tests" }
  ];

  function buildOverlay(){
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "inspector";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");

    // Kopf mit Tabs
    header = document.createElement("div");
    header.className = "ins-header";

    const tabsBar = document.createElement("div");
    tabsBar.className = "ins-tabs";

    TABS.forEach(t=>{
      const b = document.createElement("button");
      b.className = "ins-tab";
      b.dataset.tab = t.id;
      b.textContent = t.label;
      b.addEventListener("click", ()=> selectTab(t.id));
      tabsBar.appendChild(b);
    });

    closeBtn = document.createElement("button");
    closeBtn.className = "ins-close";
    closeBtn.type = "button";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", close);

    header.appendChild(tabsBar);
    header.appendChild(closeBtn);

    // Content
    contentWrap = document.createElement("div");
    contentWrap.className = "ins-content";

    // ---- LOGS PANE (mit Slots) ---------------------------------------------
    const paneLogs = document.createElement("div");
    paneLogs.id = "tab-logs";
    paneLogs.className = "ins-pane ins-pane-logs";
    paneLogs.setAttribute("role","tabpanel");
    paneLogs.innerHTML = `
      <div id="ins-logs-controls" class="slot-logs-controls"></div>
      <div id="ins-logs-view" class="slot-logs-view"></div>
    `;
    __SLOTS__["logs-controls"] = paneLogs.querySelector("#ins-logs-controls");
    __SLOTS__["logs-view"]     = paneLogs.querySelector("#ins-logs-view");

    // ---- BUILD / PATHS / TESTS – leere, persistente Panes -------------------
    const paneBuild = document.createElement("div");
    paneBuild.id = "tab-build";
    paneBuild.className = "ins-pane ins-pane-build";
    paneBuild.setAttribute("role","tabpanel");

    const panePaths = document.createElement("div");
    panePaths.id = "tab-paths";
    panePaths.className = "ins-pane ins-pane-paths";
    panePaths.setAttribute("role","tabpanel");

    const paneTests = document.createElement("div");
    paneTests.id = "tab-tests";
    paneTests.className = "ins-pane ins-pane-tests";
    paneTests.setAttribute("role","tabpanel");

    contentWrap.appendChild(paneLogs);
    contentWrap.appendChild(paneBuild);
    contentWrap.appendChild(panePaths);
    contentWrap.appendChild(paneTests);

    // Fuß
    footer = document.createElement("div");
    footer.className = "ins-footer";
    const v = document.createElement("span");
    v.className = "ins-version";
    v.textContent = "Inspector v"+VER;
    footer.appendChild(v);

    overlay.appendChild(header);
    overlay.appendChild(contentWrap);
    overlay.appendChild(footer);

    document.body.appendChild(overlay);
    log("bereit ("+VER+")");

    // Anfangs-Tab aktivieren
    selectTab(__activeTab, /*first*/true);
    return overlay;
  }

  // ---------------------------------------------------------------------------
  // Öffnen/Schließen
  // ---------------------------------------------------------------------------
  function open(){
    buildOverlay();
    overlay.style.display = "block";
    document.body.classList.add("inspector-open");
    try { window.dispatchEvent(new CustomEvent("cb:inspector-open")); } catch(_){}
  }
  function close(){
    if (!overlay) return;
    overlay.style.display = "none";
    document.body.classList.remove("inspector-open");
    try { window.dispatchEvent(new CustomEvent("cb:inspector-close")); } catch(_){}
  }
  function toggle(){ (overlay && overlay.style.display!=="none") ? close() : open(); }

  // ---------------------------------------------------------------------------
  // Tabs – nur show/hide. Pane bleibt bestehen (Logs verlieren nichts)
  // ---------------------------------------------------------------------------
  function selectTab(id, first){
    __activeTab = id;

    // Tabs-UI
    header.querySelectorAll(".ins-tab").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.tab === id);
    });

    // Panes
    contentWrap.querySelectorAll(".ins-pane").forEach(p=>{
      p.classList.toggle("active", p.id === "tab-"+id);
      p.hidden = (p.id !== "tab-"+id);
    });
    
    // nach dem Aktivieren eines Tabs:
    try {
      const id = activeTabId; // oder dein lokaler Variablenname
      document.dispatchEvent(new CustomEvent('ins:tab:enter:' + id));
    } catch {}
    
    // Lazy-Mount: Renderer nur einmal ausführen
    if (__RENDER__[id] && !__MOUNTED__[id]) {
      __MOUNTED__[id] = __RENDER__[id]() || true;
    }

    if (!first) {
      try { window.dispatchEvent(new CustomEvent("cb:inspector-tab", { detail:{ id } })); } catch(_){}
    }
  }

  // ---------------------------------------------------------------------------
  // Bridge für die FAB (ui-bridge.js ruft diese Funktionen auf)
  // ---------------------------------------------------------------------------
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open   = open;
  window.__INSPECTOR_API__.close  = close;
  window.__INSPECTOR_API__.toggle = toggle;

  // Auto-attach (Overlay sofort vorbereiten, bleibt aber unsichtbar)
  buildOverlay();

})();
