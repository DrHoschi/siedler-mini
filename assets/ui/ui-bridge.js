/* assets/ui/ui-bridge.js
 * Aufgabe:
 *  - Einheitliche UI-Bridge bereitstellen (Buttons → Aktionen)
 *  - Inspector sicher toggeln (über api-compat), ohne den Inspector zu verändern
 *  - Build-Dock öffnen/schließen + Events dispatchen (cb:build:open/close)
 *  - Keine Eingriffe in Core/Inspector – reine Fassade
 */

(function(){
  const log = (window.CBLog?.info || console.log).bind(console);
  const warn = (window.CBLog?.warn || console.warn).bind(console);

  // DOM-Hold
  let buildDock = null;
  let isBuildOpen = false;

  function ensureDock(){
    if (buildDock && document.body.contains(buildDock)) return buildDock;
    buildDock = document.getElementById('build-dock') || document.getElementById('build-panel'); // Legacy
    if (!buildDock) {
      warn('[ui-bridge] Kein Build-Dock im DOM gefunden (#build-dock / #build-panel).');
    }
    return buildDock;
  }

  function dispatch(name){
    // Doppel-Event-Strategie (Kollisionssicher zu Altcode)
    document.dispatchEvent(new CustomEvent(name));
    const legacy = name.replace(':','-');
    if (legacy !== name) document.dispatchEvent(new CustomEvent(legacy));
  }

  // === Inspector (stabil, über api-compat) ===
  function toggleInspector(){
    try{
      // Bevorzugt api-compat
      if (window.Inspector?.api?.toggle) {
        window.Inspector.api.toggle();
        log('[ui-bridge] Inspector toggle (api-compat).');
        return;
      }
      // Alternativ DOM-Overlay-Hooks (falls api-compat noch nicht geladen)
      const root = document.querySelector('.inspector-root, #inspector-root');
      if (root) {
        const visible = !root.classList.contains('hidden');
        root.classList.toggle('hidden', visible);
        log('[ui-bridge] Inspector toggle (dom overlay).');
        return;
      }
      warn('[ui-bridge] Inspector-API nicht verfügbar.');
    }catch(e){
      warn('[ui-bridge] Inspector toggle Fehler', e);
    }
  }

  // === Build-Dock ===
  function openBuild(){
    const dock = ensureDock();
    if (!dock) return;
    dock.classList.add('open');
    isBuildOpen = true;
    document.body.classList.add('has-build-open');

    // CSS-Var für FAB-Abstand (max Höhe; bleibt responsiv gesteuert in CSS)
    document.documentElement.style.setProperty('--build-dock-max-h', getComputedStyle(dock).maxHeight || '40vh');

    dispatch('cb:build:open');
    log('[ui-bridge] Build-Dock open');
  }

  function closeBuild(){
    const dock = ensureDock();
    if (!dock) return;
    dock.classList.remove('open');
    isBuildOpen = false;
    document.body.classList.remove('has-build-open');
    dispatch('cb:build:close');
    log('[ui-bridge] Build-Dock close');
  }

  function toggleBuild(){
    if (!ensureDock()) return;
    isBuildOpen ? closeBuild() : openBuild();
  }

  // Export
  window.GameUI = Object.assign(window.GameUI || {}, {
    toggleBuild, openBuild, closeBuild,
    toggleInspector
  });

  log('[ui-bridge] bereit (v18.1.0)');
})();
