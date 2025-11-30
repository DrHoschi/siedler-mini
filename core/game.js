/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-buildjobs1
 * Zweck   : Zentrale Spielsteuerung (Director)
 *           – Map sicher zeichnen
 *           – Gebäude-Platzierung aus Events übernehmen
 *           – Baustellen-Jobs (deliver) an JobEngine übergeben
 * Struktur: STATE → JOBS → INIT → TICK/RENDER → LOOP → EVENTS
 * ============================================================================ */

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
  //  JOB-ENGINE / BAUSTELLEN-JOBS
  // -------------------------------------------------------------------------

  // Laufende Nummer für Jobs (nur für Debug / Logs)
  let jobIdCounter = 0;

  /**
   * Stellt sicher, dass eine JobEngine existiert und eine push()/pop()-API hat.
   *  - Falls schon vorhanden: NICHT überschreiben, nur sanft ergänzen
   *  - Falls nicht vorhanden: minimale Queue implementieren
   */
  function ensureJobEngine(){
    if (!window.JobEngine){
      window.JobEngine = {
        _queue: [],
        push(job){ this._queue.push(job); },
        pop(){ return this._queue.shift(); }
      };
    } else {
      const eng = window.JobEngine;

      // Falls nur add() existiert → push auf add mappen
      if (!eng.push && typeof eng.add === 'function'){
        eng.push = eng.add.bind(eng);
      }
      // Falls weder push noch add existieren → einfache Queue ergänzen
      if (!eng.push && !eng.add){
        eng._queue = eng._queue || [];
        eng.push   = function(job){ this._queue.push(job); };
        if (!eng.pop){
          eng.pop = function(){ return this._queue.shift(); };
        }
      }
    }
    return window.JobEngine;
  }

  /**
   * Erzeugt einen einzelnen Deliver-Job für eine Baustelle.
   *
   * Job-Shape (generisch, damit GameUnits damit arbeiten kann):
   *   {
   *     id           : 'job-deliver-…',
   *     type         : 'deliver',
   *     res          : 'wood' | 'stone' | …
   *     tx, ty       : Tile-Koordinaten (Mitte der Baustelle)
   *     targetX/Y    : float-Koordinaten
   *     buildingId   : Typ-ID (z.B. "b.hq")
   *   }
   */
  function addDeliverJob(building, resKey){
    const eng = ensureJobEngine();

    const bw = Number.isFinite(building.w) ? building.w : 1;
    const bh = Number.isFinite(building.h) ? building.h : 1;

    const centerX = building.x + bw / 2;
    const centerY = building.y + bh / 2;

    const job = {
      id         : 'job-deliver-' + (++jobIdCounter),
      type       : 'deliver',
      res        : String(resKey || 'wood'),
      tx         : centerX | 0,
      ty         : centerY | 0,
      targetX    : centerX,
      targetY    : centerY,
      buildingId : building.id
    };

    if (typeof eng.push === 'function'){
      eng.push(job);
    } else if (typeof eng.add === 'function'){
      eng.add(job);
    }

    LOG('Baustellen-Job erzeugt', job);
    return job;
  }

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
  //  BUILD-PLACEMENT – cb:build:place → Game.buildings + Jobs + Construction
  // -------------------------------------------------------------------------

  /**
   * Detail-Objekt aus `cb:build:place` in ein Game-Building umwandeln.
   *
   * Input (von ui-build-hook/input):
   *   {
   *     __src      : "input-v25.11.14",
   *     buildingId : "b.hq",
   *     x, y       : Tile-Koordinaten,
   *     w, h       : Größe in Tiles,
   *     needs?     : { wood, stone, … }   // optional (vom Registry/Build-UI)
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

    // -----------------------------------------------------------------------
    // Baustellen-Metadaten: needs / delivered / status / drops
    //  - Falls UI/Registry needs mitliefert → übernehmen
    //  - Sonst: kleiner Fallback (z.B. 2 Holz, 1 Stein)
    // -----------------------------------------------------------------------
    const needs = (d.needs && typeof d.needs === 'object')
      ? { ...d.needs }
      : { wood: 2, stone: 1 };   // Fallback, bis echte Kosten angebunden sind

    const delivered = {};
    Object.keys(needs).forEach(k => { delivered[k] = 0; });

    // Einfaches Building-Objekt – GameConstruction arbeitet direkt mit Game.buildings
    const building = {
      id,
      x, y, w, h,
      buildStage : 0,       // 0 = SITE
      buildTimer : 0,
      hasMaterial: false,

      // neue Felder für Baustellen-Logik
      needs,                // Soll-Mengen pro Ressource
      delivered,            // bereits geliefert
      status    : 'pending',// pending | building | done
      dropSlots : []        // Boden-Ressourcen (Holz/Stein-Kugeln)
    };

    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }
    Game.buildings.push(building);

    // -----------------------------------------------------------------------
    // Jobs erzeugen: Für jede Ressource in needs einzelne Deliver-Jobs
    // -----------------------------------------------------------------------
    Object.keys(needs).forEach((resKey)=>{
      const count = needs[resKey] | 0;
      for (let i = 0; i < count; i++){
        addDeliverJob(building, resKey);
      }
    });

    LOG('Building übernommen (mit Needs + Jobs)', building);

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
