/* core/carriers.js — v16.6.1
 * -------------------------------------------------------------------
 * Zweck
 *  - Einfache „Träger“-Simulation, die Pfade vom PathFinder nutzt.
 *  - Robust gegen blockierte Start-/Zielkacheln (Snap auf begehbare Nachbarn).
 *  - Bewegungsmode:
 *      • spawn({from:{x,y}, to:{x,y}}) – erzeugt einen Carrier
 *      • tick(dt) – bewegt Carrier entlang des Pfads (dt in Sekunden)
 *      • draw(ctx, cam) – zeichnet Carrier (Sprite, wenn da; sonst Punkt)
 *  - Heatmap („applyHeat“) wird pro erzeugtem Pfad aktualisiert.
 *
 * Öffentliche API
 *  - Carriers.spawn({from:{x,y}, to:{x,y}}) → carrier | null
 *  - Carriers.tick(dt)
 *  - Carriers.draw(ctx, cam)
 *  - Carriers.list() -> Array
 *  - Carriers.clear()
 * Erwartete Game-Hooks (falls vorhanden)
 *  - Game.getTileSize(): number
 *  - Game.getRoadSet(): Set<string "x,y">      (optional; wird an PF gesetzt)
 *  - Game.getObstacleAt(tx,ty): boolean       (optional; wird an PF gesetzt)
 * -------------------------------------------------------------------
 */
(function () {
  'use strict';

  var CR = (window.Carriers = window.Carriers || {});
  var _list = [];  // { x,y, path:[{x,y}], seg, t, speedTilesPS, done }

  var SPEED = 2.0; // Tiles pro Sekunde

  function LOG(lvl, msg) {
    try {
      if (window.CBLog) {
        if (lvl === 'ok') window.CBLog.ok(msg);
        else if (lvl === 'warn') window.CBLog.warn(msg);
        else if (lvl === 'err') window.CBLog.err(msg);
        else window.CBLog.push(lvl || 'log', msg);
      } else {
        console[lvl === 'err' ? 'error' : lvl === 'warn' ? 'warn' : 'log'](msg);
      }
    } catch (_) {}
  }

  function getTile() {
    return (window.Game && Game.getTileSize && Game.getTileSize()) || 64;
  }

  // Helpers: Walkable & Road & Snap -------------------------------------------
  function isWalkable(tx,ty){
    try { return !Game.getObstacleAt(tx,ty); } catch(_){ return true; }
  }
  function isRoad(tx,ty){
    try {
      var s = Game.getRoadSet && Game.getRoadSet();
      return !!(s && s.has(tx+','+ty));
    } catch(_){ return false; }
  }
  function snapToNearbyWalkable(tx,ty){
    if (isWalkable(tx,ty)) return {x:tx,y:ty};
    var best=null;
    for (var r=1; r<=3 && !best; r++){
      for (var dy=-r; dy<=r; dy++){
        for (var dx=-r; dx<=r; dx++){
          var nx=tx+dx, ny=ty+dy;
          if (isWalkable(nx,ny)){
            var cand = { x:nx, y:ny, road: isRoad(nx,ny)?1:0, d: Math.abs(dx)+Math.abs(dy) };
            if (!best || cand.road>best.road || (cand.road===best.road && cand.d<best.d)) best=cand;
          }
        }
      }
    }
    return best ? {x:best.x, y:best.y} : {x:tx,y:ty};
  }

  // Public helpers ------------------------------------------------------------
  CR.list = function(){ return _list; };
  CR.clear = function(){ _list.length = 0; };

  // Carrier erzeugen ----------------------------------------------------------
  CR.spawn = function (opts) {
    opts = opts || {};
    var sx = (opts.from && opts.from.x) | 0,
        sy = (opts.from && opts.from.y) | 0;
    var tx = (opts.to && opts.to.x) | 0,
        ty = (opts.to && opts.to.y) | 0;

    // PF vorbereiten (RoadMask / ObstacleProvider aktualisieren, falls vorhanden)
    try {
      if (window.PathFinder) {
        if (typeof PathFinder.setRoadMask === 'function' && window.Game && Game.getRoadSet) {
          PathFinder.setRoadMask(Game.getRoadSet());
        }
        if (typeof PathFinder.setObstacleProvider === 'function') {
          if (window.Game && typeof Game.getObstacleAt === 'function') {
            PathFinder.setObstacleProvider(Game.getObstacleAt);
          } else {
            PathFinder.setObstacleProvider(null);
          }
        }
      }
    } catch (_) {}

    // Start/Ziel ggf. auf begehbare Nachbarn schnappen
    var sFixed = snapToNearbyWalkable(sx,sy);
    var tFixed = snapToNearbyWalkable(tx,ty);
    sx=sFixed.x; sy=sFixed.y; tx=tFixed.x; ty=tFixed.y;

    // Pfad bestimmen (Hybrid → falls null, Offroad-Fallback)
    var path = (window.PathFinder && PathFinder.findPath)
      ? PathFinder.findPath({ from: { x: sx, y: sy }, to: { x: tx, y: ty }, mode: 'auto' })
      : null;

    if (!path){
      path = (window.PathFinder && PathFinder.findPath)
        ? PathFinder.findPath({ from: { x: sx, y: sy }, to: { x: tx, y: ty }, mode: 'offroad' })
        : null;
    }

    if (!path || path.length < 2) {
      LOG('warn', '[carriers] kein Pfad '+sx+','+sy+' → '+tx+','+ty);
      return null;
    }

    // Heatmap „aufheizen“
    try { if (window.PathFinder && PathFinder.applyHeat) PathFinder.applyHeat(path); } catch (_) {}

    var c = {
      x: sx, y: sy,                 // in Tiles
      path: path,
      seg: 0,                       // aktuelles Segment (von path[seg] → path[seg+1])
      t: 0,                         // 0..1 innerhalb des Segments
      speedTilesPS: SPEED,
      done: false
    };
    _list.push(c);
    return c;
  };

  // Fortschritt berechnen -----------------------------------------------------
  CR.tick = function (dt) {
    if (!_list.length) return;

    for (var i = _list.length - 1; i >= 0; i--) {
      var c = _list[i];
      if (c.done) continue;

      var p = c.path, s = c.seg;
      if (s >= p.length - 1) { c.done = true; continue; }

      var a = p[s], b = p[s + 1];
      var dx = b.x - a.x, dy = b.y - a.y;
      var segLen = Math.sqrt(dx * dx + dy * dy) || 1;

      var adv = (c.speedTilesPS * dt) / segLen; // Anteil entlang Segment
      c.t += adv;

      if (c.t >= 1) {
        c.seg++; c.t = 0;
        if (c.seg >= p.length - 1) { c.x = b.x; c.y = b.y; c.done = true; continue; }
        a = p[c.seg]; b = p[c.seg + 1];
        dx = b.x - a.x; dy = b.y - a.y;
        segLen = Math.sqrt(dx * dx + dy * dy) || 1;
      }

      c.x = a.x + dx * c.t;
      c.y = a.y + dy * c.t;
    }
  };

  // Zeichnen ------------------------------------------------------------------
  CR.draw = function (ctx, cam) {
    // Debug-Overlay vom PathFinder (falls aktiv)
    try { if (window.PathFinder && PathFinder.drawOverlay) PathFinder.drawOverlay(ctx, cam); } catch (_) {}

    if (!_list.length) return;

    var tile = getTile();

    for (var i = 0; i < _list.length; i++) {
      var c = _list[i];

      // Welt → Screen (Tiles -> Pixel)
      var wx = c.x * tile + tile / 2;
      var wy = c.y * tile + tile / 2;
      var sx = Math.floor((wx - cam.x) * cam.zoom);
      var sy = Math.floor((wy - cam.y) * cam.zoom);

      // Sprite-Renderer benutzen, wenn vorhanden
      var drawn = false;
      try {
        if (window.Assets && typeof Assets.drawSprite === 'function') {
          var f = ((Math.floor((c.x+c.y+c.t*10)) % 4) + 4) % 4;
          var frameName = 'carrier_walk_' + f;
          drawn = Assets.drawSprite(ctx, 'carrier', frameName, sx, sy, { anchor:'center' });
          if (!drawn) drawn = Assets.drawSprite(ctx, 'carrier', 'carrier', sx, sy, { anchor:'center' });
        }
      } catch(_) {}

      if (!drawn) {
        // Punkt-Fallback
        ctx.save();
        ctx.fillStyle = c.done ? 'rgba(255,255,0,.7)' : 'rgba(255,200,0,.95)';
        var r = Math.max(3, Math.floor(4 * cam.zoom));
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2, false);
        ctx.fill();
        if (!c.done) {
          ctx.strokeStyle = 'rgba(0,0,0,.45)';
          ctx.lineWidth = Math.max(1, Math.floor(1 * cam.zoom));
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + r * 1.5, sy);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  LOG('ok', '[carriers] Modul geladen (v16.6.1)');
})();
