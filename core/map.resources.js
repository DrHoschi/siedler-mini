/* ============================================================================
 * Datei   : core/map.resources.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-map-resources-v1
 *
 * Zweck   :
 *   Zentraler Ressourcen-Layer für die Weltkarte:
 *     - Verwaltet alle "natürlichen" Ressourcen-Nodes:
 *         • Bäume  (type: 'tree')
 *         • Steine (type: 'stone')
 *         • Fische (type: 'fish')
 *     - Erzeugt beim Spielstart eine zufällige Startverteilung
 *     - Respektiert Terrain-Regeln:
 *         • Fische NUR auf Wasser-Tiles (IDs 8/9, wie Fisch-Modul)
 *         • Bäume NUR auf Nicht-Wasser-Tiles
 *         • Steine hauptsächlich auf Land, in Clustern
 *
 *   Integration (später):
 *     - Produktionsmodule können MapResources.findNearest(...) nutzen
 *       um Ressourcenknoten in Reichweite zu finden.
 *     - Das Deko-Baumenü kann über MapResources.spawn*/removeNode
 *       zusätzliche Bäume/Steine/Fische setzen oder löschen.
 *     - Renderer kann optional MapResources.drawWorld(...) aufrufen,
 *       um einfache Platzhalter-Symbole (Kreise) darzustellen, bis
 *       die finalen Sprites eingebunden sind.
 *
 * Struktur:
 *   IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → STATE → HAUPTLOGIK (init/tick/draw)
 *   → EVENT-BRIDGE → EXPORT
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ========================================================================
   * IMPORTS / LOGGING
   * ====================================================================== */

  const TAG  = '[map.resources]';
  const LOG  = (...a) => (global.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a) => (global.CBLog?.warn || console.warn)(TAG, ...a);

  /* ========================================================================
   * KONSTANTEN
   * ====================================================================== */

  // Ressourcen-Typen
  const RES_TYPE_TREE  = 'tree';
  const RES_TYPE_STONE = 'stone';
  const RES_TYPE_FISH  = 'fish';

  // Wasser-Tiles (IDs) – identisch zum Fisch-Modul
  // → diese IDs stammen aus deiner map-epoch1.json / Fisch-Modul
  const WATER_TILE_IDS = new Set([8, 9]);

  // Optionale Blocker-Tiles für Bäume (z. B. Lava/Asche/Felsboden)
  // → Werte kannst du später anpassen, wenn du die finalen IDs kennst.
  const TREE_FORBIDDEN_TILE_IDS = new Set([
    // Beispiel: 12, 13, 14, ...   // TODO: an Map anpassen
  ]);

  // Dichten (prozentual pro Tile) – grobe Defaults, können später gebalanced werden
  const TREE_DENSITY    = 0.040;  // ca. 4% aller Land-Tiles
  const STONE_DENSITY   = 0.015;  // ca. 1.5% aller Land-Tiles
  const FISH_DENSITY    = 0.030;  // ca. 3% aller Wasser-Tiles

  // Cluster-Parameter für Steine (Haufen)
  const STONE_CLUSTER_MIN = 3;
  const STONE_CLUSTER_MAX = 7;

  // Limits zur Sicherheit (Performance)
  const MAX_TREES_PER_MAP  = 5000;
  const MAX_STONES_PER_MAP = 3000;
  const MAX_FISH_PER_MAP   = 5000;

  // Wachstums-Parameter für Bäume (simple Demo-Logik)
  const TREE_GROW_TICK_SECONDS = 20;   // alle X Sekunden wächst ein kleiner Anteil nach
  const TREE_SPREAD_RADIUS     = 3;    // in Tiles – in der Nähe vorhandener Bäume
  const TREE_SPREAD_PER_TICK   = 5;    // max. neue Bäume pro Tick

  /* ========================================================================
   * HILFSFUNKTIONEN – RNG / MAP / MATH
   * ====================================================================== */

  // Deterministischer RNG (wie in einigen Produktionsmodulen)
  function makeRng(seedStr) {
    let s = 0;
    for (let i = 0; i < seedStr.length; i++) {
      s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    if (!s) s = 1;
    return function rng() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  }

  function getGameMapState() {
    const GameMap = global.GameMap;
    const state   = GameMap && GameMap._state;
    if (!state || !state.grid) return null;
    return state;
  }

  function getTileIdAt(tx, ty) {
    const map = getGameMapState();
    if (!map) return -1;

    const x = Math.floor(tx);
    const y = Math.floor(ty);

    if (y < 0 || y >= map.rows || x < 0 || x >= map.cols) return -1;
    const row = map.grid[y];
    if (!row) return -1;
    return row[x] | 0;
  }

  function isWaterTileId(id) {
    return WATER_TILE_IDS.has(id | 0);
  }

  function isWaterTile(tx, ty) {
    return isWaterTileId(getTileIdAt(tx, ty));
  }

  function isTreeAllowedTileId(id) {
    id = id | 0;
    if (id <= 0) return false;
    if (WATER_TILE_IDS.has(id)) return false;
    if (TREE_FORBIDDEN_TILE_IDS.has(id)) return false;
    return true;
  }

  function isTreeAllowedTile(tx, ty) {
    const id = getTileIdAt(tx, ty);
    return isTreeAllowedTileId(id);
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function keyXY(x, y) {
    return `${x|0}:${y|0}`;
  }

  /* ========================================================================
   * STATE
   * ====================================================================== */

  const State = {
    initialized : false,
    seed        : 'default',
    rows        : 0,
    cols        : 0,
    // Tile-size (Pixel) – nur für drawWorld hilfreich
    tileSize    : 64,

    trees : [],  // Liste von { id, type:'tree', tx,ty, meta:{...} }
    stones: [],  // Liste von { id, type:'stone', tx,ty, meta:{...} }
    fish  : [],  // Liste von { id, type:'fish', tx,ty, meta:{...} }

    // Schnelle Lookup-Sets, um doppelte Belegung zu vermeiden
    occupied : {
      [RES_TYPE_TREE]  : new Set(), // keyXY -> true
      [RES_TYPE_STONE] : new Set(),
      [RES_TYPE_FISH]  : new Set()
    },

    // Wachstumstimer
    lastTreeGrowTime : performance.now() / 1000
  };

  function resetState() {
    State.initialized = false;
    State.rows = State.cols = 0;
    State.trees.length  = 0;
    State.stones.length = 0;
    State.fish.length   = 0;
    State.occupied[RES_TYPE_TREE].clear();
    State.occupied[RES_TYPE_STONE].clear();
    State.occupied[RES_TYPE_FISH].clear();
  }

  /* ========================================================================
   * HILFSFUNKTIONEN – NODE-MANAGEMENT
   * ====================================================================== */

  let _idCounter = 1;
  function nextId(type) {
    return `${type}-${_idCounter++}`;
  }

  function markOccupied(type, tx, ty) {
    State.occupied[type].add(keyXY(tx, ty));
  }

  function isOccupied(type, tx, ty) {
    return State.occupied[type].has(keyXY(tx, ty));
  }

  function addNode(type, tx, ty, meta = {}) {
    tx = tx | 0;
    ty = ty | 0;

    if (type !== RES_TYPE_TREE &&
        type !== RES_TYPE_STONE &&
        type !== RES_TYPE_FISH) {
      WARN('Unbekannter Ressourcentyp in addNode:', type);
      return null;
    }

    const map = getGameMapState();
    if (!map) return null;
    if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return null;

    // Terrain-Regeln prüfen
    const id = getTileIdAt(tx, ty);

    if (type === RES_TYPE_FISH && !isWaterTileId(id)) {
      // Fische NUR auf Wasser
      return null;
    }
    if (type === RES_TYPE_TREE && !isTreeAllowedTileId(id)) {
      return null;
    }
    if (type === RES_TYPE_STONE && isWaterTileId(id)) {
      // Steine normalerweise NICHT auf Wasser (kannst du bei Bedarf lockern)
      return null;
    }

    // Doppelbelegung verhindern
    if (isOccupied(type, tx, ty)) return null;

    const node = {
      id  : nextId(type),
      type,
      tx,
      ty,
      meta: { ...meta }
    };

    if (type === RES_TYPE_TREE) {
      State.trees.push(node);
    } else if (type === RES_TYPE_STONE) {
      State.stones.push(node);
    } else if (type === RES_TYPE_FISH) {
      State.fish.push(node);
    }

    markOccupied(type, tx, ty);
    return node;
  }

  function removeNodeById(type, nodeId) {
    let list;
    if (type === RES_TYPE_TREE) list = State.trees;
    else if (type === RES_TYPE_STONE) list = State.stones;
    else if (type === RES_TYPE_FISH) list = State.fish;
    else return false;

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
   * ZUFALLS-VERTEILUNG
   * ====================================================================== */

  function buildRandomTrees(rng) {
    const map = getGameMapState();
    if (!map) return;

    const totalTiles = map.cols * map.rows;
    let targetCount  = Math.floor(totalTiles * TREE_DENSITY);
    targetCount      = clamp(targetCount, 0, MAX_TREES_PER_MAP);

    let placed = 0;
    let safety = totalTiles * 5; // Abbruch-Schutz

    while (placed < targetCount && safety-- > 0) {
      const tx = (rng() * map.cols) | 0;
      const ty = (rng() * map.rows) | 0;
      if (!isTreeAllowedTile(tx, ty)) continue;
      const node = addNode(RES_TYPE_TREE, tx, ty, {
        stage     : 'grown',    // später: 'sapling', 'grown', 'old'
        age       : 0,
        maxAge    : 99999,      // Platzhalter
        variant   : (rng() * 4) | 0 // verschiedene Baum-Varianten im Atlas
      });
      if (node) placed++;
    }

    LOG('Random Trees platziert:', placed, 'Ziel:', targetCount);
  }

  function buildRandomStoneClusters(rng) {
    const map = getGameMapState();
    if (!map) return;

    const totalTiles = map.cols * map.rows;
    const targetStones = clamp(
      Math.floor(totalTiles * STONE_DENSITY),
      0,
      MAX_STONES_PER_MAP
    );

    if (targetStones <= 0) return;

    // Grobe Abschätzung: wie viele Cluster?
    const avgClusterSize = (STONE_CLUSTER_MIN + STONE_CLUSTER_MAX) / 2;
    const clusterCount   = clamp(
      Math.floor(targetStones / avgClusterSize),
      1,
      Math.max(1, Math.floor(Math.min(map.cols, map.rows) / 4))
    );

    let placedTotal = 0;

    for (let c = 0; c < clusterCount; c++) {
      // Cluster-Zentrum wählen (Land)
      let cx = 0, cy = 0;
      let tries = 100;
      while (tries-- > 0) {
        cx = (rng() * map.cols) | 0;
        cy = (rng() * map.rows) | 0;
        const id = getTileIdAt(cx, cy);
        if (!isWaterTileId(id)) break;
      }

      const clusterSize = clamp(
        STONE_CLUSTER_MIN + ((STONE_CLUSTER_MAX - STONE_CLUSTER_MIN + 1) * rng() | 0),
        STONE_CLUSTER_MIN,
        STONE_CLUSTER_MAX
      );

      for (let i = 0; i < clusterSize && placedTotal < targetStones; i++) {
        const dx = ((rng() * 3) | 0) - 1; // -1..+1
        const dy = ((rng() * 3) | 0) - 1;
        const tx = clamp(cx + dx, 0, map.cols - 1);
        const ty = clamp(cy + dy, 0, map.rows - 1);

        const node = addNode(RES_TYPE_STONE, tx, ty, {
          size    : 1 + ((rng() * 3) | 0), // kleine/ mittlere/ große Brocken
          hardness: 1.0 + rng() * 0.5
        });
        if (node) placedTotal++;
      }
    }

    LOG('Random Stone-Cluster platziert:', placedTotal, 'Ziel:', targetStones);
  }

  function buildRandomFish(rng) {
    const map = getGameMapState();
    if (!map) return;

    // alle Wasser-Tiles sammeln
    const waterTiles = [];
    for (let y = 0; y < map.rows; y++) {
      const row = map.grid[y];
      for (let x = 0; x < map.cols; x++) {
        const id = row[x] | 0;
        if (isWaterTileId(id)) {
          waterTiles.push({ x, y });
        }
      }
    }

    const totalWater = waterTiles.length;
    if (!totalWater) {
      LOG('Keine Wasser-Tiles gefunden – keine Fische generiert.');
      return;
    }

    let targetCount = Math.floor(totalWater * FISH_DENSITY);
    targetCount     = clamp(targetCount, 0, MAX_FISH_PER_MAP);

    let placed = 0;
    let safety = totalWater * 5;

    while (placed < targetCount && safety-- > 0) {
      const idx = (rng() * waterTiles.length) | 0;
      const { x: tx, y: ty } = waterTiles[idx];

      const node = addNode(RES_TYPE_FISH, tx, ty, {
        // Animation/Atlas-spezifische Daten kannst du später hier reinpacken
        variant     : (rng() * 5) | 0,
        density     : 1 + ((rng() * 3) | 0),
        respawnTime : 30 + (rng() * 60) // Sekunden
      });
      if (node) placed++;
    }

    LOG('Random Fish platziert:', placed, 'Ziel:', targetCount);
  }

  /* ========================================================================
   * HAUPTLOGIK – INIT + TICK + GROW
   * ====================================================================== */

  function init(options = {}) {
    const map = getGameMapState();
    if (!map || !Array.isArray(map.grid)) {
      WARN('init() – GameMap._state noch nicht bereit, später erneut versuchen.');
      return false;
    }

    resetState();

    State.rows     = map.rows | 0;
    State.cols     = map.cols | 0;
    State.tileSize = map.tileSize || 64;
    State.seed     = String(options.seed || map.name || 'default-map');
    State.initialized = true;
    State.lastTreeGrowTime = performance.now() / 1000;

    const rng = makeRng(State.seed);

    buildRandomTrees(rng);
    buildRandomStoneClusters(rng);
    buildRandomFish(rng);

    LOG('MapResources initialisiert für Map:', {
      name: map.name,
      cols: State.cols,
      rows: State.rows,
      seed: State.seed,
      counts: {
        trees : State.trees.length,
        stones: State.stones.length,
        fish  : State.fish.length
      }
    });

    // Inspector/Debug-Hook
    try {
      global.dispatchEvent(new CustomEvent('cb:map:resources:ready', {
        detail: {
          seed : State.seed,
          rows : State.rows,
          cols : State.cols,
          counts: {
            trees : State.trees.length,
            stones: State.stones.length,
            fish  : State.fish.length
          }
        }
      }));
    } catch (e) {
      // optional
    }

    return true;
  }

  // Einfacher Auto-Init, falls Map bereits geladen ist
  function autoInit() {
    if (State.initialized) return;
    const ok = init();
    if (ok) return;
    // Wenn Map noch nicht da → kurze Retry-Schleife
    let tries = 0;
    const t = setInterval(() => {
      if (State.initialized) {
        clearInterval(t);
        return;
      }
      const done = init();
      if (done || ++tries > 20) clearInterval(t);
    }, 250);
  }

  // Sehr einfache Baum-"Wachstums"-Logik (Demo)
  function tick(nowSeconds) {
    if (!State.initialized) return;
    const dt = nowSeconds - State.lastTreeGrowTime;
    if (dt < TREE_GROW_TICK_SECONDS) return;
    State.lastTreeGrowTime = nowSeconds;

    const map = getGameMapState();
    if (!map) return;

    const rng = makeRng(State.seed + ':grow:' + Math.floor(nowSeconds / TREE_GROW_TICK_SECONDS));
    let spawned = 0;

    // Wenn kaum Bäume vorhanden, Rückkehr
    if (!State.trees.length) return;

    const maxNew = TREE_SPREAD_PER_TICK;
    const baseList = State.trees;

    while (spawned < maxNew) {
      // Zufälligen bestehenden Baum nehmen
      const base = baseList[(rng() * baseList.length) | 0];
      const angle = rng() * Math.PI * 2;
      const r     = 1 + Math.floor(rng() * TREE_SPREAD_RADIUS);

      const tx = clamp(base.tx + Math.round(Math.cos(angle) * r), 0, map.cols - 1);
      const ty = clamp(base.ty + Math.round(Math.sin(angle) * r), 0, map.rows - 1);

      if (!isTreeAllowedTile(tx, ty)) {
        continue;
      }

      const node = addNode(RES_TYPE_TREE, tx, ty, {
        stage  : 'sapling',
        age    : 0,
        maxAge : 99999,
        variant: (rng() * 4) | 0
      });

      if (node) {
        spawned++;
      } else {
        // konnte dort keinen Baum platzieren → weiter probieren
      }
    }

    if (spawned > 0) {
      LOG('Baum-Wachstum: +', spawned, 'neue Bäume.');
    }
  }

  // Optionales eigenes Timerchen, falls du Ticks NICHT über GameTick koppeln willst
  (function setupAutoTick() {
    let lastNow = performance.now() / 1000;
    function loop() {
      const now = performance.now() / 1000;
      tick(now);
      lastNow = now;
      global.requestAnimationFrame(loop);
    }
    global.requestAnimationFrame(loop);
  })();

  /* ========================================================================
   * ZEICHNEN – Platzhalter-Darstellung im Weltkoordinatensystem
   * ====================================================================== */

  /**
   * drawWorld(ctx, { tileSize, camera? })
   *  - ctx       : 2D-Context des Haupt-Canvas (bereits mit Kamera-Transform)
   *  - tileSize  : Tile-Größe in Pixeln
   *  - camera    : optional {x,y,zoom}, falls du Filter brauchst
   *
   * Hinweis:
   *  Du kannst das in core/game.map.js nach den Gebäuden einhängen:
   *
   *    if (window.MapResources && typeof window.MapResources.drawWorld === 'function') {
   *      window.MapResources.drawWorld(ctx, { tileSize: ts });
   *    }
   */
  function drawWorld(ctx, options = {}) {
    if (!State.initialized) return;

    const ts = options.tileSize || State.tileSize || 64;

    // Bäume – grüne Kreise
    if (State.trees.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,180,0,0.8)';
      for (const t of State.trees) {
        const x = (t.tx + 0.5) * ts;
        const y = (t.ty + 0.5) * ts;
        ctx.beginPath();
        ctx.arc(x, y, ts * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Steine – graue Quadrate
    if (State.stones.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(140,140,140,0.9)';
      for (const s of State.stones) {
        const x = s.tx * ts + ts * 0.15;
        const y = s.ty * ts + ts * 0.15;
        const w = ts * 0.7;
        const h = ts * 0.7;
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    // Fische – blaue Punkte
    if (State.fish.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,120,220,0.9)';
      for (const f of State.fish) {
        const x = (f.tx + 0.5) * ts;
        const y = (f.ty + 0.5) * ts;
        ctx.beginPath();
        ctx.arc(x, y, ts * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ========================================================================
   * ABFRAGEN – für Produktionsmodule / Deko-Tools
   * ====================================================================== */

  /**
   * findNearest(type, {tx,ty}, maxDistTiles?)
   *  - type  : 'tree' | 'stone' | 'fish'
   *  - pos   : {tx,ty} in Tiles
   *  - maxDistTiles: optionaler maximaler Abstand; wenn gesetzt und
   *                  kein Node innerhalb gefunden wird → null
   */
  function findNearest(type, pos, maxDistTiles) {
    const list = getListByType(type);
    if (!list.length) return null;
    const { tx: sx, ty: sy } = pos || {};
    if (sx == null || sy == null) return null;

    let best = null;
    let bestD2 = Infinity;
    const maxD2 = (maxDistTiles != null) ? (maxDistTiles * maxDistTiles) : Infinity;

    for (const n of list) {
      const d2 = dist2(sx, sy, n.tx, n.ty);
      if (d2 < bestD2 && d2 <= maxD2) {
        bestD2 = d2;
        best   = n;
      }
    }

    return best;
  }

  function getSnapshot() {
    return {
      seed  : State.seed,
      rows  : State.rows,
      cols  : State.cols,
      trees : State.trees.slice(),
      stones: State.stones.slice(),
      fish  : State.fish.slice()
    };
  }

  /* ========================================================================
   * EVENT-BRIDGE – für Inspector / andere Module
   * ====================================================================== */

  try {
    // explizite Initialisierung (falls du später spezielle Seeds setzen willst)
    global.addEventListener('req:map:resources:init', ev => {
      const detail = ev.detail || {};
      init(detail);
    });

    // Debug-Export der Ressourcen
    global.addEventListener('req:map:resources:export', () => {
      const snap = getSnapshot();
      try {
        global.dispatchEvent(new CustomEvent('cb:map:resources:export', {
          detail: snap
        }));
      } catch {
        // optional
      }
    });
  } catch (e) {
    WARN('Event-Bindings konnten nicht registriert werden:', e);
  }

  /* ========================================================================
   * EXPORT
   * ====================================================================== */

  autoInit(); // Standardfall: Map ist "normal" geladen → direkt initialisieren

  global.MapResources = {
    // Meta / State
    get state() { return State; },

    // Main
    init,
    tick,        // falls du doch über GameTick koppeln willst
    drawWorld,

    // Node-API (für Produktionsmodule / Deko-Editor)
    addNode,
    removeNodeById,
    findNearest,
    getSnapshot,

    // Konstanten
    TYPES: {
      TREE : RES_TYPE_TREE,
      STONE: RES_TYPE_STONE,
      FISH : RES_TYPE_FISH
    }
  };

  LOG('Modul geladen (v25.12.11-map-resources-v1)');

})(typeof window !== 'undefined' ? window : this);
