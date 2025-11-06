/* ============================================================================
 * Datei   : core/boot-v1.js
 * Projekt : Neue Siedler
 * Version : v25.11.07 (final)
 * Zweck   : Orchestrierung – reagiert auf cb:ui-ready/assets/registry & startet Spiel.
 *
 * Lauscht  : cb:ui-ready, cb:assets-ready, cb:registry:ready, req:game:start, req:game:stop
 * Sendet   : cb:boot:ready, cb:game-start, cb:game-stop
 *
 * Hinweise :
 * - Run-Once-Guard verhindert Doppel-Init zuverlässig.
 * - Start erfolgt NUR via req:game:start (Button aus ui-start.js).
 * ========================================================================== */

if (window.__BOOT_INIT__) {
  console.warn('[boot] Doppel-Init verhindert.');
  // Abbruch – zweiter Boot-Lauf wird unterbunden
  (function(){ return; })();
}
window.__BOOT_INIT__ = true;

;(()=>{
  /* ------------------------------- KONSTANTEN ------------------------------ */
  const BOOT_VERSION  = 'v25.11.07';
  const DEFAULT_MAP   = 'default';
  const DEFAULT_SEED  = Date.now();
  const TICK_MS       = 2000;     // Produktions-Heartbeat

  /* -------------------------------- STATE --------------------------------- */
  const S = { uiReady:false, assetsReady:false, registryReady:false, running:false, tick:null };

  /* ------------------------------- HELPERS -------------------------------- */
  const logI = (...a)=> console.info('[boot]', ...a);
  const logW = (...a)=> console.warn('[boot]', ...a);
  const logE = (...a)=> console.error('[boot]', ...a);

  function emitBootReady(){ dispatchEvent(new CustomEvent('cb:boot:ready', { detail:{ version:BOOT_VERSION } })); }
  function emitGameStart(map, seed){ dispatchEvent(new CustomEvent('cb:game-start', { detail:{ ok:true, map, seed } })); }
  function emitGameStop(){ dispatchEvent(new CustomEvent('cb:game-stop', { detail:{ ok:true } })); }
  function canStart(){ return S.uiReady && S.assetsReady && S.registryReady; }

  function startTicker(){
    if (!window.Production){ logW('Production nicht gefunden – Ticker übersprungen.'); return; }
    try{ window.Production.tick(); }catch(e){ logE('Production.tick Erstlauf:', e); }
    clearInterval(S.tick);
    S.tick = setInterval(()=>{ try{ window.Production.tick(); }catch(e){ logE('Production.tick Fehler:', e); } }, TICK_MS);
    logI('Produktions-Ticker gestartet (alle', TICK_MS, 'ms)');
  }
  function stopTicker(){ clearInterval(S.tick); S.tick=null; logI('Produktions-Ticker gestoppt'); }

  /* --------------------------------- INIT --------------------------------- */
  function init(){
    logI('BootManager initialisiert', BOOT_VERSION);
    emitBootReady();

    // UI
    addEventListener('cb:ui-ready', (e)=>{ S.uiReady = true;  logI('UI bereit – Startpanel sichtbar', e?.detail||{}); });

    // Assets
    addEventListener('cb:assets-ready', (e)=>{
      S.assetsReady = true; logI('Assets bereit ✓', e?.detail||{});
      if (window.Registry?.load) {
        window.Registry.load().catch(err=> logE('Registry.load Fehler:', err));
      } else {
        logW('Registry Modul nicht gefunden – core/registry.js einbinden.');
      }
    });

    // Registry
    addEventListener('cb:registry:ready', (e)=>{ S.registryReady = true; logI('Registry bereit ✓', e?.detail||{}); startTicker(); });

 /*   // Spielstart
    addEventListener('req:game:start', (e)=>{
      const { map = DEFAULT_MAP, seed = DEFAULT_SEED } = e?.detail || {};
      if (!canStart()){
        logW('Spielstart blockiert – Voraussetzungen fehlen:', { uiReady:S.uiReady, assetsReady:S.assetsReady, registryReady:S.registryReady });
        return;
      }
      if (S.running) return;
      S.running = true;
      emitGameStart(map, seed);
      logI('Spiel gestartet →', { map, seed });
    }); */

    // Spielstopp
    addEventListener('req:game:stop', ()=>{
      if (!S.running) return;
      S.running = false;
      stopTicker();
      emitGameStop();
      logI('Spiel gestoppt');
    });
  }

  // Auto-Init
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', init, { once:true })
    : init();

  // Export (optional)
  window.Boot = { version: BOOT_VERSION };
})();
