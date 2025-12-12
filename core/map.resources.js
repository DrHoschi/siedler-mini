/* ============================================================================
 * Datei   : core/map.resources.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-map-resources-v1a (EXPORT-FIRST + SAFE-LOG + SAFE-AUTOINIT)
 *
 * WICHTIGER FIX:
 *   - window.MapResources wird SOFORT exportiert (auch wenn Map noch nicht ready).
 *   - autoInit() läuft erst NACH dem Export und ist komplett try/catch-safe.
 *   - Logger-Aufrufe können das Modul NICHT mehr crashen.
 * ========================================================================== */

(function (global) {
  'use strict';

  /* ========================================================================
   * SAFE LOGGER (darf NIE crashen)
   * ====================================================================== */
  const TAG = '[map.resources]';

  function safeCall(fn, args) {
    try { if (typeof fn === 'function') fn.apply(null, args); } catch (_) {}
  }

  function LOG(...a)  { safeCall(global.CBLog?.info ?? console.info,  [TAG, ...a]); }
  function WARN(...a) { safeCall(global.CBLog?.warn ?? console.warn,  [TAG, ...a]); }

  /* ========================================================================
   * KONSTANTEN
   * ====================================================================== */
  const RES_TYPE_TREE  = 'tree';
  const RES_TYPE_STONE = 'stone';
  const RES_TYPE_FISH  = 'fish';

  // Wasser-Tiles (IDs) – bei dir aktuell vermutlich 8/9 (kannst du später anpassen)
  const WATER_TILE_IDS = new Set([8, 9]);

  const TREE_FORBIDDEN_TILE_IDS = new Set([
    // TODO: falls du Lava/Asche/Fels-Tiles sperren willst → IDs hier rein
  ]);

  const TREE_DENSITY  = 0.040;
  const STONE_DENSITY = 0.015;
  const FISH_DENSITY  = 0.030;

  const STONE_CLUSTER_MIN = 3;
  const STONE_CLUSTER_MAX = 7;

  const MAX_TREES_PER_MAP  = 5000;
  const MAX_STONES_PER_MAP = 3000;
  const MAX_FISH_PER_MAP   = 5000;

  const TREE_GROW_TICK_SECONDS = 20;
  const TREE_SPREAD_RADIUS     = 3;
  const TREE_SPREAD_PER_TICK   = 5;

  /* ========================================================================
   * HILFSFUNKTIONEN
   * ====================================================================== */
  function makeRng(seedStr) {
    let s = 0;
    for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
    if (!s) s = 1;
    return function rng() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  }

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function keyXY(x, y) { return `${x|0}:${y|0}`; }

  function getGameMapState() {
    const GameMap = global.GameMap;
    const state = GameMap && GameMap._state;
    if (!state || !state.grid) return null;
    return state;
  }

  function getTileIdAt(tx, ty) {
    const map = getGameMapState();
    if (!map) return -1;
    const x = tx | 0, y = ty | 0;
    if (y < 0 || y >= map.rows || x < 0 || x >= map.cols) return -1;
    const row = map.grid[y];
    if (!row) return -1;
    return row[x] | 0;
  }

  function isWaterTileId(id) { return WATER_TILE_IDS.has(id | 0); }

  function isTreeAllowedTileId(id) {
    id |= 0;
    if (id <= 0) return false;
    if (WATER_TILE_IDS.has(id)) return false;
    if (TREE_FORBIDDEN_TILE_IDS.has(id)) return false;
    return true;
  }

  /* ========================================================================
   * STATE
   * ====================================================================== */
  const State = {
    initialized : false,
    seed        : 'default',
    rows        : 0,
    cols        : 0,
    tileSize    : 64,

    trees : [],
    stones: [],
    fish  : [],

    occupied : {
      [RES_TYPE_TREE]  : new Set(),
      [RES_TYPE_STONE] : new Set(),
      [RES_TYPE_FISH]  : new Set()
    },

    lastTreeGrowTime : 0
  };

  function resetState() {
    State.initialized = false;
    State.rows = State.cols = 0;
    State.trees.length = 0;
    State.stones.length = 0;
    State.fish.length = 0;
    State.occupied[RES_TYPE_TREE].clear();
    State.occupied[RES_TYPE_STONE].clear();
    State.occupied[RES_TYPE_FISH].clear();
    State.lastTreeGrowTime = (performance?.now?.() ?? Date.now()) / 1000;
  }

  /* ========================================================================
   * NODE API
   * ====================================================================== */
  let _idCounter = 1;
  function nextId(type) { return `${type}-${_idCounter++}`; }
  function markOccupied(type, tx, ty) { State.occupied[type].add(keyXY(tx, ty)); }
  function isOccupied(type, tx, ty) { return State.occupied[type].has(keyXY(tx, ty)); }

  function addNode(type, tx, ty, meta = {}) {
    tx |= 0; ty |= 0;

    if (type !== RES_TYPE_TREE && type !== RES_TYPE_STONE && type !== RES_TYPE_FISH) return null;

    const map = getGameMapState();
    if (!map) return null;
    if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return null;

    const id = getTileIdAt(tx, ty);

    if (type === RES_TYPE_FISH && !isWaterTileId(id)) return null;
    if (type === RES_TYPE_TREE && !isTreeAllowedTileId(id)) return null;
    if (type === RES_TYPE_STONE && isWaterTileId(id)) return null;

    if (isOccupied(type, tx, ty)) return null;

    const node = { id: nextId(type), type, tx, ty, meta: { ...meta } };

    if (type === RES_TYPE_TREE) State.trees.push(node);
    else if (type === RES_TYPE_STONE) State.stones.push(node);
    else State.fish.push(node);

    markOccupied(type, tx, ty);
    return node;
  }

  function removeNodeById(type, nodeId) {
    const list =
      type === RES_TYPE_TREE  ? State.trees :
      type === RES_TYPE_STONE ? State.stones :
      type === RES_TYPE_FISH  ? State.fish : null;

    if (!list) return false;

    const idx = list.findIndex(n => n.id === nodeId);
    if (idx < 0) return false;

    const n = list[idx];
    list.splice(idx, 1);
    State.occupied[type].delete(keyXY(n.tx, n.ty));
    return true;
  }

  function getListByType(type) {
    if (type === RES_TYPE_TREE) return State.trees;
    if (type === RES_TYPE_STONE) return State.stones;
    if (type === RES_TYPE_FISH) return State.fish;
    return [];
  }

  /* ========================================================================
   * RANDOM GENERATION
   * ====================================================================== */
  function buildRandomTrees(rng) {
    const map = getGameMapState(); if (!map) return;
    let target = clamp(Math.floor(map.cols * map.rows * TREE_DENSITY), 0, MAX_TREES_PER_MAP);

    let placed = 0, safety = map.cols * map.rows * 5;
    while (placed < target && safety-- > 0) {
      const tx = (rng() * map.cols) | 0;
      const ty = (rng() * map.rows) | 0;
      const id = getTileIdAt(tx, ty);
      if (!isTreeAllowedTileId(id)) continue;
      if (addNode(RES_TYPE_TREE, tx, ty, { stage: 'grown', variant: (rng() * 4) | 0 })) placed++;
    }
    LOG('Random Trees:', placed, '/', target);
  }

  function buildRandomStoneClusters(rng) {
    const map = getGameMapState(); if (!map) return;
    const target = clamp(Math.floor(map.cols * map.rows * STONE_DENSITY), 0, MAX_STONES_PER_MAP);
    if (target <= 0) return;

    const avgCluster = (STONE_CLUSTER_MIN + STONE_CLUSTER_MAX) / 2;
    const clusterCount = clamp(Math.floor(target / avgCluster), 1, 9999);

    let placedTotal = 0;
    for (let c = 0; c < clusterCount && placedTotal < target; c++) {
      let cx = 0, cy = 0, tries = 100;
      while (tries-- > 0) {
        cx = (rng() * map.cols) | 0;
        cy = (rng() * map.rows) | 0;
        if (!isWaterTileId(getTileIdAt(cx, cy))) break;
      }

      const size = clamp(
        STONE_CLUSTER_MIN + (((STONE_CLUSTER_MAX - STONE_CLUSTER_MIN + 1) * rng()) | 0),
        STONE_CLUSTER_MIN, STONE_CLUSTER_MAX
      );

      for (let i = 0; i < size && placedTotal < target; i++) {
        const dx = (((rng() * 3) | 0) - 1);
        const dy = (((rng() * 3) | 0) - 1);
        const tx = clamp(cx + dx, 0, map.cols - 1);
        const ty = clamp(cy + dy, 0, map.rows - 1);

        if (addNode(RES_TYPE_STONE, tx, ty, { size: 1 + ((rng() * 3) | 0) })) placedTotal++;
      }
    }
    LOG('Random Stones:', placedTotal, '/', target);
  }

  function buildRandomFish(rng) {
    const map = getGameMapState(); if (!map) return;

    const water = [];
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        if (isWaterTileId(map.grid[y][x] | 0)) water.push({ x, y });
      }
    }
    if (!water.length) { LOG('Fish: no water tiles'); return; }

    const target = clamp(Math.floor(water.length * FISH_DENSITY), 0, MAX_FISH_PER_MAP);

    let placed = 0, safety = water.length * 5;
    while (placed < target && safety-- > 0) {
      const p = water[(rng() * water.length) | 0];
      if (addNode(RES_TYPE_FISH, p.x, p.y, { variant: (rng() * 5) | 0 })) placed++;
    }
    LOG('Random Fish:', placed, '/', target);
  }

  /* ========================================================================
   * INIT / TICK
   * ====================================================================== */
  function init(options = {}) {
    const map = getGameMapState();
    if (!map || !Array.isArray(map.grid)) {
      // Kein WARN mehr hier → niemals beim frühen Start crashen/spammen
      return false;
    }

    resetState();

    State.rows = map.rows | 0;
    State.cols = map.cols | 0;
    State.tileSize = map.tileSize || 64;
    State.seed = String(options.seed || map.name || 'default-map');
    State.initialized = true;
    State.lastTreeGrowTime = (performance?.now?.() ?? Date.now()) / 1000;

    const rng = makeRng(State.seed);
    buildRandomTrees(rng);
    buildRandomStoneClusters(rng);
    buildRandomFish(rng);

    LOG('init ok:', { seed: State.seed, trees: State.trees.length, stones: State.stones.length, fish: State.fish.length });
    return true;
  }

  function tick(nowSeconds) {
    if (!State.initialized) return;

    const dt = nowSeconds - State.lastTreeGrowTime;
    if (dt < TREE_GROW_TICK_SECONDS) return;
    State.lastTreeGrowTime = nowSeconds;

    const map = getGameMapState(); if (!map) return;
    if (!State.trees.length) return;

    const rng = makeRng(State.seed + ':grow:' + Math.floor(nowSeconds / TREE_GROW_TICK_SECONDS));
    let spawned = 0;

    while (spawned < TREE_SPREAD_PER_TICK) {
      const base = State.trees[(rng() * State.trees.length) | 0];
      const angle = rng() * Math.PI * 2;
      const r = 1 + Math.floor(rng() * TREE_SPREAD_RADIUS);

      const tx = clamp(base.tx + Math.round(Math.cos(angle) * r), 0, map.cols - 1);
      const ty = clamp(base.ty + Math.round(Math.sin(angle) * r), 0, map.rows - 1);

      const id = getTileIdAt(tx, ty);
      if (!isTreeAllowedTileId(id)) continue;

      if (addNode(RES_TYPE_TREE, tx, ty, { stage: 'sapling', variant: (rng() * 4) | 0 })) spawned++;
    }

    if (spawned) LOG('tree grow +', spawned);
  }

  function drawWorld(ctx, options = {}) {
    if (!State.initialized) return;
    const ts = options.tileSize || State.tileSize || 64;

    // Bäume – grün
    if (State.trees.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,180,0,0.8)';
      for (const t of State.trees) {
        const x = (t.tx + 0.5) * ts;
        const y = (t.ty + 0.5) * ts;
        ctx.beginPath();
        ctx.arc(x, y, ts * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Steine – grau
    if (State.stones.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(140,140,140,0.9)';
      for (const s of State.stones) {
        ctx.fillRect(s.tx * ts + ts * 0.18, s.ty * ts + ts * 0.18, ts * 0.64, ts * 0.64);
      }
      ctx.restore();
    }

    // Fische – blau
    if (State.fish.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,120,220,0.9)';
      for (const f of State.fish) {
        const x = (f.tx + 0.5) * ts;
        const y = (f.ty + 0.5) * ts;
        ctx.beginPath();
        ctx.arc(x, y, ts * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function findNearest(type, pos, maxDistTiles) {
    const list = getListByType(type);
    if (!list.length) return null;
    const sx = pos?.tx, sy = pos?.ty;
    if (sx == null || sy == null) return null;

    let best = null, bestD2 = Infinity;
    const maxD2 = maxDistTiles != null ? (maxDistTiles * maxDistTiles) : Infinity;

    for (const n of list) {
      const d2 = dist2(sx, sy, n.tx, n.ty);
      if (d2 < bestD2 && d2 <= maxD2) { bestD2 = d2; best = n; }
    }
    return best;
  }

  function getSnapshot() {
    return {
      seed: State.seed, rows: State.rows, cols: State.cols,
      trees: State.trees.slice(), stones: State.stones.slice(), fish: State.fish.slice()
    };
  }

  /* ========================================================================
   * EXPORT (WICHTIG: vor autoInit!)
   * ====================================================================== */
  global.MapResources = {
    get state() { return State; },

    init,
    tick,
    drawWorld,

    addNode,
    removeNodeById,
    findNearest,
    getSnapshot,

    TYPES: { TREE: RES_TYPE_TREE, STONE: RES_TYPE_STONE, FISH: RES_TYPE_FISH }
  };

  /* ========================================================================
   * AUTOINIT (safe)
   * ====================================================================== */
  function autoInit() {
    try {
      if (State.initialized) return;
      if (init()) return;

      let tries = 0;
      const t = setInterval(() => {
        try {
          if (State.initialized) { clearInterval(t); return; }
          if (init()) { clearInterval(t); return; }
          if (++tries > 40) clearInterval(t);
        } catch (e) {
          clearInterval(t);
          WARN('autoInit interval crash:', e);
        }
      }, 250);
    } catch (e) {
      WARN('autoInit crash:', e);
    }
  }

  // optional: Wachstumsticker (harmlos, tut nichts bis initialized=true)
  (function setupAutoTick() {
    try {
      if (!global.requestAnimationFrame) return;
      function loop() {
        try {
          const now = (performance?.now?.() ?? Date.now()) / 1000;
          tick(now);
        } catch (e) {
          WARN('tick loop crash:', e);
        }
        global.requestAnimationFrame(loop);
      }
      global.requestAnimationFrame(loop);
    } catch (e) {
      WARN('setupAutoTick crash:', e);
    }
  })();

  autoInit();
  LOG('Modul geladen (v25.12.11-map-resources-v1a)');

})(typeof window !== 'undefined' ? window : this);
