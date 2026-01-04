/* ============================================================================
 * Datei   : core/map.animals.js
 * Projekt : Neue Siedler – Siedler-Mini
 * Version : v26.01.04-animals-forestspawn-dirfix-scales-v1
 *
 * Ziel:
 *  - Tiere spawnen bevorzugt in/nahe FOREST-Tiles ("wo viele Bäume sind")
 *  - Tiere laufen NICHT auf Wasser
 *  - Richtung/Dir-Mapping ist identisch zur SpriteTest-Tab-Definition:
 *      N → NE → E → SE → S → SW → W → NW  (Uhrzeigersinn)
 *  - Per-Species Scale (deer/fox/boar/rabbit)
 *  - Robuste Fallbacks (wenn FOREST nicht verfügbar → random Land)
 *  - Debug/Logs bleiben drin (wichtig für Stabilität)
 *
 * WICHTIG: Dieses Modul ist bewusst tolerant gebaut:
 *  - Wenn Atlas fehlt, wird Species automatisch deaktiviert (mit Log).
 *  - Wenn Map-State/TileSize anders benannt ist, werden Fallbacks genutzt.
 * ============================================================================ */

(function(){
  'use strict';

  // --------------------------------------------------------------------------
  // Helpers: Logging (CBLog bevorzugt)
  // --------------------------------------------------------------------------
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console);
  const INFO = (window.CBLog?.info || console.info).bind(console);
  const WARN = (window.CBLog?.warn || console.warn).bind(console);

  // --------------------------------------------------------------------------
  // Konfiguration
  // --------------------------------------------------------------------------
  const CFG = {
    enabled: true,

    // Max Tiere global (Sicherheitsbremse)
    maxTotal: 18,

    // Wie oft pro Sekunde bewegen wir? (nur einfache "wander"-Logik)
    tickHz: 10,

    // Wie weit (in Tiles) darf ein Tier "als Ziel" suchen?
    targetRadiusTiles: 10,

    // Spawn: wie viele Kandidaten testen wir beim Suchen?
    spawnCandidates: 220,

    // Forest-Scoring: wie viele FOREST-Tiles im Radius (in Tiles) zählen wir
    forestScoreRadius: 3,

    // Debug:
    debug: {
      logs: true,
      drawDebug: false, // (optional) Box/Pivot/Dir im Render
    }
  };

  // --------------------------------------------------------------------------
  // Tileset IDs – muss zu eurem Map-System passen.
  // (Wenn das später mal global umgestellt wird: hier die IDs anpassen.)
  // --------------------------------------------------------------------------
  const TILE = {
    WATER: 8,
    FOREST: 5,
  };

  // --------------------------------------------------------------------------
  // Dir-Mapping (Uhrzeigersinn): N,NE,E,SE,S,SW,W,NW
  // --------------------------------------------------------------------------
  const DIR_ORDER = ['N','NE','E','SE','S','SW','W','NW'];

  function dirIndexFromDelta(dx, dy){
    // dx/dy in "tile space" oder "world space" mit y nach unten positiv.
    // Wir nutzen atan2(dy, dx) (0 = Ost). Dann zu 8 Sektoren.
    const ang = Math.atan2(dy, dx); // [-pi..pi]
    // Sektorbreite 45°
    // 0 rad (Ost) soll -> 'E' (Index 2)
    // Wir verschieben deshalb so, dass Nord ( -90° ) auf Index 0 landet.
    // Nord in atan2 ist -pi/2 (dy<0). Wir addieren +pi/2.
    let a = ang + Math.PI/2;
    // normalize [0..2pi)
    while(a < 0) a += Math.PI*2;
    while(a >= Math.PI*2) a -= Math.PI*2;
    const idx = Math.round(a / (Math.PI/4)) % 8;
    return idx; // 0..7 in N..NW
  }

  // --------------------------------------------------------------------------
  // Species-Definition
  //  - prefix muss zu deinem Atlas passen (z.B. deer_)
  //  - frame pattern: <prefix><dir>_walk_<i>
  // --------------------------------------------------------------------------
  const SPECIES = {
    deer: {
      id: 'deer',
      enabled: true,
      atlasKey: 'deer_sprite_atlas',
      prefix: 'deer_',
      framesPerDir: 8,
      scale: 0.35,
      maxCount: 8,
      speedPx: 28, // "world px/s" – wird im Tick umgesetzt
    },
    fox: {
      id: 'fox',
      enabled: true,
      atlasKey: 'fox_sprite_atlas',
      prefix: 'fox_',
      framesPerDir: 8,
      scale: 0.30,
      maxCount: 6,
      speedPx: 32,
    },
    rabbit: {
      id: 'rabbit',
      enabled: true,
      atlasKey: 'rabbit_sprite_atlas',
      prefix: 'rabbit_',
      framesPerDir: 8,
      scale: 0.30,
      maxCount: 6,
      speedPx: 36,
    },
    boar: {
      id: 'boar',
      enabled: true,
      atlasKey: 'boar_sprite_atlas',
      prefix: 'boar_',
      framesPerDir: 8,
      scale: 0.42,
      maxCount: 4,
      speedPx: 26,
    },
  };

  // --------------------------------------------------------------------------
  // Internal state
  // --------------------------------------------------------------------------
  let _bus = null;
  let _map = null;
  let _assets = null;
  let _timer = null;

  /** @type {Array<{id:string,species:string,tx:number,ty:number,x:number,y:number,dir:number,frame:number,targetTx:number,targetTy:number}>} */
  const _animals = [];

  // --------------------------------------------------------------------------
  // Helpers: Map access (robust)
  // --------------------------------------------------------------------------
  function getMapState(){
    return _map? (_map._state || _map.state || _map.s || _map) : null;
  }

  function getTileSize(){
    const st = getMapState();
    return st?.tileSize || st?.TILE_SIZE || st?.ts || 64;
  }

  function getGrid(){
    const st = getMapState();
    return st?.grid || st?.tiles || st?.map || null;
  }

  function inBounds(tx, ty){
    const g = getGrid();
    if(!g) return false;
    return ty >= 0 && ty < g.length && tx >= 0 && tx < g[0].length;
  }

  function tileIdAt(tx, ty){
    const g = getGrid();
    if(!g) return null;
    if(!inBounds(tx,ty)) return null;
    return g[ty][tx];
  }

  function isWater(tx, ty){
    return tileIdAt(tx,ty) === TILE.WATER;
  }

  function isLand(tx, ty){
    const id = tileIdAt(tx,ty);
    if(id == null) return false;
    return id !== TILE.WATER;
  }

  function isForest(tx, ty){
    return tileIdAt(tx,ty) === TILE.FOREST;
  }

  function tileToWorld(tx, ty){
    const ts = getTileSize();
    // eure Map ist top-down grid: world center pro Tile
    return { x: (tx + 0.5) * ts, y: (ty + 0.5) * ts };
  }

  // --------------------------------------------------------------------------
  // Spawn logic: finde "waldigsten" Punkt
  // --------------------------------------------------------------------------
  function forestScore(tx, ty){
    const r = CFG.forestScoreRadius;
    let score = 0;
    for(let yy = ty - r; yy <= ty + r; yy++){
      for(let xx = tx - r; xx <= tx + r; xx++){
        if(!inBounds(xx,yy)) continue;
        if(isForest(xx,yy)) score++;
      }
    }
    return score;
  }

  function pickForestSpawn(){
    const g = getGrid();
    if(!g) return null;

    const h = g.length;
    const w = g[0].length;

    let best = null;
    let bestScore = -1;

    for(let i=0; i<CFG.spawnCandidates; i++){
      const tx = (Math.random() * w) | 0;
      const ty = (Math.random() * h) | 0;

      if(!isLand(tx,ty)) continue;

      const s = forestScore(tx,ty);
      if(s > bestScore){
        bestScore = s;
        best = {tx,ty,score:s};
        // early exit: sehr hoher score => gut genug
        if(bestScore >= (CFG.forestScoreRadius*2+1)**2 * 0.6) break;
      }
    }

    // Wenn gar kein Forest gefunden wird, fällt score evtl. 0 aus.
    // Das ist okay: dann spawnen wir trotzdem auf Land.
    return best;
  }

  function pickRandomLand(){
    const g = getGrid();
    if(!g) return null;
    const h = g.length;
    const w = g[0].length;
    for(let i=0; i<400; i++){
      const tx = (Math.random() * w) | 0;
      const ty = (Math.random() * h) | 0;
      if(isLand(tx,ty)) return {tx,ty,score:0};
    }
    return null;
  }

  function pickSpawnTile(){
    return pickForestSpawn() || pickRandomLand();
  }

  // --------------------------------------------------------------------------
  // Target selection: innerhalb Radius ein Land-Tile wählen, bevorzugt forest
  // --------------------------------------------------------------------------
  function pickTargetFrom(tx, ty){
    const r = CFG.targetRadiusTiles;
    let best = null;
    let bestScore = -1;

    for(let i=0; i<80; i++){
      const dx = ((Math.random()* (r*2+1))|0) - r;
      const dy = ((Math.random()* (r*2+1))|0) - r;
      const nx = tx + dx;
      const ny = ty + dy;
      if(!inBounds(nx,ny)) continue;
      if(!isLand(nx,ny)) continue;

      // "mehr Bäume" bevorzugen
      const s = forestScore(nx,ny);
      if(s > bestScore){
        bestScore = s;
        best = {tx:nx, ty:ny};
      }
    }

    // fallback: irgendein Land
    if(!best){
      const r2 = pickRandomLand();
      if(r2) best = {tx:r2.tx, ty:r2.ty};
    }

    return best;
  }

  // --------------------------------------------------------------------------
  // Assets validation: prüfen, ob Atlas + erste Frames existieren
  // --------------------------------------------------------------------------
  function hasAtlas(atlasKey){
    return !!(_assets && (_assets.atlases?.[atlasKey] || _assets._atlases?.[atlasKey] || window.Assets?.atlases?.[atlasKey]));
  }

  function getAtlas(atlasKey){
    return _assets?.atlases?.[atlasKey] || _assets?._atlases?.[atlasKey] || window.Assets?.atlases?.[atlasKey] || null;
  }

  function frameName(sp, dirIdx, frameIdx){
    const dir = DIR_ORDER[dirIdx] || 'S';
    return `${sp.prefix}${dir}_walk_${frameIdx}`;
  }

  function validateSpecies(sp){
    if(!sp.enabled) return false;
    const atlas = getAtlas(sp.atlasKey);
    if(!atlas){
      if(CFG.debug.logs) WARN(`[animals] Atlas fehlt: ${sp.atlasKey} (Species ${sp.id} deaktiviert)`);
      return false;
    }
    // minimal check: alle 8 Richtungen Frame 0
    const missing = [];
    for(let d=0; d<8; d++){
      const fn = frameName(sp, d, 0);
      if(!atlas.frames?.[fn]) missing.push(fn);
    }
    if(missing.length){
      WARN(`[animals] Species ${sp.id}: Missing frames (mindestens Idle) →`, missing.slice(0,8));
      // Trotzdem zulassen (du willst Atlas später fertig machen). Wir zeichnen dann nur, wenn Frame existiert.
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // Spawning
  // --------------------------------------------------------------------------
  let _uid = 1;

  function currentCount(speciesId){
    return _animals.filter(a=>a.species===speciesId).length;
  }

  function totalCount(){
    return _animals.length;
  }

  function spawnOne(sp){
    if(totalCount() >= CFG.maxTotal) return false;
    if(currentCount(sp.id) >= sp.maxCount) return false;

    const p = pickSpawnTile();
    if(!p) return false;

    const w = tileToWorld(p.tx, p.ty);
    const t = pickTargetFrom(p.tx, p.ty) || {tx:p.tx, ty:p.ty};

    const a = {
      id: `a${_uid++}`,
      species: sp.id,
      tx: p.tx,
      ty: p.ty,
      x: w.x,
      y: w.y,
      dir: 4, // S
      frame: 0,
      targetTx: t.tx,
      targetTy: t.ty,
      _animT: 0,
    };

    _animals.push(a);
    if(CFG.debug.logs) INFO(`[animals] spawn ${a.id} ${sp.id} @${a.tx},${a.ty} (forestScore=${p.score||0})`);
    return true;
  }

  function spawnInitial(){
    if(!CFG.enabled) return;

    const enabled = Object.values(SPECIES).filter(validateSpecies);
    if(!enabled.length){
      WARN('[animals] Keine Species aktiv/valid – es werden keine Tiere gespawnt.');
      return;
    }

    // 1) erst je 1 Tier pro species, damit du immer "siehst", ob Atlas funktioniert
    enabled.forEach(sp=>spawnOne(sp));

    // 2) dann auffüllen bis maxCount
    for(const sp of enabled){
      for(let i=0; i<sp.maxCount; i++){
        if(!spawnOne(sp)) break;
      }
    }

    INFO(`[animals] initial done: total=${totalCount()}`);
  }

  // --------------------------------------------------------------------------
  // Movement + Dir update
  // --------------------------------------------------------------------------
  function stepAnimal(a, dt){
    const sp = SPECIES[a.species];
    if(!sp || !sp.enabled) return;

    // Target
    if(a.targetTx == null || a.targetTy == null || (a.tx===a.targetTx && a.ty===a.targetTy)){
      const t = pickTargetFrom(a.tx, a.ty);
      if(t){ a.targetTx = t.tx; a.targetTy = t.ty; }
    }

    const tw = tileToWorld(a.targetTx, a.targetTy);
    let dx = tw.x - a.x;
    let dy = tw.y - a.y;
    const dist = Math.hypot(dx,dy);

    if(dist < 1){
      // neues Ziel suchen
      const t = pickTargetFrom(a.tx, a.ty);
      if(t){ a.targetTx = t.tx; a.targetTy = t.ty; }
      return;
    }

    // Richtung
    a.dir = dirIndexFromDelta(dx, dy);

    // Bewegung
    const step = sp.speedPx * dt;
    const nx = a.x + (dx/dist) * step;
    const ny = a.y + (dy/dist) * step;

    // tile pos aus world
    const ts = getTileSize();
    const ntx = Math.floor(nx / ts);
    const nty = Math.floor(ny / ts);

    // Water blocking: wenn der nächste tile Wasser ist → retarget
    if(!isLand(ntx, nty)){
      const t = pickTargetFrom(a.tx, a.ty);
      if(t){ a.targetTx = t.tx; a.targetTy = t.ty; }
      return;
    }

    a.x = nx;
    a.y = ny;
    a.tx = ntx;
    a.ty = nty;

    // anim frame
    a._animT += dt;
    const fps = 8;
    const f = Math.floor(a._animT * fps) % sp.framesPerDir;
    a.frame = f;
  }

  function tick(dt){
    for(const a of _animals) stepAnimal(a, dt);
  }

  // --------------------------------------------------------------------------
  // Rendering (in euren Renderer einklinken)
  // --------------------------------------------------------------------------
  function draw(ctx){
    // Wir zeichnen in "world" Koordinaten.
    // Die meisten eurer Renderer zeichnen Units später – wir hängen uns an cb:render:world
    // falls vorhanden.
    for(const a of _animals){
      const sp = SPECIES[a.species];
      if(!sp || !sp.enabled) continue;

      const atlas = getAtlas(sp.atlasKey);
      if(!atlas) continue;

      const fn = frameName(sp, a.dir, a.frame);
      const fr = atlas.frames?.[fn];
      if(!fr){
        // fallback: idle
        const fn0 = frameName(sp, a.dir, 0);
        const fr0 = atlas.frames?.[fn0];
        if(!fr0) continue;
        drawFrame(ctx, atlas, fr0, a, sp);
      } else {
        drawFrame(ctx, atlas, fr, a, sp);
      }
    }
  }

  function drawFrame(ctx, atlas, fr, a, sp){
    const img = atlas.image;
    if(!img) return;

    // Pivot: wenn vorhanden nutzen, sonst bottom-center
    const pivot = fr.pivot || {x: fr.w/2, y: fr.h};

    const dx = Math.round(a.x - pivot.x);
    const dy = Math.round(a.y - pivot.y);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;

    // Scale (um pivot)
    ctx.translate(dx + pivot.x, dy + pivot.y);
    ctx.scale(sp.scale, sp.scale);
    ctx.translate(-(pivot.x), -(pivot.y));

    ctx.drawImage(
      img,
      fr.x, fr.y, fr.w, fr.h,
      0, 0, fr.w, fr.h
    );

    // Debug: Pivot + Dir
    if(CFG.debug.drawDebug){
      ctx.strokeStyle = 'rgba(0,255,0,0.8)';
      ctx.beginPath();
      ctx.moveTo(pivot.x-6, pivot.y);
      ctx.lineTo(pivot.x+6, pivot.y);
      ctx.moveTo(pivot.x, pivot.y-6);
      ctx.lineTo(pivot.x, pivot.y+6);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '12px monospace';
      ctx.fillText(DIR_ORDER[a.dir]||'?', pivot.x+8, pivot.y-8);
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Boot / integration
  // --------------------------------------------------------------------------
  function startLoop(){
    const dtFixed = 1 / CFG.tickHz;
    let acc = 0;
    let last = performance.now();

    function frame(now){
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      while(acc >= dtFixed){
        tick(dtFixed);
        acc -= dtFixed;
      }
      _timer = requestAnimationFrame(frame);
    }

    _timer = requestAnimationFrame(frame);
  }

  function stopLoop(){
    if(_timer) cancelAnimationFrame(_timer);
    _timer = null;
  }

  function onMapReady(payload){
    // payload kann Map-Referenz enthalten.
    _map = payload?.map || payload?.gameMap || window.GameMap || window.gameMap || _map;
    _assets = window.Assets || window.assets || _assets;

    if(CFG.debug.logs){
      const st = getMapState();
      INFO('[animals] map:ready', {
        tileSize: getTileSize(),
        grid: !!getGrid(),
        stKeys: st ? Object.keys(st).slice(0,12) : null
      });
    }

    spawnInitial();
    startLoop();
  }

  function onRenderWorld(payload){
    // payload.ctx muss vorhanden sein
    const ctx = payload?.ctx;
    if(!ctx) return;
    draw(ctx);
  }

  function init(){
    if(!CFG.enabled) return;

    _bus = window.Bus || window.bus || null;
    _assets = window.Assets || window.assets || null;

    if(!_bus){
      WARN('[animals] Kein EventBus gefunden – Modul startet nicht.');
      return;
    }

    // Map ready
    _bus.on('cb:map:ready', onMapReady);

    // Render hook (wenn vorhanden)
    _bus.on('cb:render:world', onRenderWorld);

    // Optional: wenn es keinen render:world hook gibt, kann Map/Renderer auch selbst draw() aufrufen.

    if(CFG.debug.logs) LOG('[animals] init ok – warte auf cb:map:ready');
  }

  // sofort initialisieren
  init();

})();
