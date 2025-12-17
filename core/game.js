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
  window.Game = Game;

  // ========================================================================
  // PLACEMENT / WALKABILITY RULES (Step 5 – konsolidiert)
  // ------------------------------------------------------------------------
  // Ziel:
  // - UI-Ghost (core/game.place.js) fragt Game.canPlaceBuildingAt()
  // - Build-Confirm (cb:build:place) validiert NOCHMAL hart (kein "Cheat-Place")
  // - Auto-HQ nutzt dieselben Regeln (kein 2. Regelwerk, kein Hardcode)
  //
  // Außerdem:
  // - Kleine Ressourcen (tree/stone stage===0) sind "räumbar" durch Bauarbeiter:
  //   Beim Platzieren werden sie automatisch entfernt (MapResources.clearAt).
  // - Große Bäume (stage===3) bleiben blockierend (später Holzfäller).
  // - Große Steine (stage===3) bleiben blockierend (dauerhaft).
  // - Wasser bleibt blockierend, außer spezielle Gebäude (Fischer: 1 Wasser-Tile).
  //
  // Debug:
  // - Letzte Entscheidung liegt immer in window.__SIEDLER_LAST_PLACE_INFO
  // ========================================================================

  function _legendSets(map){
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
    }catch(e){ /* silent */ }

    // Fallbacks (nur falls Legend fehlt/leer ist)
    if (!waterIds.size)  waterIds.add(8); // konservativ
    if (!forestIds.size) forestIds.add(9);
    if (!rockIds.size)   rockIds.add(7);

    return { waterIds, forestIds, rockIds };
  }

  function _tileId(map, tx, ty){
    const cols = map?.cols|0;
    const grid = map?.grid;
    if (!grid || !cols) return -1;
    const i = (ty|0)*cols + (tx|0);
    return (i>=0 && i<grid.length) ? (grid[i]|0) : -1;
  }

  function _isWater(map, tx, ty, sets){
    const id = _tileId(map, tx, ty);
    return sets.waterIds.has(id);
  }

  function _isInside(map, tx, ty){
    const cols = map?.cols|0, rows = map?.rows|0;
    return (tx>=0 && ty>=0 && tx<cols && ty<rows);
  }

  function _footprintTiles(tx, ty, w, h){
    const out = [];
    for (let yy=0; yy<h; yy++){
      for (let xx=0; xx<w; xx++){
        out.push({ tx: (tx+xx)|0, ty: (ty+yy)|0 });
      }
    }
    return out;
  }

  function _buildingOverlapsExisting(tx, ty, w, h){
    if (!Array.isArray(Game.buildings)) return false;
    const a = { x:tx, y:ty, w, h };
    for (const b of Game.buildings){
      if (!b) continue;
      const bx = (b.tx ?? b.x ?? 0)|0;
      const by = (b.ty ?? b.y ?? 0)|0;
      const bw = (b.w|0)||1;
      const bh = (b.h|0)||1;

      // Baustellen sind begehbar, aber sie sind trotzdem ein Footprint-Objekt.
      // Fürs Bauen blockieren wir auch Baustellen (sonst kann man stapeln).
      const overlap = !(a.x + a.w <= bx || bx + bw <= a.x || a.y + a.h <= by || by + bh <= a.y);
      if (overlap) return true;
    }
    return false;
  }

  function _collectClearablesForFootprint(buildingId, tiles){
    const MR = window.MapResources;
    if (!MR || typeof MR.nodeAt !== 'function') return [];
    const clear = [];
    for (const t of tiles){
      const n = MR.nodeAt(t.tx, t.ty);
      if (!n) continue;

      // nur bestimmte Ressourcen dürfen "automatisch" geräumt werden
      const isSmall = (n.stage|0) === 0;

      if (n.kind === 'tree'){
        if (isSmall) clear.push({ tx:t.tx, ty:t.ty, kind:'tree', id:n.id });
        else return [{ deny:true, reason:'tree_big', tx:t.tx, ty:t.ty, node:n }];
      }
      if (n.kind === 'stone'){
        if (isSmall) clear.push({ tx:t.tx, ty:t.ty, kind:'stone', id:n.id });
        else return [{ deny:true, reason:'stone_big', tx:t.tx, ty:t.ty, node:n }];
      }
      if (n.kind === 'fish'){
        // Fisch-Nodes blockieren Bauplätze (außer wir definieren später Pier/Boat etc.)
        return [{ deny:true, reason:'fish_node', tx:t.tx, ty:t.ty, node:n }];
      }
    }
    return clear;
  }

  /**
   * Kern-Regel: Darf ein Gebäude an (tx,ty) platziert werden?
   * @returns {boolean} ok
   */
  Game.canPlaceBuildingAt = function(buildingId, tx, ty, w, h){
    const info = Game.getPlaceInfo(buildingId, tx, ty, w, h);
    return !!info.ok;
  };

  /**
   * Liefert Detail-Info (für Debug/Inspector/Reason-Codes).
   */
  Game.getPlaceInfo = function(buildingId, tx, ty, w, h){
    const map = Game.map || window.Map || window.__MAP__;
    const sets = _legendSets(map);

    tx = tx|0; ty = ty|0;
    w  = (w|0)||1; h = (h|0)||1;

    const tiles = _footprintTiles(tx, ty, w, h);

    // 1) Bounds
    for (const t of tiles){
      if (!_isInside(map, t.tx, t.ty)){
        return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'out_of_bounds', buildingId, tx, ty, w, h });
      }
    }

    // 2) Nur ein HQ erlauben
    if (buildingId === 'b.hq' && _hasHQ()){
      return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'already_has_hq', buildingId, tx, ty, w, h });
    }

    // 3) Gebäude-Überlappung
    if (_buildingOverlapsExisting(tx, ty, w, h)){
      return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'overlap_building', buildingId, tx, ty, w, h });
    }

    // 4) Terrain-Regeln (Wasser)
    let waterCount = 0;
    for (const t of tiles){
      if (_isWater(map, t.tx, t.ty, sets)) waterCount++;
    }

    // Sonderfall: Fischer darf 1 Wasser-Tile "berühren"
    if (buildingId === 'b.fisher'){
      if (waterCount > 1){
        return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'too_much_water', buildingId, tx, ty, w, h, waterCount });
      }
      // entrance sollte nicht im Wasser liegen
      // (entrances: [{dx,dy}] → absolute = tx+dx, ty+dy)
      const def = (window.Registry?.buildings && window.Registry.buildings[buildingId]) || null;
      const e0  = def?.entrances?.[0] || { dx:1, dy:h }; // fallback
      const ex = (tx + (e0.dx|0))|0;
      const ey = (ty + (e0.dy|0))|0;
      if (_isWater(map, ex, ey, sets)){
        return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'entrance_in_water', buildingId, tx, ty, w, h, ex, ey });
      }
    } else {
      if (waterCount > 0){
        return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'water', buildingId, tx, ty, w, h, waterCount });
      }
    }

    // 5) Ressourcen auf Footprint
    const clear = _collectClearablesForFootprint(buildingId, tiles);
    if (clear.length && clear[0]?.deny){
      return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:clear[0].reason, buildingId, tx, ty, w, h, at:{tx:clear[0].tx, ty:clear[0].ty} });
    }

    // 6) HQ-Sondermargins (Rand/Wasser-Abstand) – nur fürs AutoHQ/Start-HQ kritisch
    // (beim manuellen HQ-Bau kann man das später auch erzwingen, aktuell nur basic)
    if (buildingId === 'b.hq'){
      const EDGE_MARGIN_TILES  = (window.__SIEDLER_HQ_EDGE_MARGIN_TILES  != null) ? (window.__SIEDLER_HQ_EDGE_MARGIN_TILES|0)  : 6;
      const WATER_MARGIN_TILES = (window.__SIEDLER_HQ_WATER_MARGIN_TILES != null) ? (window.__SIEDLER_HQ_WATER_MARGIN_TILES|0) : 4;

      const cols = map?.cols|0, rows = map?.rows|0;
      if (tx < EDGE_MARGIN_TILES || ty < EDGE_MARGIN_TILES || (tx+w) > (cols-EDGE_MARGIN_TILES) || (ty+h) > (rows-EDGE_MARGIN_TILES)){
        return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'hq_edge_margin', buildingId, tx, ty, w, h });
      }

      // Wasser-Margin: wir prüfen um den Footprint herum
      for (let yy = ty - WATER_MARGIN_TILES; yy < ty + h + WATER_MARGIN_TILES; yy++){
        for (let xx = tx - WATER_MARGIN_TILES; xx < tx + w + WATER_MARGIN_TILES; xx++){
          if (!_isInside(map, xx, yy)) continue;
          if (_isWater(map, xx, yy, sets)){
            return (window.__SIEDLER_LAST_PLACE_INFO = { ok:false, reason:'hq_water_margin', buildingId, tx, ty, w, h });
          }
        }
      }
    }

    return (window.__SIEDLER_LAST_PLACE_INFO = { ok:true, buildingId, tx, ty, w, h, clear });
  };

     // global verfügbar für andere Module

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
      if (areaOk(x,y)) // Letzte Instanz: dieselbe Regel-Engine wie UI/Build-Confirm verwenden
        // (damit AutoHQ nicht in "Spezialregeln" abdriftet)
        const info = (Game && typeof Game.getPlaceInfo === 'function')
          ? Game.getPlaceInfo('b.hq', x, y, w, h)
          : { ok:true };

        if (info.ok){
          return { tx:x, ty:y };
        }
        // sonst weiter suchen
    }

    // Fallback: Map-Spawn[0] (wenn vorhanden)
    const s0 = map?.spawns?.[0];
    if (s0 && Number.isFinite(s0.x) && Number.isFinite(s0.y)){
      const x = (s0.x|0), y = (s0.y|0);
      if (areaOk(x,y)) // Letzte Instanz: dieselbe Regel-Engine wie UI/Build-Confirm verwenden
        // (damit AutoHQ nicht in "Spezialregeln" abdriftet)
        const info = (Game && typeof Game.getPlaceInfo === 'function')
          ? Game.getPlaceInfo('b.hq', x, y, w, h)
          : { ok:true };

        if (info.ok){
          return { tx:x, ty:y };
        }
        // sonst weiter suchen
    }

    // Fallback: Scan (kostet, aber robust)
    for (let y=minY0; y<=maxY0; y++){
      for (let x=minX0; x<=maxX0; x++){
        if (areaOk(x,y)) // Letzte Instanz: dieselbe Regel-Engine wie UI/Build-Confirm verwenden
        // (damit AutoHQ nicht in "Spezialregeln" abdriftet)
        const info = (Game && typeof Game.getPlaceInfo === 'function')
          ? Game.getPlaceInfo('b.hq', x, y, w, h)
          : { ok:true };

        if (info.ok){
          return { tx:x, ty:y };
        }
        // sonst weiter suchen
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

    // --------------------------------------------------------------
    // Placement-Regeln (Step 5): immer prüfen (auch beim Confirm)
    // --------------------------------------------------------------
    const placeInfo = (Game && typeof Game.getPlaceInfo === 'function')
      ? Game.getPlaceInfo(id, x, y, w, h)
      : { ok:true };

    if (!placeInfo.ok){
      const detail = { buildingId:id, x, y, w, h, reason: placeInfo.reason || 'invalid' };
      try{ window.dispatchEvent(new CustomEvent('cb:build:deny', { detail })); }catch(_){}
      try{ document.dispatchEvent(new CustomEvent('cb:build:deny', { detail })); }catch(_){}
      WARN('Build DENY (Placement)', detail);
      return;
    }

    // --------------------------------------------------------------
    // Baustellen-Clearing: kleine Ressourcen entfernen (stage===0)
    // --------------------------------------------------------------
    if (Array.isArray(placeInfo.clear) && placeInfo.clear.length){
      const MR = window.MapResources;
      if (MR && typeof MR.clearAt === 'function'){
        const removedAll = [];
        for (const c of placeInfo.clear){
          const removed = MR.clearAt(c.tx, c.ty, { onlyKinds:[c.kind] }) || [];
          removedAll.push(...removed);
        }
        if (removedAll.length){
          const detail = { buildingId:id, x, y, w, h, removed: removedAll.map(r=>({id:r.id, kind:r.kind, stage:r.stage})) };
          try{ window.dispatchEvent(new CustomEvent('cb:build:cleared', { detail })); }catch(_){}
          try{ document.dispatchEvent(new CustomEvent('cb:build:cleared', { detail })); }catch(_){}
          LOG('Baustelle räumt kleine Ressourcen', detail);
        }
      }
    }

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
