/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-modular
 *
 * Zweck   : Zentrale Spielsteuerung (Director)
 *           – Initialisiert Submodule
 *           – Verbindet Events
 *           – tick() + render()
 *
 * Struktur: IMPORTS → STATE → INIT → TICK/RENDER → EVENTS → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[game]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  const Game = {
    tileSize: 64,
    buildings: [],
    units: [],
    map: null,

    getUnits(){ return this.units; }
  };

  window.Game = Game;

  // ------------------------------------------------------------
  // INIT (wird durch bootstrap ausgelöst)
  // ------------------------------------------------------------
  function init(){
    LOG('init()');

    // Map laden / vorbereiten
    if (window.GameMap?.init) Game.map = window.GameMap.init(Game);

    // Units / Carrier-Modul initialisieren
    if (window.GameUnits?.init) window.GameUnits.init(Game);

    // Production starten
    if (window.Production?.tick) {
      setInterval(()=> window.Production.tick(), 2000);
    }

    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // TICK + RENDER
  // ------------------------------------------------------------
  function tick(dt){
    if (window.GameUnits?.tick) window.GameUnits.tick(dt);
  }

  function render(){
    if (window.GameMap?.render) window.GameMap.render(Game);
    if (window.OverlayHooks?.render) window.OverlayHooks.render();
  }

  function loop(ts){
    tick(1/60);
    render();
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------
  window.addEventListener('cb:game:start', ()=> init());

})();
