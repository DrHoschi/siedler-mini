/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.11.5
 *
 * Zweck
 *  - Baut das Inspector-Overlay (DOM) einmalig auf
 *  - Öffnen/Schließen/Toggle steuern (Body-Klasse + Events)
 *  - Tab-System: Logs / Build / Pfade / Tests (Slots für Unter-Module)
 *  - Stabile, schlanke API für andere Module:
 *      window.__INSPECTOR_CORE__.api = {
 *        mount(tabId, renderFn) -> Unmount-Funktion zurückgeben (optional)
 *        getSlot(name)          -> DOM-Element (z.B. 'logs-controls', 'logs-view')
 *        signal(name, payload)  -> optionales Broadcast
 *      }
 *  - Brücke für GameUI/Buttons: window.__INSPECTOR_API__ = { open, close, toggle }
 *
 * Garantien / Code-Style
 *  - Kein body.appendChild von Untermodulen – nur über Slots!
 *  - Defensive: Mehrfach-Aufruf erzeugt KEIN doppeltes UI (idempotent)
 *  - Sanfte Logs via CBLog.* (Fallback console.*)
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.11.5";

  const logOK   = (...a) => (window.CBLog?.ok   || console.log   )(`${MOD}`, ...a);
  const logInfo = (...a) => (window.CBLog?.info || console.info  )(`${MOD}`, ...a);
  const logWarn = (...a) => (window.CBLog?.warn || console.warn  )(`${MOD}`, ...a);
  const logErr  = (...a) => (window.CBLog?.err  || console.error )(`${MOD}`, ...a);

  // ---------------------------------------------------------------------------
  // DOM-Aufbau (idempotent)
  // ---------------------------------------------------------------------------
  function ensureDOM() {
    // Root-Overlay
    let root = document.getElementById("inspector");
    if (!root) {
      root = document.createElement("div");
      root.id = "inspector";
      // CSS steuert Sichtbarkeit; initial bleibt display:none
      document.body.appendChild(root);
    }

    // Einmal sauberes Inneres setzen (aber nur, wenn leer oder alte Struktur)
    root.innerHTML = `
      <div class="ins-wrap">
        <div class="ins-panel">
          <div class="ins-head">
            <div class="ins-title">
              <span>Inspector</span>
              <span class="ins-ver">${VER}</span>
            </div>

            <div class="ins-tabs" role="tablist">
              <button class="ins-tab" data-tab="logs"  role="tab" aria-controls="pane-logs"  aria-selected="true">Logs</button>
              <button class="ins-tab" data-tab="build" role="tab" aria-controls="pane-build" aria-selected="false">Build</button>
              <button class="ins-tab" data-tab="paths" role="tab" aria-controls="pane-paths" aria-selected="false">Pfade</button>
              <button class="ins-tab" data-tab="tests" role="tab" aria-controls="pane-tests" aria-selected="false">Tests</button>
            </div>

            <button class="ins-close" type="button" aria-label="Inspector schließen"></button>
          </div>

          <div class="ins-body">
            <!-- Pane: LOGS -->
            <section id="pane-logs" class="ins-pane active" data-pane="logs" role="tabpanel" aria-labelledby="tab-logs">
              <div class="slot-logs-controls"></div>
              <div class="slot-logs-view"></div>
            </section>

            <!-- Pane: BUILD (Platzhalter/Slot) -->
            <section id="pane-build" class="ins-pane" data-pane="build" role="tabpanel" aria-labelledby="tab-build">
              <div class="slot-build-root"></div>
            </section>

            <!-- Pane: PATHS (Platzhalter/Slot) -->
            <section id="pane-paths" class="ins-pane" data-pane="paths" role="tabpanel" aria-labelledby="tab-paths">
              <div class="slot-paths-root"></div>
            </section>

            <!-- Pane: TESTS (Platzhalter/Slot) -->
            <section id="pane-tests" class="ins-pane" data-pane="tests" role="tabpanel" aria-labelledby="tab-tests">
              <div class="slot-tests-root"></div>
            </section>
          </div>

          <div class="ins-foot">
            <span class="muted">v${VER} – Vollbild-Overlay, Slot-Layout, Scroll-Fix</span>
          </div>
        </div>
      </div>
    `;

    // Klick-Handler für Tabs
    const tabs = root.querySelectorAll(".ins-tab");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        selectTab(btn.getAttribute("data-tab"));
      });
    });

    // Close
    root.querySelector(".ins-close").addEventListener("click", () => close());

    return root;
  }

  // ---------------------------------------------------------------------------
  // Slots & Mounting-API für Unter-Module
  // ---------------------------------------------------------------------------
  const mounts = new Map(); // tabId -> { render, unmount }
  const api = {
    mount(tabId, renderFn) {
      if (typeof renderFn !== "function") return () => {};
      mounts.set(tabId, { render: renderFn, unmount: null });
      // Sofort rendern, wenn Tab bereits aktiv
      if (tabId === currentTab) {
        safeMount(tabId);
      }
      // Rückgabe: noop Unmount-Delegate (Unmount verwaltet core intern)
      return () => { /* handled by core */ };
    },
    getSlot(name) {
      // Gültige Namen: logs-controls, logs-view, build-root, paths-root, tests-root
      const root = document.getElementById("inspector");
      if (!root) return null;
      return root.querySelector(`.slot-${name}`);
    },
    signal(name, payload) {
      try {
        window.dispatchEvent(new CustomEvent(`inspector:${name}`, { detail: payload }));
      } catch (_e) {}
    }
  };

  function safeMount(tabId) {
    const entry = mounts.get(tabId);
    if (!entry || typeof entry.render !== "function") return;
    // Vorherigen Unmount (derselben id) säubern
    if (entry.unmount) {
      try { entry.unmount(); } catch (_e) {}
      entry.unmount = null;
    }
    // Render ausführen – darf optional Unmount-Funktion zurückgeben
    try {
      const un = entry.render();
      if (typeof un === "function") entry.unmount = un;
    } catch (e) {
      logWarn("Mount-Fehler in Tab:", tabId, e?.message);
    }
  }

  function safeUnmount(tabId) {
    const entry = mounts.get(tabId);
    if (entry?.unmount) {
      try { entry.unmount(); } catch (_e) {}
      entry.unmount = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Tab-Management
  // ---------------------------------------------------------------------------
  let currentTab = "logs";

  function selectTab(tabId) {
    const root = document.getElementById("inspector");
    if (!root) return;

    if (tabId === currentTab) return;

    // TABS: active-Klasse setzen
    root.querySelectorAll(".ins-tab").forEach(btn => {
      const id = btn.getAttribute("data-tab");
      const is = id === tabId;
      btn.classList.toggle("active", is);
      btn.setAttribute("aria-selected", is ? "true" : "false");
    });

    // PANES: Sichtbarkeit umschalten
    root.querySelectorAll(".ins-pane").forEach(p => {
      const is = p.getAttribute("data-pane") === tabId;
      p.classList.toggle("active", is);
    });

    // Vorherigen Tab unmounten
    safeUnmount(currentTab);
    currentTab = tabId;

    // Neuen Tab mounten
    safeMount(currentTab);

    // Scroll-Focus auf Log-Viewport (macht iOS/Android Scroll zuverlässig)
    if (currentTab === "logs") {
      const view = api.getSlot("logs-view");
      if (view) { try { view.scrollTop = view.scrollHeight; } catch(_e){} }
    }
  }

  // ---------------------------------------------------------------------------
  // Öffnen / Schließen / Toggle
  // ---------------------------------------------------------------------------
  function open() {
    const root = ensureDOM();
    if (!root) return;
    if (root.style.display === "flex") return; // schon offen

    root.style.display = "flex";               // Vollbild sichtbar
    document.body.classList.add("inspector-open");

    // Standardtab sicherstellen
    selectTab(currentTab || "logs");

    // Events
    try { window.dispatchEvent(new CustomEvent("cb:inspector-open")); } catch (_e) {}
    logInfo("geöffnet", `v${VER}`);
  }

  function close() {
    const root = document.getElementById("inspector");
    if (!root) return;

    root.style.display = "none";
    document.body.classList.remove("inspector-open");

    try { window.dispatchEvent(new CustomEvent("cb:inspector-close")); } catch (_e) {}
    logInfo("geschlossen");
  }

  function toggle(force) {
    const root = document.getElementById("inspector");
    const willOpen = (force == null)
      ? !(root && root.style.display === "flex")
      : !!force;
    willOpen ? open() : close();
  }

  // ---------------------------------------------------------------------------
  // Export-APIs
  // ---------------------------------------------------------------------------
  window.__INSPECTOR_CORE__ = { api, version: VER };
  window.__INSPECTOR_API__  = { open, close, toggle }; // für GameUI/ui-bridge

  // Idempotenter DOM-Aufbau, aber Overlay geschlossen lassen
  ensureDOM();

  logOK("bereit", `v${VER}`);
})();
