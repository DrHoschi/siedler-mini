/* ============================================================================
 * Inspector Core – v18.10.12
 *  - Overlay, Tabs, Slot-Registry für Submodule (logs/build/paths/tests)
 *  - KEIN body-append außerhalb des #inspector
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.12";

  // --- Slots-Registry -------------------------------------------------------
  const __SLOTS__ = Object.create(null);
  const __mounted = Object.create(null);

  // Core-API für Submodule
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = {
    mount(tabId, renderFn) {
      if (typeof renderFn === "function") {
        // wir mounten sofort (du hast nur wenige Tabs)
        __mounted[tabId] = renderFn() || null; // optional: unmount-Fn
      }
    },
    getSlot(name) { return __SLOTS__[name] || null; },
    signal(name, payload) {
      try { document.dispatchEvent(new CustomEvent("ins:"+name, {detail: payload})); } catch(_){}
    }
  };

  // --- Overlay Grundgerüst --------------------------------------------------
  let root, titleEl, navEl, contentWrap, footerEl;
  function ensureOverlay() {
    if (root) return;

    root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-modal","true");
    root.innerHTML = `
      <div class="ins-panel">
        <div class="ins-header">
          <div class="ins-title">Inspector</div>
          <div class="ins-nav" id="ins-nav"></div>
          <button class="ins-close" id="ins-close" type="button">Schließen</button>
        </div>
        <div class="ins-content" id="ins-content"></div>
        <div class="ins-footer" id="ins-footer">
          <span class="ins-ver">Inspector v${VER}</span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    titleEl   = root.querySelector(".ins-title");
    navEl     = root.querySelector("#ins-nav");
    contentWrap = root.querySelector("#ins-content");
    footerEl  = root.querySelector("#ins-footer");

    // Navigation
    const tabs = [
      { id:"logs",  label:"Logs"  },
      { id:"build", label:"Build" },
      { id:"paths", label:"Paths" },
      { id:"tests", label:"Tests" }
    ];
    tabs.forEach(t=>{
      const b=document.createElement("button");
      b.className="ins-tab";
      b.dataset.tab=t.id;
      b.textContent=t.label.toUpperCase();
      b.addEventListener("click", ()=> setActiveTab(t.id));
      navEl.appendChild(b);
    });

    // --- PANE: LOGS (Slots) -------------------------------------------------
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
    contentWrap.appendChild(paneLogs);

    // --- PANE: BUILD --------------------------------------------------------
    const paneBuild = document.createElement("div");
    paneBuild.id = "tab-build";
    paneBuild.className = "ins-pane ins-pane-build";
    paneBuild.setAttribute("role","tabpanel");
    paneBuild.innerHTML = `<div id="ins-build-body" class="slot-build-body"></div>`;
    __SLOTS__["build-body"] = paneBuild.querySelector("#ins-build-body");
    contentWrap.appendChild(paneBuild);

    // --- PANE: PATHS --------------------------------------------------------
    const panePaths = document.createElement("div");
    panePaths.id = "tab-paths";
    panePaths.className = "ins-pane ins-pane-paths";
    panePaths.setAttribute("role","tabpanel");
    panePaths.innerHTML = `<div id="ins-paths-body" class="slot-paths-body"></div>`;
    __SLOTS__["paths-body"] = panePaths.querySelector("#ins-paths-body");
    contentWrap.appendChild(panePaths);

    // --- PANE: TESTS (NEU – Slots) -----------------------------------------
    const paneTests = document.createElement("div");
    paneTests.id = "tab-tests";
    paneTests.className = "ins-pane ins-pane-tests";
    paneTests.setAttribute("role","tabpanel");
    paneTests.innerHTML = `
      <div id="ins-tests-controls" class="slot-tests-controls"></div>
      <div id="ins-tests-view" class="slot-tests-view"></div>
    `;
    __SLOTS__["tests-controls"] = paneTests.querySelector("#ins-tests-controls");
    __SLOTS__["tests-view"]     = paneTests.querySelector("#ins-tests-view");
    contentWrap.appendChild(paneTests);

    // Close
    root.querySelector("#ins-close").addEventListener("click", close);
  }

  function setActiveTab(id){
    // Nav
    navEl.querySelectorAll(".ins-tab").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.tab===id);
    });
    // Panes
    contentWrap.querySelectorAll(".ins-pane").forEach(p=>{
      p.classList.toggle("active", p.id === "tab-"+id);
    });
    try { document.dispatchEvent(new CustomEvent("ins:tab", {detail:{id}})); } catch(_){}
  }

  function open() {
    ensureOverlay();
    document.body.classList.add("inspector-open");
    root.style.display = "block";
    setActiveTab("logs");
    try { window.dispatchEvent(new Event("cb:inspector-open")); } catch(_){}
  }
  function close() {
    if (!root) return;
    root.style.display = "none";
    document.body.classList.remove("inspector-open");
    try { window.dispatchEvent(new Event("cb:inspector-close")); } catch(_){}
  }
  function toggle(force){
    const willOpen = force==null ? (root? root.style.display!=="block":true) : !!force;
    willOpen ? open() : close();
  }

  // Bridge-API für UI-Buttons
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open   = open;
  window.__INSPECTOR_API__.close  = close;
  window.__INSPECTOR_API__.toggle = toggle;

  // Auto-init (nur Struktur bauen; Submodule rendern sich selbst in Slots)
  ensureOverlay();

  // Style-Sicherungen (Safe Area + oben liegend)
  // (Deine inspector.css enthält die eigentliche Optik)
  try {
    const css = document.createElement("style");
    css.textContent = `
      #inspector{position:fixed;inset:0;z-index:2147483646;padding-bottom:env(safe-area-inset-bottom,0);pointer-events:auto}
      body.inspector-open{overflow:hidden}
    `;
    document.head.appendChild(css);
  } catch(_){}

  (window.CBLog?.info || console.log)(`${MOD} bereit v${VER}`);
})();
