<script>
/* ============================================================================
 * Datei   : ui/compat/build-bridge-shim.js
 * Zweck   : Kompatibilität für alte "ui-bridge", die #build-panel & window.UIBuild erwartet.
 * Hinweis : Unser neues System nutzt #build-dock + Events. Wir geben der Bridge
 *           nur eine ruhige Oberfläche, ohne die neue Logik zu stören.
 * ============================================================================ */

(function () {
  // 1) Alias-Container: falls die Legacy-Bridge nur auf Existenz prüft
  if (!document.getElementById('build-panel')) {
    const alias = document.createElement('div');
    alias.id = 'build-panel';
    // Unsichtbar; stört Layout nicht:
    alias.style.cssText = 'display:none !important;';
    document.body.appendChild(alias);
  }

  // 2) Minimal-API: window.UIBuild mit open/close → mapped auf unsere Events
  if (!window.UIBuild) {
    window.UIBuild = {
      open()  { dispatchEvent(new CustomEvent('cb:build:open',  { detail:{ from:'legacy-bridge' } })); },
      close() { dispatchEvent(new CustomEvent('cb:build:close', { detail:{ from:'legacy-bridge' } })); }
    };
  }
})();
</script>
