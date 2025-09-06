/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.10.12
 *
 * Zweck:
 *   - Kern-Overlay (Vollbild), Tabs & Slots
 *   - Öffnen/Schließen API für ui-bridge (open/close/toggle)
 *   - Body-Scroll sperren, wenn offen (Mobil & Desktop)
 *   - Slot-Struktur für Untermodule (logs/build/paths/tests)
 *
 * Öffentliche API (window.__INSPECTOR_API__):
 *   • open(), close(), toggle()
 *   • mount(tabId, renderFn) via __INSPECTOR_CORE__.api.mount(...)
 *   • getSlot(name) via __INSPECTOR_CORE__.api.getSlot(name)
 *   • signal(name,payload?) (leichtgewichtiges Broadcast)
 *
 * Events:
 *   • sendet:  cb:inspector-open / cb:inspector-close
 *   • empfängt: (keine zwingend)
 *
 * CODE-STYLE:
 *   - Kein body.append von Untermodulen (nur Slots befüllen!)
 *   - Defensive gegen Mehrfach-Init
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.12";
  const log = (...a) => (window.CBLog?.info || console.log)(MOD, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(MOD, ...a);

  // Nur einmal initialisieren
  if (window.__INSPECTOR_CORE__?.api) {
    log("bereits initialisiert –", window.__INSPECTOR_CORE__?.version);
    return;
  }

  // ---------------------------------------------------------------------------
  // DOM-Grundgerüst (Vollbild-Overlay + Slots)
  // ---------------------------------------------------------------------------
  const rootId = "inspector";
  let root;           // #inspector (Overlay)
  let bodyEl;         // .ins-body (Tab-Inhalte)
  let tabsEl;         // .ins-tabs (Tab-Leiste)
  let activeTab = "logs";
  let unmountCurrent = null; // optionaler Unmount pro Tab

  // Body-Scroll-Sperre (Mobil & Desktop)
  let prevOverflow = "";
  let prevPosition = "";
  let prevTop = "";
  let scrollY = 0;

  function lockBodyScroll() {
    try {
      // vorhandene Werte merken (später sauber wiederherstellen)
      prevOverflow = document.body.style.overflow || "";
      prevPosition = document.body.style.position || "";
      prevTop      = document.body.style.top || "";
      scrollY = window.scrollY || 0;

      // Body fixieren, um Hintergrundscrollen zu verhindern
      document.body.style.overflow  = "hidden";
      document.body.style.position  = "fixed";
      document.body.style.top       = `-${scrollY}px`;
      document.body.classList.add("inspector-open");
    } catch(_) {}
  }

  function unlockBodyScroll() {
    try {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top      = prevTop;
      document.body.classList.remove("inspector-open");
      window.scrollTo(0, scrollY|0);
    } catch(_) {}
  }

  function ensureRoot() {
    if (root && root.isConnected) return root;

    root = document.getElementById(rootId);
    if (!root) {
      root = document.createElement("div");
      root.id = rootId;
      // die Optik/Position kommt aus inspector.css – hier nur Notfall-Min-Styles
      root.innerHTML = `
        <div class="ins-wrap" role="dialog" aria-label="Inspector">
          <div class="ins-header">
            <div class="ins-title">Inspector</div>
            <button class="ins-close" type="button" aria-label="Schließen">×</button>
          </div>
          <div class="ins-tabs" role="tablist">
            <button class="ins-tab" data-tab="logs"  role="tab" aria-selected="true">Logs</button>
            <button class="ins-tab" data-tab="build" role="tab" aria-selected="false">Build</button>
            <button class="ins-tab" data-tab="paths" role="tab" aria-selected="false">Pfade</button>
            <button class="ins-tab" data-tab="tests" role="tab" aria-selected="false">Tests</button>
          </div>
          <div class="ins-content" role="region">
            <div class="ins-body">
              <!-- LOGS -->
              <section class="ins-slot is-active" data-slot="logs">
                <div class="slot logs-controls" id="ins-logs-controls"></div>
                <div class="slot logs-view"     id="ins-logs-view"></div>
              </section>

              <!-- BUILD -->
              <section class="ins-slot" data-slot="build">
                <div class="slot build-body" id="ins-build-body"></div>
              </section>

              <!-- PATHS -->
              <section class="ins-slot" data-slot="paths">
                <div class="slot paths-body" id="ins-paths-body"></div>
              </section>

              <!-- TESTS -->
              <section class="ins-slot" data-slot="tests">
                <div class="slot tests-body" id="ins-tests-body"></div>
              </section>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(root);
    }

    // Hook Controls
    bodyEl = root.querySelector(".ins-body");
    tabsEl = root.querySelector(".ins-tabs");

    // Close
    root.querySelector(".ins-close")?.addEventListener("click", api.close);

    // Tabs
    tabsEl?.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".ins-tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });

    // Verhindere, dass Touch/Wheel Events nach draußen blubbern (Body-Scroll)
    // -> CSS regelt das meiste, hier nur Sicherheitsnetz
    const stopIfInside = (e) => {
      const scroller = e.target.closest(".ins-logview, .ins-content, .ins-body");
      if (scroller) {
        // erlaubt ist Scrolling im Panel; nicht verhindern, nur bubbling bremsen
        e.stopPropagation();
      }
    };
    root.addEventListener("wheel", stopIfInside, { passive: true });
    root.addEventListener("touchmove", stopIfInside, { passive: true });

    return root;
  }

  function switchTab(tabId) {
    if (tabId === activeTab) return;

    // Abwählen
    root.querySelectorAll(".ins-tab").forEach(b=>{
      b.setAttribute("aria-selected", String(b.dataset.tab===tabId));
    });

    root.querySelectorAll(".ins-slot").forEach(s=>{
      s.classList.toggle("is-active", s.dataset.slot === tabId);
    });

    // Unmount aktuelle Instanz (falls vorhanden)
    try { unmountCurrent?.(); } catch(_) {}
    unmountCurrent = null;

    // Mount neue Instanz, falls Renderer registriert
    const mountFn = mounts.get(tabId);
    if (typeof mountFn === "function") {
      unmountCurrent = (mountFn() || null);
    }

    activeTab = tabId;
  }

  // ---------------------------------------------------------------------------
  // Mount-API für Teilmodule
  // ---------------------------------------------------------------------------
  const mounts = new Map();

  const coreApi = {
    mount(tabId, renderFn) {
      if (!tabId || typeof renderFn !== "function") return;
      mounts.set(tabId, renderFn);
      // wenn dieser Tab gerade aktiv ist, direkt neu rendern
      if (activeTab === tabId && root?.isConnected) {
        try { unmountCurrent?.(); } catch(_) {}
        unmountCurrent = renderFn() || null;
      }
    },
    getSlot(name) {
      // akzeptiert alte & neue Bezeichner
      const byId = document.getElementById(`ins-${name}`);
      if (byId) return byId;
      return root?.querySelector(`.slot.${name}`) || null;
    },
    signal(name, payload) {
      try {
        root?.dispatchEvent(new CustomEvent(String(name), { detail: payload }));
      } catch(_) {}
    }
  };

  // ---------------------------------------------------------------------------
  // Öffnen/Schließen
  // ---------------------------------------------------------------------------
  function open() {
    ensureRoot();
    if (!root) return;

    root.style.display = "block";
    lockBodyScroll();

    // aktiven Tab darstellen
    switchTab(activeTab);

    try { window.dispatchEvent(new Event("cb:inspector-open")); } catch(_) {}
  }

  function close() {
    if (!root) return;
    root.style.display = "none";
    try { unmountCurrent?.(); } catch(_) {}
    unmountCurrent = null;
    unlockBodyScroll();
    try { window.dispatchEvent(new Event("cb:inspector-close")); } catch(_) {}
  }

  function toggle(force) {
    ensureRoot();
    const willOpen = (force == null)
      ? (root.style.display !== "block")
      : !!force;
    willOpen ? open() : close();
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  const api = { open, close, toggle };
  window.__INSPECTOR_API__ = api;
  window.__INSPECTOR_CORE__ = {
    version: VER,
    api: coreApi
  };

  log("bereit", VER);
})();
