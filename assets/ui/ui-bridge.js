/* ============================================================================
 * UI-Bridge – verbindet FABs (🧱/🛠) mit Build-Panel & Inspector
 * Projekt: Siedler-Mini
 * Version: v17.9.0 (bridge refresh)
 *
 * Aufgaben
 * - Exponiert window.GameUI.{toggleBuild,openInspector,closeInspector,toggleInspector}
 * - Pflegt Body-Klassen (has-build-open / inspector-open)
 * - Zeigt einen eigenständigen "Inspector (Fallback)" Loader an, falls der
 *   Inspector-Core noch nicht bereit ist. Das Fallback lässt sich schließen,
 *   OHNE dabei den Inspector zu schließen.
 * - Entkoppelt alle alten innerHTML "…lädt" Konstrukte, damit keine Overlays
 *   doppelt entstehen.
 * ========================================================================== */

(function () {
  "use strict";

  // ---- kleines Log-Helferlein --------------------------------------------
  const MOD = "[ui-bridge]";
  const log  = (...a) => (window.CBLog?.ok   || console.log   )(`${MOD}`, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn  )(`${MOD}`, ...a);
  const info = (...a) => (window.CBLog?.info || console.info  )(`${MOD}`, ...a);

  // ---- State --------------------------------------------------------------
  const state = {
    buildOpen: false,
    inspOpen:  false,
    inspOpening: false,      // Klick-Entprellung
    inspReady: false,        // vom Inspector gemeldet
  };

  // ---- Fallback-Overlay ---------------------------------------------------
  // Ein kleines neutrales Overlay, das nur "Inspector lädt…" anzeigt.
  // Wichtig: Das Schließen dieses Fallbacks schließt NICHT den Inspector!
  let $fallback = null;
  function ensureFallback() {
    if ($fallback) return $fallback;

    const wrap = document.createElement("div");
    wrap.id = "inspector-fallback";
    wrap.style.cssText = `
      position:fixed; inset:0; z-index:2147483646; display:none;
      align-items:center; justify-content:center;
      background:rgba(10,12,11,.35); backdrop-filter:blur(4px);
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      min-width: 280px; max-width: 90vw;
      background:#151a18; color:#e7ece9;
      border:1px solid rgba(255,255,255,.08);
      border-radius:12px; padding:12px; box-shadow:0 16px 40px rgba(0,0,0,.35);
      font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji", "Segoe UI Symbol";
    `;

    const head = document.createElement("div");
    head.style.cssText = `display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;`;
    const h = document.createElement("div");
    h.textContent = "Inspector (Fallback)";
    h.style.cssText = `font-weight:600; letter-spacing:.2px;`;
    const close = document.createElement("button");
    close.textContent = "Schließen";
    close.style.cssText = `
      border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:6px 10px;
      background:rgba(255,255,255,.08); color:#e7ece9; cursor:pointer;
    `;
    close.addEventListener("click", () => {
      hideFallback();                 // nur Fallback schließen!
      // WICHTIG: NICHT den Inspector schließen
    });

    head.append(h, close);

    const body = document.createElement("div");
    body.textContent = "Inspector lädt…";
    body.style.cssText = `opacity:.9;`;

    panel.append(head, body);
    wrap.append(panel);
    document.body.appendChild(wrap);
    $fallback = wrap;
    return $fallback;
  }
  function showFallback() {
    ensureFallback();
    if ($fallback) $fallback.style.display = "flex";
  }
  function hideFallback() {
    if ($fallback) $fallback.style.display = "none";
  }

  // ---- Event-Brücke <-> Inspector ----------------------------------------
  // Wir senden nur CustomEvents; der Inspector-Core hört darauf.
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // Inspector: öffnen/schließen/toggle
  function openInspector() {
    if (state.inspOpening || state.inspOpen) return;
    state.inspOpening = true;

    // 1) Versuch: Core soll öffnen
    emit("cb:inspector-open");

    // 2) Fallback-Logik:
    //    - wenn in ~300ms kein Inspector-DOM sichtbar -> Fallback zeigen
    //    - Fallback wird automatisch ausgeblendet, sobald "cb:inspector-ready" kommt
    const t1 = setTimeout(() => {
      // Wenn bis hier kein ready kam, Fallback zeigen
      if (!state.inspReady) showFallback();
    }, 300);

    // Sicherheits-Timeout, inspOpening wieder freigeben
    setTimeout(() => { state.inspOpening = false; clearTimeout(t1); }, 1000);
  }

  function closeInspector() {
    if (!state.inspOpen) return;
    emit("cb:inspector-close");
  }

  function toggleInspector() {
    if (state.inspOpen) closeInspector(); else openInspector();
  }

  // Build-Toggle bleibt unverändert (nur Body-Klasse + Events, falls vorhanden)
  function toggleBuild() {
    state.buildOpen = !state.buildOpen;
    document.body.classList.toggle("has-build-open", state.buildOpen);
    emit(state.buildOpen ? "cb:build-open" : "cb:build-close");
  }

  // ---- Öffentliche API ----------------------------------------------------
  window.GameUI = Object.assign(window.GameUI || {}, {
    toggleBuild,
    openInspector,
    closeInspector,
    toggleInspector,
  });

  // ---- FAB nachrüsten (falls Button im DOM vorhanden) ---------------------
  // HINWEIS: Wir binden NICHT doppelt! (Entprellung)
  document.addEventListener("DOMContentLoaded", () => {
    const btnInsp = document.querySelector("#btn-inspector button");
    if (btnInsp) {
      btnInsp.addEventListener("click", (ev) => {
        ev.preventDefault();
        toggleInspector();
      }, { passive: true });
    }
    const btnBuild = document.querySelector("#btn-build button");
    if (btnBuild) {
      btnBuild.addEventListener("click", (ev) => {
        ev.preventDefault();
        toggleBuild();
      }, { passive: true });
    }
  });

  // ---- Inspector-Status vom Core entgegennehmen ---------------------------
  // Der Inspector-Core sollte diese Events feuern:
  //  - cb:inspector-ready     (wenn DOM + Tabs montiert sind)
  //  - cb:inspector-opened    (sobald sichtbar)
  //  - cb:inspector-closed    (sobald geschlossen)
  document.addEventListener("cb:inspector-ready", () => {
    state.inspReady = true;
    hideFallback();
    info("Inspector meldet ready.");
  });

  document.addEventListener("cb:inspector-opened", () => {
    state.inspOpen = true;
    document.body.classList.add("inspector-open");
    hideFallback();
    log("Inspector geöffnet.");
  });

  document.addEventListener("cb:inspector-closed", () => {
    state.inspOpen = false;
    document.body.classList.remove("inspector-open");
    hideFallback();
    log("Inspector geschlossen.");
  });

  // Defensive: Falls der Core nur cb:inspector-open / -close konsumiert
  // und keine opened/closed feuert, hängen wir ein kleines Poll-Fallback dran,
  // das ein vorhandenes #inspector-Root prüft.
  let pollId = null;
  function startOpenPoll() {
    if (pollId) return;
    pollId = setInterval(() => {
      const root = document.getElementById("inspector");
      const isVisible = !!root && root.style.display !== "none";
      if (isVisible && !state.inspOpen) {
        state.inspOpen = true;
        document.body.classList.add("inspector-open");
        hideFallback();
      }
      if (!isVisible && state.inspOpen) {
        state.inspOpen = false;
        document.body.classList.remove("inspector-open");
        hideFallback();
      }
    }, 500);
  }
  startOpenPoll();

  info("UI-Bridge bereit.");
})();
