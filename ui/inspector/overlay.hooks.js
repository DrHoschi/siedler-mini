/* ============================================================================
 * Datei: ui/inspector/overlay.hooks.js
 * Zweck: Nur ein leichter „Sicherheitsgurt“, der bei Bedarf ein kleines
 *        Fallback-Modal zeigt – und es automatisch wieder entfernt, sobald
 *        der echte Inspector läuft.
 * Version: v1.4
 * ========================================================================== */
(function(){
  "use strict";

  // --- Doppel-Laden verhindern ---------------------------------------------
  if (window.__INS_OVERLAY_HOOKS__) return;
  window.__INS_OVERLAY_HOOKS__ = "v1.4";

  const MOD = "[overlay.hooks]";
  const log = (...a)=> (window.CBLog?.info || console.log)(MOD, ...a);
  const warn= (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  let fallbackEl = null;
  let watchdog = null;
  let armed = false;        // wurde das Fallback überhaupt mal „scharf“ gemacht?

  function hasInspectorDOM(){
    return !!document.getElementById("inspector");
  }
  function hasInspectorReadyFlag(){
    return !!window.__INSPECTOR_CORE__;
  }

  // --- Fallback UI ----------------------------------------------------------
  function buildFallback(){
    if (fallbackEl) return;
    const wrap = document.createElement("div");
    wrap.id = "inspector-fallback";
    wrap.style.cssText = `
      position:fixed; inset:0; z-index:2147483646;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,.35); backdrop-filter:blur(2px);
    `;
    wrap.innerHTML = `
      <div style="
        min-width: 280px; max-width: 92vw;
        background:#1f252b; color:#fff; border-radius:12px;
        box-shadow:0 20px 50px rgba(0,0,0,.45);
        overflow:hidden; font: 16px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial;
      ">
        <div style="display:flex; align-items:center; justify-content:space-between;
                    padding:12px 16px; background:#242b31; border-bottom:1px solid rgba(255,255,255,.06)">
          <strong>Inspector (Fallback)</strong>
          <button id="ins-fallback-close" type="button" style="
            border:none; border-radius:999px; padding:6px 12px; cursor:pointer;
            background:#3a4450; color:#fff;">Schließen</button>
        </div>
        <div style="padding:14px 16px; color:#cfd8e3">Inspector lädt…</div>
      </div>
    `;
    document.body.appendChild(wrap);

    // Wichtig: Nur den Fallback schließen – KEIN globales Close-Event!
    wrap.querySelector("#ins-fallback-close")?.addEventListener("click", ()=>{
      removeFallback();
    });

    fallbackEl = wrap;
    log("Fallback angezeigt");
  }

  function removeFallback(){
    if (fallbackEl){
      try { fallbackEl.remove(); } catch(_){}
      fallbackEl = null;
      log("Fallback entfernt");
    }
  }

  // --- Wachhund: zeigt Fallback nur, wenn nötig ----------------------------
  function armWatchdog(){
    if (watchdog) return;

    // erst „scharf“ schalten, wenn tatsächlich jemand öffnen will
    function onOpenIntent(){
      armed = true;
      // kleine Verzögerung: gibt dem echten Inspector Zeit zum Mounten
      // und vermeidet Flackern auf schnellen Geräten.
      watchdog = window.setTimeout(()=>{
        if (!hasInspectorDOM() && !hasInspectorReadyFlag()){
          buildFallback();
        }
      }, 450);
    }

    // Wenn der Inspector wirklich da ist -> Fallback sicher weg
    function onBecameReady(){
      if (!armed) return;      // nie „bewaffnet“ gewesen -> ignorieren
      clearTimeout(watchdog); watchdog = null;
      removeFallback();
    }

    // Öffnen/Schließen-Hooks (werden von deinem Core gesendet)
    window.addEventListener("cb:inspector-open",  onOpenIntent);
    window.addEventListener("cb:inspector-close", ()=>{ removeFallback(); armed=false; });

    // „Ready“-Signale vom Core/Logs und ein generischer Mutations-Check
    window.addEventListener("inspector:ready", onBecameReady);
    window.addEventListener("logs:ready",      onBecameReady);

    // Falls der Core schon lief (Auto-Open etc.): sofort versuchen zu räumen
    if (hasInspectorDOM() || hasInspectorReadyFlag()){
      onBecameReady();
    }

    // Letzte Sicherheitsleine: falls DOM-Element später auftaucht
    const obs = new MutationObserver(()=>{
      if (hasInspectorDOM()) onBecameReady();
    });
    obs.observe(document.documentElement, {childList:true, subtree:true});
  }

  // Start
  armWatchdog();
  log("aktiv", window.__INS_OVERLAY_HOOKS__);
})();
