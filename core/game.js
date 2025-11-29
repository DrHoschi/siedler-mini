/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-mapfix2
 * Zweck   : Zentrale Spielsteuerung (Director) – Map sicher zeichnen,
 *           Gebäude-Platzierung aus Events übernehmen
 * Struktur: STATE → INIT → TICK/RENDER → LOOP → EVENTS
 * ============================================================================
 */

(function(){
  'use strict';

  const TAG = '[game]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  STATE
  // -------------------------------------------------------------------------
  const Game = {
    ctx       : null,      // Canvas-Context
    tileSize  : 64,
    buildings : [],        // einfache Gebäudeliste (Platzhalter + echte Buildings)
    units     : [],        // Einheiten (Träger etc.)
    map       : null,
    camera    : null,

    getUnits(){ return this.units; },
    getBuildings(){ return this.buildings; }
  };
  window.Game = Game;     // global verfügbar für alle Module

  // Zeitbasis für dt im Loop
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

    // 5) Renderer – aktuell optional / defensiv
    //    Achtung: Hier passieren gerne Fehler (Sprites, Entities, usw.).
    //    Deshalb nur aufrufen, wenn vorhanden und Fehler abfangen.
    if (window.Renderer?.init){
      try {
        Renderer.init(Game);
      } catch(e){
        ERR('Renderer.init Fehler:', e);
      }
    }

    // 6) Runtime-Carriers / JobEngine (separater TICK-Loop)
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
      GameMap.render(Game);   // benutzt Game.ctx + Game.camera 
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
    // dt in Sekunden berechnen
    const now = ts || performance.now();
    let dt = (now - lastTime) / 1000;
    if (!Number.isFinite(dt) || dt <= 0) dt = 1/60;
    lastTime = now;

    // Tick/Render hart absichern – Fehler sollen Spiel NICHT stoppen
    try {
      tick(dt);
    } catch(e){
      ERR('tick() Fehler:', e);
    }

    try {
      render();
    } catch(e){
      ERR('render() Fehler:', e);
    }

    // cb:game:tick für FPS/DIAG-Overlay
    try {
      const ev = new CustomEvent('cb:game:tick', { detail:{ dt, time: now } });
      window.dispatchEvent(ev);
    } catch(e){
      // nicht kritisch
    }

    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  BUILD-PLACEMENT – cb:build:place → Game.buildings + Construction
  // -------------------------------------------------------------------------

  /**
   * Nimmt das Detail-Objekt aus `cb:build:place` und erzeugt
   * ein Building-Objekt + startet Bauphase.
   *
   * Erwartete detail-Felder (vom Ghost/Build-Hook):
   *   id          : 'b.hq' / 'b.lumberjack' ...
   *   tx, ty      : Tile-Koordinaten
   *   w, h        : Breite/Höhe in Tiles
   */
  function placeBuildingFromEvent(detail){
    const id = detail.id || detail.buildingId;
    const tx = detail.tx;
    const ty = detail.ty;
    const w  = detail.w || 1;
    const h  = detail.h || 1;

    if (tx == null || ty == null || !id){
      WARN('placeBuildingFromEvent → unvollständige Daten', detail);
      return;
    }

    // Rohdaten für Buildings-Factory
    const src = { id, tx, ty, w, h };

    let building = null;

    // Bevorzugt: zentrale Buildings-Logik (Animationen, Produktion etc.)
    if (window.Buildings?.createFromPlacement){
      try {
        building = Buildings.createFromPlacement(src);
      } catch(e){
        ERR('Buildings.createFromPlacement Fehler:', e);
      }
    }

    // Fallback: sehr simples Objekt, falls oben noch nicht verdrahtet
    if (!building){
      building = {
        id,
        tx, ty, w, h,
        // Für GameMap.render / GameConstruction:
        buildStage : 0,     // 0 = Baustelle 0
        buildTimer : 0
      };
    }

    // In globale Game-Liste aufnehmen
    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }
    Game.buildings.push(building);

    // Bauphasen-Engine informieren
    if (window.GameConstruction?.add){
      try {
        GameConstruction.add(building);
      } catch(e){
        ERR('GameConstruction.add Fehler:', e);
      }
    } else if (window.GameConstruction?.start){
      // ältere Variante
      try {
        GameConstruction.start(building);
      } catch(e){
        ERR('GameConstruction.start Fehler:', e);
      }
    }

    LOG('placeBuildingFromEvent', building);

    // Ghost/Platzier-UI informieren → Ghost schließt sich
    try {
      window.dispatchEvent(new CustomEvent('cb:place:done', {
        detail: { ok:true, id, tx, ty, w, h }
      }));
    } catch(e){
      // nicht kritisch
    }
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
