/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-mapfix2 (Map + Placement-Glue)
 * Zweck   : Zentrale Spielsteuerung (Director) – Map sicher zeichnen
 * Struktur: STATE → INIT → TICK/RENDER → LOOP → EVENTS
 * ============================================================================
 */

(function(){
  'use strict';

  const TAG  = '[game]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  STATE – existierenden Game-Block NICHT zerstören!
  // -------------------------------------------------------------------------
  /**
   * Wichtig:
   *  - core/game.buildings.js legt bereits window.Game.buildings = Buildings.list;
   *  - wir dürfen dieses Array NICHT überschreiben, sonst sieht GameMap keine Gebäude.
   */
  const Game = window.Game || {};

  if (!('ctx'       in Game)) Game.ctx       = null;
  if (!('tileSize'  in Game)) Game.tileSize  = 64;
  if (!('buildings' in Game)) Game.buildings = Game.buildings || []; // evtl. bereits von Buildings belegt
  if (!('units'     in Game)) Game.units     = Game.units || [];
  if (!('map'       in Game)) Game.map       = Game.map || null;
  if (!('camera'    in Game)) Game.camera    = Game.camera || null;

  if (typeof Game.getUnits !== 'function'){
    Game.getUnits = function(){ return this.units; };
  }

  window.Game = Game; // global verfügbar für alle Module

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
        WARN('Renderer.init Fehler:', e);
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
      // GameMap greift intern auf Game.buildings zu
      GameMap.render(Game);
    }

    // 2) Optional: zusätzlicher Renderer (z.B. spätere Sprites/Overlays)
    if (window.Renderer?.draw){
      try {
        Renderer.draw(Game);
      } catch(e){
        WARN('Renderer.draw Fehler:', e);
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
  //  BUILDINGS + PLACEMENT-GLUE
  //  (nimmt cb:build:place vom Input-Ghost entgegen)
  // -------------------------------------------------------------------------

  /**
   * Normalisiere das Detail-Objekt aus cb:build:place.
   * core/core.input-v1.js sendet:
   *   { __src, buildingId, x, y, w, h }
   */
  function normalizePlacement(detail){
    const d = detail || {};
    const id = d.buildingId || d.id;

    return {
      id,
      x: Number.isFinite(d.x) ? d.x|0 : 0,
      y: Number.isFinite(d.y) ? d.y|0 : 0,
      w: Number.isFinite(d.w) ? d.w|0 : 1,
      h: Number.isFinite(d.h) ? d.h|0 : 1,
      state   : 'construction',
      progress: 0
    };
  }

  /**
   * Gebäude aus Platzier-Event wirklich ins Spiel übernehmen.
   * - bevorzugt die Logik aus core/game.buildings.js (Buildings.createFromPlacement)
   * - Fallback: direkt in Game.buildings pushen, damit es wenigstens sichtbar ist
   */
  function placeBuildingFromEvent(detail){
    const p = normalizePlacement(detail);
    if (!p.id){
      WARN('cb:build:place ohne gültige buildingId', detail);
      return;
    }

    LOG('placeBuildingFromEvent', p);

    // Variante A: voller Weg über Buildings-Modul (Baustellen + Produktion + Carrier-Jobs)
    if (window.Buildings && typeof Buildings.createFromPlacement === 'function'){
      const b = Buildings.createFromPlacement(p);

      // Falls Construction-Modul einen Hook hat
      if (b && window.GameConstruction?.onBuildingPlaced){
        try {
          GameConstruction.onBuildingPlaced(b);
        } catch(e){
          WARN('GameConstruction.onBuildingPlaced Fehler:', e);
        }
      }

      return;
    }

    // Variante B: Minimal-Fallback – nur sichtbar machen
    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }
    Game.buildings.push(p);
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

  // Gebäude-Platzierung aus dem Ghost
  window.addEventListener('cb:build:place', (ev)=>{
    const detail = ev?.detail || {};
    LOG('cb:build:place', detail);
    placeBuildingFromEvent(detail);
  });

})();
