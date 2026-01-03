/* ============================================================================
 * Datei    : core/map.animals.js
 * Version  : v26.01.13-animals-no-water-deerSpriteAtlas
 *
 * Zweck:
 *   - Rehe & Füchse als "dynamische Ressourcen" (wandern auf der Map)
 *   - Rendering im WORLD-Space (GameMap setzt Kamera-Transform)
 *   - Integration über GameMap.globalYSort() als Drawables
 *
 * WICHTIG (Tiles vs Pixel):
 *   - Tiere speichern Position als WORLD-Pixel (x/y float).
 *   - Für Logik (z.B. Jagd) können wir worldToTile ableiten.
 * ========================================================================== */
(function(){
  'use strict';

  const TAG  = '[MapAnimals]';
  const LOG  = (...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN = (...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  // ------------------------------------------------------------
  // KONFIG
  // ------------------------------------------------------------
  const CFG = {
  enabled: true,

  // ----------------------------------------------------------
  // Spawn / Counts (Hard-Cap damit nicht „zu viele“ Tiere rumlaufen)
  // ----------------------------------------------------------
  // Hinweis: spawn-Zahlen sind gewünschte Zielanzahl pro Tierart.
  // Das System respektiert maxTotal als Obergrenze.
  maxTotal: 14,
  spawn: { deer: 6, fox: 3, rabbit: 0, boar: 0 },

  // ----------------------------------------------------------
  // Bewegung
  // ----------------------------------------------------------
  speedPxPerSec: { deer: 18, fox: 26, rabbit: 22, boar: 20 }, // „siedlerige“ Bewegung
  targetJitterPx: 96,                   // Zielpunkt im Umkreis
  retargetEverySec: [1.8, 4.2],          // Zufallsintervall

  // ----------------------------------------------------------
  // Draw / Assets
  // ----------------------------------------------------------
  // IMPORTANT: Keys müssen exakt mit core/asset.js loadAtlas(...) matchen.
  atlas:       { deer:'deer_sprite_atlas', fox:'fox_atlas', rabbit:'rabbit_atlas', boar:'boar_atlas' },
  framePrefix: { deer:'deer',             fox:'fox',       rabbit:'rabbit',       boar:'boar' },

  // Skalierung (User-Wunsch: Reh 0.35, Fuchs 0.30)
  // Später (Option B) ziehen wir das aus Registry/Rules. Dafür ist getAnimalScale() schon vorbereitet.
  scale: { deer: 0.35, fox: 0.30, rabbit: 0.30, boar: 0.38 },

  // E/W-Flip Toggle: bleibt erst mal MASTER=true für alle Tiere,
  // weil unser aktuelles Iso/Screen-Delta in der Map ggf. gespiegelt ist.
  // WICHTIG: Wenn wir später das Projekt-Koordinatensystem komplett vereinheitlichen,
  // kann flipEW wieder auf false oder komplett entfernt werden.
  flipEW: { deer: true, fox: true, rabbit: true, boar: true },

  // ----------------------------------------------------------
  // Forest-Bias: Spawn bevorzugt dort, wo viele Bäume sind
  // ----------------------------------------------------------
  spawnPreferTrees: true,
  forestCellSizeTiles: 8,   // grobe Zellgröße für Baum-Dichte-Histogramm
  forestPickRadiusTiles: 10, // um Hotspot herum
  forestSamples: 120,        // wie viele Tree-Nodes fürs Histogramm genutzt werden

  // ----------------------------------------------------------
  // Für später: Jagd/Respawn
  // ----------------------------------------------------------
  respawnSec: { deer: 18, fox: 24, rabbit: 18, boar: 26 },

  // ----------------------------------------------------------
  // Water avoidance
  // ----------------------------------------------------------
  avoidWater: true,
  landPickTries: 18
};

// ------------------------------------------------------------
// CFG Helpers (Option B Vorbereitung: später Registry/Rules)
// ------------------------------------------------------------
function getAnimalScale(kind){
  return (CFG.scale && CFG.scale[kind] != null) ? CFG.scale[kind] : 1.0;
}


  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  const State = {
    ready   : false,
    mapId   : null,
    cols    : 0,
    rows    : 0,
    tileSize: 64,
    animals : [],        // aktive Tiere
    dead    : [],        // respawn queue
    _t      : 0,
    _warnedNoWaterAPI: false
  };

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  function rand(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

  function tileCenterToWorld(tx,ty,ts){
    // Unser GameMap rendert orthogonal in WORLD-Pixel: tileTopLeft = tx*ts, ty*ts
    // Zentrum: +0.5
    return { x:(tx+0.5)*ts, y:(ty+0.5)*ts };
  }

  function worldToTile(x,y,ts){
    return { tx: Math.floor(x/ts), ty: Math.floor(y/ts) };
  }
function tileToWorld(tx, ty, ts){
  // Tile-Mitte als World-Pixel (Screen-Grid, nicht Iso-Projection).
  // Für unsere einfache Animal-Wanderung reicht das völlig.
  return { x: (tx + 0.5) * ts, y: (ty + 0.5) * ts };
}


  // ------------------------------------------------------------------------
  // Map / Tile access (best effort). If unknown -> do NOT block.
  // ------------------------------------------------------------------------
  function getTileIdAt(tx, ty){
    try{
      if (window.GameMap && typeof window.GameMap.getTileId === 'function'){
        return window.GameMap.getTileId(tx, ty);
      }
      if (window.Map && typeof window.Map.getTileId === 'function'){
        return window.Map.getTileId(tx, ty);
      }
      if (window.Game && window.Game.map && typeof window.Game.map.getTileId === 'function'){
        return window.Game.map.getTileId(tx, ty);
      }
    }catch(e){
      // ignore
    }
    return null;
  }

  function isWaterTile(tx, ty){
    // 1) direct APIs
    try{
      if (window.GameMap && typeof window.GameMap.isWaterTile === 'function'){
        return !!window.GameMap.isWaterTile(tx, ty);
      }
      if (window.GameRules && typeof window.GameRules.isWaterTile === 'function'){
        return !!window.GameRules.isWaterTile(tx, ty);
      }
      if (window.MapRules && typeof window.MapRules.isWaterTile === 'function'){
        return !!window.MapRules.isWaterTile(tx, ty);
      }
    }catch(e){
      // ignore
    }

    // 2) tileId fallback
    const id = getTileIdAt(tx, ty);
    if (id == null){
      if (!State._warnedNoWaterAPI){
        State._warnedNoWaterAPI = true;
        WARN('No isWaterTile()/getTileId() found -> water-block disabled (best effort).');
      }
      return false; // IMPORTANT: unknown -> allow
    }

    const TILE = window.TILE || window.Tiles || null;
    if (TILE && TILE.WATER != null){
      return (id|0) === (TILE.WATER|0);
    }

    const waterIds = window.GameMap?.waterIds || window.GameRules?.waterIds || window.MapRules?.waterIds;
    if (waterIds && typeof waterIds.has === 'function'){
      return waterIds.has(id|0);
    }

    return false;
  }

  function pickLandPointAround(x, y, rad){
    const ts = State.tileSize || 64;
    for (let i=0;i<CFG.landPickTries;i++){
      const p = randomPointAround(x, y, rad);
      const t = worldToTile(p.x, p.y, ts);
      if (!CFG.avoidWater || !isWaterTile(t.tx, t.ty)) return p;
    }
    return randomPointAround(x, y, rad);
  }

  function chooseSpawnNearHQ(){
    // Wir versuchen HQ-Position aus bekannten Quellen zu finden.
    // Wenn nicht: Map-Mitte.
    const ts = State.tileSize || 64;

    // 1) Game.buildings (falls vorhanden)
    const blds = window.Game?.buildings || window.GameBuildings?.list || null;
    if (Array.isArray(blds)){
      const hq = blds.find(b=> (b.id||b.kind) === 'b.hq');
      if (hq && Number.isFinite(hq.x) && Number.isFinite(hq.y)){
        const tx = clamp(Math.floor(hq.x), 1, Math.max(1,State.cols-2));
        const ty = clamp(Math.floor(hq.y), 1, Math.max(1,State.rows-2));
        return tileCenterToWorld(tx,ty,ts);
      }
// ------------------------------------------------------------
// Forest Hotspot Spawn (Bäume-Dichte)
// ------------------------------------------------------------
function _getMapResourcesState(){
  // MapResources ist bei dir je nach Stand manchmal .state oder .State
  return window.MapResources?.state || window.MapResources?.State || null;
}

function _isTreeLike(node){
  const s = (node?.kind || node?.type || node?.id || node?.name || '').toString().toLowerCase();
  return s.includes('tree') || s.includes('baum') || s.includes('pine') || s.includes('oak');
}

function _treeNodesToTileList(nodes){
  const out = [];
  const ts = State.tileSize || 64;
  for (const n of (nodes || [])){
    if (!n) continue;
    // bevorzugt tile coords
    let tx = n.tx ?? n.TX ?? n.tileX ?? n.gridX;
    let ty = n.ty ?? n.TY ?? n.tileY ?? n.gridY;
    if (tx == null || ty == null){
      // fallback world coords
      const x = n.x ?? n.px ?? n.worldX;
      const y = n.y ?? n.py ?? n.worldY;
      if (x != null && y != null){
        const t = worldToTile(x, y, ts);
        tx = t.tx; ty = t.ty;
      }
    }
    if (tx == null || ty == null) continue;
    out.push({ tx: tx|0, ty: ty|0 });
  }
  return out;
}

function getTreeTiles(){
  // Heuristik: wir suchen in MapResources nach möglichen Baum-Arrays
  const st = _getMapResourcesState();
  if (!st) return [];
  const candidates = [];

  // häufige Feldnamen
  if (Array.isArray(st.trees)) candidates.push(...st.trees);
  if (Array.isArray(st.decos)) candidates.push(...st.decos);
  if (Array.isArray(st.decorations)) candidates.push(...st.decorations);
  if (Array.isArray(st.nodes)) candidates.push(...st.nodes);

  // wenn nichts gefunden: versuche alle Array-Felder aus state zu scannen (vorsichtig)
  if (candidates.length === 0){
    for (const k of Object.keys(st)){
      const v = st[k];
      if (Array.isArray(v) && v.length && typeof v[0] === 'object'){
        // nur wenn es „tree-like“ Einträge enthält
        if (v.some(_isTreeLike)) candidates.push(...v);
      }
    }
  }

  // filter: nur tree-like
  const trees = candidates.filter(_isTreeLike);
  return _treeNodesToTileList(trees);
}

function chooseSpawnForestHotspot(){
  const ts = State.tileSize || 64;
  const trees = getTreeTiles();
  if (!trees.length){
    return chooseSpawnNearHQ(); // fallback
  }

  const cell = Math.max(2, CFG.forestCellSizeTiles|0);
  const samples = Math.min(CFG.forestSamples|0, trees.length);
  const hist = new Map();

  // sample first N (oder random falls viele)
  for (let i=0; i<samples; i++){
    const t = trees[(Math.random()*trees.length)|0];
    const cx = (t.tx / cell) | 0;
    const cy = (t.ty / cell) | 0;
    const key = cx + ',' + cy;
    hist.set(key, (hist.get(key)||0) + 1);
  }

  // best cell
  let bestKey = null, best = -1;
  for (const [k,v] of hist.entries()){
    if (v > best){ best = v; bestKey = k; }
  }
  if (!bestKey){
    // fallback: random tree tile
    const t = trees[(Math.random()*trees.length)|0];
    return tileToWorld(t.tx, t.ty, ts);
  }

  const [cx, cy] = bestKey.split(',').map(n=>parseInt(n,10));
  const centerTx = cx * cell + (cell>>1);
  const centerTy = cy * cell + (cell>>1);

  // pick a land point around hotspot
  const radTiles = Math.max(3, CFG.forestPickRadiusTiles|0);
  const centerWorld = tileToWorld(centerTx, centerTy, ts);
  return pickLandPointAround(centerWorld.x, centerWorld.y, radTiles * ts);
}

    }

    // 2) Production BUILDINGS_BY_UID cache (enthält b.hq nach build complete)
    const prod = window.Production?._buildings;
    if (prod && typeof prod.get === 'function'){
      for (const v of prod.values()){
        if (v?.id === 'b.hq' && Number.isFinite(v.x) && Number.isFinite(v.y)){
          return tileCenterToWorld(Math.floor(v.x), Math.floor(v.y), ts);
        }
      }
    }

    // 3) Fallback: Map-Mitte
    const mx = Math.floor(State.cols/2);
    const my = Math.floor(State.rows/2);
    return tileCenterToWorld(mx,my,ts);
  }

  function randomPointAround(x,y,rad){
    return {
      x: x + rand(-rad, rad),
      y: y + rand(-rad, rad)
    };
  }

  function pickDirectionFromDelta(dx, dy, kind){
  // ----------------------------------------------------------
  // Richtungsauswahl (8 Richtungen) – CLOCKWISE
  // ----------------------------------------------------------
  // WICHTIG:
  // - In Canvas/Screen ist Y nach unten positiv.
  // - atan2(dy, dx) liefert: 0° = rechts(E), 90° = unten(S), 180° = links(W), 270° = oben(N).
  //
  // Unsere Sprite-Reihenfolge ist (im Uhrzeigersinn):
  // N → NE → E → SE → S → SW → W → NW
  //
  // Für die Auswahl mappen wir den Winkel aber direkt auf die 8 Labels.
  // Falls E/W später nach einer Koordinaten-Vereinheitlichung „plötzlich“ wieder passt,
  // kann CFG.flipEW[...] auf false gestellt werden (siehe CFG-Kommentar).
  const ang = Math.atan2(dy, dx); // -pi..pi
  const deg = (ang * 180 / Math.PI + 360) % 360;

  // E=0, SE=45, S=90, SW=135, W=180, NW=225, N=270, NE=315
  let dir;
  if (deg < 22.5 || deg >= 337.5) dir = 'E';
  else if (deg < 67.5)  dir = 'SE';
  else if (deg < 112.5) dir = 'S';
  else if (deg < 157.5) dir = 'SW';
  else if (deg < 202.5) dir = 'W';
  else if (deg < 247.5) dir = 'NW';
  else if (deg < 292.5) dir = 'N';
  else                  dir = 'NE';

  // Optionaler E/W-Flip (MASTER=true für alle Tiere aktuell).
  if (kind && CFG.flipEW && CFG.flipEW[kind]){
    if (dir === 'E') dir = 'W';
    else if (dir === 'W') dir = 'E';
    else if (dir === 'NE') dir = 'NW';
    else if (dir === 'NW') dir = 'NE';
    else if (dir === 'SE') dir = 'SW';
    else if (dir === 'SW') dir = 'SE';
  }
  return dir;
}


  function makeAnimal(kind, x, y){
    const uid = `${kind}@${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    return {
      uid,
      kind,                 // 'deer' | 'fox' | 'rabbit' | 'boar'
      scale: getAnimalScale(kind),
      x, y,                 // WORLD-Pixel
      vx:0, vy:0,
      dir:'S',
      animT:0,
      animF:0,
      nextRetarget: rand(CFG.retargetEverySec[0], CFG.retargetEverySec[1]),
      target: pickLandPointAround(x,y,CFG.targetJitterPx)
    };
  }

  function ensureInsideMap(a){
    const ts = State.tileSize || 64;
    const maxX = State.cols*ts;
    const maxY = State.rows*ts;
    a.x = clamp(a.x, ts*0.5, maxX - ts*0.5);
    a.y = clamp(a.y, ts*0.5, maxY - ts*0.5);
    a.target.x = clamp(a.target.x, ts*0.5, maxX - ts*0.5);
    a.target.y = clamp(a.target.y, ts*0.5, maxY - ts*0.5);
  }

  // ------------------------------------------------------------
  // INIT / RESET
  // ------------------------------------------------------------
  function reset(){
  State.animals.length = 0;
  State.dead.length = 0;
  State._t = 0;
  State.ready = true;

  // Spawn-Base: bevorzugt Wald-Hotspots, sonst HQ/Mitte.
  const base = (CFG.spawnPreferTrees ? chooseSpawnForestHotspot() : chooseSpawnNearHQ());

  function spawnKind(kind, n, rad){
    for (let i=0; i<n; i++){
      if (State.animals.length >= (CFG.maxTotal|0)) return;
      const p = pickLandPointAround(base.x, base.y, rad);
      const a = makeAnimal(kind, p.x, p.y);
      ensureInsideMap(a);
      State.animals.push(a);
    }
  }

  spawnKind('deer',   CFG.spawn.deer|0,   320);
  spawnKind('fox',    CFG.spawn.fox|0,    380);
  spawnKind('rabbit', CFG.spawn.rabbit|0, 340);
  spawnKind('boar',   CFG.spawn.boar|0,   420);

  LOG('spawned', State.animals.length, 'animals', CFG.spawnPreferTrees ? '(forest-hotspot)' : '(near HQ/middle)');
}

    for (let i=0;i<CFG.spawn.fox;i++){
      const p = pickLandPointAround(base.x, base.y, 260);
      const a = makeAnimal('fox', p.x, p.y);
      ensureInsideMap(a);
      State.animals.push(a);
    }

    LOG('spawned', State.animals.length, 'animals near HQ/middle');
  }

  // ------------------------------------------------------------
  // TICK
  // ------------------------------------------------------------
  function tick(dt){
    if (!CFG.enabled || !State.ready) return;
    State._t += dt;

    const ts = State.tileSize || 64;

    // Respawn (einfach)
    for (let i=State.dead.length-1;i>=0;i--){
      const d = State.dead[i];
      d.t -= dt;
      if (d.t <= 0){
        State.dead.splice(i,1);
        const base = chooseSpawnNearHQ();
        const p = randomPointAround(base.x, base.y, 380);
        const a = makeAnimal(d.kind, p.x, p.y);
        ensureInsideMap(a);
        State.animals.push(a);
      }
    }

    for (const a of State.animals){
      a.nextRetarget -= dt;
      if (a.nextRetarget <= 0){
        a.nextRetarget = rand(CFG.retargetEverySec[0], CFG.retargetEverySec[1]);
        a.target = pickLandPointAround(a.x, a.y, CFG.targetJitterPx);
        ensureInsideMap(a);
      }

      const dx = a.target.x - a.x;
      const dy = a.target.y - a.y;
      const dist = Math.hypot(dx,dy);

      const sp = CFG.speedPxPerSec[a.kind] || 18;

      if (dist > 1){
        const nx = dx / dist;
        const ny = dy / dist;

        const nextX = a.x + nx * sp * dt;
        const nextY = a.y + ny * sp * dt;

        if (CFG.avoidWater){
          const nt = worldToTile(nextX, nextY, ts);
          if (isWaterTile(nt.tx, nt.ty)){
            // Block: force retarget to land
            a.nextRetarget = 0;
          } else {
            a.x = nextX;
            a.y = nextY;
            a.dir = pickDirectionFromDelta(nx, ny, a.kind);
          }
        } else {
          a.x = nextX;
          a.y = nextY;
          a.dir = pickDirectionFromDelta(nx, ny, a.kind);
        }
      }

      // Anim
      a.animT += dt;
      if (a.animT >= 0.12){
        a.animT = 0;
        a.animF = (a.animF + 1) % 8;
      }

      ensureInsideMap(a);
    }
  }

  // ------------------------------------------------------------
  // DRAWABLES für GameMap.globalYSort
  // ------------------------------------------------------------
  function collectDrawables(out, cam, tileSize){
    if (!CFG.enabled || !State.ready) return;
    const Assets = window.Assets;
    if (!Assets?.drawAtlasFrame) return;

    for (const a of State.animals){
      const atlasName = CFG.atlas[a.kind];
      const prefix    = CFG.framePrefix[a.kind];
      const frameName = `${prefix}_${a.dir}_walk_${a.animF}`;

      // Y-Sort: wir sortieren nach "Fußpunkt" (a.y)
      out.push({
        y: a.y,
        draw(ctx){
          // Welt-Pixel: wir zeichnen zentriert am Fußpunkt
          Assets.drawAtlasFrame(ctx, atlasName, frameName, a.x, a.y, {
            anchor: { x: 0.5, y: 0.90 }, // Fußpunkt ~ 90%
            scale : a.scale,
          });
        }
      });
    }
  }

  // ------------------------------------------------------------
  // JAGD-API (für game.production.hunt.js)
  // ------------------------------------------------------------
  function findNearestInRadius(worldX, worldY, radiusPx, allowKinds){
    let best = null;
    let bestD = Infinity;
    const r2 = radiusPx*radiusPx;
    for (const a of State.animals){
      if (allowKinds && !allowKinds.includes(a.kind)) continue;
      const dx = a.x - worldX;
      const dy = a.y - worldY;
      const d2 = dx*dx + dy*dy;
      if (d2 <= r2 && d2 < bestD){
        bestD = d2;
        best = a;
      }
    }
    return best;
  }

  function consumeAnimal(uid){
    const idx = State.animals.findIndex(a=>a.uid===uid);
    if (idx === -1) return null;
    const a = State.animals[idx];
    State.animals.splice(idx,1);
    // Respawn (einfach)
    const t = CFG.respawnSec[a.kind] ?? 20;
    State.dead.push({ kind:a.kind, t });
    return a;
  }

  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------
  window.addEventListener('cb:map:ready', (ev)=>{
    const d = ev?.detail || {};
    State.mapId    = d.mapId || null;
    State.cols     = d.cols || d.w || d.width  || State.cols;
    State.rows     = d.rows || d.h || d.height || State.rows;
    State.tileSize = d.tileSize || State.tileSize;

    if (!State.cols || !State.rows){
      WARN('map:ready ohne cols/rows – spawn verschoben');
      return;
    }
    reset();
  });

  // Wenn neues Spiel startet, aber map:ready evtl. schon war: respawn trotzdem
  window.addEventListener('cb:game:start', ()=>{
    if (State.cols && State.rows){
      reset();
    }
  });

  // Expose
  window.MapAnimals = {
    id:'MapAnimals',
    CFG,
    State,
    tick,
    collectDrawables,
    worldToTile: (x,y)=>worldToTile(x,y, State.tileSize||64),
    isWaterTile,
    findNearestInRadius,
    consumeAnimal
  };

  LOG('loaded', { enabled: CFG.enabled });
})();
