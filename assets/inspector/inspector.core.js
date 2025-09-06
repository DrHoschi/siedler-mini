/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.11.2
 *
 * Zweck:
 *  - Vollbild-Overlay für den Inspector mit fester Struktur (Panel, Kopf, Body, Fuß)
 *  - Tabs: Logs / Build / Pfade / Tests (sichtbar schalten + Slots bereitstellen)
 *  - Stabile, schlanke API für Module: __INSPECTOR_CORE__.api.{mount,getSlot,signal}
 *  - Brücke für UI-Buttons: __INSPECTOR_API__.{open,close,toggle}
 *
 * Garantien / Code-Style:
 *  - KEINE Logs hier sammeln – das macht inspector.logs.js
 *  - KEINE „body.appendChild“ außerhalb des Overlays – Slots nur innerhalb des Panels
 *  - body bekommt Klasse "inspector-open" (Hintergrundscroll sperren; siehe CSS)
 *  - Defensive: überlebt fehlende Module (Tabs bleiben leer, aber UI bleibt stabil)
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.11.2";

  // ---- Logging (sanft) ------------------------------------------------------
  const log  = (...a) => (window.CBLog?.info || console.log)(`${MOD}`, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(`${MOD}`, ...a);

  // ---- DOM Grundgerüst ------------------------------------------------------
  // Einmalige Erstellung des Overlays (wenn nicht vorhanden)
  let root = document.getElementById("inspector");
  if (!root) {
    root = document.createElement("div");
    root.id = "inspector";
    // WICHTIG: CSS kümmert sich um Position/Look; wir nur Struktur.
    // Hidden by default – wir schalten via open()/close().
    root.hidden = true;

    root.innerHTML = `
      <div class="ins-wrap">
        <div class="ins-panel" role="dialog" aria-modal="true" aria-labelledby="ins-title">
          <div class="ins-head">
            <div class="ins-title" id="ins-title">
              <span>Inspector</span>
              <span class="ins-ver">v${VER}</span>
            </div>
            <div class="ins-tabs" role="tablist" aria-label="Inspector Tabs">
              <button class="ins-tab active" data-tab="logs"  role="tab" aria-selected="true">Logs</button>
              <button class="ins-tab"         data-tab="build" role="tab" aria-selected="false">Build</button>
              <button class="ins-tab"         data-tab="paths" role="tab" aria-selected="false">Pfade</button>
              <button class="ins-tab"         data-tab="tests" role="tab" aria-selected="false">Tests</button>
            </div>
            <button class="ins-close" title="Schließen" aria-label="Inspector schließen"></button>
          </div>

          <div class="ins-body">
            <!-- LOGS -->
            <section class="slot logs" data-slot="logs">
              <div id="ins-logs-controls" class="slot-logs-controls"></div>
              <div id="ins-logs-view"     class="slot-logs-view"></div>
            </section>

            <!-- BUILD -->
            <section id="ins-build" class="slot build" data-slot="build" hidden></section>

            <!-- PFAD/OVERLAY -->
            <section id="ins-paths" class="slot paths" data-slot="paths" hidden></section>

            <!-- TESTS -->
            <section id="ins-tests" class="slot tests" data-slot="tests" hidden></section>
          </div>

          <div class="ins-foot">
            <span class="muted">Inspector bereit</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  // Referenzen
  const panel   = root.querySelector(".ins-panel");
  const tabsEl  = root.querySelector(".ins-tabs");
  const tabBtns = Array.from(root.querySelectorAll(".ins-tab"));
  const sections = {
    logs:  root.querySelector('[data-slot="logs"]'),
    build: root.querySelector('[data-slot="build"]'),
    paths: root.querySelector('[data-slot="paths"]'),
    tests: root.querySelector('[data-slot="tests"]'),
  };

  // Slot-Map (für Module)
  const slotMap = {
    "logs-controls": document.getElementById("ins-logs-controls"),
    "logs-view":     document.getElementById("ins-logs-view"),
    "build":         document.getElementById("ins-build"),
    "paths":         document.getElementById("ins-paths"),
    "tests":         document.getElementById("ins-tests"),
  };

  // ---- Zustand --------------------------------------------------------------
  let activeTab = loadTab() || "logs";
  const mounts = Object.create(null); // tabId -> () => {unmount?}

  // ---- API für Module -------------------------------------------------------
  const api = {
    /** Module registrieren ihren Tab-Renderer */
    mount(tabId, renderFn) {
      if (typeof renderFn === "function") {
        mounts[tabId] = renderFn;
        // Falls dieser Tab bereits aktiv ist → sofort rendern
        if (tabId === activeTab) renderActiveTab();
      }
    },
    /** Benannte Slots ausgeben (innerhalb des Panels!) */
    getSlot(name) {
      return slotMap[name] || null;
    },
    /** Optionales Signal-System für lose Kopplung */
    signal(name, payload) {
      try {
        window.dispatchEvent(new CustomEvent(`ins:${name}`, { detail: payload }));
      } catch (_) {}
    },
    /** Version ausgeben */
    version: VER,
  };

  // Export Kernobjekt (für Sub-Module)
  window.__INSPECTOR_CORE__ = { api, version: VER };

  // Für die FAB/Bridge (ui-bridge) zusätzlich eine einfache UI-API anbieten
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  Object.assign(window.__INSPECTOR_API__, {
    open, close, toggle,
    // kleine Logs-Brücke, falls Module sowas brauchen möchten:
    logs: {
      // no-op Platzhalter; echte Log-UI liefert inspector.logs.js
      push:  function(){ /* noop */ },
      render:function(){ /* noop */ },
    }
  });

  // ---- Öffnen/Schließen -----------------------------------------------------
  function open() {
    // evtl. Fallback-Badge entfernen
    try { document.getElementById("inspector-fallback")?.remove(); } catch {}

    root.hidden = false;
    document.body.classList.add("inspector-open");
    // Focus ins Panel
    try { panel.focus({ preventScroll: true }); } catch {}
    // Render aktiven Tab (falls noch nicht)
    renderActiveTab();

    // Event raus
    try { window.dispatchEvent(new CustomEvent("cb:inspector-open")); } catch {}
    log("geöffnet (", VER, ")");
  }

  function close() {
    document.body.classList.remove("inspector-open");
    root.hidden = true;
    try { window.dispatchEvent(new CustomEvent("cb:inspector-close")); } catch {}
    log("geschlossen");
  }

  function toggle(force) {
    const willOpen = force == null ? root.hidden : !!force;
    willOpen ? open() : close();
  }

  // Buttons / Interaktion
  root.querySelector(".ins-close")?.addEventListener("click", close);
  // Overlay-Hintergrund KLICK → schließen? (nur wenn außerhalb des Panels)
  root.addEventListener("mousedown", (ev) => {
    if (!panel.contains(ev.target)) close();
  });
  // Innerhalb Panel keine Schließ-Propagation
  panel.addEventListener("mousedown", (ev) => ev.stopPropagation());

  // Tabs-Klick
  tabsEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ins-tab");
    if (!btn) return;
    const id = btn.dataset.tab;
    if (!id || id === activeTab) return;
    switchTab(id);
  });

  function switchTab(id) {
    if (!sections[id]) return;
    // Buttons markieren
    tabBtns.forEach(b => {
      const on = b.dataset.tab === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    // Sections ein/aus
    Object.entries(sections).forEach(([key, sec]) => {
      sec.hidden = key !== id;
    });
    activeTab = id;
    saveTab(id);
    renderActiveTab();
  }

  function renderActiveTab() {
    // Unmount vorheriger Content, wenn Tab erneut gerendert wird
    // (Jedes mount() darf optional eine Unmount-Fn zurückgeben – hier unterstützt.)
    if (renderActiveTab._unmount) {
      try { renderActiveTab._unmount(); } catch (_) {}
      renderActiveTab._unmount = null;
    }
    const fn = mounts[activeTab];
    if (typeof fn === "function") {
      const maybeUnmount = fn(); // Module rendert sich in seine Slots
      if (typeof maybeUnmount === "function") renderActiveTab._unmount = maybeUnmount;
    }
  }

  // ---- Focus-Trap (einfach) -------------------------------------------------
  panel.setAttribute("tabindex", "-1");
  root.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { ev.preventDefault(); close(); return; }
    // einfache Trap: bei Tab innerhalb Panel bleiben
    if (ev.key === "Tab") {
      const focusables = root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      const list = Array.from(focusables).filter(el => panel.contains(el) && !el.disabled && el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      const active = document.activeElement;
      if (ev.shiftKey && active === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && active === last) { ev.preventDefault(); first.focus(); }
    }
  });

  // ---- Persistenz aktiver Tab ----------------------------------------------
  function saveTab(id) {
    try { localStorage.setItem("ins.activeTab", id); } catch (_) {}
  }
  function loadTab() {
    try { return localStorage.getItem("ins.activeTab") || ""; } catch (_) { return ""; }
  }

  // ---- Auto-Wiring & Ready-Log ---------------------------------------------
  // Falls jemand schon vor uns "Inspector lädt…" Fallback gesetzt hatte
  try { document.getElementById("inspector-probe")?.remove(); } catch {}

  log("bereit (", VER, ")");

  // Exponierte komfort-Methoden für FAB:
  //  - window.GameUI.toggleInspector() ruft __INSPECTOR_API__.toggle() (via ui-bridge)
  // Nichts weiter zu tun – das Panel bleibt geschlossen bis der Nutzer öffnet.

  // Optional: Wenn URL ?open-ins=1 → auto-öffnen (nur Dev-Helfer)
  try {
    if (/\bopen-ins=1\b/.test(location.search)) open();
  } catch(_) {}

  // Beim Hot-Reload / Neuinitialisierung sicherstellen, dass aktiver Tab sichtbar ist
  switchTab(activeTab); // wendet Sichtbarkeiten sofort an

})();
