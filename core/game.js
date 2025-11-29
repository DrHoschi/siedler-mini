/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-mapfix1
 * Zweck   : Zentrale Spielsteuerung (Director) – Map sicher zeichnen
 * Struktur: STATE → INIT → TICK/RENDER → LOOP → EVENTS
 * ============================================================================
 */

(function(){
  'use strict';

  const TAG = '[game]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  STATE
  // -------------------------------------------------------------------------
  const Game = {
    ctx      : null,      // Canvas-Context
    tileSize : 64,
    buildings: [],        // einfache Gebäudeliste (Platzhalter)
    units    : [],
    map      : null,
    camera   : null,

    getUnits(){ return this.units; }
  };
  window.Game = Game;     // global verfügbar für alle Module

  // -------------------------------------------------------------------------
  //  INIT – wird von cb:game:start ausgelöst
  // -------------------------------------------------------------------------
  function init(){
    LOG('cb:game:start empfangen → init() startet');

    // 1) Canvas holen
    const canvas = document.querySelector('#game');
    if (!canvas){
      console.warn(TAG, 'Kein <canvas id="game"> gefunden!');
      return;
    }
    Game.ctx = canvas.getContext('2d');

    // 2) Map initialisieren (lädt JSON + Tileset) 
    if (window.GameMap?.init){
      Game.map = GameMap.init(Game);
    }

    // 3) Units / Carrier
    if (window.GameUnits?.init){
      Game.GameUnits = GameUnits;
      GameUnits.init(Game);
    }

    // 4) Kamera (neues Modul GameCamera bevorzugt)
    if (window.GameCamera?.init){
      Game.camera = GameCamera;
      GameCamera.init(Game);
    } else if (window.Camera?.init){
      Game.camera = Camera;
      Camera.init(Game);
    }

    // 5) Renderer (optional – Map zeichnet trotzdem direkt über GameMap.render)
    if (window.Renderer?.init){
      try {
        Renderer.init(Game);
      } catch(e){
        console.warn(TAG, 'Renderer.init Fehler:', e);
      }
    }

    // 6) Runtime-Carriers / JobEngine
    if (window.CarrierRuntime?.start){
      CarrierRuntime.start();
    }

    LOG('init() fertig → starte Loop');
    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  TICK + RENDER
  // -------------------------------------------------------------------------
  function tick(dt){
    // Einheiten bewegen / Jobs abarbeiten
    if (window.GameUnits?.tick){
      GameUnits.tick(dt);
    }

    // Bauphasen (Baustelle → fertig) 
    if (window.GameConstruction?.tick){
      GameConstruction.tick(dt);
    }
  }

  function render(){
    // 1) Terrain + Baustellen/ Gebäude-Overlay direkt aus GameMap
    if (window.GameMap?.render){
      GameMap.render(Game);   // benutzt Game.ctx + GameCamera 
    }

    // 2) Optional: zusätzlicher Renderer (z.B. spätere Sprites/Overlays)
    if (window.Renderer?.draw){
      try {
        Renderer.draw(Game);
      } catch(e){
        console.warn(TAG, 'Renderer.draw Fehler:', e);
      }
    }

    // 3) Debug-/HUD-Overlays
    if (window.OverlayHooks?.render){
      OverlayHooks.render();
    }
  }

  function loop(ts){
    // Feste Schrittweite, reicht für jetzt
    tick(1/60);
    render();
    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  EVENTS – Start erst, wenn Registry + UI fertig sind
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', ()=>{
    LOG('registry ready → warte auf cb:game:start');
  });

  window.addEventListener('cb:game:start', ()=>{
    LOG('cb:game:start Event erhalten');
    init();
  });

})();
