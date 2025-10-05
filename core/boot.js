/* ============================================================================
 * Datei    : core/boot.js
 * Projekt  : Neue Siedler
 * Version  : v19.0.0 (2025-10-05)
 * Zweck    : Boot-Kette Assets→Registry→Game
 * ============================================================================
 */

(function(){

  async function loadJSON(path){
    const r = await fetch(path);
    return await r.json();
  }

  async function boot(){
    // 1) Assets ready (hier nur JSON – echte Sprites lädst du in core/asset.js)
    // 2) Registry
    await Registry.init(loadJSON);

    // 3) Game start
    Game.start();
  }

  // Startpanel könnte "Neues Spiel" klicken → dann boot()
  document.getElementById('btn-start')?.addEventListener('click', boot);

  // Falls du direkt starten willst:
  // window.addEventListener('load', boot);

})();
