/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v18.7.0 (Tiles im Preview + stabiles Place)
 *
 * Änderung ggü. v18.6.0:
 *  - cb:place:preview enthält jetzt zusätzlich tx/ty (== gx/gy)
 *  - auch beim "Fallback-Preview" und beim Confirm-Preview
 * ============================================================================ */

(() => {
  // == State =================================================================
  const _state = {
    started:false, mapId:null,
    canvas:null, ctx:null, w:0, h:0,
    tile:64, gridW:32, gridH:18,
    placements:[], occupied:new Set(), hover:{x:-1,y:-1},
    selectedBuilding:null, preview:null, showEntrances:false,
    resources:{ wood:0, stone:0, food:0, gold:0, pop:0 },
    map:null, camX:0, camY:0, zoom:1, rafId:0, lastTs:0,
    panActive:false, panStart:{x:0,y:0,camX:0,camY:0},
    pointers:new Map(), pinch:{ active:false, d0:1, zoom0:1, center:{x:0,y:0} },
    tapStart:{x:0,y:0},
    iconMap:null, spriteMap:null, imgCache:new Map(),
  };

  // == Utils / Events ========================================================
  const log  = (...a)=>(window.CBLog?.ok  || console.log)('[game]',...a);
  const warn = (...a)=>(window.CBLog?.warn|| console.warn)('[game]',...a);
  const err  = (...a)=>(window.CBLog?.err || console.error)('[game]',...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const clamp=(v,mi,ma)=>Math.min(ma,Math.max(mi,v));
  const snap =(v,s)=>Math.floor(v/s);
  const EPS=1e-6;
  const keyXY=(x,y)=>`${x},${y}`;

  function getCssScale(){
    const c=_state.canvas; if(!c) return {x:1,y:1};
    const r=c.getBoundingClientRect();
    return { x:c.width/Math.max(1,r.width), y:c.height/Math.max(1,r.height) };
  }

// == Registry / Asset-Resolver  (ICONS-ONLY) =================================
function iconsBase(){
  try { return (window.Registry?.get?.('iconsBase')) || 'assets/icons/buildings/'; }
  catch { return 'assets/icons/buildings/'; }
}

const isAbs   = u => /^(https?:)?\/\//i.test(u) || u?.startsWith('/') || u?.startsWith('data:');
const withExt = n => /\.(png|webp|jpg|jpeg|svg)$/i.test(n) ? n : (n + '.png');

function join(base, name){
  if (!name) return '';
  if (isAbs(name)) return name;
  const b = String(base||'').replace(/\/+$/,'');
  return b + '/' + withExt(String(name));
}

let _iconMap = null;
let _assetsBuilt = false;

function buildMapsFromRegistry(){
  if (_assetsBuilt && _iconMap) return;
  const icons = new Map();
  const ibase = iconsBase();

  try{
    const list = window.Registry?.get?.('buildings') || [];
    for (const b of list){
      const id = String(b.id);
      // Quelle: iconUrl | iconPath | iconId | icon
      const rawIcon =
        b.iconUrl ?? b.iconPath ?? b.iconId ?? b.icon ?? null;
      const iconUrl = rawIcon ? join(ibase, rawIcon) : '';
      if (iconUrl) icons.set(id, iconUrl);
    }
  } catch(e){
    (window.CBLog?.warn||console.warn)('[game] registry parse fail', e);
  }

  _iconMap = icons;
  _assetsBuilt = true;
}

const getIconUrl   = id => { buildMapsFromRegistry(); return _iconMap.get(String(id)) || null; };

// NOTE: Sprites deaktiviert – Rückgabe immer null.
const getSpriteUrl = _id => null;

function getImage(url){
  if(!url) return null;
  const c=_state.imgCache.get(url);
  if (c instanceof Image) return c;
  if (c==='loading'||c==='error') return null;
  const img=new Image();
  _state.imgCache.set(url,'loading');
  img.onload =()=>_state.imgCache.set(url,img);
  img.onerror=()=>{
    _state.imgCache.set(url,'error');
    (window.CBLog?.warn||console.warn)('[game] image err/404:', url);
  };
  img.src=url;
  return null;
}
/** Normiert eine URL/ID mit einem Basis-Pfad:
 *  - absolute URLs → unverändert
 *  - enthält kein "/" → an Base anhängen + .png
 *  - enthält "/" → relativ belassen (so wie geliefert)
 */
function normalizeUrl(name, base){
  if (!name) return '';
  if (isAbs(name)) return name;
  if (!hasSlash(name)) return join(base, name);
  return withExt(String(name));
}

let _assetsBuilt = false;
let _iconMap  = null;
let _spriteMap= null;

function buildMapsFromRegistry(){
  if (_assetsBuilt && _iconMap && _spriteMap) return;
  const icons   = new Map();
  const sprites = new Map();
  const ibase   = iconsBase();
  const sbase   = spritesBase();

  try{
    const list = window.Registry?.get?.('buildings') || [];
    for (const b of list){
      const id = String(b.id);

      // Icon
      const iconRaw =
        b.iconUrl ?? b.iconPath ?? b.iconId ?? b.icon ?? null;
      const iconUrl = normalizeUrl(iconRaw, ibase);
      if (iconUrl) icons.set(id, iconUrl);

      // Sprite
      const spriteRaw =
        b.spriteUrl ?? b.spritePath ?? b.spriteId ?? b.sprite ?? iconRaw ?? null;
      const spriteUrl = normalizeUrl(spriteRaw, sbase);
      if (spriteUrl) sprites.set(id, spriteUrl);
    }
  } catch(e){ (window.CBLog?.warn||console.warn)('[game] registry parse fail', e); }

  _iconMap   = icons;
  _spriteMap = sprites;
  _assetsBuilt = true;
}

const getIconUrl   = id => { buildMapsFromRegistry(); return _iconMap.get(String(id))    || null; };
const getSpriteUrl = id => { buildMapsFromRegistry(); return _spriteMap.get(String(id))  || null; };

function getImage(url){
  if(!url) return null;
  const c=_state.imgCache.get(url);
  if (c instanceof Image) return c;
  if (c==='loading'||c==='error') return null;
  const img=new Image();
  _state.imgCache.set(url,'loading');
  img.onload =()=>_state.imgCache.set(url,img);
  img.onerror=()=>{
    _state.imgCache.set(url,'error');
    (window.CBLog?.warn||console.warn)('[game] image 404/err →', url);
  };
  img.src=url;
  return null;
}

  // == Buildings / Platzierlogik ============================================
  function getBuildingDef(id){
    const raw = window.Registry?.byId?.(id)
             || (window.Registry?.get?.('buildings')||[]).find(b=>String(b.id)===String(id))
             || null;

    let w=3,h=3;
    let entrances=[[1,3]];
    let door={dx:1,dy:1};
    const blockedTerrains=['water'];

    if(raw){
      if (Array.isArray(raw.size)){ w=+raw.size[0]||3; h=+raw.size[1]||3; }
      else if (raw.size && typeof raw.size==='object'){ w=+raw.size.w||3; h=+raw.size.h||3; }

      if (Array.isArray(raw.entrances)&&raw.entrances.length){
        entrances=raw.entrances.map(e=>[(e[0]|0),(e[1]|0)]);
      } else {
        entrances=[[Math.floor((w-1)/2),h]];
      }
      door={dx:entrances[0][0],dy:entrances[0][1]};
    }

    return { id:String(id), size:{w,h}, entrances, door, blockedTerrains };
  }

  const inBoundsTile=(gx,gy)=>gx>=0&&gy>=0&&gx<_state.gridW&&gy<_state.gridH;
  const inBoundsFootprint=(gx,gy,w,h)=>inBoundsTile(gx,gy)&&inBoundsTile(gx+w-1,gy+h-1);
  const isFree=(gx,gy)=>!_state.occupied.has(keyXY(gx,gy));
  function occupyFootprint(g0,h0,w,h){ for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) _state.occupied.add(keyXY(g0+dx, h0+dy)); }
  function rebuildOccupied(){ _state.occupied.clear(); for (const p of _state.placements) occupyFootprint(p.x,p.y,p.w,p.h); }

  function isBlockedByTerrain(gx,gy,def){
    const m=_state.map;
    if (!m || !def.blockedTerrains?.length) return false;
    if (typeof m.isWater==='function' && def.blockedTerrains.includes('water')){
      try{ if (m.isWater(gx,gy)) return true; }catch{}
    }
    if (typeof m.terrainAt==='function'){
      try{
        const t=m.terrainAt(gx,gy);
        if (t && def.blockedTerrains.includes(String(t))) return true;
      }catch{}
    }
    return false;
  }

  function anyOccupiedWithinMargin(g0,h0,w,h,m=1){
    for (let y=h0-m;y<=h0+h-1+m;y++){
      for (let x=g0-m;x<=g0+w-1+m;x++){
        const inside=(x>=g0&&y>=h0&&x<=g0+w-1&&y<=h0+h-1);
        if(!inside && inBoundsTile(x,y) && _state.occupied.has(keyXY(x,y))) return true;
      }
    }
    return false;
  }

  const tileBlocked=(gx,gy,def)=>!inBoundsTile(gx,gy)||!isFree(gx,gy)||isBlockedByTerrain(gx,gy,def);

  function computeEntrancesAbs(g0,h0,def){
    const out=[];
    for (const [dx,dy] of (def.entrances||[])){
      const ex=g0+(dx|0), ey=h0+(dy|0);
      const blocked=!inBoundsTile(ex,ey)||isBlockedByTerrain(ex,ey,def);
      out.push({ex,ey,blocked});
    }
    return out;
  }

  function canPlaceAtFootprint(g0, h0, id){
    const def = getBuildingDef(id);
    const { w, h } = def.size;

    if (!inBoundsFootprint(g0, h0, w, h)) return false;

    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (tileBlocked(g0 + dx, h0 + dy, def)) return false;

    if (anyOccupiedWithinMargin(g0, h0, w, h, 1)) return false;

    const entrancesAbs = computeEntrancesAbs(g0, h0, def);
    if (!entrancesAbs.some(e => !e.blocked)) return false;

    return true;
  }

  // == Kamera / Projektion & Rendering ======================================
  function clampCameraToMap(){
    const WW=_state.gridW*_state.tile, HH=_state.gridH*_state.tile;
    const VW=_state.w/Math.max(EPS,_state.zoom), VH=_state.h/Math.max(EPS,_state.zoom);
    let maxX=WW-VW, maxY=HH-VH;
    if (Math.abs(maxX)<EPS) maxX=0;
    if (Math.abs(maxY)<EPS) maxY=0;
    _state.camX = (maxX<0) ? (WW-VW)*.5 : clamp(_state.camX,0,maxX);
    _state.camY = (maxY<0) ? (HH-VH)*.5 : clamp(_state.camY,0,maxY);
    if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
  }

  function centerCameraOnMap(){
    const WW=_state.gridW*_state.tile, HH=_state.gridH*_state.tile;
    const VW=_state.w/Math.max(EPS,_state.zoom), VH=_state.h/Math.max(EPS,_state.zoom);
    _state.camX=Math.max(0,(WW-VW)/2);
    _state.camY=Math.max(0,(HH-VH)/2);
    clampCameraToMap();
    if (_state.map){
      _state.map.camX=_state.camX; _state.map.camY=_state.camY; _state.map.zoom=_state.zoom;
    }
  }

  const screenToCanvasPx=(cx,cy)=>{ const c=_state.canvas, r=c.getBoundingClientRect(); return { sx:(cx-r.left)*(c.width/r.width), sy:(cy-r.top)*(c.height/r.height) }; };
  const screenToWorld=(cx,cy)=>{ const {sx,sy}=screenToCanvasPx(cx,cy); return { wx:sx/_state.zoom+_state.camX, wy:sy/_state.zoom+_state.camY }; };
  const worldToScreen=(wx,wy)=>({ sx:(wx-_state.camX)*_state.zoom, sy:(wy-_state.camY)*_state.zoom });

  function frame(ts){
    if(!_state.started) return;
    const {ctx,canvas,map}=_state; if(!ctx||!canvas) return;

    const dt=_state.lastTs?Math.min(0.1,(ts-_state.lastTs)/1000):0;
    _state.lastTs=ts;

    map?.draw();

    ctx.setTransform(1,0,0,1,0,0);
    ctx.save();
    drawGhost(ctx);
    drawPlacements(ctx);
    window.Units && drawUnitsWithProjection?.(ctx, dt);
    ctx.restore();

    _state.rafId=requestAnimationFrame(frame);
  }

  function drawRect(ctx,sx,sy,w,h,ok){
    ctx.fillStyle = ok ? 'rgba(120,200,120,.18)' : 'rgba(200,80,80,.18)';
    ctx.strokeStyle= ok ? 'rgba(120,200,120,.9)'  : 'rgba(200,80,80,.95)';
    ctx.fillRect(sx,sy,w,h);
    ctx.strokeRect(sx+.5,sy+.5,w-1,h-1);
  }

  function drawPlacementSprite(ctx,id,sx,sy,wTiles,hTiles){
    const sprite=getImage(getSpriteUrl(id));
    const s=_state.tile*_state.zoom;
    if (sprite){
      ctx.drawImage(sprite, sx, sy, wTiles*s, hTiles*s);
    } else {
      const icon=getImage(getIconUrl(id));
      if(icon) ctx.drawImage(icon, sx+4, sy+4, s-8, s-8);
    }
  }

  function drawPlacements(ctx){
    for (const p of _state.placements){
      const s=_state.tile*_state.zoom;
      const {sx,sy}=worldToScreen(p.x*_state.tile, p.y*_state.tile);
      drawPlacementSprite(ctx, p.id, sx, sy, p.w, p.h);

      if (_state.showEntrances){
        const def=getBuildingDef(p.id);
        const entrancesAbs=computeEntrancesAbs(p.x,p.y,def);
        for (const {ex,ey} of entrancesAbs){
          const epos=worldToScreen(ex*_state.tile,ey*_state.tile);
          const pad=Math.max(2,Math.floor(s*0.08));
          ctx.save(); ctx.lineWidth=2; ctx.strokeStyle='rgba(255,220,80,.95)';
          ctx.strokeRect(epos.sx+pad+.5, epos.sy+pad+.5, s-2*pad-1, s-2*pad-1);
          ctx.restore();
        }
      }
    }
  }

  function emitPreviewEvent(payload){
    const cssScale=getCssScale();
    EVT('cb:place:preview', {
      ...payload,
      // WICHTIG: Tiles zusätzlich liefern (tx/ty = gx/gy)
      tx: payload.gx, ty: payload.gy,
      cam:{x:_state.camX,y:_state.camY,z:_state.zoom},
      cssScale,
      canvas:{w:_state.canvas?.width||0,h:_state.canvas?.height||0}
    });
  }

  function drawGhost(ctx){
    let gx=-1,gy=-1,id=_state.selectedBuilding;
    if (_state.preview){ gx=_state.preview.gx; gy=_state.preview.gy; id=_state.preview.id; }
    else if (id && inBoundsTile(_state.hover.x,_state.hover.y)){ gx=_state.hover.x; gy=_state.hover.y; }

    if (!inBoundsTile(gx,gy) || !id){
      if (_state.preview && !inBoundsTile(gx,gy)) emitPreviewEvent({invalid:true});
      return;
    }

    const def=getBuildingDef(id);
    const s=_state.tile*_state.zoom;
    const pos=worldToScreen(gx*_state.tile, gy*_state.tile);
    const ok=canPlaceAtFootprint(gx,gy,id);

    drawRect(ctx,pos.sx,pos.sy,def.size.w*s,def.size.h*s,ok);

    const entrancesAbs=computeEntrancesAbs(gx,gy,def);
    for (const {ex,ey,blocked} of entrancesAbs){
      const epos=worldToScreen(ex*_state.tile,ey*_state.tile);
      const pad=Math.max(2,Math.floor(s*0.08));
      ctx.save(); ctx.lineWidth=2; ctx.strokeStyle=blocked?'rgba(255,80,80,.95)':'rgba(255,220,80,.95)';
      ctx.strokeRect(epos.sx+pad+.5, epos.sy+pad+.5, s-2*pad-1, s-2*pad-1);
      ctx.restore();
    }

    emitPreviewEvent({
      id, gx, gy, sx:pos.sx, sy:pos.sy, size:s, invalid:!ok,
      w:def.size.w, h:def.size.h, door:{...def.door},
      entrances:def.entrances.slice(), entrancesAbs
    });
  }

  // == Map laden / Input / Build-Flow (unverändert bis auf Preview-Fix) ======
  async function loadMap(mapId){
    try{
      if (typeof mapId==='string' && /\.json($|\?)/i.test(mapId)){
        const res=await fetch(mapId,{cache:'no-cache'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json=await res.json();

        _state.tile = Number(json.tile) || _state.tile;
        const w=Number((Array.isArray(json.size)?json.size[0]:(json.cols??json.width)));
        const h=Number((Array.isArray(json.size)?json.size[1]:(json.rows??json.height)));
        _state.gridW=w||_state.gridW; _state.gridH=h||_state.gridH;

        log('map geladen',{mapId,tile:_state.tile,grid:[_state.gridW,_state.gridH]});

        if (_state.map?.loadMap) await _state.map.loadMap(mapId);
      } else {
        log('map: kein JSON → Default',{mapId});
      }
    }catch(e){ warn('map laden fehlgeschlagen',e); }
    EVT('cb:map:loaded',{mapId,tile:_state.tile,size:{w:_state.gridW,h:_state.gridH}});
  }

  function clearPointers(){ _state.pointers.clear(); _state.pinch.active=false; _state.panActive=false; }

  function onResize(){
    const c=_state.canvas; if(!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
    _state.map?.setSize?.(_state.w,_state.h);
    clampCameraToMap();
  }

  function rememberPointer(ev){ _state.pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY}); }
  function forgetPointer(ev){ _state.pointers.delete(ev.pointerId); if (_state.pointers.size<2) _state.pinch.active=false; }

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

  function _centeredGridUnderFinger(clientX, clientY, id){
    const def = getBuildingDef(id);
    const wTiles = def.size.w, hTiles = def.size.h;
    const wpos = screenToWorld(clientX, clientY);
    const gx = Math.round(wpos.wx / _state.tile - wTiles / 2);
    const gy = Math.round(wpos.wy / _state.tile - hTiles / 2);
    return { gx, gy, def };
  }

  function onPointerDown(ev){
    rememberPointer(ev);
    if (_state.pointers.size===2 && tryStartPinch()) return;

    if (_state.selectedBuilding){
      _state.tapStart.x=ev.clientX; _state.tapStart.y=ev.clientY;
      _state.panActive=false;
      return;
    }

    if (!_state.pinch.active){
      _state.panActive=true;
      _state.canvas.setPointerCapture?.(ev.pointerId);
      _state.panStart={ x:ev.clientX, y:ev.clientY, camX:_state.camX, camY:_state.camY };
    }
  }

  function onPointerMove(ev){
    rememberPointer(ev);
    if (_state.selectedBuilding && _state.pointers.size<=1) _state.pinch.active=false;

    if (_state.selectedBuilding){
      const r=_centeredGridUnderFinger(ev.clientX,ev.clientY,_state.selectedBuilding);
      if (inBoundsTile(r.gx,r.gy)) { _state.hover.x=r.gx; _state.hover.y=r.gy; }
      else { _state.hover.x=-1; _state.hover.y=-1; }
    } else {
      const wpos=screenToWorld(ev.clientX,ev.clientY);
      const gx=snap(wpos.wx,_state.tile), gy=snap(wpos.wy,_state.tile);
      if (inBoundsTile(gx,gy)) { _state.hover.x=gx; _state.hover.y=gy; } else { _state.hover.x=-1; _state.hover.y=-1; }
    }

    if (_state.pinch.active && _state.pointers.size===2){
      const [a,b]=[..._state.pointers.values()];
      const dist=Math.hypot(a.x-b.x,a.y-b.y);
      const factor=dist/Math.max(1,_state.pinch.d0);
      const newZ=clamp(_state.pinch.zoom0*factor, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);

      const before=screenToWorld(_state.pinch.center.x,_state.pinch.center.y);
      _state.zoom=newZ;
      const cs=screenToCanvasPx(_state.pinch.center.x,_state.pinch.center.y);
      _state.camX=before.wx-(cs.sx/_state.zoom);
      _state.camY=before.wy-(cs.sy/_state.zoom);
      clampCameraToMap();
      if (_state.map){ _state.map.zoom=_state.zoom; _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
      return;
    }

    if (_state.panActive && !_state.selectedBuilding){
      const dx=(ev.clientX-_state.panStart.x)/Math.max(EPS,_state.zoom);
      const dy=(ev.clientY-_state.panStart.y)/Math.max(EPS,_state.zoom);
      _state.camX=_state.panStart.camX-dx; _state.camY=_state.panStart.camY-dy;
      clampCameraToMap();
      if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
    }
  }

  function onPointerUp(ev){
    const wasPlacing=!!_state.selectedBuilding;
    const wasPinch=_state.pinch.active;

    forgetPointer(ev);

    const moved=Math.hypot(ev.clientX-_state.tapStart.x, ev.clientY-_state.tapStart.y);
    const isTap=moved<8;

    if (wasPlacing && !wasPinch && isTap){
      const prev=_state.preview;
      if (prev){
        const def=getBuildingDef(prev.id);
        const ok=canPlaceAtFootprint(prev.gx,prev.gy,prev.id);
        if (!ok){ _state.preview=null; emitPreviewEvent({ invalid:true }); }
        else {
          const pos=worldToScreen(prev.gx*_state.tile, prev.gy*_state.tile);
          const entrancesAbs=computeEntrancesAbs(prev.gx,prev.gy,def);
          emitPreviewEvent({
            id:prev.id, gx:prev.gx, gy:prev.gy, tx:prev.gx, ty:prev.gy,
            sx:pos.sx, sy:pos.sy, size:_state.tile*_state.zoom, invalid:false,
            w:def.size.w, h:def.size.h, door:{...def.door},
            entrances:def.entrances.slice(), entrancesAbs
          });
        }
      } else {
        const {gx,gy,def}=_centeredGridUnderFinger(ev.clientX,ev.clientY,_state.selectedBuilding);
        const ok=canPlaceAtFootprint(gx,gy,_state.selectedBuilding);
        if (!ok){ _state.preview=null; emitPreviewEvent({ invalid:true }); }
        else {
          _state.preview={ id:_state.selectedBuilding, gx, gy };
          const pos=worldToScreen(gx*_state.tile, gy*_state.tile);
          const entrancesAbs=computeEntrancesAbs(gx,gy,def);
          emitPreviewEvent({
            id:_state.preview.id, gx, gy, tx:gx, ty:gy,
            sx:pos.sx, sy:pos.sy, size:_state.tile*_state.zoom, invalid:false,
            w:def.size.w, h:def.size.h, door:{...def.door},
            entrances:def.entrances.slice(), entrancesAbs
          });
        }
      }
    }

    if (_state.pointers.size===0){ _state.pinch.active=false; _state.panActive=false; }
  }

  function onWheel(ev){
    if ('ontouchstart' in window) return;
    ev.preventDefault();
    const old=_state.zoom, fac=ev.deltaY<0?1.1:0.9;
    const nz=clamp(old*fac, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);
    if (nz===old) return;
    const before=screenToWorld(ev.clientX,ev.clientY);
    _state.zoom=nz;
    const cs=screenToCanvasPx(ev.clientX,ev.clientY);
    _state.camX=before.wx-(cs.sx/_state.zoom);
    _state.camY=before.wy-(cs.sy/_state.zoom);
    clampCameraToMap();
  }

  function exitBuildMode(reason='done'){
    _state.preview=null;
    _state.selectedBuilding=null;
    clearPointers();
    EVT('cb:place:preview',{invalid:true});
    EVT('cb:build:mode',{active:false,reason});
    log('build mode off ←', reason);
  }

  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas=canvas;
    _state.ctx   =canvas.getContext('2d');

    _state.canvas.style.touchAction='none';
    _state.canvas.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
    _state.canvas.addEventListener('touchmove', e=>e.preventDefault(),{passive:false});
    _state.canvas.addEventListener('touchend',  e=>e.preventDefault(),{passive:false});

    if (typeof window.SiedlerMap!=='function'){
      err('SiedlerMap fehlt – core/core.map.js nicht geladen?');
    } else {
      const dbg=document.getElementById('debug-map');
      _state.map=new window.SiedlerMap(canvas,_state.ctx,dbg);
      _state.camX=_state.map.camX ?? 0; _state.camY=_state.map.camY ?? 0; _state.zoom=_state.map.zoom ?? 1;
    }

    window.Units?.init?.(_state.ctx,_state.tile);

    onResize(); window.addEventListener('resize',onResize);
    canvas.addEventListener('pointerdown',onPointerDown);
    window.addEventListener('pointermove',onPointerMove);
    window.addEventListener('pointerup',  onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel',onWheel,{passive:false});

    window.addEventListener('cb:build:select',(e)=>{
      _state.selectedBuilding=e?.detail?.id||null;
      _state.preview=null;
      clearPointers();
      emitPreviewEvent({invalid:true});
      log('select building',_state.selectedBuilding);
    });

    window.addEventListener('cb:place:confirm',(e)=>{
      const d=e.detail||{};
      if (_state.preview && d && d.gx===_state.preview.gx && d.gy===_state.preview.gy){
        const def=getBuildingDef(_state.preview.id);
        if (canPlaceAtFootprint(d.gx,d.gy,_state.preview.id)){
          _state.placements.push({ id:_state.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h, door:{...def.door} });
          occupyFootprint(d.gx,d.gy,def.size.w,def.size.h);
          log('placed ✓',{ id:_state.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });
          exitBuildMode('confirm');
          EVT('cb:build:placed',{ id:def.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });
          return;
        } else warn('confirm: Position inzwischen unplazierbar');
      }
      exitBuildMode('confirm-invalid');
    });
    window.addEventListener('cb:place:cancel',()=>exitBuildMode('cancel'));

    window.addEventListener('cb:dbg:entrances:show',(e)=>{ _state.showEntrances=!!e.detail?.show; });

    log('init ✓');
  }

  async function start(mapId){
    _state.mapId=mapId||_state.mapId||'data/maps/map-mini.json';
    _state.started=true;

    await loadMap(_state.mapId);
    _state.map?.reload?.();

    onResize(); centerCameraOnMap();
    rebuildOccupied();

    cancelAnimationFrame(_state.rafId);
    _state.lastTs=0;
    _state.rafId=requestAnimationFrame(frame);

    EVT('cb:res:change',{..._state.resources});

    requestAnimationFrame(()=>{ onResize(); centerCameraOnMap(); });
  }

  function __spriteUrlById(id){ return getSpriteUrl(id); }
  const getState=()=>{ const { started,mapId,tile,gridW,gridH,placements,selectedBuilding }=_state; return { started,mapId,tile,gridW,gridH,placements:placements.slice(),selectedBuilding }; };
  const getResources=()=>({ ..._state.resources });

  window.Game={ init, start, getState, getResources, __spriteUrlById };
 
  // Map-Getter für Module wie UnitOverlay (lesen Game.map.camX/Y/zoom)
try {
  Object.defineProperty(window.Game, 'map', {
    configurable: true, enumerable: false,
    get(){ return _state.map; }
  });
} catch {}
})();
