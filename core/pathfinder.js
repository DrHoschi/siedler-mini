// core/pathfinder.js — v16.4.0
// Leichter Pfadfinder (Gitter, 4-Nachbarn). Bevorzugt Straßen, wenn verfügbar.
// Public API: window.PathFinder.init(getSizeFn), window.PathFinder.find(a, b, opts)
// a/b sind {x:tileX, y:tileY}; opts: {preferRoads:true, maxLen:1000}

(function () {
  'use strict';

  var VERSION = 'v16.4.0';
  var log = (window.CBLog && CBLog.ok) ? CBLog.ok : console.log;
  var warn = (window.CBLog && CBLog.warn) ? CBLog.warn : console.warn;

  var api = {};
  var getSize = null; // function -> {w,h}
  var cachedRoads = null; // Set("x,y")

  function key(x, y) { return x + ',' + y; }

  function isInside(x, y) {
    var s = getSize ? getSize() : { w: 0, h: 0 };
    return (x >= 0 && y >= 0 && x < s.w && y < s.h);
  }

  function isRoad(x, y) {
    if (!cachedRoads) {
      // Versuche Road-Set vom Spiel zu holen
      try {
        if (window.Game && typeof Game.getRoadSet === 'function') {
          cachedRoads = Game.getRoadSet();
        }
      } catch (_) {}
      if (!cachedRoads) cachedRoads = new Set();
    }
    return cachedRoads.has(key(x, y));
  }

  function neighbors(x, y) {
    // 4er Nachbarschaft
    return [
      { x: x - 1, y: y },
      { x: x + 1, y: y },
      { x: x, y: y - 1 },
      { x: x, y: y + 1 }
    ];
  }

  // ein kleines A*-Light: g=Schrittkosten, h=Manhattan, f=g+h
  function heuristic(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function findPath(a, b, opts) {
    opts = opts || {};
    var preferRoads = (opts.preferRoads !== false); // default true
    var maxLen = opts.maxLen || 1000;

    if (!a || !b) return null;
    if (!isInside(a.x, a.y) || !isInside(b.x, b.y)) return null;
    if (a.x === b.x && a.y === b.y) return [{ x: a.x, y: a.y }];

    // Open-Set (als Map key->node), Priority-Queue per linearem Scan (klein, ok)
    var open = {};
    var openList = [];

    // Closed-Set
    var closed = new Set();

    function push(node) {
      open[key(node.x, node.y)] = node;
      openList.push(node);
    }
    function popLowestF() {
      var bestIdx = -1, bestF = Infinity;
      for (var i = 0; i < openList.length; i++) {
        var n = openList[i];
        if (n.f < bestF) { bestF = n.f; bestIdx = i; }
      }
      var out = openList.splice(bestIdx, 1)[0];
      delete open[key(out.x, out.y)];
      return out;
    }

    var start = {
      x: a.x, y: a.y,
      g: 0,
      h: heuristic(a.x, a.y, b.x, b.y),
      f: 0,
      parent: null
    };
    start.f = start.g + start.h;
    push(start);

    var steps = 0;

    while (openList.length && steps < maxLen) {
      steps++;

      var cur = popLowestF();
      var ck = key(cur.x, cur.y);
      if (closed.has(ck)) continue;
      closed.add(ck);

      if (cur.x === b.x && cur.y === b.y) {
        // rekonstruiere pfad
        var path = [];
        var p = cur;
        while (p) { path.push({ x: p.x, y: p.y }); p = p.parent; }
        path.reverse();
        return path;
      }

      var nb = neighbors(cur.x, cur.y);
      for (var i = 0; i < nb.length; i++) {
        var nx = nb[i].x, ny = nb[i].y;
        if (!isInside(nx, ny)) continue;

        var nk = key(nx, ny);
        if (closed.has(nk)) continue;

        // Kosten: Straße 1, sonst 2 (damit Straßen bevorzugt werden)
        var stepCost = (preferRoads && isRoad(nx, ny)) ? 1 : 2;
        var g = cur.g + stepCost;

        var existing = open[nk];
        if (existing && g >= existing.g) continue;

        var h = heuristic(nx, ny, b.x, b.y);
        var node = { x: nx, y: ny, g: g, h: h, f: g + h, parent: cur };

        if (existing) {
          // update
          existing.g = g; existing.h = h; existing.f = node.f; existing.parent = cur;
        } else {
          push(node);
        }
      }
    }

    warn('[pathfinder] kein Pfad gefunden / Abbruch (steps=%s)', steps);
    return null;
  }

  api.init = function (getSizeFn) {
    getSize = getSizeFn;
    cachedRoads = null; // Road-Cache invalidieren
    log('[pathfinder] init', VERSION);
  };

  api.invalidateRoads = function () {
    cachedRoads = null;
  };

  api.find = function (a, b, opts) {
    return findPath(a, b, opts);
  };

  // export
  window.PathFinder = api;
})();
