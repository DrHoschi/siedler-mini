/* ============================================================================
 * overlay.hooks.js  —  Inspector FAB → Fallback-Overlay, bis Core geladen ist
 * Version: v1.4.0
 * ---------------------------------------------------------------------------
 * Aufgaben
 * - Toggle per FAB (🛠) hören und früh Feedback geben („Inspector lädt…“)
 * - Nur EIN Fallback gleichzeitig anlegen
 * - Fallback automatisch schließen, sobald der Core „ready“ meldet
 * - „Schließen“ des Fallbacks darf NICHT den echten Inspector beeinflussen
 * - Doppelklicks / mehrfaches Toggle entprellen
 * ========================================================================== */

(function(){
  "use strict";

  const MOD = "[overlay.hooks]";
  const BUS = window;
  let lastToggleAt = 0;
  let fallBackEl = null;

  // Utility ---------------------------------------------------------------
  function now(){ return Date.now(); }
  function byId(id){ return document.getElementById(id); }

  function makeFallback(){
    if (fallBackEl && document.body.contains(fallBackEl)) return fallBackEl;

    const wrap = document.createElement("div");
    wrap.id = "inspector-fallback";
    wrap.setAttribute("role","dialog");
    wrap.style.cssText = `
      position:fixed; inset:0; z-index:2147483645;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,.35); backdrop-filter: blur(2px);
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      min-width: min(480px, 92vw);
      max-width: 92vw;
      background: #1f262c;
      color: #dde3ea;
      border-radius: 12px;
      box-shadow: 0 18px 42px rgba(0,0,0,.35);
      overflow:hidden;
      border:1px solid rgba(255,255,255,.06);
    `;

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);">
        <strong style="font-size:18px;">Inspector (Fallback)</strong>
        <button id="ins-fb-close" aria-label="Schließen"
          style="padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#2b333a;color:#fff;cursor:pointer;">
          Schließen
        </button>
      </div>
      <div style="padding:14px 16px; font:15px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
        Inspector lädt…
      </div>
    `;

    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    // Close nur den Fallback – NICHT erneut toggeln!
    wrap.querySelector("#ins-fb-close").addEventListener("click", (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      destroyFallback();
    });

    fallBackEl = wrap;
    return wrap;
  }

  function destroyFallback(){
    if (fallBackEl){
      try { fallBackEl.remove(); } catch(_){}
      fallBackEl = null;
    }
  }

  // Events vom Core -------------------------------------------------------
  BUS.addEventListener("ins:core-ready", ()=> {
    // Core meldet „bereit“ → Fallback schließen
    destroyFallback();
  });

  BUS.addEventListener("ins:open", ()=> {
    // Echte UI ist offen → Fallback vorsichtshalber schließen
    destroyFallback();
  });

  BUS.addEventListener("ins:close", ()=> {
    // Inspector zu → Fallback ebenfalls schließen
    destroyFallback();
  });

  // FAB → Toggle ----------------------------------------------------------
  function requestToggle(){
    const t = now();
    if (t - lastToggleAt < 350) return; // Entprellen
    lastToggleAt = t;

    // Sofort Fallback sichtbar machen (nur wenn noch nicht da)
    makeFallback();

    // Core anstoßen: der Core selbst entscheidet open/close
    BUS.dispatchEvent(new CustomEvent("cb:inspector-toggle"));
  }

  // Globalen FAB anbinden, falls vorhanden
  function wireFab(){
    const btn = byId("btn-inspector");
    if (!btn) return;
    const el = btn.querySelector("button") || btn;
    if (!el.__inspectorFabWired__){
      el.__inspectorFabWired__ = true;
      el.addEventListener("click", (ev)=>{
        // Der FAB selbst triggert nur den Toggle. Fallback verwalten wir hier lokal.
        requestToggle();
      });
    }
  }

  // Auch Tastatur (optional, nur DEV): Alt+I
  window.addEventListener("keydown", (e)=>{
    if ((e.altKey || e.metaKey) && !e.shiftKey && (e.key === "i" || e.key === "I")){
      e.preventDefault();
      requestToggle();
    }
  });

  // Beim DOM-Ready FAB suchen
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", wireFab, { once:true });
  } else {
    wireFab();
  }

  console.log(MOD, "bereit v1.4.0");
})();
