/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-mapfix3
 * Zweck   : Zentrale Spielsteuerung (Director) – Map sicher zeichnen,
 *           Gebäude-Platzierung aus Events übernehmen
 * Struktur: STATE → INIT → TICK/RENDER → LOOP → EVENTS
 * ============================================================================
 */

(function(){
  'use strict';

  const TAG  = '[game]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error?? console.error)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  STATE
  // -------------------------------------------------------------------------
  const Game = {
    ctx       : null,      // Canvas-Context
    tileSize  : 64,
    buildings : [],        // Baustellen + fertige Gebäude
    units     : [],        // Träger etc.
    map       : null,
    camera    : null,

    getUnits(){ return this.units; },
    getBuildings(){ return this.buildings; }
  };
  window.Game = Game;     // global verfügbar für andere Module

  // Zeitbasis für dt
  let lastTime = 0;

  // -------------------------------------------------------------------------
  //  INIT – wird von cb:game:start ausgelöst
  // -------------------------------------------------------------------------
  function init(){
    LOG('cb:game:start empfangen → init() startet');

    // 1) Canvas holen
    const canvas = document.querySelector('#game');
    if (!canvas){
      WARN('Kein <canvas id="game"> gefunden!');
      return;
    }
    Game.ctx = canvas.getContext('2d');

    // 2) Map initialisieren (lädt JSON + Tileset) 
    if (window.GameMap?.init){
      try {
        Game.map = GameMap.init(Game);
      } catch(e){
        ERR('GameMap.init Fehler:', e);
      }
    }

    // 3) Units / Carrier
    if (window.GameUnits?.init){
      try {
        Game.GameUnits = GameUnits;
        GameUnits.init(Game);
      } catch(e){
        ERR('GameUnits.init Fehler:', e);
      }
    }

    // 4) Kamera (neues Modul GameCamera bevorzugt)
    if (window.GameCamera?.init){
      try {
        Game.camera = GameCamera;
        GameCamera.init(Game);
      } catch(e){
        ERR('GameCamera.init Fehler:', e);
      }
    } else if (window.Camera?.init){
      try {
        Game.camera = Camera;
        Camera.init(Game);
      } catch(e){
        ERR('Camera.init Fehler:', e);
      }
    }

    // 5) Renderer – optional / defensiv
    if (window.Renderer?.init){
      try {
        Renderer.init(Game);
      } catch(e){
        ERR('Renderer.init Fehler:', e);
      }
    }

    // 6) CarrierRuntime (eigene Schleife) – nur starten, wenn vorhanden
    if (window.CarrierRuntime?.start){
      try {
        CarrierRuntime.start();
      } catch(e){
        ERR('CarrierRuntime.start Fehler:', e);
      }
    }

    LOG('init() fertig → starte Loop');
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  TICK + RENDER
  // -------------------------------------------------------------------------
  function tick(dt){
    // Einheiten bewegen / Jobs abarbeiten
    if (window.GameUnits?.tick){
      try {
        GameUnits.tick(dt);
      } catch(e){
        ERR('GameUnits.tick Fehler:', e);
      }
    }

    // Bauphasen (Baustelle → fertig) 
    if (window.GameConstruction?.tick){
      try {
        GameConstruction.tick(dt);
      } catch(e){
        ERR('GameConstruction.tick Fehler:', e);
      }
    }
  }

  function render(){
    // 1) Terrain + Baustellen/ Gebäude-Overlay direkt aus GameMap
    if (window.GameMap?.render){
      try {
        GameMap.render(Game);   // benutzt Game.ctx + Game.camera 
      } catch(e){
        ERR('GameMap.render Fehler:', e);
      }
    }

    // 2) Optional: zusätzlicher Renderer (Sprites/Overlays/Entities)
    if (window.Renderer?.draw){
      try {
        Renderer.draw(Game);
      } catch(e){
        ERR('Renderer.draw Fehler:', e);
      }
    }

    // 3) Debug-/HUD-Overlays
    if (window.OverlayHooks?.render){
      try {
        OverlayHooks.render();
      } catch(e){
        ERR('[overlay] render Fehler:', e);
      }
    }
  }

  function loop(ts){
    const now = ts || performance.now();
    let dt = (now - lastTime) / 1000;
    if (!Number.isFinite(dt) || dt <= 0) dt = 1/60;
    lastTime = now;

    try { tick(dt);   } catch(e){ ERR('tick() Fehler:', e); }
    try { render();   } catch(e){ ERR('render() Fehler:', e); }

    // kleines Diagnose-Event pro Frame
    try {
      window.dispatchEvent(new CustomEvent('cb:game:tick', {
        detail:{ dt, time: now }
      }));
    } catch(e){
      // nicht kritisch
    }

    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  BUILD-PLACEMENT – cb:build:place → Game.buildings + Construction
  // -------------------------------------------------------------------------

  /**
   * Detail-Objekt aus `cb:build:place` in ein Game-Building umwandeln.
   *
   * Input (von ui-build-hook/input):
   *   {
   *     __src      : "input-v25.11.14",
   *     buildingId : "b.hq",
   *     x, y       : Tile-Koordinaten,
   *     w, h       : Größe in Tiles
   *   }
   */
  function placeBuildingFromEvent(detail){
    const d = detail || {};

    const id = d.id || d.buildingId || d.kind;
    const x  = Number.isFinite(d.x)  ? (d.x|0)  :
               Number.isFinite(d.tx) ? (d.tx|0) : NaN;
    const y  = Number.isFinite(d.y)  ? (d.y|0)  :
               Number.isFinite(d.ty) ? (d.ty|0) : NaN;
    const w  = (d.w|0) || 3;
    const h  = (d.h|0) || 3;

    if (!id || !Number.isFinite(x) || !Number.isFinite(y)){
      WARN('placeBuildingFromEvent → unvollständige Daten', d);
      return;
    }

    // Einfaches Building-Objekt – GameConstruction arbeitet direkt mit Game.buildings
    const building = {
      id,
      x, y, w, h,
      buildStage : 0,       // 0 = SITE
      buildTimer : 0,
      hasMaterial: false
    };

    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }
    Game.buildings.push(building);

    LOG('Building übernommen', building);

    // Ghost / Overlay schließen
    try {
      window.dispatchEvent(new CustomEvent('cb:place:done', {
        detail:{ ok:true, id, x, y, w, h }
      }));
    } catch(e){
      // nicht kritisch
    }
  }

  // -------------------------------------------------------------------------
  //  EVENTS – Start und Platzierung
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', ()=>{
    LOG('registry ready → warte auf cb:game:start');
  });

  window.addEventListener('cb:game:start', ()=>{
    LOG('cb:game:start Event erhalten');
    init();
  });

  // Gebäude-Platzierung vom Build-Ghost / UI
  window.addEventListener('cb:build:place', (ev)=>{
    const detail = ev?.detail || {};
    LOG('cb:build:place', detail);
    try {
      placeBuildingFromEvent(detail);
    } catch(e){
      ERR('placeBuildingFromEvent Fehler:', e);
    }
  });

})();
