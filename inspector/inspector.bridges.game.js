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
