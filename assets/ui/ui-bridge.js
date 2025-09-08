/* ============================================================================
 * UI Bridge – Siedler-Mini
 * Version: v17.8.3 (clean)
 * - Keine Fallback-Overlays mehr
 * - Stabile Inspector-Toggles (ruft direkt __INSPECTOR_CORE__ auf)
 * - Sanfte Signale, falls Core noch lädt
 * ===========================================================================*/

(function () {
  'use strict';

  // ------------------------------------------------------------
  // Kleines Log-Helferlein (geht über CBLog, fällt auf console zurück)
  // ------------------------------------------------------------
  const log = {
    info:  (m) => (window.CBLog?.info  || console.log)   (m),
    warn:  (m) => (window.CBLog?.warn  || console.warn)  (m),
    error: (m) => (window.CBLog?.error || console.error) (m),
  };

  // Marker, damit andere Module wissen, dass die UI-Bridge geladen ist
  window.__UI_BRIDGE__ = { version: 'v17.8.3' };
  log.info('[ui-bridge] bereit (v17.8.3)');

  // ------------------------------------------------------------
  // Build-Dock (unverändert – Stub für deinen Build-Button)
  // ------------------------------------------------------------
  function isBuildOpen() {
    return document.body.classList.contains('has-build-open');
  }
  function openBuild() {
    if (isBuildOpen()) return;
    document.body.classList.add('has-build-open');
    window.dispatchEvent(new CustomEvent('cb:build-open'));
  }
  function closeBuild() {
    if (!isBuildOpen()) return;
    document.body.classList.remove('has-build-open');
    window.dispatchEvent(new CustomEvent('cb:build-close'));
  }
  function toggleBuild() {
    (isBuildOpen() ? closeBuild : openBuild)();
  }

  // ------------------------------------------------------------
  // Inspector – saubere Steuerung ohne Fallback-Modal
  // ------------------------------------------------------------

  // Merker, falls Nutzer schon klickt, bevor Core fertig ist
  let wantInspector = false;

  function isInspectorOpen() {
    return document.body.classList.contains('inspector-open');
  }

  function inspectorOpen() {
    const core = window.__INSPECTOR_CORE__;
    if (core?.open) {
      core.open();
      return;
    }
    // Core noch nicht bereit → Wunsch merken + Signal feuern
    wantInspector = true;
    window.dispatchEvent(new CustomEvent('cb:inspector-wanted'));
    log.info('[ui-bridge] Inspector gewünscht, warte auf Core…');
  }

  function inspectorClose() {
    const core = window.__INSPECTOR_CORE__;
    if (core?.close) {
      core.close();
      return;
    }
    // Falls Core noch nicht da ist: Wunsch zurücknehmen
    wantInspector = false;
  }

  function toggleInspector() {
    if (isInspectorOpen()) inspectorClose();
    else inspectorOpen();
  }

  // Wenn der Core sich meldet („bereit“), erfüllen wir evtl. Wunsch
  window.addEventListener('cb:inspector-core-ready', () => {
    log.info('[ui-bridge] Inspector-Core meldet bereit.');
    if (wantInspector) {
      wantInspector = false;
      // kleine Verzögerung, damit Slots/DOM stehen
      setTimeout(() => {
        try { window.__INSPECTOR_CORE__?.open?.(); }
        catch (e) { log.error('[ui-bridge] open() nach ready fehlgeschlagen: ' + e); }
      }, 0);
    }
  }, { once: false });

  // Zur Sicherheit: Falls der Core sehr früh da ist, direkt prüfen
  if (window.__INSPECTOR_CORE__?.api) {
    // einige Implementationen dispatchen das Event nicht noch einmal
    window.dispatchEvent(new CustomEvent('cb:inspector-core-ready'));
  }

  // ------------------------------------------------------------
  // Öffentliche API für deine Buttons (index.html ruft diese auf)
  // ------------------------------------------------------------
  window.GameUI = Object.assign(window.GameUI || {}, {
    // Build
    openBuild, closeBuild, toggleBuild,
    // Inspector
    openInspector:  inspectorOpen,
    closeInspector: inspectorClose,
    toggleInspector,
  });

})();
