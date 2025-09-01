/* core/pathfinder.js — v16.5.2
 * -------------------------------------------------------------------
 * Zweck
 *  - Hybrid-Pathfinding:
 *      • Wenn Start/Ziel über Straßen (4-Nachbarn) verbunden → Straße bevorzugen
 *      • sonst Offroad mit diagonalen Schritten (8-Nachbarn)
 *  - Heatmap (Trampelpfade) zur Visualisierung / günstigeren Wiederverwendung
 *  - Overlay-Darstellung (optional) für Debug/Inspektor
 *
 * Öffentliche API
 *  - PathFinder.init(getMapSizeFn)
 *  - PathFinder.setRoadMask(Set<string "x,y"> | null)
 *  - PathFinder.setObstacleProvider(fn(tx,ty)=>boolean | null)
 *  - PathFinder.invalidateRoads()     // Platzhalter für späteren Cache
 *  - PathFinder.applyHeat(path)       // Heatmap „aufheizen“ entlang eines Pfads
 *  - PathFinder.findPath({from:{x,y}, to:{x,y}, mode:'auto'|'offroad'|'roads'})
 *  - PathFinder.drawOverlay(ctx, cam) // cam: {x,y,zoom}, nutzt Game.getTileSize()
 *
 * Erwartete Game-Hooks (falls vorhanden)
 *  - Game.getTileSize() : number
 *  - Game.getRoadSet()  : Set<string "x,y">
 *  - Game.getObstacleAt(tx,ty) : boolean   (true = blockiert)
 *
 * Debug:
 *  - window.DEBUG_PATH_OVERLAY = true  → Heatmap & Pfadlinien sichtbar
 * -------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // internes State
  // ------------------------------------------------------------------
  var PF = (window.PathFinder = window.PathFinder || {});

  var _w = 0, _h = 0;                   // Map-Größe in Tiles
  var _heat = null;                      // Float32Array[w*h] (Trampelpfad/Heatmap)
  var _roadSet = null;                   // Set("x,y") für Straßen-Tiles (oder null)
  var _blockerProvider = null;           // fn(tx,ty)=>true wenn blockiert
  var _lastPaths = [];                   // für Overlay: Liste jüngster Pfade

  // Utilities
  function idx(x, y) { return y * _w + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < _w && y < _h; }
  function key(x, y) { return x + ',' + y; }
  function isRoad(x, y) { return _roadSet && _roadSet.has(key(x, y)); }
  function isBlocked(x, y) {
    if (!inb(x, y)) return true;
    if (_blockerProvider && _blockerProvider(x, y)) return true;
    return false;
  }

  // Sanftes Logging (fällt auf console.* zurück, wenn CBLog fehlt)
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

  // ------------------------------------------------------------------
  // Öffentliche API
  // ------------------------------------------------------------------
  PF.init = function (getMapSize) {
    try {
      var s = getMapSize && getMapSize();
      _w = (s && s.w) | 0;
      _h = (s && s.h) | 0;
      if (_w <= 0 || _h <= 0) {
        LOG('warn', '[PF] init: ungültige Größe ' + JSON.stringify(s));
        return;
      }
      _heat = new Float32Array(_w * _h);
      LOG('ok', `[PF] init OK ${_w}x${_h}`);
    } catch (e) {
      LOG('warn', '[PF] init Fehler: ' + (e && e.message));
    }
  };

  PF.setRoadMask = function (set) {
    _roadSet = set || null;
  };

  PF.setObstacleProvider = function (fn) {
    _blockerProvider = (typeof fn === 'function') ? fn : null;
  };

  PF.invalidateRoads = function () {
    // Platzhalter: hier könnte später ein Road-Cache geleert werden.
  };

  PF.applyHeat = function (path) {
    if (!_heat || !path || !path.length) return;
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      var id = idx(p.x | 0, p.y | 0);
      if (id >= 0 && id < _heat.length) {
        var v = _heat[id] + 1.0;
        _heat[id] = v > 50 ? 50 : v; // Deckeln
      }
    }
  };

  // ------------------------------------------------------------------
  // Straßenverbindung checken (BFS mit 4-Nachbarn)
  // ------------------------------------------------------------------
  function roadConnected(sx, sy, tx, ty) {
    if (!_roadSet) return false;
    if (!isRoad(sx, sy) || !isRoad(tx, ty)) return false;

    var qx = new Int16Array(_w * _h),
        qy = new Int16Array(_w * _h);
    var qh = 0, qt = 0;
    var seen = new Uint8Array(_w * _h);

    qx[qh] = sx; qy[qh] = sy; qh++;
    seen[idx(sx, sy)] = 1;

    var nx = [1, -1, 0, 0], ny = [0, 0, 1, -1];

    while (qt < qh) {
      var x = qx[qt], y = qy[qt]; qt++;
      if (x === tx && y === ty) return true;

      for (var i = 0; i < 4; i++) {
        var nx1 = x + nx[i], ny1 = y + ny[i];
        if (!inb(nx1, ny1)) continue;
        if (!isRoad(nx1, ny1)) continue;
        var id = idx(nx1, ny1);
        if (seen[id]) continue;
        seen[id] = 1; qx[qh] = nx1; qy[qh] = ny1; qh++;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------
  // A*: Straßen (4-Nachbarn), Kosten = 10 je Schritt
  // ------------------------------------------------------------------
  function findPathRoads(sx, sy, tx, ty) {
    var max = _w * _h;
    var og = new Int32Array(max);           // g-Kosten
    var open = new Uint8Array(max);
    var closed = new Uint8Array(max);
    var cameX = new Int16Array(max);
    var cameY = new Int16Array(max);

    for (var i = 0; i < max; i++) og[i] = 1e9;

    var qx = new Int16Array(max), qy = new Int16Array(max), qh = 0;
    function push(x, y) { qx[qh] = x; qy[qh] = y; qh++; }

    var startId = idx(sx, sy);
    og[startId] = 0; open[startId] = 1; push(sx, sy);

    var best = { x: sx, y: sy, f: 1e9 };
    var base = 10;

    while (qh > 0) {
      // primitiver „Open-Set“-Pick: letztes Element
      qh--;
      var cx = qx[qh], cy = qy[qh];
      var cid = idx(cx, cy);
      open[cid] = 0; closed[cid] = 1;

      if (cx === tx && cy === ty) {
        return reconstruct(cameX, cameY, sx, sy, tx, ty);
      }

      var nx4 = [1, -1, 0, 0], ny4 = [0, 0, 1, -1];
      for (var k = 0; k < 4; k++) {
        var nx1 = cx + nx4[k], ny1 = cy + ny4[k];
        if (!inb(nx1, ny1)) continue;
        if (!isRoad(nx1, ny1)) continue;
        if (isBlocked(nx1, ny1)) continue;

        var id = idx(nx1, ny1);
        if (closed[id]) continue;

        var newG = og[cid] + base; // konstante Kosten auf Straßen
        if (newG < og[id]) {
          cameX[id] = cx; cameY[id] = cy; og[id] = newG;
          if (!open[id]) { open[id] = 1; push(nx1, ny1); }
        }
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // A*: Offroad (8-Nachbarn), diagonale Kosten ~14, orthogonal ~10
  //  - Heatmap beeinflusst Kosten (viel benutzt → etwas günstiger)
  // ------------------------------------------------------------------
  function hManhattan(x, y, tx, ty) {
    return (Math.abs(tx - x) + Math.abs(ty - y)) * 10;
  }

  function findPathOffroad(sx, sy, tx, ty) {
    var max = _w * _h;
    var og = new Int32Array(max);            // g-Kosten
    var open = new Uint8Array(max);
    var closed = new Uint8Array(max);
    var cameX = new Int16Array(max);
    var cameY = new Int16Array(max);

    for (var i = 0; i < max; i++) og[i] = 1e9;

    var qx = new Int16Array(max), qy = new Int16Array(max), qh = 0;
    function push(x, y, f) {
      // sehr einfacher Stack (keine echte Prioritätsqueue) – leichtgewichtiger
      qx[qh] = x; qy[qh] = y; qh++;
    }

    var startId = idx(sx, sy);
    og[startId] = 0; open[startId] = 1; push(sx, sy, 0);

    var dirs = [
      { x: 1, y: 0, c: 10 }, { x: -1, y: 0, c: 10 },
      { x: 0, y: 1, c: 10 }, { x: 0, y: -1, c: 10 },
      { x: 1, y: 1, c: 14 }, { x: 1, y: -1, c: 14 },
      { x: -1, y: 1, c: 14 }, { x: -1, y: -1, c: 14 },
    ];

    while (qh > 0) {
      // Pop (LIFO) – für kleine Karten OK; später ggf. mit Binär-Heap ersetzen
      qh--;
      var cx = qx[qh], cy = qy[qh];
      var cid = idx(cx, cy);
      open[cid] = 0; closed[cid] = 1;

      if (cx === tx && cy === ty) {
        return reconstruct(cameX, cameY, sx, sy, tx, ty);
      }

      for (var i = 0; i < dirs.length; i++) {
        var nx1 = cx + dirs[i].x, ny1 = cy + dirs[i].y;
        if (!inb(nx1, ny1)) continue;
        if (isBlocked(nx1, ny1)) continue;

        var id = idx(nx1, ny1);
        if (closed[id]) continue;

        // Basiskosten + Heatmap-Bias (viel gelaufen = leicht günstiger)
        var base = dirs[i].c;
        var costMul = 1.0;
        if (_heat) {
          var heat = _heat[id] || 0;
          var bias = 1.0 - Math.min(0.4, heat * 0.02); // bis -40%
          costMul *= bias;
        }
        var step = Math.floor(base * costMul) || 1;
        var newG = og[cid] + step;

        if (newG < og[id]) {
          cameX[id] = cx; cameY[id] = cy; og[id] = newG;
          if (!open[id]) { open[id] = 1; push(nx1, ny1, newG + hManhattan(nx1, ny1, tx, ty)); }
        }
      }
    }
    return null;
  }

  // Pfad rekonstruieren
  function reconstruct(cX, cY, sx, sy, tx, ty) {
    var out = [];
    var x = tx, y = ty;
    var guard = _w * _h + 10; // simple Endlosschleifen-Sicherung

    while (guard-- > 0) {
      out.push({ x: x, y: y });
      if (x === sx && y === sy) break;
      var id = idx(x, y);
      var px = cX[id], py = cY[id];
      if (px === 0 && py === 0 && !(x === sx && y === sy)) {
        // Keine Spur → Fehler
        return null;
      }
      x = px; y = py;
    }
    out.reverse();
    return out;
  }

  // ------------------------------------------------------------------
  // Hauptfunktion: Hybrid-Pfad
  // mode:
  //   'roads'   → nur Straßen (wenn verbunden), sonst null
  //   'offroad' → nur Offroad
  //   'auto'    → Straßen wenn möglich, sonst Offroad (Standard)
  // ------------------------------------------------------------------
  PF.findPath = function (opts) {
    if (!_w || !_h) {
      LOG('warn', '[PF] findPath ohne init() aufgerufen');
      return null;
    }
    opts = opts || {};
    var sx = (opts.from && opts.from.x) | 0,
        sy = (opts.from && opts.from.y) | 0;
    var tx = (opts.to && opts.to.x) | 0,
        ty = (opts.to && opts.to.y) | 0;
    var mode = opts.mode || 'auto';

    _lastPaths.length = 0;

    // 1) Straßen-only?
    if (mode !== 'offroad' && _roadSet && roadConnected(sx, sy, tx, ty)) {
      var r = findPathRoads(sx, sy, tx, ty);
      if (r && r.length) {
        _lastPaths.push({ path: r, type: 'road' });
        return r;
      }
      if (mode === 'roads') return null;
    }

    // 2) Offroad
    if (mode !== 'roads') {
      var o = findPathOffroad(sx, sy, tx, ty);
      if (o && o.length) {
        _lastPaths.push({ path: o, type: 'offroad' });
        return o;
      }
    }

    return null;
  };

  // ------------------------------------------------------------------
  // Overlay (Heatmap + letzte Pfade)
  //  - nur wenn window.DEBUG_PATH_OVERLAY = true
  // ------------------------------------------------------------------
  PF.drawOverlay = function (ctx, cam) {
    if (!window.DEBUG_PATH_OVERLAY) return;
    if (!_heat && !_lastPaths.length) return;

    var tile = (window.Game && Game.getTileSize && Game.getTileSize()) || 64;

    // Heatmap
    if (_heat) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (var y = 0; y < _h; y++) {
        for (var x = 0; x < _w; x++) {
          var v = _heat[idx(x, y)];
          if (v <= 0) continue;
          var dx = Math.floor((x * tile - cam.x) * cam.zoom);
          var dy = Math.floor((y * tile - cam.y) * cam.zoom);
          var ds = Math.ceil(tile * cam.zoom);
          var a = Math.min(0.45, 0.08 + v * 0.02);
          ctx.fillStyle = 'rgba(255,215,64,' + a.toFixed(3) + ')';
          ctx.fillRect(dx, dy, ds, ds);
        }
      }
      ctx.restore();
    }

    // Pfad-Linien
    for (var i = 0; i < _lastPaths.length; i++) {
      var P = _lastPaths[i];
      var path = P.path;
      if (!path || path.length < 2) continue;

      ctx.save();
      ctx.lineWidth = Math.max(2, Math.floor(2 * cam.zoom));
      ctx.strokeStyle = (P.type === 'road')
        ? 'rgba(120,200,255,.95)'
        : 'rgba(255,170,60,.95)';

      ctx.beginPath();
      for (var k = 0; k < path.length; k++) {
        var wx = path[k].x * tile + tile / 2;
        var wy = path[k].y * tile + tile / 2;
        var sx = Math.floor((wx - cam.x) * cam.zoom);
        var sy = Math.floor((wy - cam.y) * cam.zoom);
        if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  LOG('ok', '[pathfinder.js] Modul geladen (v16.5.2)');
})();
