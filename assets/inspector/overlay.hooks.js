/* ============================================================================
 * overlay.hooks.js  –  v1.4
 * Aufgaben:
 *  - Auf Inspector-Core warten und erst dann öffnen/schließen
 *  - Fallback-Modal nur zeigen, wenn Core wirklich nicht rechtzeitig da ist
 *  - Keinerlei Auto-Open; reagiert nur auf Events/Buttons
 * Events (vom UI/Spiel):
 *  - window.dispatchEvent(new Event('cb:inspector-open'))
 *  - window.dispatchEvent(new Event('cb:inspector-close'))
 * ========================================================================== */

(function () {
  "use strict";

  if (window.__INS_OVERLAY_HOOKS__) return;
  window.__INS_OVERLAY_HOOKS__ = "v1.4";

  const MOD = "[overlay-hooks]";
  const log = (...a) => (window.CBLog?.info || console.log)(MOD, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(MOD, ...a);

  // --- kleine Helfer --------------------------------------------------------
  const coreReady = () => !!(window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.open);
  const on = (ev, fn, opt)=> window.addEventListener(ev, fn, opt);
  const off = (ev, fn)=> window.removeEventListener(ev, fn);

  // --- Fallback-Modal --------------------------------------------------------
  let $fb = null;
  function ensureFallback() {
    if ($fb) return $fb;
    const wrap = document.createElement("div");
    wrap.id = "inspector-fallback";
    Object.assign(wrap.style, {
      position: "fixed", inset: "0", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,.45)", zIndex: "2147483646"
    });
    wrap.innerHTML = `
      <div style="
        min-width:280px; max-width:90vw; border-radius:12px;
        background:#161b1e; color:#e9eef2; box-shadow:0 12px 36px rgba(0,0,0,.35);
        border:1px solid rgba(255,255,255,.08); overflow:hidden">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.08)">
          <strong style="font:600 16px/1.2 system-ui,Segoe UI,Roboto,Helvetica,Arial">Inspector (Fallback)</strong>
          <button id="ins-fb-close" style="padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:#2b3135; color:#e9eef2; cursor:pointer">Schließen</button>
        </div>
        <div style="padding:14px 14px 16px 14px; font:14px/1.5 system-ui,Segoe UI,Roboto,Helvetica,Arial">
          Inspector lädt…
        </div>
      </div>`;
    wrap.querySelector("#ins-fb-close").addEventListener("click", hideFallback);
    $fb = wrap;
    return $fb;
  }
  function showFallback() {
    if (!document.getElementById("inspector-fallback")) {
      document.body.appendChild(ensureFallback());
    } else {
      $fb.style.display = "flex";
    }
  }
  function hideFallback() {
    if ($fb) $fb.style.display = "none";
  }

  // --- Warten, bis der Core wirklich da ist ---------------------------------
  function whenCoreReady(cb, opts) {
    const timeout = opts?.timeout ?? 4000;
    const interval = opts?.interval ?? 60;
    const start = Date.now();

    // schon bereit?
    if (coreReady()) return void cb();

    const t = setInterval(() => {
      if (coreReady()) {
        clearInterval(t);
        cb();
      } else if (Date.now() - start > timeout) {
        clearInterval(t);
        (opts?.onTimeout || (()=>{}))();
      }
    }, interval);
  }

  // --- Öffnen/Schließen orchestrieren ---------------------------------------
  function openInspector() {
    // 1) warten wir auf den Core …
    whenCoreReady(() => {
      hideFallback();
      try {
        window.__INSPECTOR_CORE__.open();
      } catch (e) {
        warn("open() fehlgeschlagen:", e);
        showFallback();
      }
    }, {
      timeout: 900,  // kurz probieren …
      onTimeout: () => {
        // 2) … und wenn er noch nicht da ist, Fallback zeigen …
        showFallback();
        // 3) … aber parallel weiter warten und bei Erfolg übernehmen:
        whenCoreReady(() => {
          hideFallback();
          try { window.__INSPECTOR_CORE__.open(); } catch(e){ warn("open() takeover:", e); }
        }, { timeout: 4000, interval: 80 });
      }
    });
  }

  function closeInspector() {
    hideFallback();
    if (coreReady()) {
      try { window.__INSPECTOR_CORE__.close(); } catch(e){ warn("close() err", e); }
    }
  }

  // --- Events aus dem UI / Deinen Buttons -----------------------------------
  on("cb:inspector-open",  openInspector);
  on("cb:inspector-close", closeInspector);

  // Falls der Core seine eigene „bin da“-Meldung sendet, Fallback sofort schließen
  on("ins:ready", hideFallback);

  // Nur Infos ins Log
  log("bereit", window.__INS_OVERLAY_HOOKS__);
})();
