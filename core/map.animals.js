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
    spawn: { deer: 6, fox: 3 },
    // Wanderung
    speedPxPerSec: { deer: 18, fox: 26 }, // langsame, „siedlerige“ Bewegung
    targetJitterPx: 96,                   // Zielpunkt im Umkreis
    retargetEverySec: [1.8, 4.2],          // Zufallsintervall
    // Draw
    // IMPORTANT: deer MUST match core/asset.js loadAtlas('deer_sprite_atlas', ...)
    atlas: { deer:'deer_sprite_atlas', fox:'fox_atlas' },
    framePrefix: { deer:'deer', fox:'fox' },
    // Für später: Jagd/Respawn
    respawnSec: { deer: 18, fox: 24 },

    // Water avoidance
    avoidWater: true,
    landPickTries: 18
  };

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

  function pickDirectionFromDelta(dx,dy){
    // 8 Richtungen (für Frame-Namen)
    // WICHTIG: Diese Zuordnung MUSS identisch zu SpriteTest sein,
    // sonst sehen die Tiere im Inspector "richtig" aus, auf der Map aber verdreht.
    //
    // SpriteTest-Logik:
    //   idx = round(angle/45)
    //   map = ['E','SE','S','SW','W','NW','N','NE']
    const ang = Math.atan2(dy, dx); // -pi..pi
    const deg = (ang * 180/Math.PI + 360) % 360;
    const idx = Math.round(deg / 45) % 8;
    const map = ['E','SE','S','SW','W','NW','N','NE'];
    return map[idx];
  }

  function makeAnimal(kind, x, y){
    const uid = `${kind}@${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    return {
      uid,
      kind,                 // 'deer' | 'fox'
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

    const base = chooseSpawnNearHQ();

    for (let i=0;i<CFG.spawn.deer;i++){
      const p = pickLandPointAround(base.x, base.y, 220);
      const a = makeAnimal('deer', p.x, p.y);
      ensureInsideMap(a);
      State.animals.push(a);
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
            a.dir = pickDirectionFromDelta(nx, ny);
          }
        } else {
          a.x = nextX;
          a.y = nextY;
          a.dir = pickDirectionFromDelta(nx, ny);
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
            // scale: 1
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
