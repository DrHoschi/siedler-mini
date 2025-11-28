/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-final
 * Zweck   : Zentrale Spielsteuerung (Director)
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[game]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  const Game = {
    ctx: null,
    tileSize: 64,
    buildings: [],
    units: [],
    map: null,

    getUnits(){ return this.units; }
  };
  window.Game = Game;

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  function init(){
    LOG('init()');

    // Canvas holen
    const canvas = document.querySelector('#game');
    Game.ctx = canvas.getContext('2d');

    // Kamera
    if (window.Camera?.init) Camera.init(Game);

    // Map
    if (window.GameMap?.init) Game.map = GameMap.init(Game);

    // Units
    if (window.GameUnits?.init) GameUnits.init(Game);

    // Runtime-Carriers
    if (window.CarrierRuntime?.start) CarrierRuntime.start();

    // Tick starten
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // TICK + RENDER
  // ------------------------------------------------------------
  function tick(dt){
    GameUnits.tick(dt);
    GameConstruction.tick(dt);
  }

  function render(){
    GameMap.render(Game);
    if (window.OverlayHooks?.render) OverlayHooks.render();
  }

  function loop(ts){
    tick(1/60);
    render();
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------
  window.addEventListener('cb:registry:ready', ()=>{
    LOG('registry ready → warte auf cb:game:start');
  });

  window.addEventListener('cb:game:start', ()=> init());
})();
