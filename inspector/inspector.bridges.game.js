/* ============================================================================
 * Datei   : inspector/inspector.bridges.game.js
 * Version : v1.0.0
 * Zweck   : Inspector-Buttons/Abfragen mit dem Spiel verdrahten. Keine Demo-Daten.
 * Events  :
 *   → Inspector fragt   : 'req:build:snapshot', 'req:res:snapshot'
 *   ← Spiel antwortet   : 'cb:build:snapshot',  'cb:res:snapshot'
 *   Pfad-Overlay-Buttons: 'cb:path:overlay:on/off', 'cb:path:heatmap:on/off'
 * ========================================================================== */
(function(){
  // ===== Pfad-Overlay (Inspector → Overlay-Modul) =====
  const on     = () => window.PathOverlay?.toggle?.(true);
  const off    = () => window.PathOverlay?.toggle?.(false);
  const heatOn = () => window.PathOverlay?.setHeatmap?.(true);
  const heatOff= () => window.PathOverlay?.setHeatmap?.(false);

  window.addEventListener('cb:path:overlay:on',  on);
  window.addEventListener('cb:path:overlay:off', off);
  window.addEventListener('cb:path:heatmap:on',  heatOn);
  window.addEventListener('cb:path:heatmap:off', heatOff);

  // ===== Ressourcen-Snapshot (Inspector → Spiel) =====
  window.addEventListener('req:res:snapshot', () => {
    // Dein Ressourcensystem antwortet später mit:
    // window.dispatchEvent(new CustomEvent('cb:res:snapshot', { detail: {/*…*/} }));
  });

  // ===== Build-Snapshot (Inspector → Spiel) =====
  window.addEventListener('req:build:snapshot', () => {
    // Dein Build/Registry antwortet später mit:
    // window.dispatchEvent(new CustomEvent('cb:build:snapshot', { detail: {/*…*/} }));
  });

  // ===== Optional: Tests-Tab-Buttons =====
  window.addEventListener('req:insp:open',  () => window.Inspector?.open?.());
  window.addEventListener('req:insp:close', () => window.Inspector?.close?.());
})();

/* ============================================================================
 * Datei   : inspector/inspector.bridges.game.js
 * Patch   : v25.11.01-logbridge
 * Zweck   : Console → Inspector-Event 'cb:log' spiegeln (ohne Spielcode zu ändern)
 * Hinweis : Tut nix kaputt: Original-console wird weiter aufgerufen.
 * ========================================================================== */
(function () {
  if (console._inspProxy) return;            // idempotent
  const send = (level, args) => {
    // Text "best effort" (JSON bei Objekten)
    const msg = args.map(a => {
      try { return (typeof a === 'string') ? a : JSON.stringify(a); }
      catch (_) { return String(a); }
    }).join(' ');
    window.dispatchEvent(new CustomEvent('cb:log', {
      detail: { level, msg, args }
    }));
  };

  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    const orig = (console[level] || console.log).bind(console);
    console[level] = function (...args) {
      try { send(level, args); } catch (_) {}
      return orig(...args);
    };
  });
  console._inspProxy = true;
  console.debug('[insp-bridge] console proxy aktiv');
})();
