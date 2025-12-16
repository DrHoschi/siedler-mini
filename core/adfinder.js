/* ============================================================================
 * Datei: core/adfinder.js
 * Projekt: Neue Siedler
 * Version: v1.1.0 (A* + optional Smoothing + Default-Obstacles)
 * Zweck: Hybrid-Pathfinding (A* + Heatmap-Bias) – jetzt REAL (nicht mehr Stub).
 * Datum: 2025-12-16
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 *
 * WICHTIG (Design-Entscheidung):
 * - Diese Datei liefert "Pfad in Tile-Koordinaten" ([{x,y}, ...]) und bleibt
 *   bewusst unabhängig von Render/Units. Die Bewegung (dt/Speed) bleibt bei GameUnits.
 * - Default-Obstacles (falls opts.isBlocked fehlt):
 *     • Map-Grenzen + Wasser (TileId 8/9 – konservativer Default)
 *     • MapResources.nodes (Trees/Stones/Fish) -> blockiert
 *     • Game.buildings (Footprints) -> blockiert
 *   Start/Goal werden immer als begehbar behandelt (sonst "im Gebäude gefangen").
 * ============================================================================ */

(function(){
  'use strict';

  // =========================================================================
  // LOGGING / DEBUG
  // =========================================================================
  const TAG  = '[adfinder]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const ADFINDER_VERSION = "v1.1.0";

  // =========================================================================
  // KONSTANTEN
  // =========================================================================
  const SQRT2 = Math.SQRT2;

  // Wasser-Tile-IDs: konservativ – später über Registry/Terrain-Regeln ersetzen.
  const DEFAULT_WATER_TILE_IDS = new Set([8]);

  // =========================================================================
  // HILFSFUNKTIONEN
  // =========================================================================
  function toInt(v, fallback=0){
    const n = Number(v);
    return Number.isFinite(n) ? (n|0) : fallback;
  }
  function nowMs(){ return (performance && performance.now) ? performance.now() : Date.now(); }

  function keyOf(a,b,opts){
    // wichtig: nur stabile Inputs – keine großen Objekte stringifizieren
    const diag = (opts?.allowDiagonal !== false) ? 1 : 0;
    const smooth = (opts?.smooth !== false) ? 1 : 0;
    return `${a.x},${a.y}->${b.x},${b.y}|d${diag}|s${smooth}`;
  }

  function octileHeuristic(ax, ay, bx, by){
    // Octile (8-dir) Heuristik
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    const m  = Math.min(dx, dy);
    const M  = Math.max(dx, dy);
    return (SQRT2 * m) + (M - m);
  }

  // Bresenham / Supercover-ähnlich: wir prüfen alle Tiles auf einer Linie.
  // Für "string pulling" reicht das in Grid-Spielen meist sehr gut.
  function lineOfSight(a, b, isBlocked, allow){
    let x0 = a.x|0, y0 = a.y|0;
    const x1 = b.x|0, y1 = b.y|0;

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;

    // Wir prüfen Start NICHT (damit "im Gebäude starten" geht),
    // aber alle Zwischenpunkte + Ziel.
    while (!(x0 === x1 && y0 === y1)) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 <  dx) { err += dx; y0 += sy; }

      if (isBlocked(x0, y0, allow)) return false;
    }
    return true;
  }

  // =========================================================================
  // MIN-HEAP (Priority Queue) für Open-Set
  // =========================================================================
  class MinHeap{
    constructor(){ this.a = []; }
    size(){ return this.a.length; }
    push(node){
      const a = this.a;
      a.push(node);
      this._bubbleUp(a.length-1);
    }
    pop(){
      const a = this.a;
      if (!a.length) return null;
      const top = a[0];
      const last = a.pop();
      if (a.length){
        a[0] = last;
        this._sinkDown(0);
      }
      return top;
    }
    _bubbleUp(i){
      const a = this.a;
      while (i > 0){
        const p = (i-1)>>1;
        if (a[p].f <= a[i].f) break;
        const tmp = a[p]; a[p] = a[i]; a[i] = tmp;
        i = p;
      }
    }
    _sinkDown(i){
      const a = this.a;
      const n = a.length;
      while (true){
        const l = i*2+1;
        const r = l+1;
        let m = i;
        if (l < n && a[l].f < a[m].f) m = l;
        if (r < n && a[r].f < a[m].f) m = r;
        if (m === i) break;
        const tmp = a[m]; a[m] = a[i]; a[i] = tmp;
        i = m;
      }
    }
  }

  // =========================================================================
  // DEFAULT-OBSTACLE CALLBACK
  // =========================================================================
  function defaultIsBlockedFactory(opts){
    // opts kann allowStart/allowGoal als Tiles enthalten (werden immer erlaubt)
    const allow = opts?.allow || null;

    const map = window.GameMap?._state || null;
    const grid = map?.grid || null;
    const cols = toInt(map?.cols, 0);
    const rows = toInt(map?.rows, 0);

    // MapResources
    const nodes = window.MapResources?.state?.nodes || [];

    // Game.buildings (Baustellen + fertige Gebäude)
    const buildings = (window.Game?.getBuildings?.() || window.Game?.buildings || []);

    return function isBlocked(tx, ty, allow2){
      // allow2 > allow: (per-call override) – wir nehmen allow2, falls gesetzt.
      const A = allow2 || allow;

      // 0) Start/Ziel erlauben, sonst "im Gebäude gefangen"
      if (A){
        if (A.start && tx === (A.start.x|0) && ty === (A.start.y|0)) return false;
        if (A.goal  && tx === (A.goal.x|0)  && ty === (A.goal.y|0))  return false;
        // Zusätzlich: optional erlaubte Rechtecke (z.B. Ziel-Gebäude-Footprint)
        if (Array.isArray(A.rects)){
          for (const r of A.rects){
            if (!r) continue;
            if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return false;
          }
        }
      }

      // 1) Bounds
      if (tx < 0 || ty < 0) return true;
      if (cols && tx >= cols) return true;
      if (rows && ty >= rows) return true;

      // 2) Wasser / Terrain
      try{
        const tid = grid?.[ty]?.[tx];
        if (DEFAULT_WATER_TILE_IDS.has(tid)) return true;
      }catch(e){ /* ignore */ }

      // 3) MapResources (Trees/Stones/Fish): jede Ressource blockiert aktuell
      //    (später ggf. "walkThrough" oder "passable" pro Resource-Typ)
      if (Array.isArray(nodes) && nodes.length){
        for (const n of nodes){
          if (!n) continue;
          if ((n.x|0) === tx && (n.y|0) === ty) return true;
        }
      }

      // 4) Buildings-Footprints
      if (Array.isArray(buildings) && buildings.length){
        for (const b of buildings){
          if (!b) continue;
          const bx = toInt(b.x, NaN);
          const by = toInt(b.y, NaN);
          const bw = Math.max(1, toInt(b.w, 1));
          const bh = Math.max(1, toInt(b.h, 1));
          if (!Number.isFinite(bx) || !Number.isFinite(by)) continue;
          // Nur fertige Gebäude blockieren den Weg.
          // Baustellen (buildStage 0..2 / status pending/building) bleiben begehbar,
          // damit Träger optisch zur Türkachel liefern können.
          const stage = (typeof b.buildStage === 'number') ? b.buildStage : -1;
          const isDone = (stage >= 3) || (b.status === 'done') || (b.buildPhase === 'complete') || (b.buildPhase === 3);
          if (!isDone) continue;

          if (tx >= bx && tx < bx + bw && ty >= by && ty < by + bh) return true;
        }
      }

      return false;
    };
  }

  // =========================================================================
  // A* (8-dir) – Hauptlogik
  // =========================================================================
  function astar(from, to, opts){
    const t0 = nowMs();

    const map = window.GameMap?._state || null;
    const cols = toInt(opts?.cols ?? map?.cols, 0);
    const rows = toInt(opts?.rows ?? map?.rows, 0);

    // Defensive: ohne Map-Dimensionen keine Suche
    if (!(cols > 0 && rows > 0)){
      WARN('A*: keine gültigen Map-Dimensionen', { cols, rows });
      return { path:null, expanded:0, ms: nowMs()-t0, reason:'no-dims' };
    }

    const start = { x: toInt(from?.x, 0), y: toInt(from?.y, 0) };
    const goal  = { x: toInt(to?.x, 0),   y: toInt(to?.y, 0)   };

    const allowDiagonal = (opts?.allowDiagonal !== false);

    // isBlocked – wenn nicht geliefert, nehmen wir Default
    const allow = {
      start,
      goal,
      rects: Array.isArray(opts?.allowRects) ? opts.allowRects : null
    };
    const isBlocked = (typeof opts?.isBlocked === 'function')
      ? (tx,ty)=> opts.isBlocked(tx,ty,allow)
      : defaultIsBlockedFactory({ allow });

    // Max expansions (Sicherheitsnetz gegen "Freeze")
    const maxNodes = Math.max(500, toInt(opts?.maxNodes, cols * rows * 2));

    const toIndex = (x,y)=> (y * cols + x);

    // Arrays: float/ints
    const gScore = new Float32Array(cols * rows);
    const fScore = new Float32Array(cols * rows);
    const came   = new Int32Array(cols * rows);
    const openF  = new Uint8Array(cols * rows); // open flag
    const closed = new Uint8Array(cols * rows);

    for (let i=0;i<gScore.length;i++){
      gScore[i] = Infinity;
      fScore[i] = Infinity;
      came[i]   = -1;
    }

    const startIdx = toIndex(start.x, start.y);
    gScore[startIdx] = 0;
    fScore[startIdx] = octileHeuristic(start.x, start.y, goal.x, goal.y);

    const open = new MinHeap();
    open.push({ x:start.x, y:start.y, f:fScore[startIdx] });
    openF[startIdx] = 1;

    const dirs = allowDiagonal
      ? [
          {dx: 1, dy: 0, c:1}, {dx:-1, dy: 0, c:1}, {dx: 0, dy: 1, c:1}, {dx: 0, dy:-1, c:1},
          {dx: 1, dy: 1, c:SQRT2}, {dx: 1, dy:-1, c:SQRT2}, {dx:-1, dy: 1, c:SQRT2}, {dx:-1, dy:-1, c:SQRT2},
        ]
      : [
          {dx: 1, dy: 0, c:1}, {dx:-1, dy: 0, c:1}, {dx: 0, dy: 1, c:1}, {dx: 0, dy:-1, c:1},
        ];

    let expanded = 0;

    while (open.size()){
      const cur = open.pop();
      if (!cur) break;

      const ci = toIndex(cur.x, cur.y);
      if (closed[ci]) continue;
      closed[ci] = 1;

      expanded++;
      if (expanded > maxNodes){
        return { path:null, expanded, ms: nowMs()-t0, reason:'maxNodes' };
      }

      // Goal?
      if (cur.x === goal.x && cur.y === goal.y){
        // reconstruct
        const out = [];
        let idx = ci;
        while (idx !== -1){
          const x = idx % cols;
          const y = (idx / cols) | 0;
          out.push({ x, y });
          idx = came[idx];
        }
        out.reverse();
        return { path: out, expanded, ms: nowMs()-t0, reason:'ok' };
      }

      // expand neighbors
      for (const d of dirs){
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;

        // Bounds
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

        // Diagonal corner cutting verhindern:
        // wenn diagonal, müssen beide orthogonalen Nachbarn frei sein.
        if (allowDiagonal && d.dx !== 0 && d.dy !== 0){
          const b1 = isBlocked(cur.x + d.dx, cur.y, allow);
          const b2 = isBlocked(cur.x, cur.y + d.dy, allow);
          if (b1 || b2) continue;
        }

        if (isBlocked(nx, ny, allow)) continue;

        const ni = toIndex(nx, ny);
        if (closed[ni]) continue;

        const tentative = gScore[ci] + d.c;
        if (tentative < gScore[ni]){
          came[ni] = ci;
          gScore[ni] = tentative;
          const f = tentative + octileHeuristic(nx, ny, goal.x, goal.y);
          fScore[ni] = f;
          if (!openF[ni]){
            open.push({ x:nx, y:ny, f });
            openF[ni] = 1;
          }else{
            // Wir pushen dupes – closed[] filtert. Das ist ok & simpel.
            open.push({ x:nx, y:ny, f });
          }
        }
      }
    }

    return { path:null, expanded, ms: nowMs()-t0, reason:'noPath' };
  }

  // =========================================================================
  // SMOOTHING (String Pulling)
  // =========================================================================
  function smoothPath(path, isBlocked, allow){
    if (!Array.isArray(path) || path.length <= 2) return path;

    const out = [];
    let i = 0;
    out.push(path[0]);

    while (i < path.length - 1){
      let j = path.length - 1;
      // finde weitesten Punkt mit Sichtlinie
      for (; j > i + 1; j--){
        if (lineOfSight(path[i], path[j], isBlocked, allow)) break;
      }
      out.push(path[j]);
      i = j;
    }

    return out;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  class AdFinder{
    /**
     * findPath(from,to,opts) -> [{x,y}, ...] | null
     *
     * from/to: {x,y} in Tile-Koordinaten (float erlaubt → wird gefloort)
     * opts:
     *  - cols, rows
     *  - allowDiagonal (default true)
     *  - smooth (default true)
     *  - maxNodes
     *  - isBlocked(tx,ty,allow)  // optional
     *  - allowRects: [{x,y,w,h}, ...] // Tiles die erlaubt sind (z.B. Ziel-Footprint)
     */
    static findPath(from, to, opts={}){
      const a = { x: toInt(from?.x, 0), y: toInt(from?.y, 0) };
      const b = { x: toInt(to?.x,   0), y: toInt(to?.y,   0) };

      const k = keyOf(a,b,opts);
      const t0 = nowMs();

      const res = astar(a, b, opts);
      const raw = res.path;

      // Default isBlocked für smoothing braucht selben allow-Kontext:
      const allow = { start:a, goal:b, rects: Array.isArray(opts?.allowRects) ? opts.allowRects : null };
      const isBlocked = (typeof opts?.isBlocked === 'function')
        ? (tx,ty)=> opts.isBlocked(tx,ty,allow)
        : defaultIsBlockedFactory({ allow });

      let out = raw;
      if (raw && raw.length && (opts?.smooth !== false)){
        out = smoothPath(raw, (tx,ty)=> isBlocked(tx,ty,allow), allow);
      }

      const t1 = nowMs();
      const detail = {
        key      : k,
        reason   : res.reason,
        rawLen   : raw ? raw.length : 0,
        smoothLen: out ? out.length : 0,
        expanded : res.expanded,
        ms       : Math.round((t1 - t0) * 1000) / 1000
      };

      // Debug/Inspector Hook (nicht entfernen!)
      try{
        window.dispatchEvent(new CustomEvent('cb:path:test:done', { detail }));
      }catch(e){}

      return out;
    }
  }

  window.AdFinder = AdFinder;
  LOG('Modul geladen', ADFINDER_VERSION);

})();
