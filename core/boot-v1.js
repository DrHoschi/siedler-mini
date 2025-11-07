/* ============================================================================
 * Datei   : core/boot-v1.js
 * Projekt : Neue Siedler
 * Version : v25.11.07-final2
 * Zweck   : Boot-Orchestrierung – Startet das Spiel NUR nach User-Request,
 *           wenn UI, Assets und Registry bereit sind. Kein Autostart.
 *
 * Lauscht  : cb:ui-ready, cb:assets-ready, cb:registry:ready,
 *            req:game:start,  req:game:stop
 * Sendet   : cb:boot:ready, cb:game-start, cb:game-stop
 *
 * WICHTIG
 * - Run-Once-Guard verhindert Doppel-Init.
 * - Start erfolgt ausschließlich per req:game:start (Button in ui-start.js).
 * - startTicker() erst nach cb:game-start (nicht vorab), damit Zyklen sauber sind.
 * - Keine setTimeout-Autostarts oder versteckte Fallbacks!
 * ========================================================================== */

;(() => {
  /* ---------------------------- RUN-ONCE-GUARD --------------------------- */
  if (window.__BOOT_INIT__) {
    console.warn('[boot] Doppel-Init verhindert.');
    return;
  }
  window.__BOOT_INIT__ = true;

  /* ------------------------------- KONSTANTEN ----------------------------- */
  const BOOT_VERSION = 'v25.11.07-final2';
  const DEFAULT_MAP  = 'default';
  const DEFAULT_SEED = Date.now();
  const TICK_MS      = 2000; // Produktions-Heartbeat

  /* -------------------------------- STATE -------------------------------- */
  const S = {
    uiReady:       false,
    assetsReady:   false,
    registryReady: false,
    userRequested: false, // wird nur durch req:game:start gesetzt
    running:       false,
    tick:          null
  };

  /* ------------------------------- HELPERS -------------------------------- */
  const logI = (...a) => (console.info || console.log)('[boot]', ...a);
  const logW = (...a) => (console.warn || console.log)('[boot]', ...a);
  const logE = (...a) => (console.error|| console.log)('[boot]', ...a);

  const emitBootReady = () => {
    dispatchEvent(new CustomEvent('cb:boot:ready', { detail:{ version: BOOT_VERSION }}));
  };

  const emitGameStart = (map, seed) => {
    dispatchEvent(new CustomEvent('cb:game-start', { detail:{ ok:true, map, seed, source:'boot' }}));
  };

  const emitGameStop = () => {
    dispatchEvent(new CustomEvent('cb:game-stop', { detail:{ ok:true, source:'boot' }}));
  };

  const canStart = () => (S.uiReady && S.assetsReady && S.registryReady && S.userRequested && !S.running);

  function printMissing() {
    const miss = [];
    if (!S.uiReady)       miss.push('uiReady');
    if (!S.assetsReady)   miss.push('assetsReady');
    if (!S.registryReady) miss.push('registryReady');
    if (!S.userRequested) miss.push('userRequested');
    if (S.running)        miss.push('alreadyRunning');
    if (miss.length) logW('Start blockiert → fehlend:', miss);
  }

  function startTicker(){
    clearInterval(S.tick);
    if (!window.Production || typeof window.Production.tick !== 'function') {
      logW('Production.tick nicht verfügbar – Ticker übersprungen.');
      S.tick = null;
      return;
    }
    try { window.Production.tick(); } catch(e){ logE('Production.tick (Erstlauf) Fehler:', e); }
    S.tick = setInterval(() => {
      try { window.Production.tick(); } catch(e){ logE('Production.tick Fehler:', e); }
    }, TICK_MS);
    logI('Produktions-Ticker gestartet (alle', TICK_MS, 'ms)');
  }

  function stopTicker(){
    clearInterval(S.tick);
    S.tick = null;
    logI('Produktions-Ticker gestoppt');
  }

  /* ------------------------------ CORE-LOGIK ------------------------------ */
  function tryStart(map = DEFAULT_MAP, seed = DEFAULT_SEED) {
    if (!canStart()) { printMissing(); return; }
    S.running = true;
    logI('Alle Bedingungen erfüllt → Spielstart', { map, seed });
    emitGameStart(map, seed);
    startTicker();
  }

  /* -------------------------------- LISTENER ------------------------------ */
  // UI bereit – Startpanel sichtbar; NICHT starten!
  addEventListener('cb:ui-ready', (e) => {
    S.uiReady = true;
    logI('UI bereit ✓', e?.detail || {});
  });

  // Assets fertig
  addEventListener('cb:assets-ready', (e) => {
    S.assetsReady = true;
    logI('Assets bereit ✓', e?.detail || {});
    // Hinweis: Registry.load() ggf. woanders – hier nur Flag setzen.
  });

  // Registry fertig
  addEventListener('cb:registry:ready', (e) => {
    S.registryReady = true;
    logI('Registry bereit ✓', e?.detail || {});
    // Kein Ticker hier! Erst nach Spielstart starten.
  });

  // Benutzer startet das Spiel (einziger legitimer Trigger!)
  addEventListener('req:game:start', (e) => {
    // e.detail kann { map, seed } enthalten
    const map  = e?.detail?.map  || DEFAULT_MAP;
    const seed = e?.detail?.seed || DEFAULT_SEED;
    S.userRequested = true;
    tryStart(map, seed);
  });

  // Spiel stoppen
  addEventListener('req:game:stop', () => {
    if (!S.running) return;
    S.running = false;
    stopTicker();
    emitGameStop();
    logI('Spiel gestoppt');
  });

  /* --------------------------------- INIT --------------------------------- */
  function init(){
    logI('BootManager initialisiert', BOOT_VERSION);
    emitBootReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  /* -------------------------------- EXPORT -------------------------------- */
  window.Boot = {
    version: BOOT_VERSION,
    getState: () => ({ ...S }),
    canStart,
    tryStart // optional, z. B. für Tests
  };
})();
