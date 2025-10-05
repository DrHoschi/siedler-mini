/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v18.7.1 (2025-10-05)
 *
 * Zweck   : Engine: Map-View, Kamera/Zoom, Bauen (Preview/Confirm), Rendering
 * Änderungen ggü. v18.7.0:
 *  - Sprites deaktiviert (Icons only) → verhindert 404 (hq.png, lumber.png, ...)
 *  - cb:place:preview sendet weiterhin tx/ty (=gx/gy) + alle Maße
 *  - robustere Touch/Pinch-Logik und Ghost-Rect-Darstellung
 * Events  :
 *  - cb:place:preview { id,gx,gy,tx,ty,sx,sy,size,w,h,door,entrances,entrancesAbs,invalid }
 *  - cb:place:confirm { gx,gy }       (wird von UI gesendet, Game hört zu)
 *  - cb:place:cancel                  (dito)
 *  - cb:build:select  { id }          (UI → Game)
 *  - cb:build:mode    { active,reason }
 *  - cb:map:loaded    { mapId,tile,size:{w,h} }
 * ============================================================================ */

(() => {
  // == State =================================================================
  const S = {
    started:false, mapId:null,
    canvas:null, ctx:null, w:0, h:0,
    tile:64, gridW:32, gridH:18,
    placements:[], occupied:new Set(),
    hover:{x:-1,y:-1},
    selected:null, preview:null, showEntrances:false,
    map:null, camX:0, camY:0, zoom:1, rafId:0, lastTs:0,
    pan:false, panStart:{x:0,y:0,camX:0,camY:0},
    pointers:new Map(), pinch:{active:false,d0:1,zoom0:1,center:{x:0,y:0}},
    tapStart:{x:0,y:0},
    iconMap:null, imgCache:new Map(),
  };

  // == Utils / Events ========================================================
  const log  = (...a)=>(window.CBLog?.ok  || console.log )('[game]',...a);
  const warn = (...a)=>(window.CBLog?.warn|| console.warn)('[game]',...a);
  const err  = (...a)=>(window.CBLog?.err || console.error)('[game]',...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const clamp=(v,mi,ma)=>Math.min(ma,Math.max(mi,v));
  const snap =(v,s)=>Math.floor(v/s);
  const EPS=1e-6;
  const keyXY=(x,y)=>`${x},${y}`;

  function getCssScale(){
    const c=S.canvas; if(!c) return {x:1,y:1};
    const r=c.getBoundingClientRect();
    return { x:c.width/Math.max(1,r.width), y:c.height/Math.max(1,r.height) };
  }

  // == Registry / Icons ======================================================
  function iconsBase(){
    try { return (window.Registry?.get?.('iconsBase')) || 'assets/icons/buildings/'; }
    catch { return 'assets/icons/buildings/'; }
  }
  const isAbs=u=>/^(https?:)?\/\//i.test(u)||u?.startsWith('/')||u?.startsWith('data:');
  const withExt=n=>/\.(png|webp|jpg|jpeg|svg)$/i.test(n)?n:(n+'.png');
  const joinBase=name=>!name?'':(isAbs(name)?name:(iconsBase().replace(/\/+$/,'')+'/'+withExt(String(name))));

  function buildIconMap(){
    if (S.iconMap) return;
    const icons=new Map();
    try{
      for (const b of (window.Registry?.get?.('buildings')||[])){
        const id=String(b.id);
        const iconUrl = b.iconUrl || joinBase(b.icon || b.iconId || b.iconPath);
        if (iconUrl) icons.set(id,iconUrl);
      }
    }catch{/* noop */}
    S.iconMap=icons;
  }
  const getIconUrl = id=>{ buildIconMap(); return S.iconMap.get(String(id)) || null; };

  function getImage(url){
    if(!url) return null;
    const c=S.imgCache.get(url);
    if (c instanceof Image) return c;
    if (c==='loading'||c==='error') return null;
    const img=new Image();
    S.imgCache.set(url,'loading');
    img.onload =()=>S.imgCache.set(url,img);
    img.onerror=()=>S.imgCache.set(url,'error');
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

  const inBoundsTile=(gx,gy)=>gx>=0&&gy>=0&&gx<S.gridW&&gy<S.gridH;
  const inBoundsFootprint=(gx,gy,w,h)=>inBoundsTile(gx,gy)&&inBoundsTile(gx+w-1,gy+h-1);
  const isFree=(gx,gy)=>!S.occupied.has(keyXY(gx,gy));
  function occupyFootprint(g0,h0,w,h){ for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) S.occupied.add(keyXY(g0+dx, h0+dy)); }
  function rebuildOccupied(){ S.occupied.clear(); for (const p of S.placements) occupyFootprint(p.x,p.y,p.w,p.h); }

  function anyOccupiedWithinMargin(g0,h0,w,h,m=1){
    for (let y=h0-m;y<=h0+h-1+m;y++){
      for (let x=g0-m;x<=g0+w-1+m;x++){
        const inside=(x>=g0&&y>=h0&&x<=g0+w-1&&y<=h0+h-1);
        if(!inside && inBoundsTile(x,y) && S.occupied.has(keyXY(x,y))) return true;
      }
    }
    return false;
  }

  function canPlaceAtFootprint(g0,h0,id){
    const def = getBuildingDef(id);
    const { w, h } = def.size;

    if (!inBoundsFootprint(g0, h0, w, h)) return false;

    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (!isFree(g0 + dx, h0 + dy)) return false;

    if (anyOccupiedWithinMargin(g0, h0, w, h, 1)) return false;

    // Eingang muss frei auf der Karte liegen (Terrain-Check ist hier neutral)
    const entrancesAbs = def.entrances.map(([dx,dy])=>({ex:g0+dx, ey:h0+dy}));
    if (!entrancesAbs.some(e => inBoundsTile(e.ex,e.ey))) return false;

    return true;
  }

  // == Kamera / Projektion & Rendering ======================================
  function clampCameraToMap(){
    const WW=S.gridW*S.tile, HH=S.gridH*S.tile;
    const VW=S.w/Math.max(EPS,S.zoom), VH=S.h/Math.max(EPS,S.zoom);
    let maxX=WW-VW, maxY=HH-VH;
    if (Math.abs(maxX)<EPS) maxX=0;
    if (Math.abs(maxY)<EPS) maxY=0;
    S.camX = (maxX<0) ? (WW-VW)*.5 : clamp(S.camX,0,maxX);
    S.camY = (maxY<0) ? (HH-VH)*.5 : clamp(S.camY,0,maxY);
    if (S.map){ S.map.camX=S.camX; S.map.camY=S.camY; }
  }

  function centerCameraOnMap(){
    const WW=S.gridW*S.tile, HH=S.gridH*S.tile;
    const VW=S.w/Math.max(EPS,S.zoom), VH=S.h/Math.max(EPS,S.zoom);
    S.camX=Math.max(0,(WW-VW)/2);
    S.camY=Math.max(0,(HH-VH)/2);
    clampCameraToMap();
    if (S.map){
      S.map.camX=S.camX; S.map.camY=S.camY; S.map.zoom=S.zoom;
    }
  }

  const screenToCanvasPx=(cx,cy)=>{ const c=S.canvas, r=c.getBoundingClientRect(); return { sx:(cx-r.left)*(c.width/r.width), sy:(cy-r.top)*(c.height/r.height) }; };
  const screenToWorld=(cx,cy)=>{ const {sx,sy}=screenToCanvasPx(cx,cy); return { wx:sx/S.zoom+S.camX, wy:sy/S.zoom+S.camY }; };
  const worldToScreen=(wx,wy)=>({ sx:(wx-S.camX)*S.zoom, sy:(wy-S.camY)*S.zoom });

  function frame(ts){
    if(!S.started) return;
    const {ctx,canvas,map}=S; if(!ctx||!canvas) return;

    const dt=S.lastTs?Math.min(0.1,(ts-S.lastTs)/1000):0;
    S.lastTs=ts;

    map?.draw();

    ctx.setTransform(1,0,0,1,0,0);
    ctx.save();
    drawGhost(ctx);
    drawPlacements(ctx);
    ctx.restore();

    S.rafId=requestAnimationFrame(frame);
  }

  function drawRect(ctx,sx,sy,w,h,ok){
    ctx.fillStyle = ok ? 'rgba(120,200,120,.18)' : 'rgba(200,80,80,.18)';
    ctx.strokeStyle= ok ? 'rgba(120,200,120,.9)'  : 'rgba(200,80,80,.95)';
    ctx.fillRect(sx,sy,w,h);
    ctx.strokeRect(sx+.5,sy+.5,w-1,h-1);
  }

  function drawIcon(ctx,id,sx,sy,wTiles,hTiles){
    const icon=getImage(getIconUrl(id));
    const s=S.tile*S.zoom;
    // Fallback: Icon mittig innerhalb 1x1 Kachel; Gebäude-Rand kommt vom Ghost-Rect
    if(icon) ctx.drawImage(icon, sx+4, sy+4, Math.min(s*wTiles-8, s), Math.min(s*hTiles-8, s));
  }

  function drawPlacements(ctx){
    for (const p of S.placements){
      const s=S.tile*S.zoom;
      const {sx,sy}=worldToScreen(p.x*S.tile, p.y*S.tile);
      drawIcon(ctx, p.id, sx, sy, p.w, p.h);

      if (S.showEntrances){
        const def=getBuildingDef(p.id);
        for (const [dx,dy] of def.entrances){
          const epos=worldToScreen((p.x+dx)*S.tile,(p.y+dy)*S.tile);
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
      tx: payload.gx, ty: payload.gy,                 // Tiles zusätzlich
      cam:{x:S.camX,y:S.camY,z:S.zoom},
      cssScale,
      canvas:{w:S.canvas?.width||0,h:S.canvas?.height||0}
    });
  }

  function drawGhost(ctx){
    let gx=-1,gy=-1,id=S.selected;
    if (S.preview){ gx=S.preview.gx; gy=S.preview.gy; id=S.preview.id; }
    else if (id && inBoundsTile(S.hover.x,S.hover.y)){ gx=S.hover.x; gy=S.hover.y; }

    if (!inBoundsTile(gx,gy) || !id){
      if (S.preview && !inBoundsTile(gx,gy)) emitPreviewEvent({invalid:true});
      return;
    }

    const def=getBuildingDef(id);
    const s=S.tile*S.zoom;
    const pos=worldToScreen(gx*S.tile, gy*S.tile);
    const ok=canPlaceAtFootprint(gx,gy,id);

    drawRect(ctx,pos.sx,pos.sy,def.size.w*s,def.size.h*s,ok);

    // markiere Tür(en)
    for (const [dx,dy] of def.entrances){
      const epos=worldToScreen((gx+dx)*S.tile,(gy+dy)*S.tile);
      const pad=Math.max(2,Math.floor(s*0.08));
      ctx.save(); ctx.lineWidth=2; ctx.strokeStyle=ok?'rgba(255,220,80,.95)':'rgba(255,80,80,.95)';
      ctx.strokeRect(epos.sx+pad+.5, epos.sy+pad+.5, s-2*pad-1, s-2*pad-1);
      ctx.restore();
    }

    emitPreviewEvent({
      id, gx, gy, sx:pos.sx, sy:pos.sy, size:s, invalid:!ok,
      w:def.size.w, h:def.size.h, door:{...def.door},
      entrances:def.entrances.slice(),
      entrancesAbs:def.entrances.map(([dx,dy])=>({ex:gx+dx,ey:gy+dy,blocked:false}))
    });
  }

  // == Map laden / Input / Build-Flow ========================================
  async function loadMap(mapId){
    try{
      if (typeof mapId==='string' && /\.json($|\?)/i.test(mapId)){
        const res=await fetch(mapId,{cache:'no-cache'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json=await res.json();

        S.tile = Number(json.tile) || S.tile;
        const w=Number((Array.isArray(json.size)?json.size[0]:(json.cols??json.width)));
        const h=Number((Array.isArray(json.size)?json.size[1]:(json.rows??json.height)));
        S.gridW=w||S.gridW; S.gridH=h||S.gridH;

        log('map geladen',{mapId,tile:S.tile,grid:[S.gridW,S.gridH]});

        if (S.map?.loadMap) await S.map.loadMap(mapId);
      } else {
        log('map: kein JSON → Default',{mapId});
      }
    }catch(e){ warn('map laden fehlgeschlagen',e); }
    EVT('cb:map:loaded',{mapId,tile:S.tile,size:{w:S.gridW,h:S.gridH}});
  }

  function clearPointers(){ S.pointers.clear(); S.pinch.active=false; S.pan=false; }

  function onResize(){
    const c=S.canvas; if(!c) return;
    S.w = (c.width  = c.clientWidth  || c.width);
    S.h = (c.height = c.clientHeight || c.height);
    S.map?.setSize?.(S.w,S.h);
    clampCameraToMap();
  }

  function rememberPointer(ev){ S.pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY}); }
  function forgetPointer(ev){ S.pointers.delete(ev.pointerId); if (S.pointers.size<2) S.pinch.active=false; }

  function tryStartPinch(){
    if (S.pointers.size!==2) return false;
    const [a,b]=[...S.pointers.values()];
    const dx=a.x-b.x, dy=a.y-b.y;
    S.pinch.active=true;
    S.pinch.d0=Math.hypot(dx,dy);
    S.pinch.zoom0=S.zoom;
    S.pinch.center={x:(a.x+b.x)/2, y:(a.y+b.y)/2};
    return true;
  }

  function _centeredGridUnderFinger(clientX, clientY, id){
    const def = getBuildingDef(id);
    const wTiles = def.size.w, hTiles = def.size.h;
    const wpos = screenToWorld(clientX, clientY);
    const gx = Math.round(wpos.wx / S.tile - wTiles / 2);
    const gy = Math.round(wpos.wy / S.tile - hTiles / 2);
    return { gx, gy, def };
  }

  function onPointerDown(ev){
    rememberPointer(ev);
    if (S.pointers.size===2 && tryStartPinch()) return;

    if (S.selected){
      S.tapStart.x=ev.clientX; S.tapStart.y=ev.clientY;
      S.pan=false;
      return;
    }

    if (!S.pinch.active){
      S.pan=true;
      S.canvas.setPointerCapture?.(ev.pointerId);
      S.panStart={ x:ev.clientX, y:ev.clientY, camX:S.camX, camY:S.camY };
    }
  }

  function onPointerMove(ev){
    rememberPointer(ev);
    if (S.selected && S.pointers.size<=1) S.pinch.active=false;

    if (S.selected){
      const r=_centeredGridUnderFinger(ev.clientX,ev.clientY,S.selected);
      if (inBoundsTile(r.gx,r.gy)) { S.hover.x=r.gx; S.hover.y=r.gy; }
      else { S.hover.x=-1; S.hover.y=-1; }
    } else {
      const wpos=screenToWorld(ev.clientX,ev.clientY);
      const gx=snap(wpos.wx,S.tile), gy=snap(wpos.wy,S.tile);
      if (inBoundsTile(gx,gy)) { S.hover.x=gx; S.hover.y=gy; } else { S.hover.x=-1; S.hover.y=-1; }
    }

    if (S.pinch.active && S.pointers.size===2){
      const [a,b]=[...S.pointers.values()];
      const dist=Math.hypot(a.x-b.x,a.y-b.y);
      const factor=dist/Math.max(1,S.pinch.d0);
      const newZ=clamp(S.pinch.zoom0*factor, S.map?.minZoom ?? 0.5, S.map?.maxZoom ?? 3);

      const before=screenToWorld(S.pinch.center.x,S.pinch.center.y);
      S.zoom=newZ;
      const cs=screenToCanvasPx(S.pinch.center.x,S.pinch.center.y);
      S.camX=before.wx-(cs.sx/S.zoom);
      S.camY=before.wy-(cs.sy/S.zoom);
      clampCameraToMap();
      if (S.map){ S.map.zoom=S.zoom; S.map.camX=S.camX; S.map.camY=S.camY; }
      return;
    }

    if (S.pan && !S.selected){
      const dx=(ev.clientX-S.panStart.x)/Math.max(EPS,S.zoom);
      const dy=(ev.clientY-S.panStart.y)/Math.max(EPS,S.zoom);
      S.camX=S.panStart.camX-dx; S.camY=S.panStart.camY-dy;
      clampCameraToMap();
      if (S.map){ S.map.camX=S.camX; S.map.camY=S.camY; }
    }
  }

  function onPointerUp(ev){
    const wasPlacing=!!S.selected;
    const wasPinch=S.pinch.active;

    forgetPointer(ev);

    const moved=Math.hypot(ev.clientX-S.tapStart.x, ev.clientY-S.tapStart.y);
    const isTap=moved<8;

    if (wasPlacing && !wasPinch && isTap){
      const prev=S.preview;
      if (prev){
        const def=getBuildingDef(prev.id);
        const ok=canPlaceAtFootprint(prev.gx,prev.gy,prev.id);
        if (!ok){ S.preview=null; emitPreviewEvent({ invalid:true }); }
        else {
          const pos=worldToScreen(prev.gx*S.tile, prev.gy*S.tile);
          emitPreviewEvent({
            id:prev.id, gx:prev.gx, gy:prev.gy, tx:prev.gx, ty:prev.gy,
            sx:pos.sx, sy:pos.sy, size:S.tile*S.zoom, invalid:false,
            w:def.size.w, h:def.size.h, door:{...def.door},
            entrances:def.entrances.slice(),
            entrancesAbs:def.entrances.map(([dx,dy])=>({ex:prev.gx+dx,ey:prev.gy+dy,blocked:false}))
          });
        }
      } else {
        const {gx,gy,def}=_centeredGridUnderFinger(ev.clientX,ev.clientY,S.selected);
        const ok=canPlaceAtFootprint(gx,gy,S.selected);
        if (!ok){ S.preview=null; emitPreviewEvent({ invalid:true }); }
        else {
          S.preview={ id:S.selected, gx, gy };
          const pos=worldToScreen(gx*S.tile, gy*S.tile);
          emitPreviewEvent({
            id:S.preview.id, gx, gy, tx:gx, ty:gy,
            sx:pos.sx, sy:pos.sy, size:S.tile*S.zoom, invalid:false,
            w:def.size.w, h:def.size.h, door:{...def.door},
            entrances:def.entrances.slice(),
            entrancesAbs:def.entrances.map(([dx,dy])=>({ex:gx+dx,ey:gy+dy,blocked:false}))
          });
        }
      }
    }

    if (S.pointers.size===0){ S.pinch.active=false; S.pan=false; }
  }

  function onWheel(ev){
    if ('ontouchstart' in window) return;
    ev.preventDefault();
    const old=S.zoom, fac=ev.deltaY<0?1.1:0.9;
    const nz=clamp(old*fac, S.map?.minZoom ?? 0.5, S.map?.maxZoom ?? 3);
    if (nz===old) return;
    const before=screenToWorld(ev.clientX,ev.clientY);
    S.zoom=nz;
    const cs=screenToCanvasPx(ev.clientX,ev.clientY);
    S.camX=before.wx-(cs.sx/S.zoom);
    S.camY=before.wy-(cs.sy/S.zoom);
    clampCameraToMap();
  }

  function exitBuildMode(reason='done'){
    S.preview=null;
    S.selected=null;
    clearPointers();
    EVT('cb:place:preview',{invalid:true});
    EVT('cb:build:mode',{active:false,reason});
    log('build mode off ←', reason);
  }

  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    S.canvas=canvas;
    S.ctx   =canvas.getContext('2d');

    // Touch handling stabilisieren
    S.canvas.style.touchAction='none';
    S.canvas.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
    S.canvas.addEventListener('touchmove', e=>e.preventDefault(),{passive:false});
    S.canvas.addEventListener('touchend',  e=>e.preventDefault(),{passive:false});

    if (typeof window.SiedlerMap!=='function'){
      err('SiedlerMap fehlt – core/core.map.js nicht geladen?');
    } else {
      const dbg=document.getElementById('debug-map');
      S.map=new window.SiedlerMap(canvas,S.ctx,dbg);
      S.camX=S.map.camX ?? 0; S.camY=S.map.camY ?? 0; S.zoom=S.map.zoom ?? 1;
    }

    onResize(); window.addEventListener('resize',onResize);
    canvas.addEventListener('pointerdown',onPointerDown);
    window.addEventListener('pointermove',onPointerMove);
    window.addEventListener('pointerup',  onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel',onWheel,{passive:false});

    window.addEventListener('cb:build:select',(e)=>{
      S.selected=e?.detail?.id||null;
      S.preview=null;
      clearPointers();
      emitPreviewEvent({invalid:true});
      log('select building',S.selected);
    });

    window.addEventListener('cb:place:confirm',(e)=>{
      const d=e.detail||{};
      if (S.preview && d && d.gx===S.preview.gx && d.gy===S.preview.gy){
        const def=getBuildingDef(S.preview.id);
        if (canPlaceAtFootprint(d.gx,d.gy,S.preview.id)){
          S.placements.push({ id:S.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h, door:{...def.door} });
          occupyFootprint(d.gx,d.gy,def.size.w,def.size.h);
          log('placed ✓',{ id:S.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });
          exitBuildMode('confirm');
          EVT('cb:build:placed',{ id:def.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });
          return;
        } else warn('confirm: Position inzwischen unplazierbar');
      }
      exitBuildMode('confirm-invalid');
    });
    window.addEventListener('cb:place:cancel',()=>exitBuildMode('cancel'));

    window.addEventListener('cb:dbg:entrances:show',(e)=>{ S.showEntrances=!!e.detail?.show; });

    log('init ✓');
  }

  async function start(mapId){
    S.mapId=mapId||S.mapId||'data/maps/map-mini.json';
    S.started=true;

    await loadMap(S.mapId);
    S.map?.reload?.();

    onResize(); centerCameraOnMap();
    rebuildOccupied();

    cancelAnimationFrame(S.rafId);
    S.lastTs=0;
    S.rafId=requestAnimationFrame(frame);

    requestAnimationFrame(()=>{ onResize(); centerCameraOnMap(); });
  }

  const getState=()=>{ const { started,mapId,tile,gridW,gridH,placements,selected }=S; return { started,mapId,tile,gridW,gridH,placements:placements.slice(),selectedBuilding:selected }; };

  window.Game={ init, start, getState };
})();
