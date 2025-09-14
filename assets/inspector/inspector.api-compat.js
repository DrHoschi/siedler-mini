/* ============================================================================
 * Datei: assets/inspector/inspector.api-compat.js
 * Version: v18.12.4
 * Zweck:
 *  - Kompatibilitäts-API __INSPECTOR_API__ bereitstellen, wenn Core nur core.api hat
 *  - Events cb:inspector-open / -close / -toggle abwickeln
 *  - Kein UI – nur Verdrahtung
 * ============================================================================
 */
(function(){
  "use strict";
  const MOD = "[inspector.api-compat]";
  const ok  = (...a)=>(window.CBLog?.ok||console.log)(MOD, ...a);
  const wrn = (...a)=>(window.CBLog?.warn||console.warn)(MOD, ...a);

  // Warten bis Core initialisiert hat
  function ensure() {
    const core = window.__INSPECTOR_CORE__;
    if (!core || !core.api) {
      wrn("Core-API noch nicht verfügbar – versuche später erneut.");
      return false;
    }

    // Wenn __INSPECTOR_API__ bereits existiert, nur Events verdrahten und raus
    if (!window.__INSPECTOR_API__) {
      // Thin wrapper, der auf core.api.* delegiert
      window.__INSPECTOR_API__ = {
        open () { try{ core.api.open(); } catch(e){ wrn("open()", e); } },
        close() { try{ core.api.close(); } catch(e){ wrn("close()", e); } },
        toggle(force) {
          try {
            if (typeof force === "boolean") {
              force ? core.api.open() : core.api.close();
            } else {
              core.api.isOpen() ? core.api.close() : core.api.open();
            }
          } catch(e){ wrn("toggle()", e); }
        }
      };
      ok("Compat-API bereitgestellt.");
    } else {
      ok("__INSPECTOR_API__ vorhanden – nur Events verdrahten.");
    }

    // Einheitliche Events → API
    window.addEventListener("cb:inspector-open",  ()=>window.__INSPECTOR_API__?.open());
    window.addEventListener("cb:inspector-close", ()=>window.__INSPECTOR_API__?.close());
    window.addEventListener("cb:inspector-toggle", (ev)=>{
      const f = ev?.detail?.force; window.__INSPECTOR_API__?.toggle(f);
    });

    // (Optional) Legacy-Event-Namen weiterhin akzeptieren
    window.addEventListener("cb:inspector-open-legacy",  ()=>window.__INSPECTOR_API__?.open());
    window.addEventListener("cb:inspector-close-legacy", ()=>window.__INSPECTOR_API__?.close());

    ok("Events verdrahtet.");
    return true;
  }

  // Sofort versuchen, danach noch kurz pollen (für “defer”-Load)
  if (!ensure()) {
    const t0 = Date.now();
    const timer = setInterval(()=>{
      if (ensure() || Date.now() - t0 > 4000) clearInterval(timer);
    }, 120);
  }
})();
