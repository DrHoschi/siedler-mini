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
  //  BUILDING HELPERS: Tile-Aliases + Entrance-Resolver (Patch D/E)
  // -------------------------------------------------------------------------
  // Ziel:
  //  - building.tx/ty intern immer verfügbar (TopLeft in Tile-Koordinaten)
  //  - entrances (Registry: [{dx,dy}]) → entrancesAbs [{tx,ty,dx,dy}]
  //  - Default-Türtile: building.entranceTx / building.entranceTy
  // Hinweis:
  //  - Wir ändern KEINE Events/Details – nur das interne Building-Objekt.
  //  - Wir überschreiben building.entrances NICHT (bleibt Relativ-Offsets).
  function _ensureBuildingTileAndEntranceFields(b){
    if (!b) return b;

    // 1) TopLeft (Tile)
    if (!Number.isFinite(b.tx)) b.tx = Number.isFinite(b.x) ? (b.x|0) : (b.tx|0);
    if (!Number.isFinite(b.ty)) b.ty = Number.isFinite(b.y) ? (b.y|0) : (b.ty|0);

    // Legacy-Fallback: falls jemand nur tx/ty setzt
    if (!Number.isFinite(b.x)) b.x = (b.tx|0);
    if (!Number.isFinite(b.y)) b.y = (b.ty|0);

    // 2) Entrances absolut ableiten (dx/dy → tx/ty)
    const rel = Array.isArray(b.entrances) ? b.entrances : [];
    const abs = [];
    for (const e of rel){
      if (!e) continue;

      // Unterstützt beide Welten:
      //  a) Relativ: {dx,dy}
      //  b) Absolut: {tx,ty} (falls irgendwo schon umgerechnet)
      const etx = Number(e.tx);
      const ety = Number(e.ty);

      if (Number.isFinite(etx) && Number.isFinite(ety)){
        abs.push({ tx: etx|0, ty: ety|0, dx: (e.dx|0)||0, dy: (e.dy|0)||0 });
      } else {
        const dx = (e.dx|0) || 0;
        const dy = (e.dy|0) || 0;
        abs.push({ tx: (b.tx|0) + dx, ty: (b.ty|0) + dy, dx, dy });
      }
    }

    b.entrancesAbs = abs;

    // Default Entrance
    if (abs.length){
      b.entranceTx = abs[0].tx|0;
      b.entranceTy = abs[0].ty|0;
    } else {
      // defensiver Fallback: südliche Mitte außerhalb des Footprints
      const bw = Math.max(1, (b.w|0) || 1);
      const bh = Math.max(1, (b.h|0) || 1);
      b.entranceTx = (b.tx|0) + ((bw/2)|0);
      b.entranceTy = (b.ty|0) + (bh|0);
    }

    return b;
  }

  // Building lookup (für Jobs, die nur buildingUid tragen)
  Game.getBuildingByUid = function(uid){
    if (!uid) return null;
    const list = Game.buildings || [];
    return list.find(b => b && b.uid === uid) || null;
  };

  // -------------------------------------------------------------------------
  //  JOB-ENGINE / BAUSTELLEN-JOBS
  // -------------------------------------------------------------------------

  // Laufende Nummer für Jobs (nur für Debug / Logs)
  let jobIdCounter = 0;
  let buildingUidCounter = 0;

  // -------------------------------------------------------------------------
  //  AUTO-START-HQ (Start-HQ automatisch platzieren + Kamera fokussieren)
  // -------------------------------------------------------------------------
  let __autoStartHQDone = false;
  const START_HQ_ID   = 'b.hq';
  const START_ZOOM    = (window.__SIEDLER_START_ZOOM != null) ? Number(window.__SIEDLER_START_ZOOM) : 1.20;
  const AUTO_HQ_ENABLED = (window.__SIEDLER_DISABLE_AUTO_HQ !== true);

  function _hasHQ(){
    return Array.isArray(Game.buildings) && Game.buildings.some(b => b && b.id === START_HQ_ID);
  }
  function _pickRandomHQPos(map, w, h, entrance0){
    const grid = map?.grid;
    const cols = map?.cols | 0;
    const rows = map?.rows | 0;
    if (!grid || !cols || !rows) return null;

    // ---------------------------------------------------------------------
    // HQ-Placement Constraints (User-Request):
    //   - Abstand zum Rand (EDGE_MARGIN_TILES)
    //   - Abstand zum Wasser (WATER_MARGIN_TILES)
    //   - Wasser-Tiles NICHT hardcoden → aus map.legend / map.metadata.legend erkennen
    //   - Nicht in Ressourcen-Nodes / nicht in andere Gebäude hinein
    //   - Entrance-Tile muss innerhalb der Map liegen und darf kein Wasser sein
    // ---------------------------------------------------------------------
    const EDGE_MARGIN_TILES  = (window.__SIEDLER_HQ_EDGE_MARGIN_TILES  != null) ? (window.__SIEDLER_HQ_EDGE_MARGIN_TILES|0)  : 6;
    const WATER_MARGIN_TILES = (window.__SIEDLER_HQ_WATER_MARGIN_TILES != null) ? (window.__SIEDLER_HQ_WATER_MARGIN_TILES|0) : 4;

    // Legend (primary: map.legend, fallback: map.metadata.legend)
    const legend = (map && map.legend) ? map.legend : (map?.metadata?.legend || {});
    const waterIds  = new Set();
    const forestIds = new Set();
    const rockIds   = new Set();

    try{
      for (const [k, v] of Object.entries(legend || {})){
        const name = (typeof v === 'string') ? v.toLowerCase() : '';
        const id   = parseInt(k, 10);
        if (!Number.isFinite(id)) continue;

        if (name.includes('water'))  waterIds.add(id);
        if (name.includes('forest')) forestIds.add(id);
        if (name.includes('rock'))   rockIds.add(id);
      }
    } catch(e){ /* silent */ }

    // Fallbacks (nur wenn Legend nichts hergibt)
    if (!waterIds.size)  waterIds.add(8);   // konservativ: alte Demo/Default-Maps
    if (!forestIds.size) forestIds.add(5);
    if (!rockIds.size)   rockIds.add(6);

    function isWater(t){ return waterIds.has(t|0); }
    function isForbiddenTerrain(t){
      const tt = t|0;
      if (waterIds.has(tt)) return true;
      if (forestIds.has(tt)) return true; // Start lieber nicht mitten in Wald
      if (rockIds.has(tt))   return true;
      return false;
    }

    // Blocker-Set aus MapResources (falls schon bereit)
    // + bereits platzierte Gebäude (Start kann z.B. Map-Spawn-Objekte enthalten)
    const blocked = new Set();
    try{
      const nodes = window.MapResources?.state?.nodes;
      if (Array.isArray(nodes)){
        for (const n of nodes){
          const tx = (n.tx|0), ty = (n.ty|0);
          blocked.add(tx+','+ty);
        }
      }
    } catch(e){}

    try{
      if (Array.isArray(Game.buildings)){
        for (const b of Game.buildings){
          if (!b) continue;
          const bx = (b.x|0), by = (b.y|0);
          const bw = (b.w|0) || 1, bh = (b.h|0) || 1;
          for (let yy=by; yy<by+bh; yy++){
            for (let xx=bx; xx<bx+bw; xx++){
              blocked.add(xx+','+yy);
            }
          }
        }
      }
    } catch(e){}

    // Entrance default: Option 1 (entrances[0]) – falls nicht vorhanden: "mittig unten"
    const ent = entrance0 ? { dx:(entrance0.dx|0), dy:(entrance0.dy|0) } : { dx: Math.floor(w/2), dy: h };

    // Aus Sampling-Gründen: berechne grobe Start-Range, damit wir nicht ewig rand/door-out-of-bounds picken
    const minX0 = EDGE_MARGIN_TILES - Math.min(0, ent.dx);
    const minY0 = EDGE_MARGIN_TILES - Math.min(0, ent.dy);
    const maxX0 = (cols - EDGE_MARGIN_TILES - 1) - Math.max((w-1), ent.dx);
    const maxY0 = (rows - EDGE_MARGIN_TILES - 1) - Math.max((h-1), ent.dy);
    if (maxX0 < minX0 || maxY0 < minY0) return null;

    function areaOk(x0,y0){
      const ex = x0 + ent.dx;
      const ey = y0 + ent.dy;

      // Bounds: Footprint + Entrance müssen innerhalb der Map sein
      const minX = Math.min(x0, ex);
      const minY = Math.min(y0, ey);
      const maxX = Math.max(x0 + w - 1, ex);
      const maxY = Math.max(y0 + h - 1, ey);
      if (minX < 0 || minY < 0 || maxX >= cols || maxY >= rows) return false;

      // Rand-Margin
      if (minX < EDGE_MARGIN_TILES || minY < EDGE_MARGIN_TILES) return false;
      if (maxX >= (cols - EDGE_MARGIN_TILES) || maxY >= (rows - EDGE_MARGIN_TILES)) return false;

      // Footprint: Terrain + Blocker
      for (let y=y0; y<y0+h; y++){
        const row = grid[y];
        if (!row) return false;
        for (let x=x0; x<x0+w; x++){
          const t = row[x] | 0;
          if (isForbiddenTerrain(t)) return false;
          if (blocked.has(x+','+y)) return false;
        }
      }

      // Entrance: Terrain + Blocker
      {
        const rowE = grid[ey];
        if (!rowE) return false;
        const te = rowE[ex] | 0;
        if (isForbiddenTerrain(te)) return false;
        if (blocked.has(ex+','+ey)) return false;
      }

      // Wasser-Margin: im erweiterten Bounding-Box-Ring darf kein Wasser liegen
      const wx0 = Math.max(0, minX - WATER_MARGIN_TILES);
      const wy0 = Math.max(0, minY - WATER_MARGIN_TILES);
      const wx1 = Math.min(cols-1, maxX + WATER_MARGIN_TILES);
      const wy1 = Math.min(rows-1, maxY + WATER_MARGIN_TILES);
      for (let y=wy0; y<=wy1; y++){
        const row = grid[y];
        if (!row) return false;
        for (let x=wx0; x<=wx1; x++){
          const t = row[x] | 0;
          if (isWater(t)) return false;
        }
      }

      return true;
    }

    // Random Sampling
    for (let i=0; i<1200; i++){
      const x = (minX0 + Math.random() * (maxX0 - minX0 + 1)) | 0;
      const y = (minY0 + Math.random() * (maxY0 - minY0 + 1)) | 0;
      if (areaOk(x,y)) return { tx:x, ty:y };
    }

    // Fallback: Map-Spawn[0] (wenn vorhanden)
    const s0 = map?.spawns?.[0];
    if (s0 && Number.isFinite(s0.x) && Number.isFinite(s0.y)){
      const x = (s0.x|0), y = (s0.y|0);
      if (areaOk(x,y)) return { tx:x, ty:y };
    }

    // Fallback: Scan (kostet, aber robust)
    for (let y=minY0; y<=maxY0; y++){
      for (let x=minX0; x<=maxX0; x++){
        if (areaOk(x,y)) return { tx:x, ty:y };
      }
    }
    return null;
  }

  function _centerCameraOnBuilding(b){
    try{
      const ts = Game.tileSize || 64;
      const cx = (b.x + (b.w||1)/2) * ts;
      const cy = (b.y + (b.h||1)/2) * ts;
      window.GameCamera?.centerOn?.(cx, cy, { zoom: START_ZOOM });
    } catch(e){}
  }

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

    // Ziel: Entrance-Tile (Türkachel) statt Building-Center,
    // damit Delivery optisch stimmt und wir später Construction/Finished sauber trennen können.
    const def = window.Registry?.getBuilding?.(building.id) || null;
    const entrances = (def && Array.isArray(def.entrances) && def.entrances.length)
      ? def.entrances
      : (Array.isArray(building.entrances) ? building.entrances : null);

    // Ziel: Entrance-Tile (Türkachel) statt Building-Center,
// damit Delivery optisch stimmt und wir später Construction/Finished sauber trennen können.
_ensureBuildingTileAndEntranceFields(building);

// Default: bereits berechnete Türtile
let destTx = (building.entranceTx|0);
let destTy = (building.entranceTy|0);

// Zusätzlicher Fallback: falls jemand building.entranceTx/Ty wieder löscht,
// nehmen wir direkt die Registry-Offests (entrances[0]) oder südliche Mitte.
if (!Number.isFinite(destTx) || !Number.isFinite(destTy)){
  if (entrances && entrances.length){
    destTx = (building.x|0) + (entrances[0].dx|0);
    destTy = (building.y|0) + (entrances[0].dy|0);
  } else {
    destTx = (building.x|0) + Math.floor(bw/2);
    destTy = (building.y|0) + (bh|0);
  }
}

const centerX = building.x + bw / 2;
    const centerY = building.y + bh / 2;

    // Ziel-Koordinate für CarrierRuntime / JobEngine (Tile-Space)
    const dest = {
      x  : destTx + 0.5,
      y  : destTy + 0.5,
      tx : destTx,
      ty : destTy
    };

    const job = {
      id         : 'job-deliver-' + (++jobIdCounter),
      type       : 'deliver',
      res        : String(resKey || 'wood'),
      tx         : dest.tx,
      ty         : dest.ty,
      to         : dest,        // <-- wichtig: assignJob() nutzt job.to.x / job.to.y
      targetX    : centerX,
      targetY    : centerY,
      buildingId : building.id,
      buildingUid: building.uid || null
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
  //  RENDER
  // -------------------------------------------------------------------------

  function render(){
    // 1) Terrain + Baustellen/ Gebäude-Overlay direkt aus GameMap
    if (window.GameMap?.render){
      try {
        GameMap.render(Game);   // benutzt Game.ctx + Game.camera 
      } catch(e){
        ERR('GameMap.render Fehler:', e);
      }
    }

      // 2) Baustellen-Overlays: Drops + Baufortschrittsbalken
  if (window.GameConstruction?.render){
    try {
      GameConstruction.render(Game);
    } catch(e){
      ERR('GameConstruction.render Fehler:', e);
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
  lastTime = now;

  try { render(); } catch(e){ ERR('render() Fehler:', e); }

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
    let w  = (d.w|0) || 3;
    let h  = (d.h|0) || 3;

    if (!id || !Number.isFinite(x) || !Number.isFinite(y)){
      WARN('placeBuildingFromEvent → unvollständige Daten', d);
      return;
    }

    // Registry-Definition (Größe/Entrances) – defensiv
    const def = window.Registry?.getBuilding?.(id) || null;
    if (def && def.size){
      // Wenn Event keine Größe liefert, nehmen wir die Registry-Größe
      if (!(d.w|0) && Number.isFinite(def.size.w)) w = def.size.w|0;
      if (!(d.h|0) && Number.isFinite(def.size.h)) h = def.size.h|0;
    }
    const entrances = (def && Array.isArray(def.entrances)) ? def.entrances : [];

    // HQ: nur 1x erlaubt und sofort fertig (Startpunkt/Spawn)
    if (id === 'b.hq'){
      if (Array.isArray(Game.buildings) && Game.buildings.some(b => b && b.id === 'b.hq')){
        WARN('HQ ist bereits vorhanden – zweites HQ wird ignoriert');
        return;
      }

      const uid = 'bld-' + (++buildingUidCounter);
      const building = {
        uid,
        id,
        x, y, w, h,
        entrances,
        buildStage : 3,
        buildTimer : 0,
        hasMaterial: true,
        needs      : {},
        delivered  : {},
        status     : 'done',
        dropSlots  : []
      };
      _ensureBuildingTileAndEntranceFields(building);
      if (!Array.isArray(Game.buildings)) Game.buildings = [];
      Game.buildings.push(building);

      // Optional: Completion-Event (macht Inspector/Worker-Spawn einfacher)
      try{
        window.dispatchEvent(new CustomEvent('cb:build:complete', { detail: { id:'b.hq', buildingUid: uid, x, y, w, h } }));
      } catch(e){}

      LOG('Start-HQ gesetzt (sofort fertig)', building);
      return;
    }

    const uid = 'bld-' + (++buildingUidCounter);

    // -----------------------------------------------------------------------
    // Baustellen-Metadaten: needs / delivered / status / drops
    //  - Falls UI/Registry needs mitliefert → übernehmen
    //  - Sonst: kleiner Fallback (z.B. 2 Holz, 1 Stein)
    // -----------------------------------------------------------------------
    const needs = (d.needs && typeof d.needs === 'object')
      ? { ...d.needs }
      : (() => {
          // 1) Wenn keine needs mitgeliefert wurden: aus Registry-Kosten ableiten
          try{
            const def = window.Registry?.get?.('buildings', id);
            const cost = def?.cost;
            if (Array.isArray(cost) && cost.length){
              const out = {};
              cost.forEach(c=>{
                const k = String(c?.id || '').trim();
                const q = Number(c?.qty ?? c?.amount ?? 0) | 0;
                if (k && q > 0) out[k] = (out[k]||0) + q;
              });
              if (Object.keys(out).length) return out;
            }
          }catch(e){}
          // 2) Letzter Fallback
          return { wood: 2, stone: 1 };
        })();

    const delivered = {};
    Object.keys(needs).forEach(k => { delivered[k] = 0; });

    // -----------------------------------------------------------------------
    // Ressourcen-Check + „Reservierung“ (ein Store: Production/RegistryValues)
    // -----------------------------------------------------------------------
    try{
      const Prod = window.Production;
      if (Prod && typeof Prod.getResourceValue === 'function' && typeof Prod.addResource === 'function'){
        const missing = {};
        let ok = true;
        Object.keys(needs).forEach((k)=>{
          const need = (needs[k] | 0);
          if (need <= 0) return;
          const have = Number(Prod.getResourceValue(k) || 0);
          if (have < need){
            ok = false;
            missing[k] = { need, have, missing: (need - have) };
          }
        });

        if (!ok){
          // Deny-Event (UI/Inspector kann das später hübsch anzeigen)
          const detail = { buildingId:id, x, y, needs, missing, reason:'notenough' };
          try{ window.dispatchEvent(new CustomEvent('cb:build:deny', { detail })); }catch(_){}
          try{ document.dispatchEvent(new CustomEvent('cb:build:deny', { detail })); }catch(_){}
          WARN('Nicht genug Ressourcen für Bau', detail);
          return;
        }

        // Reservieren (= vom Bestand abziehen). Lieferungen erhöhen den Bestand NICHT,
        // da wir aktuell kein zweites Lager-System wollen.
        Object.keys(needs).forEach((k)=>{
          const need = (needs[k] | 0);
          if (need > 0) Prod.addResource(k, -need, 'build:reserve', id);
        });
      }
    }catch(e){
      WARN('Ressourcen-Reserve fehlgeschlagen', e);
    }

    // Einfaches Building-Objekt – GameConstruction arbeitet direkt mit Game.buildings
    const building = {
      uid,
      id,
      x, y, w, h,
      entrances,
      buildStage : 0,       // 0 = SITE
      buildTimer : 0,
      hasMaterial: false,

      // neue Felder für Baustellen-Logik
      needs,                // Soll-Mengen pro Ressource
      delivered,            // bereits geliefert
      status    : 'pending',// pending | building | done
      dropSlots : []        // Boden-Ressourcen (Holz/Stein-Kugeln)
    };
    _ensureBuildingTileAndEntranceFields(building);

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

  // Map ready → Auto-Start-HQ platzieren (wenn noch keines existiert)
  window.addEventListener('cb:map:ready', (ev)=>{
    if (__autoStartHQDone) return;
    __autoStartHQDone = true;
    if (!AUTO_HQ_ENABLED) return;
    if (_hasHQ()) return;

    const map = Game.map || ev?.detail?.map || null;
    const def = window.Registry?.getBuilding?.(START_HQ_ID) || null;
    const w   = (def && def.size && Number.isFinite(def.size.w)) ? (def.size.w|0) : 3;
    const h   = (def && def.size && Number.isFinite(def.size.h)) ? (def.size.h|0) : 3;

    const ent0 = (def && Array.isArray(def.entrances) && def.entrances.length) ? def.entrances[0] : { dx: Math.floor(w/2), dy: h };
    const pos = _pickRandomHQPos(map, w, h, ent0);
    if (!pos){
      WARN('Auto-Start-HQ: keine Position gefunden (Map/Blocker)');
      return;
    }

    try{
      window.dispatchEvent(new CustomEvent('cb:build:place', {
        detail: { __autoStart:true, buildingId: START_HQ_ID, x: pos.tx, y: pos.ty, w, h }
      }));
    } catch(e){
      WARN('Auto-Start-HQ: cb:build:place dispatch fehlgeschlagen', e);
    }

    // Kamera nachziehen (nächster Tick, damit HQ sicher in Game.buildings steht)
    // Wenn Cinematic aktiv ist, übernimmt core/camera.cinematic.js und wir vermeiden einen Jump.
    setTimeout(()=>{
      const hq = (Array.isArray(Game.buildings) ? Game.buildings.find(b => b && b.id === START_HQ_ID) : null);
      if (!hq) return;

      const cineWants = !!(window.CameraCinematic && typeof window.CameraCinematic.wantsControl === 'function' && window.CameraCinematic.wantsControl());
      if (!cineWants) _centerCameraOnBuilding(hq);
    }, 0);
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



/* ===============================================================
 * v25.12.20-buildmenu-final
 * FINAL: Baumenü-Dock (Toggle) – robust & unabhängig
 * ---------------------------------------------------------------
 * Ziel:
 *  - Der sichtbare Button "#btn-build" muss IMMER ein Menü öffnen.
 *  - Kein Abhängen von Registry-Events / MapReady / Timing.
 *  - Falls Registry vorhanden: nutze Registry.
 *  - Sonst: lade data/buildings.json (Fallback).
 *  - Klick auf Gebäude: emittiere kompatible Events:
 *      - cb:build:place  (detail:{ id, buildingId })
 *      - req:place:begin (detail:{ id, buildingId })
 *
 * Hinweis:
 *  - Dieses Stück ist absichtlich "self contained", um Mischstände
 *    zu überleben.
 * ===============================================================*/
(function buildMenuFinal(){
  'use strict';

  const LOGP = '[buildmenu-final]';

  function log(...a){ try{ console.log(LOGP, ...a); }catch{} }
  function warn(...a){ try{ console.warn(LOGP, ...a); }catch{} }

  function emit(name, detail){
    try{ window.dispatchEvent(new CustomEvent(name, { detail: detail||{} })); }catch{}
    try{ document.dispatchEvent(new CustomEvent(name, { detail: detail||{} })); }catch{}
  }

  function qs(sel){ return document.querySelector(sel); }

  function ensureDock(){
    let dock = qs('#build-dock');
    if (!dock){
      dock = document.createElement('div');
      dock.id = 'build-dock';
      document.body.appendChild(dock);
    }

    // Failsafe-Styles (nur minimal, damit es sichtbar ist)
    dock.style.position = 'fixed';
    dock.style.left = '0';
    dock.style.right = '0';
    dock.style.bottom = '0';
    dock.style.zIndex = '9999';
    dock.style.padding = '10px 12px';
    dock.style.boxSizing = 'border-box';
    dock.style.display = dock.style.display || 'none';

    // Hintergrund: wenn dein CSS es schon macht, überschreibt es das ggf.
    dock.style.background = dock.style.background || 'rgba(210, 190, 155, 0.92)';
    dock.style.borderTop = dock.style.borderTop || '2px solid rgba(60,40,20,0.35)';
    dock.style.backdropFilter = dock.style.backdropFilter || 'blur(6px)';

    // Inhalt container
    let header = dock.querySelector('.bm-header');
    if (!header){
      dock.innerHTML = `
        <div class="bm-header" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div class="bm-title" style="font-weight:700; font-size:16px;">Bauen</div>
          <button class="bm-close" type="button"
            style="width:36px;height:36px;border-radius:18px;border:0;background:rgba(0,0,0,0.25);color:#fff;font-size:18px;line-height:36px;">
            ✕
          </button>
        </div>
        <div class="bm-body" style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
        <div class="bm-hint" style="margin-top:8px; font-size:12px; opacity:0.85;"></div>
      `;
      dock.querySelector('.bm-close')?.addEventListener('click', ()=> setOpen(false));
    }
    return dock;
  }

  function setOpen(open){
    const dock = ensureDock();
    dock.style.display = open ? 'block' : 'none';
    emit(open ? 'cb:build:open' : 'cb:build:close', { src:'buildmenu-final' });
    if (open) ensureFilled();
  }

  function toggle(){
    const dock = ensureDock();
    const isOpen = dock.style.display !== 'none';
    setOpen(!isOpen);
  }

  function normalizeBuildings(raw){
    // Erwartet: array mit {id,name,category,cost,...} oder object map
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw.buildings && Array.isArray(raw.buildings)) return raw.buildings;
    if (raw.items && Array.isArray(raw.items)) return raw.items;
    if (typeof raw === 'object'){
      // object-map → array
      return Object.keys(raw).map(k => ({ id:k, ...(raw[k]||{}) }));
    }
    return [];
  }

  async function loadBuildingsFallback(){
    // Fallback: data/buildings.json
    const url = 'data/buildings.json';
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) throw new Error('HTTP '+res.status+' '+url);
    return await res.json();
  }

  function readRegistryBuildings(){
    const R = window.Registry || window.registry;
    if (!R) return null;

    // häufige Varianten:
    try{
      if (typeof R.list === 'function'){
        const arr = R.list('buildings');
        if (arr && arr.length) return arr;
      }
    }catch{}

    try{
      if (R.buildings){
        return R.buildings;
      }
    }catch{}

    return null;
  }

  let _fillPromise = null;
  function ensureFilled(){
    const dock = ensureDock();
    const body = dock.querySelector('.bm-body');
    const hint = dock.querySelector('.bm-hint');
    if (!body || !hint) return;

    // nur einmal parallel füllen
    if (_fillPromise) return;

    _fillPromise = (async ()=>{
      hint.textContent = 'Lade Gebäude…';
      body.innerHTML = '';

      let data = null;

      // 1) Registry
      try{
        const reg = readRegistryBuildings();
        if (reg){
          data = reg;
          log('Gebäude aus Registry geladen.');
        }
      }catch(e){ warn('Registry read failed', e); }

      // 2) JSON-Fallback
      if (!data){
        try{
          data = await loadBuildingsFallback();
          log('Gebäude aus data/buildings.json geladen.');
        }catch(e){
          warn('buildings.json konnte nicht geladen werden:', e);
        }
      }

      const buildings = normalizeBuildings(data);
      if (!buildings.length){
        hint.textContent = 'Keine Gebäude gefunden (Registry/JSON leer).';
        return;
      }

      hint.textContent = `${buildings.length} Gebäude verfügbar.`;

      // Simple: eine Button-Liste
      for (const b of buildings){
        const id = b.id || b.buildingId || b.key;
        const label = b.name || b.title || id || 'building';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.style.padding = '8px 10px';
        btn.style.borderRadius = '10px';
        btn.style.border = '1px solid rgba(0,0,0,0.25)';
        btn.style.background = 'rgba(255,255,255,0.75)';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', ()=>{
          const buildingId = id;
          if (!buildingId) return;
          emit('cb:build:place', { id: buildingId, buildingId });
          emit('req:place:begin', { id: buildingId, buildingId });
          log('place event', buildingId);
        });

        body.appendChild(btn);
      }
    })().finally(()=>{ _fillPromise = null; });
  }

  function bindButton(){
    const btn = qs('#btn-build');
    if (!btn){
      warn('Button #btn-build nicht gefunden.');
      return;
    }

    const handler = (ev)=>{
      ev && ev.preventDefault && ev.preventDefault();
      ev && ev.stopPropagation && ev.stopPropagation();
      toggle();
    };

    // robust: pointerdown + click + touchend
    btn.addEventListener('pointerdown', handler, { passive:false });
    btn.addEventListener('click', handler, { passive:false });
    btn.addEventListener('touchend', handler, { passive:false });

    log('#btn-build gebunden (pointerdown/click/touchend).');
  }

  // Bind sofort + nach DOM
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindButton, { once:true });
  } else {
    bindButton();
  }

  // Auch per Event bedienbar
  window.addEventListener('cb:buildmenu:open', ()=>setOpen(true));
  window.addEventListener('cb:buildmenu:close', ()=>setOpen(false));
  window.addEventListener('cb:buildmenu:toggle', ()=>toggle());

})();
