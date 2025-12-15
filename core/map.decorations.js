/* ============================================================================
 * Datei   : core/map.decorations.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.15-mapdecorations-deco-atlas (Plants/Props, NON-Resource)
 *
 * Zweck   :
 *   - Spawnt & verwaltet rein dekorative Objekte (Pflanzen/Props) pro Map-Tile
 *   - Zeichnet sie im WORLD-Space auf dem Main-Canvas (über GameMap.render)
 *   - Nutzt Atlas-Frames aus deinem Deco-Pack (keine Ressourcen, kein Abbau)
 *
 * Quelle/Grundlagen:
 *   - Tile-Legende aus map-epoch1.json (1 grass, 5 forest, 6 rock, 8 water, 9 sand) fileciteturn2file16
 *   - Frame-Namen/Packer-Format aus deco_plants_iso_settlersstyle_v3_atlas_compact.json fileciteturn3file4
 *   - Stil/Pattern übernommen von core/map.resources.js (init→spawn→draw + req/cb Events) fileciteturn2file7
 *
 * WICHTIG (Integration):
 *   1) Assets: Atlas unter einem Key registrieren (Default hier: 'deco_plants_mega_atlas')
 *   2) Render: In game.map.js (oder wo du Ressourcen zeichnest) zusätzlich aufrufen:
 *        MapDecorations.drawOnMainCanvas(ctx, cam, tileSize);
 *      idealerweise NACH Terrain und NACH Ressourcen, aber VOR Units/HUD.
 *
 * Debug/Inspector:
 *   window.MapDecorations.state
 *   window.MapDecorations.snapshot()
 *   window.dispatchEvent(new Event('req:mapdeco:snapshot'))
 * ========================================================================== */

(function(){
  'use strict';

  // =========================================================================
  // LOGGING
  // =========================================================================
  const TAG  = '[map.decorations]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // =========================================================================
  // KONFIG – MAP TILE IDS (aus map-epoch1.json -> metadata.legend) fileciteturn2file16
  // =========================================================================
  // ACHTUNG:
  // In map.resources.js war WATER_TILE_IDS = [8,9]. In der Map-Legende ist 9 aber "sand".
  // Für Deko verwenden wir die Legende. Wenn du 9 als "ShallowWater" nutzt, ändere es hier.
  const TILE = {
    GRASS:  1,
    FOREST: 5,
    ROCK:   6,
    WATER:  8,
    SAND:   9
  };

  // =========================================================================
  // KONFIG – DECO ATLAS
  // =========================================================================
  const CFG = {
    // Atlas-Key, wie er im Asset-System registriert wird:
    // Beispiel (Pseudo): Assets.registerAtlas('deco_plants_mega_atlas', '...json', '...png');
    atlasName: 'deco_plants_mega_atlas',

    // Spawn-Mengen (für ~35x32 Tiles passt das gut; bei größeren Karten hochdrehen)
    counts: {
      grassClumps: 95,
      shrubs:      55,
      flowers:     40,
      mushrooms:   24,
      cattails:    18,
      waterlily:   10,
      logs:         7,
      rocksSmall:  16,
      rocksLarge:   9,
      boulders:     6
    },

    // Clustering: höhere Werte = mehr "Patch"-Look
    clusterChance: {
      grassClumps: 0.45,
      shrubs:      0.40,
      flowers:     0.35,
      mushrooms:   0.55,
      cattails:    0.60,
      waterlily:   0.70,
      logs:        0.30,
      rocksSmall:  0.30,
      rocksLarge:  0.25,
      boulders:    0.20
    },

    // Zeichnungs-Skalierung relativ zu tileSize.
    // Deco-Frames sind meist ~256px sourceSize (siehe Atlas). fileciteturn3file0
    drawScale: {
      grassClumps: 0.90,
      shrubs:      1.05,
      flowers:     0.90,
      mushrooms:   0.80,
      cattails:    1.00,
      waterlily:   0.95,
      logs:        1.10,
      rocksSmall:  0.85,
      rocksLarge:  0.95,
      boulders:    1.00
    },

    // Wie stark dürfen sich Deko-Objekte innerhalb der Tile verschieben?
    // (kleines "natürliches Chaos")
    jitter: {
      px: 0.22, // Anteil von tileSize
      py: 0.12  // Anteil von tileSize
    },

    // Layering: default ist nach y sortieren (schön für ISO-Look)
    sortByY: true
  };

  // =========================================================================
  // STATE
  // =========================================================================
  const State = {
    initialized: false,
    seed: (Math.random()*1e9)|0,

    // je Eintrag: { id, kind, x,y, frame, ox,oy }
    nodes: []
  };

  // =========================================================================
  // RNG (wie in map.resources.js) fileciteturn2file12
  // =========================================================================
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // =========================================================================
  // MAP HELPERS (robust: grid ODER tiles)
  // =========================================================================
  function getMap(){
    // In diesem Projekt liegt der echte Map-State unter GameMap._state (wie map.resources.js) fileciteturn2file12
    if (window.GameMap && window.GameMap._state) return window.GameMap._state;
    return window.Map || null;
  }

  function getGrid(map){
    if (!map) return null;
    return map.grid || map.tiles || null;
  }

  function getColsRows(map){
    const g = getGrid(map);
    const rows = (map?.rows|0) || (Array.isArray(g) ? g.length : 0);
    const cols = (map?.cols|0) || (Array.isArray(g?.[0]) ? g[0].length : 0);
    return { cols, rows };
  }

  function getTileId(x,y){
    const map = getMap();
    const g = getGrid(map);
    if (!g) return 0;
    const row = g[y];
    if (!row) return 0;
    return row[x] | 0;
  }

  function isInside(x,y){
    const map = getMap();
    const {cols, rows} = getColsRows(map);
    return (x>=0 && y>=0 && x<cols && y<rows);
  }

  function isWater(x,y){ return getTileId(x,y) === TILE.WATER; }
  function isSand(x,y){  return getTileId(x,y) === TILE.SAND; }
  function isGrass(x,y){ return getTileId(x,y) === TILE.GRASS; }
  function isForest(x,y){return getTileId(x,y) === TILE.FOREST; }
  function isRock(x,y){  return getTileId(x,y) === TILE.ROCK; }

  function countNeighbors4(x,y, predicate){
    let c = 0;
    if (predicate(x+1,y)) c++;
    if (predicate(x-1,y)) c++;
    if (predicate(x,y+1)) c++;
    if (predicate(x,y-1)) c++;
    return c;
  }

  function isShoreWaterTile(x,y){
    // Wasser-Tile, das mindestens 1 Landnachbar hat
    if (!isWater(x,y)) return false;
    const land = (nx,ny)=>isInside(nx,ny) && !isWater(nx,ny);
    return countNeighbors4(x,y, land) > 0;
  }

  function isLandNextToWater(x,y){
    if (!isInside(x,y) || isWater(x,y)) return false;
    const w = (nx,ny)=>isInside(nx,ny) && isWater(nx,ny);
    return countNeighbors4(x,y, w) > 0;
  }

  // =========================================================================
  // OPTIONAL: Kollision vermeiden mit Ressourcen (Trees/Stones/Fish) – wenn vorhanden
  // =========================================================================
  function isOccupiedByResource(x,y){
    const res = window.MapResources?.state?.nodes;
    if (!Array.isArray(res)) return false;
    return res.some(n => n && n.x===x && n.y===y);
  }

  function isOccupiedByDeco(x,y){
    return State.nodes.some(n => n.x===x && n.y===y);
  }

  // =========================================================================
  // FRAME PICKER (über Assets) – nutzt Prefixe aus deinem Atlas fileciteturn3file4
  // =========================================================================
  function pickByPrefix(prefix){
    const A = window.Assets;
    if (!A || !A.state?.ready) return null;
    return A.pickRandomFrame(CFG.atlasName, prefix);
  }

  function pickFrameForKind(kind){
    // Wir arbeiten bewusst über Prefixe, damit du später einfach neue Frames ergänzen kannst.
    switch (kind){
      case 'grassClumps': return pickByPrefix('deco_grass_clump_');
      case 'shrubs': {
        // Mischlook: runde Büsche + Beerenbusch selten
        if (Math.random() < 0.18) return pickByPrefix('deco_shrub_berries_');
        return pickByPrefix('deco_shrub_round_');
      }
      case 'flowers': {
        return (Math.random() < 0.55) ? pickByPrefix('deco_flowers_blue_') : pickByPrefix('deco_flowers_yellow_');
      }
      case 'mushrooms': {
        return (Math.random() < 0.55) ? pickByPrefix('deco_mushroom_red_') : pickByPrefix('deco_mushroom_brown_');
      }
      case 'cattails':   return pickByPrefix('deco_cattails_');
      case 'waterlily':  return pickByPrefix('deco_waterlily_');
      case 'logs':       return pickByPrefix('deco_log_');
      case 'rocksSmall': return pickByPrefix('deco_rocks_small_');
      case 'rocksLarge': return pickByPrefix('deco_rocks_large_');
      case 'boulders':   return pickByPrefix('deco_boulder_');
      default: return null;
    }
  }

  // =========================================================================
  // PLACEMENT RULES – hier ist der Punkt, den du am leichtesten selbst tunen kannst
  // =========================================================================
  function canPlace(kind, x,y){
    if (!isInside(x,y)) return false;
    if (isOccupiedByDeco(x,y)) return false;

    // Optional: Ressourcen nicht überdecken (kannst du auskommentieren, wenn egal)
    if (isOccupiedByResource(x,y)) return false;

    // Kind-spezifisch:
    if (kind === 'waterlily'){
      // nur Wasser und nur in Ufernähe
      return isShoreWaterTile(x,y);
    }

    if (kind === 'cattails'){
      // nur Land in Wassernähe (oft auf Sand / Ufer)
      if (!isLandNextToWater(x,y)) return false;
      return isSand(x,y) || isGrass(x,y);
    }

    if (kind === 'mushrooms'){
      // typisch im Wald/Schattig: forest + grass direkt an forest
      if (isForest(x,y)) return true;
      if (isGrass(x,y)){
        const nearForest = (nx,ny)=>isInside(nx,ny) && isForest(nx,ny);
        return countNeighbors4(x,y, nearForest) > 0;
      }
      return false;
    }

    if (kind === 'logs'){
      // Logs eher am Waldrand / forest / grass neben forest
      if (isForest(x,y)) return true;
      if (isGrass(x,y)){
        const nearForest = (nx,ny)=>isInside(nx,ny) && isForest(nx,ny);
        return countNeighbors4(x,y, nearForest) > 0;
      }
      return false;
    }

    if (kind === 'rocksLarge' || kind === 'boulders'){
      // große Steine: lieber auf ROCK-Tiles
      return isRock(x,y);
    }

    if (kind === 'rocksSmall'){
      // kleine Steine: sand/rock/grass ok, aber NICHT im Wasser
      if (isWater(x,y)) return false;
      return isSand(x,y) || isRock(x,y) || isGrass(x,y);
    }

    if (kind === 'shrubs'){
      // Büsche: grass/forest (nicht auf sand/rock/water)
      return isGrass(x,y) || isForest(x,y);
    }

    if (kind === 'grassClumps'){
      // Grasbüschel: grass/sand (auf sand selten ok)
      return isGrass(x,y) || isSand(x,y);
    }

    if (kind === 'flowers'){
      // Blumen: hauptsächlich grass, selten am Waldrand
      if (isGrass(x,y)) return true;
      if (isForest(x,y)) return Math.random() < 0.10;
      return false;
    }

    return false;
  }

  // =========================================================================
  // SPAWN – ähnlich wie map.resources.js, aber pro Deco-Kategorie fileciteturn2file11
  // =========================================================================
  function spawn(kind, count, rng){
    const map = getMap();
    const g = getGrid(map);
    const {cols, rows} = getColsRows(map);
    if (!g || !cols || !rows) return;

    // Patch-Base (für Clustering)
    const listOfThisKind = ()=>State.nodes.filter(n => n.kind === kind);

    function pickBase(){
      const list = listOfThisKind();
      if (list.length && rng() < (CFG.clusterChance[kind] ?? 0.0)){
        const n = list[(rng()*list.length)|0];
        return { bx:n.x, by:n.y };
      }
      return null;
    }

    let tries = 0;
    let made  = 0;

    while (made < count && tries < count*120){
      tries++;

      const base = pickBase();
      let x, y;

      if (base){
        x = base.bx + ((rng()*7)|0) - 3;
        y = base.by + ((rng()*7)|0) - 3;
      } else {
        x = (rng()*cols)|0;
        y = (rng()*rows)|0;
      }

      if (!canPlace(kind, x,y)) continue;

      const frame = pickFrameForKind(kind); // kann null sein → Fallback-Kreis
      const node = {
        id: `${kind}:${State.nodes.length}`,
        kind,
        x, y,
        frame,

        // kleine zufällige Verschiebung innerhalb der Tile
        ox: ((rng()*2)-1) * CFG.jitter.px,
        oy: ((rng()*2)-1) * CFG.jitter.py
      };

      State.nodes.push(node);
      made++;
    }

    LOG('spawn', kind, { want: count, made, tries });
  }

  function _mapIsReady(){
    const map = getMap();
    const g = getGrid(map);
    const {cols, rows} = getColsRows(map);
    return !!(g && cols>0 && rows>0);
  }

  function init(seed){
    if (State.initialized) return;
    if (typeof seed === 'number') State.seed = seed|0;

    const rng = mulberry32(State.seed);

    // Reihenfolge bewusst: erst "Untergrundnah", dann "größer"
    spawn('grassClumps', CFG.counts.grassClumps, rng);
    spawn('flowers',     CFG.counts.flowers,     rng);
    spawn('shrubs',      CFG.counts.shrubs,      rng);
    spawn('mushrooms',   CFG.counts.mushrooms,   rng);

    // Ufer / Wasser
    spawn('cattails',    CFG.counts.cattails,    rng);
    spawn('waterlily',   CFG.counts.waterlily,   rng);

    // Props / Steine
    spawn('logs',        CFG.counts.logs,        rng);
    spawn('rocksSmall',  CFG.counts.rocksSmall,  rng);
    spawn('rocksLarge',  CFG.counts.rocksLarge,  rng);
    spawn('boulders',    CFG.counts.boulders,    rng);

    // optional: sort für sauberes Back-to-Front
    if (CFG.sortByY){
      State.nodes.sort((a,b)=> (a.y - b.y) || (a.x - b.x));
    }

    State.initialized = true;
    LOG('init ok', { seed: State.seed, nodes: State.nodes.length });
  }

  // =========================================================================
  // DRAW (WORLD-Space wie MapResources) fileciteturn2file18
  // =========================================================================
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;

    // erst initialisieren, wenn Map bereit ist
    if (!State.initialized){
      if (!_mapIsReady()) return;
      init();
    }

    const ts = tileSize || (window.GameMap?.tileSize) || 64;
    const A  = window.Assets;

    for (const n of State.nodes){
      // Tile-Fußpunkt (wie in map.resources.js) fileciteturn2file10
      const wx = (n.x * ts) + ts * (0.5 + (n.ox || 0));
      const wy = (n.y * ts) + ts * (0.82 + (n.oy || 0));

      // Atlas-Draw, wenn vorhanden
      if (A && A.state?.ready && n.frame){
        const scale = CFG.drawScale[n.kind] ?? 1.0;

        // Frames sind sourceSize 256 (Atlas) → auf tileSize skalieren fileciteturn3file0
        const ok = A.drawAtlasFrame(ctx, CFG.atlasName, n.frame, wx, wy, {
          scale: (ts/256) * scale,
          align: 'pivot'
        });

        if (ok) continue;
      }

      // Fallback (wenn Atlas fehlt)
      ctx.save();
      ctx.fillStyle = 'rgba(0,200,0,0.75)';
      if (n.kind === 'waterlily') ctx.fillStyle = 'rgba(20,170,120,0.85)';
      if (n.kind === 'rocksSmall' || n.kind === 'rocksLarge' || n.kind === 'boulders') ctx.fillStyle = 'rgba(160,160,160,0.85)';
      ctx.beginPath();
      ctx.arc(wx, wy, ts * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // STEP 1 – Debug/Tools API: regen / clear / snapshot + Events für Inspector
  // =========================================================================
  function _resetState(keepSeed = true){
    const seed = State.seed;

    State.initialized = false;
    State.nodes.length = 0;

    if (keepSeed) State.seed = seed;
  }

  function snapshot(options = {}){
    const limit = Number.isFinite(options.limit) ? options.limit : 300;
    const nodes = State.nodes.slice(0, Math.max(0, limit)).map(n => ({
      id: n.id,
      kind: n.kind,
      x: n.x, y: n.y,
      frame: n.frame || null,
      ox: n.ox ?? 0,
      oy: n.oy ?? 0
    }));

    return {
      version: window.MapDecorations?.version || 'unknown',
      initialized: State.initialized,
      seed: State.seed,
      counts: { nodes: State.nodes.length },
      sample: nodes,
      note: (State.nodes.length > limit) ? `sample limited to ${limit}` : 'full list (<= limit)'
    };
  }

  function exportJSON(pretty = true){
    // Voll-Export aller Nodes – zum Copy&Paste in eine Datei / Inspector-Tab
    const payload = {
      id: (getMap()?.id) || 'unknown-map',
      seed: State.seed,
      nodes: State.nodes.map(n => ({
        kind: n.kind, x: n.x, y: n.y, frame: n.frame || null, ox: n.ox ?? 0, oy: n.oy ?? 0
      }))
    };
    return JSON.stringify(payload, null, pretty ? 2 : 0);
  }

  function regen(seed){
    if (Number.isFinite(seed)) State.seed = seed | 0;

    _resetState(true);

    if (_mapIsReady()){
      init(State.seed);
      window.dispatchEvent(new CustomEvent('cb:mapdeco:changed', { detail: snapshot() }));
      return true;
    }

    // Map noch nicht ready – drawOnMainCanvas init() später
    window.dispatchEvent(new CustomEvent('cb:mapdeco:changed', { detail: snapshot({limit:50}) }));
    return false;
  }

  function clear(){
    _resetState(true);
    State.initialized = true; // draw soll nicht auto-init machen
    window.dispatchEvent(new CustomEvent('cb:mapdeco:changed', { detail: snapshot() }));
  }

  // Events (Inspector kompatibel)
  window.addEventListener('req:mapdeco:snapshot', ()=>{
    window.dispatchEvent(new CustomEvent('cb:mapdeco:snapshot', { detail: snapshot() }));
  });

  window.addEventListener('req:mapdeco:regen', (e)=>{
    const seed = e?.detail?.seed;
    const ok = regen(seed);
    window.dispatchEvent(new CustomEvent('cb:mapdeco:regen', { detail: { ok, seed: State.seed, snap: snapshot() } }));
  });

  window.addEventListener('req:mapdeco:clear', ()=>{
    clear();
    window.dispatchEvent(new CustomEvent('cb:mapdeco:clear', { detail: snapshot() }));
  });

  // =========================================================================
  // API / DEBUG
  // =========================================================================
  function debugDump(){
    return {
      initialized: State.initialized,
      seed: State.seed,
      nodes: State.nodes.length
    };
  }

  window.MapDecorations = {
    version: 'v25.12.15-mapdecorations-deco-atlas',
    state: State,
    cfg: CFG,
    init,
    drawOnMainCanvas,
    debugDump,

    // Tools
    regen,
    clear,
    snapshot,
    exportJSON
  };

  LOG('bereit', window.MapDecorations.version);

})();
