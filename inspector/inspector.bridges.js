/* ============================================================================
 * Datei   : inspector/inspector.bridges.js
 * Version : v1.0.0
 * Zweck   : Ein zentraler Ort, um Inspector-Buttons/Abfragen mit dem Spiel
 *           zu verdrahten. Keine Demo-Daten – nur Events durchreichen.
 * Events  :
 *   → Inspector fragt   : 'req:build:snapshot', 'req:res:snapshot'
 *   ← Spiel antwortet   : 'cb:build:snapshot',  'cb:res:snapshot'
 *   Pfad-Overlay-Buttons: 'cb:path:overlay:on/off', 'cb:path:heatmap:on/off'
 * Hinweise:
 *   – Falls das Spiel (HUD/Build) bereits Listener hat, macht das hier nichts kaputt.
 *   – Hier KEINE Platzhalter-Daten. Tabs zeigen dann korrekt „(keine Daten)“.
 * ========================================================================== */

(function(){
  // ===== Pfad-Overlay Brücke (Inspector → Overlay-Modul) =====
  const on  = () => window.PathOverlay?.toggle(true);
  const off = () => window.PathOverlay?.toggle(false);
  const heatOn  = () => window.PathOverlay?.setHeatmap?.(true);
  const heatOff = () => window.PathOverlay?.setHeatmap?.(false);

  window.addEventListener('cb:path:overlay:on',  on);
  window.addEventListener('cb:path:overlay:off', off);
  window.addEventListener('cb:path:heatmap:on',  heatOn);
  window.addEventListener('cb:path:heatmap:off', heatOff);

  // ===== Ressourcen-Snapshot (Inspector → Spiel) =====
  window.addEventListener('req:res:snapshot', () => {
    // Erwartet, dass dein Ressourcensystem die Antwort sendet:
    // window.dispatchEvent(new CustomEvent('cb:res:snapshot', {detail:{Holz:..}}));
    // → Falls noch nicht implementiert, bleibt der Tab korrekt leer.
  });

  // ===== Build-Snapshot (Inspector → Spiel) =====
  window.addEventListener('req:build:snapshot', () => {
    // Erwartet, dass dein Build/Registry-System antwortet:
    // window.dispatchEvent(new CustomEvent('cb:build:snapshot', {detail:{...}}));
  });

  // ===== Optional: Quick-Buttons im Tests-Tab können open/close triggern =====
  window.addEventListener('req:insp:open',  () => window.Inspector?.open?.());
  window.addEventListener('req:insp:close', () => window.Inspector?.close?.());
})();
