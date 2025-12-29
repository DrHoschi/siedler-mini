/* ============================================================================
 * Datei    : core/map.animals.js
 * Version  : v25.12.28-animals-v1
 *
 * Zweck:
 *   - Rehe & Füchse als "dynamische Ressourcen" (wandern auf der Map)
 *   - Erstmal: Spawn + einfache Wanderbewegung + Rendern als Sprite
 *   - Jagd (Hunter + Produktion) folgt später (game.production.hunt.js)
 *
 * Architektur (passt zu deinem PDF-Konzept):
 *   - orientiert sich an map.resources.js / map.decorations.js
 *   - state -> animals[]
 *   - tick(dt) aktualisiert Ziele/Positionen
 *   - drawOnMainCanvas(ctx, cam, tileSize) zeichnet Sprites im World-Space
 * ========================================================================== */
(function(){
  'use strict';

  const TAG = '[MapAnimals]';
  const LOG = (...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  // ------------------------------------------------------------
  // KONFIG
  // ------------------------------------------------------------
  const CFG = {
    enabled: true,
    // initialer Spawn (für Tests lieber klein halten)
    spawn: {
      deer: 6,
      fox: 3,
      // wo spawnen? (Fallback: random auf Map)
      // Wenn HQ existiert, spawnen wir grob in dessen Nähe, damit du sie sofort siehst.
      aroundHQRadiusTiles: 12
    },
    // Wander-Parameter
    move: {
      // Tiles pro Sekunde (weltlich; wir bewegen in Tile-Space float)
      speedTilesPerSec: 0.6,
      // wie oft neues Ziel? (Sekunden)
      retargetMin: 1.5,
      retargetMax: 3.5,
      // max Distanz zum Ausgangspunkt (Tiles) – damit Tiere nicht bis ans Ende der Map wandern
      roamRadiusTiles: 18
    },
    // Render
    render: {
      // Welche Atlas-Keys im Asset-System?
      atlasDeer: 'deer_atlas',
      atlasFox: 'fox_atlas',
      // Default Anim
      framesPerDir: 8,
      animFps: 6
    }
  };

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  const State = {
    ok:false,
    // HQ-Hint (Tile-Koordinaten), wird z.B. beim Auto-Start-HQ gesetzt
    // damit wir initial Tiere sichtbar in HQ-Nähe spawnen können.
    hqHint: null,
    animals: [],
    // deterministische IDs
    _id: 1,
    // Map-Info (lazy)
    mapW: 0,
    mapH: 0
  };

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  function rand(min,max){ return min + Math.random()*(max-min); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

  function getMapState(){
    // in deinem Projekt liegt der echte Map-State unter GameMap._state
    return (window.GameMap && window.GameMap._state) ? window.GameMap._state : null;
  }

  function getHQ(){
    // HQ-Position ermitteln (Tile-Koordinaten).
    // Priorität:
    // 1) State.hqHint (z.B. aus cb:build:place __autoStart)
    // 2) bekannte Game-Container (Game.buildings / GameBuildings)
    // Wenn nichts gefunden wird -> null (dann spawnen wir random).
    if (State.hqHint && typeof State.hqHint.tx==='number' && typeof State.hqHint.ty==='number'){
      return State.hqHint;
    }

    const g = window.Game;

    // 2a) Game.buildings / Game._buildings
    try{
      const list = g?.buildings || g?._buildings || [];
      if (Array.isArray(list)){
        const hq = list.find(b => b && (
          b.type==='hq' || b.bId==='hq' || b.kind==='hq' ||
          b.buildingId==='b.hq' || b.id==='b.hq'
        ));
        if (hq && typeof hq.tx==='number' && typeof hq.ty==='number') return hq;
        // manche Datenmodelle benutzen x/y als tile coords
        if (hq && typeof hq.x==='number' && typeof hq.y==='number') return { tx:hq.x, ty:hq.y };
      }
    }catch(_){}

    // 2b) GameBuildings State
    try{
      const list = window.GameBuildings?.State?.list || window.GameBuildings?.state?.list || [];
      if (Array.isArray(list)){
        const hq = list.find(b => b && (b.buildingId==='b.hq' || b.id==='b.hq' || b.type==='hq'));
        if (hq && typeof hq.tx==='number' && typeof hq.ty==='number') return hq;
        if (hq && typeof hq.x==='number' && typeof hq.y==='number') return { tx:hq.x, ty:hq.y };
      }
    }catch(_){}

    return null;
  }

  function isBlockedTile(tx,ty){
    // Minimal-Regel: Wasser = blocked. (Für feinere Biome später in game.rules.js)
    if (window.GameRules?.isWaterTile){
      try{ return !!window.GameRules.isWaterTile(tx,ty); }catch(_){}
    }
    return false;
  }

  function pickSpawnTile(){
    const ms = getMapState();
    if (!ms) return {tx: 5, ty: 5};

    const w = ms.w|0, h = ms.h|0;
    const hq = getHQ();

    // 1) nahe HQ (damit sichtbar)
    if (hq){
      for (let i=0;i<120;i++){
        const tx = clamp((hq.tx|0) + Math.floor(rand(-CFG.spawn.aroundHQRadiusTiles, CFG.spawn.aroundHQRadiusTiles)), 1, w-2);
        const ty = clamp((hq.ty|0) + Math.floor(rand(-CFG.spawn.aroundHQRadiusTiles, CFG.spawn.aroundHQRadiusTiles)), 1, h-2);
        if (!isBlockedTile(tx,ty)) return {tx,ty};
      }
    }

    // 2) random
    for (let i=0;i<300;i++){
      const tx = 1 + Math.floor(Math.random()*(w-2));
      const ty = 1 + Math.floor(Math.random()*(h-2));
      if (!isBlockedTile(tx,ty)) return {tx,ty};
    }
    return {tx: 5, ty: 5};
  }

  function dirFromDelta(dx,dy){
    // Acht Richtungen, grob wie N,NE,E,SE,S,SW,W,NW
    // dy < 0 = N (weil Tile-y nach unten wächst)
    const a = Math.atan2(dy, dx); // -pi..pi (0=E)
    // map angle to 8 sectors
    const sector = Math.round(a / (Math.PI/4)); // -4..4
    // sector to index [E,NE,N,NW,W,SW,S,SE] -> wir wollen [N,NE,E,SE,S,SW,W,NW]
    // Wir machen direkt:
    // a= -pi/2 => N
    // a=0 => E
    // a= +pi/2 => S
    const dirs = ['E','NE','N','NW','W','SW','S','SE','E'];
    const d = dirs[sector+4] || 'S';
    // reorder to our atlas dir list
    const order = {N:0,NE:1,E:2,SE:3,S:4,SW:5,W:6,NW:7};
    return order[d] ?? 4;
  }

  function makeAnimal(kind, tx, ty){
    return {
      id: State._id++,
      kind,          // 'deer' | 'fox'
      // Position in TILE-Space (float) – später können wir bei Bedarf world-px speichern
      x: tx + 0.5,
      y: ty + 0.5,
      // roam origin
      ox: tx + 0.5,
      oy: ty + 0.5,
      // current target in TILE-Space
      tx: tx + 0.5,
      ty: ty + 0.5,
      // dir index 0..7
      dir: 4,
      // timing
      tRetarget: rand(CFG.move.retargetMin, CFG.move.retargetMax),
      // anim
      animT: Math.random()*10
    };
  }

  function retarget(a){
    // neues Ziel um Ursprung herum
    const r = CFG.move.roamRadiusTiles;
    const ms = getMapState();
    const w = ms?.w|0, h = ms?.h|0;

    for (let i=0;i<40;i++){
      const nx = a.ox + rand(-r, r);
      const ny = a.oy + rand(-r, r);
      const tx = clamp(nx, 1.5, (w||9999)-1.5);
      const ty = clamp(ny, 1.5, (h||9999)-1.5);
      const itx = Math.floor(tx), ity = Math.floor(ty);
      if (!isBlockedTile(itx,ity)){
        a.tx = tx;
        a.ty = ty;
        const dx = a.tx - a.x, dy = a.ty - a.y;
        a.dir = dirFromDelta(dx,dy);
        a.tRetarget = rand(CFG.move.retargetMin, CFG.move.retargetMax);
        return;
      }
    }
    // fallback: bleibt stehen
    a.tx = a.x; a.ty = a.y;
    a.tRetarget = rand(CFG.move.retargetMin, CFG.move.retargetMax);
  }

  // ------------------------------------------------------------
  // API
  // ------------------------------------------------------------
  function init(){
    if (!CFG.enabled) { State.ok=false; return; }

    const ms = getMapState();
    State.mapW = ms?.w|0;
    State.mapH = ms?.h|0;

    // Wenn Map-Dimensionen noch nicht bereit sind (0/0),
    // verschieben wir den Spawn, damit Tiere nicht bei (0,0) "unsichtbar" sind.
    if (State.mapW <= 0 || State.mapH <= 0){
      WARN('Map noch nicht bereit (w/h=', State.mapW, State.mapH, ') → retry init');
      setTimeout(()=>{ try{ init(); }catch(e){} }, 200);
      return;
    }

    State.animals.length = 0;
    State._id = 1;

    // Spawn
    for (let i=0;i<CFG.spawn.deer;i++){
      const p = pickSpawnTile();
      State.animals.push(makeAnimal('deer', p.tx, p.ty));
    }
    for (let i=0;i<CFG.spawn.fox;i++){
      const p = pickSpawnTile();
      State.animals.push(makeAnimal('fox', p.tx, p.ty));
    }

    // erstes Ziel wählen
    State.animals.forEach(retarget);

    State.ok = true;

    // Snapshot Event (für Inspector später)
    window.dispatchEvent(new CustomEvent('cb:animals:changed', { detail: snapshot() }));

    LOG('init ok:', { deer: CFG.spawn.deer, fox: CFG.spawn.fox, total: State.animals.length });
  }

  function tick(dt){
    if (!State.ok || !CFG.enabled) return;

    const speed = CFG.move.speedTilesPerSec;
    for (const a of State.animals){
      a.animT += dt;

      a.tRetarget -= dt;
      if (a.tRetarget <= 0) retarget(a);

      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx,dy);

      if (dist > 0.02){
        const step = Math.min(dist, speed*dt);
        a.x += (dx/dist)*step;
        a.y += (dy/dist)*step;
        a.dir = dirFromDelta(dx,dy);
      }else{
        // Ziel erreicht -> in Kürze neues Ziel
        if (a.tRetarget > 0.2) a.tRetarget = rand(0.2, 0.6);
      }
    }
  }

  function snapshot(){
    return {
      ok: State.ok,
      n: State.animals.length,
      animals: State.animals.map(a => ({
        id: a.id, kind: a.kind,
        x: +a.x.toFixed(3), y: +a.y.toFixed(3),
        dir: a.dir
      }))
    };
  }

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!State.ok || !CFG.enabled) return;
    if (!window.Assets?.drawAtlasFrame) return;

    const ts = tileSize|0;
    const framesPerDir = CFG.render.framesPerDir|0;
    const fps = CFG.render.animFps;

    for (const a of State.animals){
      const atlas = (a.kind==='fox') ? CFG.render.atlasFox : CFG.render.atlasDeer;

      // Anim-Frame
      const f = Math.floor(a.animT * fps) % framesPerDir;

      // Frame-Namen: {prefix}_{DIR}_walk_{f}
      const prefix = (a.kind==='fox') ? 'fox' : 'deer';
      const dirName = ['N','NE','E','SE','S','SW','W','NW'][a.dir] || 'S';
      const frame = `${prefix}_${dirName}_walk_${f}`;

      // World-Pixel: tileSpace -> px
      const wx = a.x * ts;
      const wy = a.y * ts;

      Assets.drawAtlasFrame(ctx, atlas, frame, wx, wy, {
        align: 'pivot',
        scale: 1
      });
    }
  }

  // ------------------------------------------------------------
// Event-Hooks
//
// WICHTIG:
// - cb:game:start kann kommen, bevor cb:map:ready das Grid gesetzt hat.
// - Deshalb initialisieren wir auch (und bevorzugt) auf cb:map:ready.
// ------------------------------------------------------------

let _didInit = false;

function safeInit(reason){
  if (_didInit) return;
  try{
    init();
    // init() kann selbst retry'n, falls Map-Dims noch 0 sind.
    // Sobald init erfolgreich durchläuft, setzen wir ok=true.
    if (State.mapW > 0 && State.mapH > 0) {
      _didInit = true;
      LOG('init ok via', reason, 'map=', State.mapW, State.mapH);
    }
  }catch(e){
    WARN('init failed via', reason, e);
  }
}

// Map bereit → jetzt können wir sicher w/h lesen & sinnvoll spawnen
window.addEventListener('cb:map:ready', () => safeInit('cb:map:ready'));

// Game start → Fallback, falls map:ready schon vorher war
window.addEventListener('cb:game:start', () => safeInit('cb:game:start'));

// Auto-Start-HQ Hint (damit Tiere in HQ-Nähe spawnen und sofort sichtbar sind)
window.addEventListener('cb:build:place', (ev)=>{
  const d = ev?.detail || {};
  if (d.__autoStart && (d.buildingId==='b.hq' || d.id==='b.hq' || d.type==='hq')){
    State.hqHint = { tx: d.x, ty: d.y };
    LOG('hqHint set from cb:build:place', State.hqHint);
  }
});

// Optional: Continue – Boot löst später cb:game:start aus
window.addEventListener('req:game:continue', () => {});

// Expose
  window.MapAnimals = {
    CFG,
    State,
    init,
    tick,
    snapshot,
    drawOnMainCanvas
  };

})();
