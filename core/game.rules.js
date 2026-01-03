/* ============================================================================
 * Datei   : core/game.rules.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.17-patchF
 * Zweck   : EIN zentrales Regelwerk für
 *           - Walkability / Blocker (Pathfinding, LOS, Movement)
 *           - Placement-Regeln (Ghost, Confirm)
 *           - Auto-HQ-Spawn (Start-Flow)
 * ---------------------------------------------------------------------------
 * Warum?
 *  - Wir hatten mehrere teils widersprüchliche Blocker-Quellen (Hardcodes,
 *    Legend-Fallbacks, unterschiedliche Checks in AutoHQ / Placement / A*).
 *  - Diese Datei bündelt die Regeln, sodass ALLE Systeme dieselbe Quelle
 *    verwenden können.
 *
 * Registry-Integration (Step 5 / Patch F):
 *  - pro Building (Registry/buildings.json):
 *      blockedTerrains : ["water", ...]    // Terrain-Namen/Token
 *      minMargin       : { edge:6, water:4 } // optional
 *
 * Hinweise:
 *  - Keine Abhängigkeit von Rendering.
 *  - Defensiv: funktioniert auch ohne Legend/Registry (Fallbacks bleiben).
 * ========================================================================== */

(() => {
  'use strict';

  const TAG  = '[rules]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const VERSION = 'v25.12.17-patchF';

  // -------------------------------------------------------------------------
  //  INTERNAL CACHE (Legend → TileId-Sets, Nodes → Set)
  // -------------------------------------------------------------------------
  const _cache = {
    legendRef: null,
    waterIds : null,
    // nameKey → Set(tileId)
    nameSets : new Map(),

    nodesRef : null,
    nodeSet  : null,
    nodeHash : 0
  };

  // -------------------------------------------------------------------------
  //  HELPERS
  // -------------------------------------------------------------------------
  const toInt = (v, fb=0)=> (Number.isFinite(+v) ? (+v|0) : fb);

  function _getMapState(){
    return window.GameMap?._state || window.Game?.map || null;
  }

  // -----------------------------------------------------------------------
  //  GRID ACCESS (FIX)
  //  In v4.6 war isWaterTile() bereits auf _getGrid(map) umgestellt,
  //  aber die Helper-Funktion fehlte komplett -> ReferenceError.
  //  Ergebnis: Wasser-Checks "fallen durch" und Systeme (z.B. Animals)
  //  laufen trotzdem ins Wasser.
  //
  //  Erwartete Map-Struktur (GameMap._state):
  //    map.grid[y][x] = tileId
  // -----------------------------------------------------------------------
  function _getGrid(map){
    try{
      if (!map) return null;
      // Standard: core/game.map.js setzt Mod.grid
      if (map.grid) return map.grid;
      // seltene Varianten / Legacy:
      if (map.tiles) return map.tiles;
      if (map.tileGrid) return map.tileGrid;
      if (map.layers && map.layers[0] && map.layers[0].grid) return map.layers[0].grid;
      // falls aus Versehen der Wrapper statt _state übergeben wird
      if (map._state && map._state.grid) return map._state.grid;
    }catch(e){ /* ignore */ }
    return null;
  }

  function _getLegend(map){
    return map?.legend || map?.metadata?.legend || null;
  }

  function _legendNameForTileId(map, tid){
    const legend = _getLegend(map);
    if (!legend) return null;
    const v = (legend[String(tid)] ?? legend[tid]) ?? null;
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object'){
      return v.name || v.label || v.type || v.id || null;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  //  WATER HELPER (für Ressourcenspawn/Production – ohne harte Tile-IDs)
  // -------------------------------------------------------------------------
  function isWaterTile(tx, ty){
    const map  = _getMapState();
    const grid = _getGrid(map);
    const cols = toInt(map?.cols ?? map?.width, 0);
    const rows = toInt(map?.rows ?? map?.height, 0);
    if (!grid || !(cols>0) || !(rows>0)) return false;
    if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return false;
    const tid = grid?.[ty]?.[tx];
    return _waterIdSet(map).has(toInt(tid, 0));
  }

  function _ensureLegendCache(map){
    const legend = _getLegend(map);
    if (!legend) return false;
    if (_cache.legendRef === legend) return true;

    // Reset caches, wenn Legend wechselt
    _cache.legendRef = legend;
    _cache.waterIds  = null;
    _cache.nameSets  = new Map();
    return true;
  }

  // Synonyme (de/en) – sehr tolerant.
  const _ALIASES = {
    water : ['water','wasser','ocean','sea','river','fluss','lake','see','teich','stream','meer'],
    forest: ['forest','wald','wood','woods'],
    stone : ['stone','rock','stein','felsen','quarry','mountain','berg'],
    sand  : ['sand','sandy','strand'],
    road  : ['road','path','weg','pfad','track']
  };

  function _buildIdSetBySubstrings(map, substrings){
    const out = new Set();
    const legend = _getLegend(map);
    if (!legend || typeof legend !== 'object') return out;

    const subs = (Array.isArray(substrings) ? substrings : [substrings])
      .map(s => String(s || '').toLowerCase())
      .filter(Boolean);
    if (!subs.length) return out;

    for (const [k,v] of Object.entries(legend)){
      const id = parseInt(k, 10);
      if (!Number.isFinite(id)) continue;
      const name = (typeof v === 'string') ? v : (v?.name || v?.label || v?.type || v?.id || '');
      const s = String(name || '').toLowerCase();
      if (!s) continue;
      for (const sub of subs){
        if (s.includes(sub)) { out.add(id); break; }
      }
    }

    return out;
  }

  function _getWaterIds(map){
    _ensureLegendCache(map);
    if (_cache.waterIds && _cache.waterIds.size) return _cache.waterIds;

    // 1) Legend-basierte Erkennung
    const ids = _buildIdSetBySubstrings(map, _ALIASES.water);

    // 2) Hard-Fallback (konservativ)
    if (!ids.size) ids.add(8);

    _cache.waterIds = ids;
    return ids;
  }

  function _getNameSet(map, token){
    _ensureLegendCache(map);

    const t = String(token || '').toLowerCase().trim();
    if (!t) return new Set();

    // Cache-Key: Token
    if (_cache.nameSets.has(t)) return _cache.nameSets.get(t);

    const subs = _ALIASES[t] || [t];
    const set = _buildIdSetBySubstrings(map, subs);
    _cache.nameSets.set(t, set);
    return set;
  }

  function _getNodeSet(){
    const nodes = window.MapResources?.state?.nodes || null;
    if (!Array.isArray(nodes) || !nodes.length) {
      _cache.nodesRef = nodes;
      _cache.nodeSet  = null;
      _cache.nodeHash = 0;
      return null;
    }

    // Sehr einfache Änderungs-Heuristik
    const hash = nodes.length;
    if (_cache.nodesRef === nodes && _cache.nodeSet && _cache.nodeHash === hash) return _cache.nodeSet;

    const s = new Set();
    for (const n of nodes){
      if (!n) continue;
      const x = toInt(n.x, NaN);
      const y = toInt(n.y, NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      s.add(`${x},${y}`);
    }

    _cache.nodesRef = nodes;
    _cache.nodeSet  = s;
    _cache.nodeHash = hash;
    return s;
  }

  // Liefert Map: "x,y" -> node (für differenzierte Regeln: tree vs stone vs fish)
  function _getNodeMap(){
    const nodes = window.MapResources?.state?.nodes || null;
    if (!Array.isArray(nodes) || !nodes.length) return null;
    const m = new Map();
    for (const n of nodes){
      if (!n) continue;
      const x = toInt(n.x, NaN);
      const y = toInt(n.y, NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      m.set(`${x},${y}`, n);
    }
    return m;
  }

  function _hasDoneLumberjack(){
    const buildings = (window.Game?.getBuildings?.() || window.Game?.buildings || window.Buildings?.list || []);
    if (!Array.isArray(buildings) || !buildings.length) return false;
    for (const b of buildings){
      if (!b) continue;
      if (b.id === 'b.lumberjack' && _isBuildingDone(b)) return true;
    }
    return false;
  }

  function _isBuildingDone(b){
    const stage = (typeof b?.buildStage === 'number') ? b.buildStage : -1;
    return (stage >= 3) || (b?.status === 'done') || (b?.buildPhase === 'complete') || (b?.buildPhase === 3);
  }

  function _buildingEntranceTilesAbs(b){
    if (!b) return [];
    // Schnellpfad, falls schon berechnet
    if (Number.isFinite(b.entranceTx) && Number.isFinite(b.entranceTy)){
      return [{ x: b.entranceTx|0, y: b.entranceTy|0 }];
    }
    const bx = toInt(b.x, NaN), by = toInt(b.y, NaN);
    if (!Number.isFinite(bx) || !Number.isFinite(by)) return [];

    // 1) b.entrances (relativ)
    if (Array.isArray(b.entrances) && b.entrances.length){
      return b.entrances
        .filter(e => e && Number.isFinite(e.dx) && Number.isFinite(e.dy))
        .map(e => ({ x: (bx + (e.dx|0))|0, y: (by + (e.dy|0))|0 }));
    }

    // 2) Registry-Fallback
    try{
      const def = window.Registry?.getBuilding?.(b.id) || null;
      const e0 = def?.entrances?.[0];
      if (e0 && Number.isFinite(e0.dx) && Number.isFinite(e0.dy)){
        return [{ x: (bx + (e0.dx|0))|0, y: (by + (e0.dy|0))|0 }];
      }
    }catch(_){ /* ignore */ }

    return [];
  }

  // -------------------------------------------------------------------------
  //  WALKABILITY / NAV BLOCKER (für A*, LOS, Movement)
  // -------------------------------------------------------------------------
  function isNavBlocked(tx, ty, allow){
    const map = _getMapState();
    const cols = toInt(map?.cols, 0);
    const rows = toInt(map?.rows, 0);

    // Start/Ziel/AllowRects immer begehbar (sonst "im Gebäude gefangen")
    if (allow){
      const sx = allow?.start?.x, sy = allow?.start?.y;
      const gx = allow?.goal?.x,  gy = allow?.goal?.y;
      if (Number.isFinite(sx) && Number.isFinite(sy) && tx === (sx|0) && ty === (sy|0)) return false;
      if (Number.isFinite(gx) && Number.isFinite(gy) && tx === (gx|0) && ty === (gy|0)) return false;
      if (Array.isArray(allow?.rects)){
        for (const r of allow.rects){
          if (!r) continue;
          if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return false;
        }
      }
    }

    // Bounds
    if (tx < 0 || ty < 0) return true;
    if (cols && tx >= cols) return true;
    if (rows && ty >= rows) return true;

    // Terrain
    const grid = map?.grid || null;
    const tid = grid?.[ty]?.[tx];
    const waterIds = _getWaterIds(map);
    if (waterIds.has(tid)) return true;

    // Ressourcen-Nodes blockieren
    const nodeSet = _getNodeSet();
    if (nodeSet && nodeSet.has(`${tx|0},${ty|0}`)) return true;

    // Fertige Gebäude blockieren (Baustellen bleiben begehbar) – Tür bleibt passierbar
    const buildings = (window.Game?.getBuildings?.() || window.Game?.buildings || window.Buildings?.list || []);
    if (Array.isArray(buildings) && buildings.length){
      for (const b of buildings){
        if (!b) continue;
        if (!_isBuildingDone(b)) continue;

        const bx = toInt(b.x, NaN);
        const by = toInt(b.y, NaN);
        const bw = Math.max(1, toInt(b.w, 1));
        const bh = Math.max(1, toInt(b.h, 1));
        if (!Number.isFinite(bx) || !Number.isFinite(by)) continue;

        if (tx >= bx && tx < bx + bw && ty >= by && ty < by + bh){
          // Door-Pass: Wenn Tile eine Tür ist → nicht blockieren
          const doors = _buildingEntranceTilesAbs(b);
          for (const d of doors){
            if (d && tx === (d.x|0) && ty === (d.y|0)) return false;
          }
          return true;
        }
      }
    }

    return false;
  }

  // -------------------------------------------------------------------------
  //  PLACEMENT (Ghost/Confirm + AutoHQ)
  // -------------------------------------------------------------------------
  function canPlaceBuildingAt(buildingId, tx, ty, w, h, opts){
    const map = _getMapState();
    const cols = toInt(map?.cols, 0);
    const rows = toInt(map?.rows, 0);
    const grid = map?.grid || null;
    const nodeSet = _getNodeSet();

    const id = String(buildingId || '').trim();
    const bx = toInt(tx, NaN);
    const by = toInt(ty, NaN);

    const result = { ok:false, reason:'unknown', details:null };

    if (!id || !Number.isFinite(bx) || !Number.isFinite(by) || !grid || !(cols>0 && rows>0)){
      result.reason = 'no_map_or_args';
      return result;
    }

    // Definition (Registry bevorzugt)
    let def = null;
    try{ def = window.Registry?.getBuilding?.(id) || null; }catch(_){ def = null; }

    const ww = Math.max(1, toInt(w ?? def?.size?.w ?? def?.size?.width, 3));
    const hh = Math.max(1, toInt(h ?? def?.size?.h ?? def?.size?.height, 3));

    // Per-Building blockedTerrains
    const blockedTerrains = Array.isArray(def?.blockedTerrains) ? def.blockedTerrains : null;
    const bt = (blockedTerrains && blockedTerrains.length) ? blockedTerrains : ['water'];

    // Per-Building minMargin (edge/water)
    const mm = def?.minMargin;
    const edgeMargin = toInt(opts?.override?.edgeMarginTiles ?? mm?.edge ?? mm?.edgeTiles ?? 0, 0);
    const waterMargin = toInt(opts?.override?.waterMarginTiles ?? mm?.water ?? mm?.waterTiles ?? 0, 0);

    // 1) Edge-Margin (vor Bounds, weil wir damit die zulässige Fläche definieren)
    if (edgeMargin > 0){
      if (bx < edgeMargin || by < edgeMargin || (bx + ww) > (cols - edgeMargin) || (by + hh) > (rows - edgeMargin)){
        result.reason = 'too_close_to_edge';
        result.details = { edgeMargin, cols, rows, w:ww, h:hh };
        return result;
      }
    }

    // 2) Bounds (Footprint)
    if (bx < 0 || by < 0 || (bx + ww) > cols || (by + hh) > rows){
      result.reason = 'out_of_bounds';
      result.details = { cols, rows, w:ww, h:hh };
      return result;
    }

    // 3) Buildings (Overlap) – Platzierung blockt IMMER auch Baustellen
    const buildings = (window.Game?.getBuildings?.() || window.Game?.buildings || window.Buildings?.list || []);
    if (Array.isArray(buildings) && buildings.length){
      for (const b of buildings){
        if (!b) continue;
        const ox = toInt(b.x, NaN);
        const oy = toInt(b.y, NaN);
        const ow = Math.max(1, toInt(b.w, 1));
        const oh = Math.max(1, toInt(b.h, 1));
        if (!Number.isFinite(ox) || !Number.isFinite(oy)) continue;
        const overlap = (bx < ox + ow) && (bx + ww > ox) && (by < oy + oh) && (by + hh > oy);
        if (overlap){
          result.reason = 'occupied';
          result.details = { otherId: b.id, otherUid: b.uid || null, otherX:ox, otherY:oy, otherW:ow, otherH:oh };
          return result;
        }
      }
    }

    // 4) Terrain + Ressourcen im Footprint
    //    blockedTerrains kann sowohl Strings (Legend-Token) als auch Numbers (TileId) enthalten.
    const blockedIds = new Set();
    for (const t of bt){
      if (Number.isFinite(+t)) { blockedIds.add(toInt(t, 0)); continue; }
      const tok = String(t || '').toLowerCase().trim();
      if (!tok) continue;
      if (tok === 'water'){
        for (const id of _getWaterIds(map)) blockedIds.add(id);
      } else {
        for (const id of _getNameSet(map, tok)) blockedIds.add(id);
      }
    }

    for (let y = by; y < by + hh; y++){
      const row = grid[y];
      if (!row) {
        result.reason = 'grid_invalid';
        return result;
      }
      for (let x = bx; x < bx + ww; x++){
        const tid = row[x] | 0;
        if (blockedIds.has(tid)){
          result.reason = 'blocked_terrain';
          result.details = { tileId: tid, tileName: _legendNameForTileId(map, tid), x, y, blockedTerrains: bt };
          return result;
        }
        if (nodeSet && nodeSet.has(`${x},${y}`)){
          // Ressourcen sind nicht immer "hart" blockierend.
          // Wunsch (v4.3):
          //  - Kleinkram (kleine Steine/kleine Deco) soll beim Bauen weggeräumt werden.
          //  - Auf große Bäume darf man platzieren, sobald mindestens ein Holzfäller
          //    fertig gebaut ist (oder wenn man gerade den Holzfäller platziert).
          //
          // MapResources liefert pro Node: { kind:'tree'|'stone'|'fish', x,y, ... }
          const nodeMap = _getNodeMap();
          const n = nodeMap ? nodeMap.get(`${x},${y}`) : null;
          const kind = String(n?.kind || '').toLowerCase();

          // 1) "Soft"-Ressourcen: Steine können beim Bau geräumt werden.
          if (kind === 'stone'){
            // erlaubt → Game wird beim Bauen (core/game.js) die Steine entfernen
            continue;
          }

          // 2) Bäume: nur erlauben, wenn Holzfäller existiert ODER wir gerade einen Holzfäller setzen
          if (kind === 'tree'){
            const allowTrees = (id === 'b.lumberjack') || _hasDoneLumberjack();
            if (allowTrees) {
              continue;
            }
            result.reason = 'blocked_resource_tree';
            result.details = { x, y, kind:'tree' };
            return result;
          }

          // 3) Fisch / unbekannt: blockiert
          result.reason = 'blocked_resource';
          result.details = { x, y, kind: kind || null };
          return result;
        }
      }
    }

    // 5) Wasser-Margin (Ring um das Gebäude)
    if (waterMargin > 0){
      const waterIds = _getWaterIds(map);
      const x0 = Math.max(0, bx - waterMargin);
      const y0 = Math.max(0, by - waterMargin);
      const x1 = Math.min(cols - 1, (bx + ww - 1) + waterMargin);
      const y1 = Math.min(rows - 1, (by + hh - 1) + waterMargin);
      for (let y = y0; y <= y1; y++){
        const row = grid[y];
        if (!row) continue;
        for (let x = x0; x <= x1; x++){
          const tid = row[x] | 0;
          if (waterIds.has(tid)){
            result.reason = 'too_close_to_water';
            result.details = { waterMargin, x, y, tileId: tid, tileName: _legendNameForTileId(map, tid) };
            return result;
          }
        }
      }
    }

    // 6) Entrance muss in Bounds bleiben & nicht auf Wasser landen
    const e0 = (def?.entrances && Array.isArray(def.entrances) && def.entrances.length)
      ? def.entrances[0]
      : null;
    if (e0 && Number.isFinite(e0.dx) && Number.isFinite(e0.dy)){
      const ex = (bx + (e0.dx|0))|0;
      const ey = (by + (e0.dy|0))|0;
      if (ex < 0 || ey < 0 || ex >= cols || ey >= rows){
        result.reason = 'entrance_out_of_bounds';
        result.details = { ex, ey, cols, rows };
        return result;
      }
      const tid = grid?.[ey]?.[ex] | 0;
      if (_getWaterIds(map).has(tid)){
        result.reason = 'entrance_on_water';
        result.details = { ex, ey, tileId: tid, tileName: _legendNameForTileId(map, tid) };
        return result;
      }
    }

    result.ok = true;
    result.reason = 'ok';
    result.details = { w:ww, h:hh };
    return result;
  }

  // -------------------------------------------------------------------------
  //  AUTO-HQ / START-PLACEMENT – nutzt dasselbe canPlaceBuildingAt
  // -------------------------------------------------------------------------
  function findAutoPlacement(buildingId, w, h, opts){
    const map = _getMapState();
    const cols = toInt(map?.cols, 0);
    const rows = toInt(map?.rows, 0);
    if (!map || !(cols>0 && rows>0)) return null;

    // Override-Parameter (z.B. HQ edge/water margin aus Start-Flow)
    const edgeMargin = toInt(opts?.edgeMarginTiles ?? 0, 0);
    const waterMargin = toInt(opts?.waterMarginTiles ?? 0, 0);
    const tries = Math.max(50, toInt(opts?.tries ?? 1200, 1200));

    const ww = Math.max(1, toInt(w, 3));
    const hh = Math.max(1, toInt(h, 3));

    // zulässiger Bereich (EdgeMargin direkt einrechnen)
    const minX = edgeMargin;
    const minY = edgeMargin;
    const maxX = Math.max(minX, cols - ww - edgeMargin);
    const maxY = Math.max(minY, rows - hh - edgeMargin);

    function okAt(x,y){
      const r = canPlaceBuildingAt(buildingId, x, y, ww, hh, {
        override: { edgeMarginTiles: edgeMargin, waterMarginTiles: waterMargin }
      });
      return !!r?.ok;
    }

    // 1) Random Sampling
    for (let i=0; i<tries; i++){
      const x = (minX + Math.random() * (maxX - minX + 1)) | 0;
      const y = (minY + Math.random() * (maxY - minY + 1)) | 0;
      if (okAt(x,y)) return { tx:x, ty:y };
    }

    // 2) Fallback: Scan
    for (let y=minY; y<=maxY; y++){
      for (let x=minX; x<=maxX; x++){
        if (okAt(x,y)) return { tx:x, ty:y };
      }
    }

    return null;
  }

  // -------------------------------------------------------------------------
  //  PUBLIC API
  // -------------------------------------------------------------------------
  const GameRules = {
    VERSION,
    // Walkability
    isNavBlocked,
    isWaterTile,
    // Placement
    canPlaceBuildingAt,
    findAutoPlacement,

    // kleine Debug-Helpers
    _debugLegendNameForTileId: _legendNameForTileId
  };

  window.GameRules = GameRules;

  // Optional: an Game hängen (wenn Game später kommt)
  function _attachToGame(){
    if (!window.Game) return;
    // Bool-Wrapper für Legacy-Aufrufe
    window.Game.canPlaceBuildingAt = function(kind, tx, ty, w, h, opts){
      const r = GameRules.canPlaceBuildingAt(kind, tx, ty, w, h, opts);
      return !!r?.ok;
    };
  }
  _attachToGame();
  window.addEventListener('cb:game:initialized', _attachToGame);
  window.addEventListener('cb:game:start', _attachToGame);

  LOG('geladen', VERSION);
})();
