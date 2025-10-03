// ============================================================================
// Datei   : core/game.js
// Projekt : Neue Siedler
// Version : v18.3.0 (Build-Mode & Overlay-Fixes)
// Zweck   : Spiel-Engine – Map laden/zeichnen, Placements, Units, Loop
//
// Änderungen ggü. v18.1/18.2
//  - NEU: exitBuildMode() beendet den Baumodus zuverlässig (confirm/cancel)
//  - NEU: cb:place:preview trägt cssScale/cam/canvas mit → exakte UI-Positionierung
//  - FIX: Nach map.draw() wird auf Screen-Space zurückgestellt (Transform=Identity)
//  - Bestehendes Verhalten (Sprites/Placements/Pinch/Zoom) bleibt unverändert
// ============================================================================

(() => {
  // == State =================================================================
  const _state = {
    started: false,
    mapId  : null,

    // Canvas
    canvas : null,
    ctx    : null,
    w:0, h:0,

    // Grid/Tiles (werden nach Map-Laden aktualisiert)
    tile : 64,
    gridW: 32, gridH: 18,

    // Weltobjekte
    placements: [],                 // { id, x, y, w, h, door:{dx,dy} }
    occupied : new Set(),           // "x,y"
    hover: { x:-1, y:-1 },
    selectedBuilding: null,
    preview: null,                  // { id,gx,gy }

    // Ressourcen
    resources: { wood:0, stone:0, food:0, gold:0, pop:0 },

    // Map / Kamera / Loop
    map  : null,
    camX : 0,
    camY : 0,
    zoom : 1,
    rafId: 0, lastTs: 0,

    // Eingaben
    panActive: false,
    panStart : { x:0, y:0, camX:0, camY:0 },

    // Pinch
    pointers: new Map(),
    pinch   : { active:false, d0:1, zoom0:1, center:{x:0,y:0} },

    // Tap
    tapStart: { x:0, y:0 },

    // Asset-Auflösung & Cache
    iconMap : null,         // id -> iconUrl (aus Registry)
    spriteMap: null,        // id -> spriteUrl (aus Registry)
    imgCache: new Map(),    // url -> HTMLImageElement | 'loading' | 'error'
  };

  // == Utils / Events ========================================================
  const log  = (...a)=>(window.CBLog?.ok  || console.log)('[game]', ...a);
  const warn = (...a)=>(window.CBLog?.warn|| console.warn)('[game]', ...a);
  const err  = (...a)=>(window.CBLog?.err || console.error)('[game]', ...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const clamp = (v,mi,ma)=>Math.min(ma,Math.max(mi,v));
  const snap  = (v,s)=>Math.floor(v/s);
  const EPS   = 1e-6;
  const keyXY = (x,y)=>`${x},${y}`;

  // Helper: CSS<->Canvas Skalierung (wichtig für iOS/Safari)
  function getCssScale(){
    const c = _state.canvas; if (!c) return { x:1, y:1, cr:null };
    const cr = c.getBoundingClientRect();
    return {
      x: c.width  / Math.max(1, cr.width),
      y: c.height / Math.max(1, cr.height),
      cr
    };
  }

  // == Registry-Resolver =====================================================
  function iconsBase(){
    try { return (window.Registry?.get?.('iconsBase')) || 'assets/icons/buildings/'; }
    catch(e){ return 'assets/icons/buildings/'; }
  }
  function isAbs(u){ return /^(https?:)?\/\//i.test(u) || u?.startsWith('/') || u?.startsWith('data:'); }
  function withExt(n){ return /\.(png|webp|jpg|jpeg|svg)$/i.test(n) ? n : (n + '.png'); }
  function joinBase(name){
    if (!name) return '';
    if (isAbs(name)) return name;
    return (iconsBase().replace(/\/+$/,'') + '/' + withExt(String(name)));
  }
  function buildMapsFromRegistry(){
    if (_state.iconMap && _state.spriteMap) return;
    const icons = new Map();
    const sprites = new Map();
    try {
      const list = window.Registry?.get?.('buildings') || [];
      for (const b of (list||[])){
        const id = String(b.id);
        const iconUrl   = b.iconUrl   || joinBase(b.icon || b.iconId || b.iconPath);
        const spriteUrl = b.spriteUrl || joinBase(b.sprite || b.spriteId || b.spritePath || b.icon);
        if (iconUrl)   icons.set(id, iconUrl);
        if (spriteUrl) sprites.set(id, spriteUrl);
      }
    } catch(e){ /* ignore */ }
    _state.iconMap   = icons;
    _state.spriteMap = sprites;
  }
  function getIconUrl(id){ buildMapsFromRegistry(); return _state.iconMap.get(String(id)) || null; }
  function getSpriteUrl(id){ buildMapsFromRegistry(); return _state.spriteMap.get(String(id)) || null; }

  function getImage(url){
    if (!url) return null;
    const c = _state.imgCache.get(url);
    if (c && c instanceof HTMLImageElement) return c;
    if (c === 'loading' || c === 'error')   return null;
    const img = new Image();
    _state.imgCache.set(url, 'loading');
    img.onload  = ()=>_state.imgCache.set(url, img);
    img.onerror = ()=>_state.imgCache.set(url, 'error');
    img.src     = url;
    return null;
  }

  // == Building-Definitionen (size/entrances) ================================
  function getBuildingDef(id){
    const raw = window.Registry?.byId?.(id) || (window.Registry?.get?.('buildings')||[]).find(b=>String(b.id)===String(id)) || null;

    let w=3, h=3;
    let entrances = [[1,3]];                 // 3x3 → Tür vor dem Gebäude, unten mittig
    let door = { dx:1, dy:1 };
    const blockedTerrains = ['water'];

    if (raw){
      if (Array.isArray(raw.size)) { w = +raw.size[0]||3; h = +raw.size[1]||3; }
      else if (raw.size && typeof raw.size === 'object') { w = +raw.size.w||3; h = +raw.size.h||3; }

      if (Array.isArray(raw.entrances) && raw.entrances.length){
        entrances = raw.entrances.map(e => [ (e[0]|0), (e[1]|0) ]);
      } else {
        entrances = [[ Math.floor((w-1)/2), h ]];       // Fallback: mittig vor dem Haus
      }
      door = { dx: entrances[0][0], dy: entrances[0][1] };
    }

    return { id:String(id), size:{w,h}, entrances, door, blockedTerrains };
  }

  // == Platzier-/Bounds-Helper ==============================================
  function inBoundsTile(gx, gy){ return gx>=0 && gy>=0 && gx<_state.gridW && gy<_state.gridH; }
  function inBoundsFootprint(gx, gy, w, h){ return inBoundsTile(gx,gy) && inBoundsTile(gx+w-1, gy+h-1); }
  function isFree(gx, gy){ return !_state.occupied.has(keyXY(gx,gy)); }
  function occupyFootprint(g0, h0, w, h){
    for (let dy=0; dy<h; dy++) for (let dx=0; dx<w; dx++) _state.occupied.add(keyXY(g0+dx, h0+dy));
  }
  function rebuildOccupied(){
    _state.occupied.clear();
    for (const p of _state.placements){ occupyFootprint(p.x, p.y, p.w, p.h); }
  }

  function isBlockedByTerrain(gx, gy, def){
    const m = _state.map;
    if (!m || !def.blockedTerrains?.length) return false;
    if (typeof m.isWater === 'function' && def.blockedTerrains.includes('water')){
      try{ if (m.isWater(gx,gy)) return true; }catch(e){}
    }
    if (typeof m.terrainAt === 'function'){
      try{
        const t = m.terrainAt(gx,gy);
        if (t && def.blockedTerrains.includes(String(t))) return true;
      }catch(e){}
    }
    return false;
  }
  function anyOccupiedWithinMargin(g0, h0, w, h, m=1){
    for (let y=h0-m; y<=h0+h-1+m; y++){
      for (let x=g0-m; x<=g0+w-1+m; x++){
        const inside = (x>=g0 && y>=h0 && x<=g0+w-1 && y<=h0+h-1);
        if (!inside && inBoundsTile(x,y) && _state.occupied.has(keyXY(x,y))) return true;
      }
    }
    return false;
  }
  function tileBlocked(gx, gy, def){ return !inBoundsTile(gx,gy) || !isFree(gx,gy) || isBlockedByTerrain(gx,gy,def); }
  function computeEntrancesAbs(g0, h0, def){
    const out=[]; for (const [dx,dy] of (def.entrances||[])){
      const ex=g0+(dx|0), ey=h0+(dy|0);
      const blocked = !inBoundsTile(ex,ey) || isBlockedByTerrain(ex,ey,def);
      out.push({ex,ey,blocked});
    } return out;
  }
  function canPlaceAtFootprint(g0, h0, id){
    const def = getBuildingDef(id);
    const { w,h } = def.size;
    if (!inBoundsFootprint(g0,h0,w,h)) return false;
    for (let dy=0; dy<h; dy++) for (let dx=0; dx<w; dx++) if (tileBlocked(g0+dx, h0+dy, def)) return false;
    if (anyOccupiedWithinMargin(g0,h0,w,h,1)) return false;
    const entrancesAbs = computeEntrancesAbs(g0,h0,def);
    if (!entrancesAbs.some(e => !e.blocked)) return false;
    return true;
  }

  // == Kamera/Projektion =====================================================
  function clampCameraToMap(){
    const worldW=_state.gridW*_state.tile, worldH=_state.gridH*_state.tile;
    const viewW=_state.w/Math.max(EPS,_state.zoom), viewH=_state.h/Math.max(EPS,_state.zoom);
    let maxX=worldW-viewW, maxY=worldH-viewH;
    if (Math.abs(maxX)<EPS) maxX=0; if (Math.abs(maxY)<EPS) maxY=0;
    _state.camX = (maxX<0) ? (worldW-viewW)*.5 : clamp(_state.camX,0,maxX);
    _state.camY = (maxY<0) ? (worldH-viewH)*.5 : clamp(_state.camY,0,maxY);
    if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
  }
  function screenToCanvasPx(cx,cy){ const c=_state.canvas, r=c.getBoundingClientRect(); return { sx:(cx-r.left)*(c.width/r.width), sy:(cy-r.top)*(c.height/r.height) }; }
  function screenToWorld(cx,cy){ const {sx,sy}=screenToCanvasPx(cx,cy); return { wx:sx/_state.zoom+_state.camX, wy:sy/_state.zoom+_state.camY }; }
  function worldToScreen(wx,wy){ return { sx:(wx-_state.camX)*_state.zoom, sy:(wy-_state.camY)*_state.zoom }; }
  function syncCamFromMap(){ const m=_state.map; if(!m) return; if(typeof m.camX==='number') _state.camX=m.camX; if(typeof m.camY==='number') _state.camY=m.camY; if(typeof m.zoom==='number') _state.zoom=m.zoom; clampCameraToMap(); }

  // == Rendering =============================================================
  function frame(ts){
    if(!_state.started) return;
    const {ctx,canvas,map}=_state; if(!ctx||!canvas) return;

    syncCamFromMap();
    const dt=_state.lastTs?Math.min(0.1,(ts-_state.lastTs)/1000):0;
    _state.lastTs=ts;

    // --- Welt (Tiles) -------------------------------------------------------
    map?.draw();

    // --- WICHTIG: Canvas-Transform auf Screen-Space zurücksetzen -----------
    ctx.setTransform(1,0,0,1,0,0);

    // --- UI/Overlays --------------------------------------------------------
    ctx.save();
    drawGhost(ctx);
    drawPlacements(ctx);
    window.Units && drawUnitsWithProjection(ctx, dt);
    ctx.restore();

    _state.rafId = requestAnimationFrame(frame);
  }

  function drawRect(ctx, sx, sy, w, h, ok){
    ctx.fillStyle   = ok ? 'rgba(120,200,120,.22)' : 'rgba(200,80,80,.22)';
    ctx.strokeStyle = ok ? 'rgba(120,200,120,.85)' : 'rgba(200,80,80,.9)';
    ctx.fillRect(sx,sy,w,h);
    ctx.strokeRect(sx+.5, sy+.5, w-1, h-1);
  }

  // Vollbild-Sprite für platzierte Gebäude
  function drawPlacementSprite(ctx, id, sx, sy, wTiles, hTiles){
    const sprite = getImage(getSpriteUrl(id));
    const s = _state.tile * _state.zoom;
    if (sprite){
      ctx.drawImage(sprite, sx, sy, wTiles*s, hTiles*s);
    } else {
      const icon = getImage(getIconUrl(id));
      if (icon) ctx.drawImage(icon, sx+4, sy+4, s-8, s-8);
    }
  }

  function drawPlacements(ctx){
    for(const p of _state.placements){
      const s = _state.tile * _state.zoom;
      const {sx,sy} = worldToScreen(p.x*_state.tile, p.y*_state.tile);
      drawRect(ctx, sx, sy, p.w*s, p.h*s, true);
      drawPlacementSprite(ctx, p.id, sx, sy, p.w, p.h);
    }
  }

  // == Build-Mode Helpers ====================================================
  function exitBuildMode(reason = 'done'){
    _state.preview = null;
    _state.selectedBuilding = null;
    _state.panActive = false; // sicher ist sicher
    EVT('cb:place:preview', { invalid:true });
    EVT('cb:build:mode', { active:false, reason });
    log('build mode off ←', reason);
  }

  function emitPreviewEvent(payload){
    // fügt cssScale/cam/canvas hinzu, damit das UI präzise positioniert
    const { x:cssX, y:cssY } = getCssScale();
    const ev = {
      ...payload,
      cam   : { x:_state.camX, y:_state.camY, z:_state.zoom },
      cssScale: { x:cssX, y:cssY },
      canvas: { w:_state.canvas?.width||0, h:_state.canvas?.height||0 }
    };
    EVT('cb:place:preview', ev);
  }

  // Ghost – KEIN zusätzliches Engine-Icon (Bild kommt aus ui-place.js)
  function drawGhost(ctx){
    let gx=-1, gy=-1, id=_state.selectedBuilding;
    if (_state.preview){ gx=_state.preview.gx; gy=_state.preview.gy; id=_state.preview.id; }
    else if (id && inBoundsTile(_state.hover.x,_state.hover.y)){ gx=_state.hover.x; gy=_state.hover.y; }

    if (!inBoundsTile(gx,gy) || !id){
      if (_state.preview && !inBoundsTile(gx,gy)) emitPreviewEvent({ invalid:true });
      return;
    }

    const def = getBuildingDef(id);
    const s   = _state.tile * _state.zoom;
    const pos = worldToScreen(gx*_state.tile, gy*_state.tile);
    const ok  = canPlaceAtFootprint(gx, gy, id);

    // Footprint (grün/rot)
    drawRect(ctx, pos.sx, pos.sy, def.size.w*s, def.size.h*s, ok);

    // Entrance-Kacheln markieren
    const entrancesAbs = computeEntrancesAbs(gx, gy, def);
    for (const {ex,ey,blocked} of entrancesAbs){
      const epos = worldToScreen(ex*_state.tile, ey*_state.tile);
      const s1 = _state.tile * _state.zoom;
      const pad = Math.max(2, Math.floor(s1*0.08));
      ctx.save();
      ctx.lineWidth   = 2;
      ctx.strokeStyle = blocked ? 'rgba(255,80,80,.95)' : 'rgba(255,220,80,.95)';
      ctx.strokeRect(epos.sx+pad+.5, epos.sy+pad+.5, s1-2*pad-1, s1-2*pad-1);
      ctx.restore();
    }

    emitPreviewEvent({
      id, gx, gy, sx:pos.sx, sy:pos.sy, size:s, invalid:!ok,
      w:def.size.w, h:def.size.h, door:{...def.door},
      entrances: def.entrances.slice(),
      entrancesAbs
    });
  }

  function drawUnitsWithProjection(ctx, dt){
    window.Units?.update?.(dt, { zoom:_state.zoom, camX:_state.camX, camY:_state.camY });
    window.Units?.drawProjected?.(ctx, (wx,wy)=>worldToScreen(wx,wy));
  }

  // == Map laden =============================================================
  async function loadMap(mapId){
    try{
      if (typeof mapId==='string' && /\.json($|\?)/i.test(mapId)){
        const res = await fetch(mapId,{cache:'no-cache'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // Grid/Tiles übernehmen (Renderer hat eigene tileSize intern)
        _state.tile  = Number(json.tile) || _state.tile;
        const w = Number((Array.isArray(json.size)? json.size[0] : (json.cols ?? json.width)));
        const h = Number((Array.isArray(json.size)? json.size[1] : (json.rows ?? json.height)));
        _state.gridW = w || _state.gridW;
        _state.gridH = h || _state.gridH;

        log('map geladen', { mapId, tile:_state.tile, grid:[_state.gridW,_state.gridH] });

        // An SiedlerMap übergeben (damit Tiles wirklich gezeichnet werden)
        if (_state.map?.loadMap) {
          await _state.map.loadMap(mapId);
        }
      } else {
        log('map: kein JSON → Default', { mapId });
      }
    } catch(e){ warn('map laden fehlgeschlagen', e); }
    EVT('cb:map:loaded', { mapId, tile:_state.tile, size:{ w:_state.gridW, h:_state.gridH } });
  }

  // == Inputs (Resize / Pan / Pinch / Zoom / Preview-Tap) ====================
  function onResize(){
    const c=_state.canvas; if(!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
    _state.map?.setSize?.(_state.w,_state.h);

    if (_state.map){
      _state.camX = _state.map.camX ?? _state.camX;
      _state.camY = _state.map.camY ?? _state.camY;
      _state.zoom = _state.map.zoom ?? _state.zoom;
      clampCameraToMap();
    }
  }
  function rememberPointer(ev){ _state.pointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY}); }
  function forgetPointer(ev){ _state.pointers.delete(ev.pointerId); if(_state.pointers.size<2) _state.pinch.active=false; }
  function tryStartPinch(){
    if (_state.pointers.size!==2) return false;
    const [a,b]=[..._state.pointers.values()];
    const dx=a.x-b.x, dy=a.y-b.y;
    _state.pinch.active=true;
    _state.pinch.d0=Math.hypot(dx,dy);
    _state.pinch.zoom0=_state.zoom;
    _state.pinch.center={x:(a.x+b.x)/2, y:(a.y+b.y)/2};
    return true;
  }
  function onPointerDown(ev){
    rememberPointer(ev);
    if (_state.pointers.size===2 && tryStartPinch()) return;

    if (_state.selectedBuilding){
      _state.tapStart.x = ev.clientX;
      _state.tapStart.y = ev.clientY;
      _state.panActive  = false;
    } else if (!_state.pinch.active){
      _state.panActive = true;
      _state.canvas.setPointerCapture?.(ev.pointerId);
      _state.panStart = { x:ev.clientX, y:ev.clientY, camX:_state.camX, camY:_state.camY };
    }
  }
  function onPointerMove(ev){
    rememberPointer(ev);

    // Hover
    {
      const wpos = screenToWorld(ev.clientX, ev.clientY);
      const gx = snap(wpos.wx, _state.tile);
      const gy = snap(wpos.wy, _state.tile);
      if (inBoundsTile(gx, gy)) { _state.hover.x=gx; _state.hover.y=gy; }
      else                      { _state.hover.x=-1; _state.hover.y=-1; }
    }

    // Pinch
    if (_state.pinch.active && _state.pointers.size===2){
      const [a,b]=[..._state.pointers.values()];
      const dist  = Math.hypot(a.x-b.x, a.y-b.y);
      const factor= dist / Math.max(1,_state.pinch.d0);
      const newZ  = clamp(_state.pinch.zoom0 * factor, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);

      const before = screenToWorld(_state.pinch.center.x, _state.pinch.center.y);
      _state.zoom  = newZ;
      const cs     = screenToCanvasPx(_state.pinch.center.x, _state.pinch.center.y);
      _state.camX  = before.wx - (cs.sx / _state.zoom);
      _state.camY  = before.wy - (cs.sy / _state.zoom);

      clampCameraToMap();
      if (_state.map){ _state.map.zoom=_state.zoom; _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
      return;
    }

    // Pan
    if (_state.panActive && !_state.selectedBuilding){
      const dx = (ev.clientX - _state.panStart.x) / Math.max(EPS,_state.zoom);
      const dy = (ev.clientY - _state.panStart.y) / Math.max(EPS,_state.zoom);
      _state.camX = _state.panStart.camX - dx;
      _state.camY = _state.panStart.camY - dy;
      clampCameraToMap();
      if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
    }
  }
  function onPointerUp(ev){
    const wasPlacing = !!_state.selectedBuilding;
    const wasPinch   = _state.pinch.active;

    forgetPointer(ev);

    const moved = Math.hypot(ev.clientX - _state.tapStart.x, ev.clientY - _state.tapStart.y);
    const isTap = moved < 8;

    if (wasPlacing && !wasPinch && isTap){
      const wpos = screenToWorld(ev.clientX, ev.clientY);
      const gx   = snap(wpos.wx, _state.tile);
      const gy   = snap(wpos.wy, _state.tile);

      const ok = canPlaceAtFootprint(gx,gy,_state.selectedBuilding);
      if (!ok){
        _state.preview = null;
        emitPreviewEvent({ invalid:true });
      } else {
        _state.preview = { id:_state.selectedBuilding, gx, gy };
        const def = getBuildingDef(_state.selectedBuilding);
        const { sx, sy } = worldToScreen(gx*_state.tile, gy*_state.tile);
        const entrancesAbs = computeEntrancesAbs(gx, gy, def);
        emitPreviewEvent({
          id:_state.preview.id, gx, gy, sx, sy, size:_state.tile*_state.zoom, invalid:false,
          w:def.size.w, h:def.size.h, door:{...def.door}, entrances:def.entrances.slice(), entrancesAbs
        });
      }
    }

    _state.panActive = false;
  }
  function onWheel(ev){
    ev.preventDefault();
    const old=_state.zoom, fac=ev.deltaY<0 ? 1.1 : 0.9;
    const nz = clamp(old*fac, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);
    if (nz===old) return;

    const before = screenToWorld(ev.clientX, ev.clientY);
    _state.zoom  = nz;
    const cs     = screenToCanvasPx(ev.clientX, ev.clientY);
    _state.camX  = before.wx - (cs.sx / _state.zoom);
    _state.camY  = before.wy - (cs.sy / _state.zoom);
    clampCameraToMap();
    if (_state.map){ _state.map.zoom=_state.zoom; _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
  }

  // == Public API ============================================================
  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx    = canvas.getContext('2d');

    // Safari/iOS Gesten
    _state.canvas.style.touchAction = 'none';
    _state.canvas.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
    _state.canvas.addEventListener('touchmove',  (e)=>e.preventDefault(), {passive:false});
    _state.canvas.addEventListener('touchend',   (e)=>e.preventDefault(), {passive:false});

    // Map-Renderer (SiedlerMap)
    if (typeof window.SiedlerMap !== 'function'){
      err('SiedlerMap fehlt – core/core.map.js nicht geladen?');
    } else {
      const dbg = document.getElementById('debug-map'); // optional
      _state.map = new window.SiedlerMap(canvas, _state.ctx, dbg);
      _state.camX = _state.map.camX ?? 0;
      _state.camY = _state.map.camY ?? 0;
      _state.zoom = _state.map.zoom ?? 1;
    }

    window.Units?.init?.(_state.ctx, _state.tile);

    onResize(); window.addEventListener('resize', onResize);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive:false });

    // Auswahl aus Baumenü
    window.addEventListener('cb:build:select', (e)=>{
      _state.selectedBuilding = e?.detail?.id || null;
      _state.preview = null;
      emitPreviewEvent({ invalid:true });
      log('select building', _state.selectedBuilding);
    });

    // Confirm/Cancel
    window.addEventListener('cb:place:confirm', (e)=>{
      const d = e.detail || {};
      if (_state.preview && d && d.gx===_state.preview.gx && d.gy===_state.preview.gy){
        const def = getBuildingDef(_state.preview.id);
        if (canPlaceAtFootprint(d.gx, d.gy, _state.preview.id)){
          _state.placements.push({ id:_state.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h, door:{...def.door} });
          occupyFootprint(d.gx, d.gy, def.size.w, def.size.h);
          log('placed ✓', { id:_state.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });

          // 👉 Baumodus sauber verlassen, damit Pan/Zoom wieder frei ist
          exitBuildMode('confirm');

          // optionales Signal ans UI
          EVT('cb:build:placed', { id:def.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });
          return;
        } else {
          warn('confirm: Position inzwischen unplazierbar');
        }
      }
      // Fallback: Preview schließen und Modus verlassen
      exitBuildMode('confirm-invalid');
    });

    window.addEventListener('cb:place:cancel', ()=>{
      exitBuildMode('cancel');
      log('place canceled');
    });

    log('init ✓');
  }

  async function start(mapId){
    _state.mapId  = mapId || _state.mapId || 'data/maps/map-mini.json';
    _state.started = true;

    await loadMap(_state.mapId);            // lädt JSON + übergibt an SiedlerMap
    _state.map?.reload?.();

    _state.camX = _state.map?.camX ?? _state.camX;
    _state.camY = _state.map?.camY ?? _state.camY;
    _state.zoom = _state.map?.zoom ?? _state.zoom;
    onResize();

    rebuildOccupied();

    cancelAnimationFrame(_state.rafId);
    _state.lastTs = 0;
    _state.rafId  = requestAnimationFrame(frame);

    EVT('cb:res:change', { ..._state.resources });
  }

  function getState(){
    const { started, mapId, tile, gridW, gridH, placements, selectedBuilding } = _state;
    return { started, mapId, tile, gridW, gridH, placements: placements.slice(), selectedBuilding };
  }
  function getResources(){ return { ..._state.resources }; }

  window.Game = { init, start, getState, getResources, map: _state.map };
})();
