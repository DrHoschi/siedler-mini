/* ============================================================================
 * UI Bridge – Siedler-Mini
 * Version: v17.8.4
 * - Verbindet die FAB-Buttons mit Inspector & Build
 * - Kein Fallback-Modal mehr, nur API-Aufruf
 * - Doppel-Klick-Schutz, saubere Events
 * ========================================================================== */
(function () {
  "use strict";

  // --- Logging --------------------------------------------------------------
  const CB = (window.CBLog && typeof CBLog.info === "function")
    ? CBLog
    : {
        info: (...a) => console.log(...a),
        warn: (...a) => console.warn(...a),
        error: (...a) => console.error(...a),
      };

  // --- kleines Helferlein ---------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const fire = (name, detail) => {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); }
    catch (_) {}
  };

  // --- interner UI-Zustand --------------------------------------------------
  const State = {
    buildOpen: false,
    inspectorOpen: false,
    busyInspector: false,
    busyBuild: false,
  };

  // --- Inspector Steuerung --------------------------------------------------
  function openInspector() {
    if (State.busyInspector) return;
    State.busyInspector = true;

    try {
      if (window.Inspector && typeof window.Inspector.open === "function") {
        window.Inspector.open();
        State.inspectorOpen = true;
        fire("cb:inspector-open");
        CB.info("[ui-bridge] Inspector geöffnet.");
      } else {
        CB.warn("[ui-bridge] Inspector API nicht verfügbar (Inspector.open fehlt).");
      }
    } finally {
      setTimeout(() => (State.busyInspector = false), 50);
    }
  }

  function closeInspector() {
    if (State.busyInspector) return;
    State.busyInspector = true;

    try {
      if (window.Inspector && typeof window.Inspector.close === "function") {
        window.Inspector.close();
        State.inspectorOpen = false;
        fire("cb:inspector-close");
        CB.info("[ui-bridge] Inspector geschlossen.");
      } else {
        CB.warn("[ui-bridge] Inspector API nicht verfügbar (Inspector.close fehlt).");
      }
    } finally {
      setTimeout(() => (State.busyInspector = false), 50);
    }
  }

  function toggleInspector() {
    (State.inspectorOpen ? closeInspector : openInspector)();
  }

  // --- Build-Dock Steuerung -------------------------------------------------
  function openBuild() {
    if (State.busyBuild) return;
    State.busyBuild = true;

    try {
      const el = $("#build-panel");
      if (!el) {
        CB.warn("[ui-bridge] build-panel nicht gefunden.");
        return;
      }
      el.style.display = "block";
      document.body.classList.add("has-build-open");
      State.buildOpen = true;
      fire("cb:build-open");
      CB.info("[ui-bridge] Build geöffnet.");
    } finally {
      setTimeout(() => (State.busyBuild = false), 50);
    }
  }

  function closeBuild() {
    if (State.busyBuild) return;
    State.busyBuild = true;

    try {
      const el = $("#build-panel");
      if (!el) return;
      el.style.display = "none";
      document.body.classList.remove("has-build-open");
      State.buildOpen = false;
      fire("cb:build-close");
      CB.info("[ui-bridge] Build geschlossen.");
    } finally {
      setTimeout(() => (State.busyBuild = false), 50);
    }
  }

  function toggleBuild() {
    (State.buildOpen ? closeBuild : openBuild)();
  }

  // --- Öffentliche API bereitstellen ---------------------------------------
  //  (von den Buttons im HTML wird GameUI.* aufgerufen)
  window.GameUI = {
    // Inspector
    openInspector,
    closeInspector,
    toggleInspector,
    // Build
    openBuild,
    closeBuild,
    toggleBuild,
    // nur zu Debug-Zwecken:
    _state: State,
  };

  // --- Start-Event-Hooks (optional) ----------------------------------------
  window.addEventListener("cb:ui-ready", () => {
    CB.info("[ui-bridge] bereit (v17.8.4).");
  });

  // Für Seiten ohne cb:ui-ready feuern wir einmal beim DOM-Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      CB.info("[ui-bridge] bereit (v17.8.4).")
    );
  } else {
    CB.info("[ui-bridge] bereit (v17.8.4).");
  }
})();
