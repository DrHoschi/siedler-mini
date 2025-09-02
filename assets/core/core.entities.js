/* ============================================================================
 * core.entities.js — v17.0.0
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Zentrale Gebäudedaten (BUILDINGS) inkl. festen Tür-Definitionen (doors)
 *   - Aliase/resolveKey
 *   - Platzieren/Kollision (nur Innenfläche blockieren)
 *   - Obstacles-Grid pflegen
 *   - Türwahl (konfigurierte Türen → Fallback Perimeter)
 * Export: GameCore.Entities = { BUILDINGS, resolveKey, canPlace, place, registerObstacles,
 *                               getObstacleAt, pickExitDoor, pickEntryDoor }
 * ========================================================================== */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[entities] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;

  // --------------------------- BUILDINGS (+ doors) ----------------------------
  // Tür-Offsets sind relativ zur linken oberen Gebäudeecke (tx,ty),
  // und zeigen auf eine Kachel *außerhalb* der Gebäude-Innenfläche.
  var BUILDINGS = {
    townhall:  { wTiles:2, hTiles:2, img:"assets/tex/building/Holz_Rathaus_1.png",
      doors: [ {x:1, y:2}, {x:0, y:2}, {x:-1,y:0}, {x:2,y:0} ] },
    hq:        { wTiles:2, hTiles:2, img:"assets/tex/building/wood/hq_wood.PNG",
      doors: [ {x:1, y:2}, {x:0, y:2} ] },
    depot:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/depot_wood.png",
      doors: [ {x:-1, y:1}, {x:2, y:1} ] },
    lumberjack:{ wTiles:2, hTiles:2, img:"assets/tex/building/wood/lumberjack_wood.PNG",
      prod:{ type:'wood', rate:0.35, cap:20, keep:6 },
      doors: [ {x:1, y:2} ] },
    farm:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/farm_wood.png",
      prod:{ type:'grain', rate:0.30, cap:20, keep:6 },
      doors: [ {x:1, y:-1}, {x:0, y:-1} ] },
    mill:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/windmuehle_wood.PNG",
      doors: [ {x:-1, y:1}, {x:2, y:1}, {x:1, y:-1}, {x:1, y:2} ] },
    smith:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Schmied_wood0.png",
      doors: [ {x:2, y:1} ] },
    house0:    { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood0_ug0.png",
      doors: [ {x:1, y:2} ] },
    house1:    { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood1_ug0.png",
      doors: [ {x:1, y:2} ] },
    tree:      { wTiles:1, hTiles:1, img:"assets/tex/terrain/topdown_tree_needle0_ug0.jpeg",
      doors: [] } // keine Tür
  };

  var ALIAS = { schmied:'smith', rathaus:'townhall', holzfaeller:'lumberjack', bauernhof:'farm', wohnhaus0:'house0', wohnhaus1:'house1' };

  function resolveKey(key){ if (BUILDINGS[key]) return key; if (ALIAS[key]) return ALIAS[key]; return key; }

  // --------------------------- Obstacles-Grid --------------------------------
  function _obIdx(x,y){ return y*S.obstW + x; }
  function _ensureObstacles(){
    if (!S.map) return;
    if (!S.obstacles || S.obstW!==S.map.width || S.obstH!==S.map.height){
      S.obstW = S.map.width|0; S.obstH = S.map.height|0;
      S.obstacles = new Uint8Array(S.obstW * S.obstH);
    }
  }
  function _clearObstacles(){ if (S.obstacles) S.obstacles.fill(0); }
  function _setBlocked(x,y){ if (U.inb(x,y,S.obstW,S.obstH)) S.obstacles[_obIdx(x,y)] = 1; }

  function getObstacleAt(tx,ty){
    if (!S.obstacles) return false;
    if (!U.inb(tx,ty,S.obstW,S.obstH)) return true;
    return S.obstacles[_obIdx(tx,ty)] === 1;
  }

  function registerObstacles(){
    _ensureObstacles(); _clearObstacles();
    for (var i=0;i<S.entities.length;i++){
      var e=S.entities[i];
      for (var y=e.ty; y<e.ty+e.hTiles; y++){
        for (var x=e.tx; x<e.tx+e.wTiles; x++){
          _setBlocked(x,y); // nur Innenfläche blockieren
        }
      }
    }
  }

  // --------------------------- Platzieren / Kollision ------------------------
  function _rectsOverlap(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }

  function canPlace(key, tx, ty){
    if (!S.map) return false;
    var def = BUILDINGS[key = resolveKey(key)]; if (!def) return false;
    if (tx<0 || ty<0 || tx+def.wTiles>S.map.width || ty+def.hTiles>S.map.height) return false;

    var t = S.map.tile, r = { x:tx*t, y:ty*t, w:def.wTiles*t, h:def.hTiles*t };
    for (var i=0;i<S.entities.length;i++){
      var e=S.entities[i], er = { x:e.x, y:e.y, w:e.w, h:e.h };
      if (_rectsOverlap(r,er)) return false;
    }
    return true;
  }

  function place(key, tx, ty){
    if (!S.map) return false;
    key = resolveKey(key);
    var def = BUILDINGS[key]; if (!def) return false;

    var t = S.map.tile;
    var x = tx*t, y = ty*t;
    var img = def._img; // wird typischerweise vom Loader befüllt

    var e = {
      id: S.nextEntityId++,
      key:key, tx:tx, ty:ty, wTiles:def.wTiles|0, hTiles:def.hTiles|0,
      x:x, y:y, w:(def.wTiles|0)*t, h:(def.hTiles|0)*t,
      img:img, stock:{}, tickAcc:0
    };
    if (def.prod){
      e.prod = { type:def.prod.type, rate:def.prod.rate, cap:def.prod.cap, keep:def.prod.keep };
    }
    S.entities.push(e);
    registerObstacles();
    ns.ok('[ok] Gebäude platziert:', key, 'at', tx, ty);
    return e;
  }

  // --------------------------- Türwahl ---------------------------------------
  function _isWalk(x,y){ try{ return !getObstacleAt(x,y); }catch(_){ return true; } }
  function _isRoad(x,y){ try{ return !!S.roads.has(U.key(x,y)); }catch(_){ return false; } }

  // 1) Konfigurierte Türen → beste (Straße > Nähe zur Mitte)
  function pickConfiguredDoor(e){
    var def = BUILDINGS[e.key]; if (!def || !def.doors || !def.doors.length) return null;
    var cx = e.tx + (e.wTiles>>1), cy = e.ty + (e.hTiles>>1);
    var cand = [];
    for (var i=0;i<def.doors.length;i++){
      var d=def.doors[i], dx=e.tx+d.x, dy=e.ty+d.y;
      if (!_isWalk(dx,dy)) continue;
      cand.push({x:dx,y:dy, road:_isRoad(dx,dy)?1:0, d:Math.abs(dx-cx)+Math.abs(dy-cy)});
    }
    if (!cand.length) return null;
    cand.sort(function(a,b){ if (b.road!==a.road) return b.road-a.road; return a.d-b.d; });
    return {x:cand[0].x, y:cand[0].y};
  }

  // 2) Fallback: Perimeter (Ring um das Gebäude)
  function pickDoorFallbackPerimeter(e){
    var w=e.wTiles|0, h=e.hTiles|0, cand=[];
    for (var y=e.ty-1; y<=e.ty+h; y++){
      for (var x=e.tx-1; x<=e.tx+w; x++){
        var inside=(x>=e.tx && x<e.tx+w && y>=e.ty && y<e.ty+h);
        if (inside) continue;
        var onEdge=(y===e.ty-1||y===e.ty+h||x===e.tx-1||x===e.tx+w);
        if (!onEdge) continue;
        if (!_isWalk(x,y)) continue;
        var cx=e.tx+(w>>1), cy=e.ty+(h>>1);
        cand.push({x:x,y:y, road:_isRoad(x,y)?1:0, d:Math.abs(x-cx)+Math.abs(y-cy)});
      }
    }
    if (!cand.length) return null;
    cand.sort(function(a,b){ if (b.road!==a.road) return b.road-a.road; return a.d-b.d; });
    return {x:cand[0].x, y:cand[0].y};
  }

  function pickExitDoor(e){ return pickConfiguredDoor(e) || pickDoorFallbackPerimeter(e); }
  function pickEntryDoor(e){ return pickConfiguredDoor(e) || pickDoorFallbackPerimeter(e); }

  // --------------------------- Export ----------------------------------------
  ns.Entities = {
    BUILDINGS: BUILDINGS,
    resolveKey: resolveKey,
    canPlace: canPlace,
    place: place,
    registerObstacles: registerObstacles,
    getObstacleAt: getObstacleAt,
    pickExitDoor: pickExitDoor,
    pickEntryDoor: pickEntryDoor
  };

  ns.ok('[entities] Modul geladen (v17.0.0)');

})(window.GameCore = window.GameCore || {});
