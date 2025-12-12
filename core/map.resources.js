/* ============================================================================
 * Datei   : core/map.resources.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-mapresources-atlas-render (Trees/Stones/Fish)
 *
 * Zweck   :
 *   - Hält zufällige Ressourcen-Spawns (Trees/Stones/Fish)
 *   - Zeichnet sie im WORLD-Space auf dem Main-Canvas (über GameMap.render)
 *   - Nutzt Mega-Atlas Frames:
 *       stones_mega_atlas.json nutzt frame/pivot/anchor  [oai_citation:3‡stones_mega_atlas.json](sediment://file_00000000cb30720aafc246ea388e8c07)
 *       fish_mega_atlas.json nutzt frame/pivot/anchor  [oai_citation:4‡fish_mega_atlas.json.txt](sediment://file_000000007ed8720abe7ae44d1239f904)
 *
 * Debug:
 *   window.MapResources.state
 *   window.MapResources.debugDump()
 * ========================================================================== */

(function(){
  'use strict';

  // =========================================================================
  // LOGGING
  // =========================================================================
  const TAG  = '[map.resources]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // =========================================================================
  // KONFIG / FILTER
  // =========================================================================
  // Wasser-Tiles in deiner Map (wie bei Fish-Production bereits üblich)  [oai_citation:5‡CODES_MONOLITH_Siedler-v4.0.txt](file-service://file-5bTfqQ9UDwP1giK7J39zht)
  const WATER_TILE_IDS = new Set([8, 9]);

  // Basismengen (Start-Sandbox)
  const CFG = {
    trees: { count: 40, clusterChance: 0.45 },
    stones:{ count: 18, clusterChance: 0.35 },
    fish:  { count: 22, clusterChance: 0.55 },

    // Zeichnungs-Skalierung relativ zu tileSize:
    // (Viele Frames sind ~128px, tileSize ist meist 64px → 0.65..0.9 wirkt gut)
    drawScale: {
      tree:  0.95,
      stone: 0.85,
      fish:  0.70
    },

    // Prefix-Filter (optional):
    // - Trees: wenn dein Atlas Epochen hat, nimm z. B. "e1_"
    // - Stones: "e1_" ist sicher (siehe JSON)  [oai_citation:6‡stones_mega_atlas.json](sediment://file_00000000cb30720aafc246ea388e8c07)
    // - Fish: kein Prefix nötig (fish_raw_v01...)  [oai_citation:7‡fish_mega_atlas.json.txt](sediment://file_000000007ed8720abe7ae44d1239f904)
    prefix: {
      tree:  'e1_',
      stone: 'e1_',
      fish:  ''
    }
  };

  // =========================================================================
  // STATE
  // =========================================================================
  const State = {
    initialized: false,
    seed: (Math.random()*1e9)|0,

    // je Eintrag: { id, kind:'tree'|'stone'|'fish', x,y, frame, stage? }
    nodes: [],

    // optional: schnelle Listen
    trees: [],
    stones: [],
    fish: []
  };

  // =========================================================================
  // RNG
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
  // MAP HELPERS
  // =========================================================================
  function getMap(){
    return window.GameMap || window.Map || null;
  }

  function getTileId(x,y){
    const map = getMap();
    const g = map?.grid;
    if (!g) return 0;
    const row = g[y];
    if (!row) return 0;
    return row[x] | 0;
  }

  function isInside(x,y){
    const map = getMap();
    const cols = map?.cols|0;
    const rows = map?.rows|0;
    return (x>=0 && y>=0 && x<cols && y<rows);
  }

  function isWater(x,y){
    return WATER_TILE_IDS.has(getTileId(x,y));
  }

  // Trees sollen NICHT auf Wasser und NICHT direkt auf Stein liegen (vereinfachtes Regelwerk)
  function canPlaceTree(x,y){
    if (!isInside(x,y)) return false;
    if (isWater(x,y)) return false;
    // optional: keine Trees direkt auf "Rock"-Tiles – später besser per Terrain-Regeln
    return true;
  }

  function canPlaceStone(x,y){
    if (!isInside(x,y)) return false;
    // Steine im Wasser selten – hier erstmal: komplett vermeiden
    if (isWater(x,y)) return false;
    return true;
  }

  function canPlaceFish(x,y){
    if (!isInside(x,y)) return false;
    return isWater(x,y);
  }

  // =========================================================================
  // FRAME PICKER (über Assets)
  // =========================================================================
  function pickFrame(kind){
    const A = window.Assets;

    if (!A || !A.state?.ready){
      return null;
    }

    if (kind === 'tree'){
      // trees_mega_atlas (wir filtern epoch1 prefix)
      const p = CFG.prefix.tree || '';
      return A.pickRandomFrame('trees_mega_atlas', p);
    }
    if (kind === 'stone'){
      const p = CFG.prefix.stone || '';
      return A.pickRandomFrame('stones_mega_atlas', p);
    }
    if (kind === 'fish'){
      const p = CFG.prefix.fish || '';
      return A.pickRandomFrame('fish_mega_atlas', p);
    }
    return null;
  }

  // =========================================================================
  // SPAWN LOGIK
  // =========================================================================
  function spawn(kind, count, rng){
    const map = getMap();
    if (!map?.grid) return;

    const cols = map.cols|0;
    const rows = map.rows|0;

    function canPlace(x,y){
      if (kind === 'tree') return canPlaceTree(x,y);
      if (kind === 'stone') return canPlaceStone(x,y);
      if (kind === 'fish') return canPlaceFish(x,y);
      return false;
    }

    // leichter Cluster-Ansatz: manchmal nahe einer existierenden Node spawnen
    function pickBase(){
      const list = (kind === 'tree') ? State.trees
                 : (kind === 'stone')? State.stones
                 : State.fish;

      if (list.length && rng() < (CFG[kind+'s']?.clusterChance ?? 0.0)){
        const n = list[(rng()*list.length)|0];
        return { bx:n.x, by:n.y };
      }
      return null;
    }

    let tries = 0;
    let made  = 0;

    while (made < count && tries < count*80){
      tries++;

      const base = pickBase();
      let x, y;

      if (base){
        x = base.bx + ((rng()*9)|0) - 4;
        y = base.by + ((rng()*9)|0) - 4;
      } else {
        x = (rng()*cols)|0;
        y = (rng()*rows)|0;
      }

      if (!canPlace(x,y)) continue;

      // keine Doppelbelegung auf derselben Tile (simpel)
      if (State.nodes.some(n => n.x===x && n.y===y)) continue;

      const frame = pickFrame(kind); // kann null sein → fallback draw
      const node = {
        id: `${kind}:${State.nodes.length}`,
        kind,
        x, y,
        frame,
        // vorbereitet für Wachstum / Abbau
        stage: (kind === 'tree') ? 3 : 0
      };

      State.nodes.push(node);

      if (kind === 'tree')  State.trees.push(node);
      if (kind === 'stone') State.stones.push(node);
      if (kind === 'fish')  State.fish.push(node);

      made++;
    }

    LOG('spawn', kind, { want: count, made, tries });
  }

  function init(seed){
    if (State.initialized) return;
    if (typeof seed === 'number') State.seed = seed|0;

    const rng = mulberry32(State.seed);

    // Grundspawns
    spawn('tree',  CFG.trees.count,  rng);
    spawn('stone', CFG.stones.count, rng);
    spawn('fish',  CFG.fish.count,   rng);

    State.initialized = true;
    LOG('init ok', { seed: State.seed, nodes: State.nodes.length });
  }

  // =========================================================================
  // DRAW
  // =========================================================================
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;

    // Wenn noch nicht initialisiert: jetzt
    if (!State.initialized) init();

    const ts = tileSize || (window.GameMap?.tileSize) || 64;

    // Zeichnen im WORLD-Space: game.map.js setzt bereits ctx.setTransform(zoom,...)
    //  [oai_citation:8‡game.map.js](sediment://file_00000000e47471f4ba3a10288aba09c9)
    const A = window.Assets;

    // Mittelpunkt der Tile-Oberfläche, NICHT der Unterkante
    for (const n of State.nodes){
      const wx = (n.x * ts) + ts * 0.5;   // Tile center
      const wy = (n.y * ts) + ts * 0.8;   // "Fußpunkt" unten am Tile

      // Atlas-Draw, wenn vorhanden
      if (A && A.state?.ready && n.frame){
        let atlasName = null;
        let scale = 1;

        if (n.kind === 'tree'){  atlasName = 'trees_mega_atlas';  scale = CFG.drawScale.tree; }
        if (n.kind === 'stone'){ atlasName = 'stones_mega_atlas'; scale = CFG.drawScale.stone; }
        if (n.kind === 'fish'){  atlasName = 'fish_mega_atlas';   scale = CFG.drawScale.fish; }

        if (atlasName){
          const ok = A.drawAtlasFrame(ctx, atlasName, n.frame, wx, wy, {
            scale: (ts/128) * scale,   // Frames sind typ. 128-ish → auf tileSize anpassen
            align: 'pivot'
          });
          if (ok) continue; // wenn gezeichnet → fertig
        }
      }

      // Fallback (wenn Atlas fehlt)
      ctx.save();
      if (n.kind === 'tree'){  ctx.fillStyle = 'rgba(0,160,0,0.8)'; }
      if (n.kind === 'stone'){ ctx.fillStyle = 'rgba(140,140,140,0.9)'; }
      if (n.kind === 'fish'){  ctx.fillStyle = 'rgba(0,120,255,0.9)'; }
      ctx.beginPath();
      ctx.arc(wx, wy - ts*0.35, ts*0.18, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // API / DEBUG
  // =========================================================================
  function debugDump(){
    return {
      initialized: State.initialized,
      seed: State.seed,
      nodes: State.nodes.length,
      trees: State.trees.length,
      stones: State.stones.length,
      fish: State.fish.length
    };
  }

  window.MapResources = {
    version: 'v25.12.12-mapresources-atlas-render',
    state: State,
    cfg: CFG,
    init,
    drawOnMainCanvas,
    debugDump
  };

  LOG('bereit', window.MapResources.version);

})();
