/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v18.7.1 (URL-Normalisierung Icons/Sprites + stabile Preview)
 *
 * Änderungen ggü. v18.7.0:
 *  - normalizeUrl(): relative Registry-Pfade (z.B. "hq" / "hq.png")
 *    werden zuverlässig mit iconsBase kombiniert.
 *  - buildMapsFromRegistry(): nutzt normalizeUrl() für Icon+Sprite.
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

  // == Registry / Asset-Resolver ============================================
  function iconsBase(){
    try {
      // Du kannst das in registry.js setzen: Registry.set('iconsBase', 'assets/icons/buildings/')
      return (window.Registry?.get?.('iconsBase'))
          || 'assets/icons/buildings/'; // Fallback
    } catch { return 'assets/icons/buildings/'; }
  }
  const isAbs = u => /^(https?:)?\/\//i.test(u) || u?.startsWith('/') || u?.startsWith('data:');
  const withExt = n => /\.(png|webp|jpg|jpeg|svg)$/i.test(n) ? n : (n + '.png');
  function normalizeUrl(u){
    if (!u) return null;
    if (isAbs(u)) return u;
    const base = String(iconsBase()).replace(/\/+$/,'');
    return base + '/' + withExt(String(u).replace(/^\.?\/*/,''));
  }

  function buildMapsFromRegistry(){
    if (_state.iconMap && _state.spriteMap) return;
    const icons=new Map(), sprites=new Map();
    try{
      const list = window.Registry?.get?.('buildings') || [];
      for (const b of list){
        const id = String(b.id);
        // Akzeptiere alle Varianten aus deiner Registry
        const rawIcon   = b.iconUrl   || b.icon   || b.iconId   || b.iconPath;
        const rawSprite = b.spriteUrl || b.sprite || b.spriteId || b.spritePath || rawIcon;
        const iconUrl   = normalizeUrl(rawIcon);
        const spriteUrl = normalizeUrl(rawSprite);
        if (iconUrl)   icons.set(id,iconUrl);
        if (spriteUrl) sprites.set(id,spriteUrl);
      }
    }catch(e){ warn('buildMapsFromRegistry fail', e); }
    _state.iconMap=icons; _state.spriteMap=sprites;
  }
  const getIconUrl   = id=>{ buildMapsFromRegistry(); return _state.iconMap.get(String(id))   || null; };
  const getSpriteUrl = id=>{ buildMapsFromRegistry(); return _state.spriteMap.get(String(id)) || getIconUrl(id); };

  function getImage(url){
    if(!url) return null;
    const c=_state.imgCache.get(url);
    if (c instanceof Image) return c;
    if (c==='loading'||c==='error') return null;
    const img=new Image();
    _state.imgCache.set(url,'loading');
    img.onload =()=>_state.imgCache.set(url,img);
    img.onerror=()=>_state.imgCache.set(url,'error');
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

  const keyXY=(x,y)=>`${x},${y}`;
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
  function screenToCanvasPx(cx,cy){
    const c=_state.canvas, r=c.getBoundingClientRect();
    return { sx:(cx-r.left)*(c.width/Math.max(1,r.width)), sy:(cy-r.top)*(c.height/Math.max(1,r.height)) };
  }
  const screenToWorld=(cx,cy)=>{ const {sx,sy}=screenToCanvasPx(cx,cy); return { wx:sx/_state.zoom+_state.camX, wy:sy/_state.zoom+_state.camY }; };
  const worldToScreen=(wx,wy)=>({ sx:(wx-_state.camX)*_state.zoom, sy:(wy-_state.camY)*_state.zoom });

  function drawRect(ctx,sx,sy,w,h,ok){
    ctx.fillStyle = ok ? 'rgba(120,200,120,.18)' : 'rgba(200,80,80,.18)';
    ctx.strokeStyle= ok ? 'rgba(120,200,120,.9)'  : 'rgba(200,80,80,.95)';
    ctx.fillRect(sx,sy,w,h);
    ctx.strokeRect(sx+.5,sy+.5,w-1,h-1);
  }

  function drawPlacementSprite(ctx,id,sx,sy,wTiles,hTiles){
    // Erst Sprite, falls nicht da → Icon
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
    }
  }

  function emitPreviewEvent(payload){
    // Liefert immer tx/ty (== gx/gy), Canvas-Infos & Cam
    const c=_state.canvas, r=c?.getBoundingClientRect?.();
    EVT('cb:place:preview', {
      ...payload,
      tx: payload.gx, ty: payload.gy,
      cam:{x:_state.camX,y:_state.camY,z:_state.zoom},
      cssScale: r ? { x:c.width/Math.max(1,r.width), y:c.height/Math.max(1,r.height) } : {x:1,y:1},
      canvas:{w:c?.width||0,h:c?.height||0}
    });
  }

  function drawGhost(ctx){
    let gx=-1,gy=-1,id=_state.selectedBuilding;
    if (_state.preview){ gx=_state.preview.gx; gy=_state.preview.gy; id=_state.preview.id; }
    else if (id && inBoundsTile(_state.hover.x,_state.hover.y)){ gx=_state.hover.x; gy=_state.hover.y; }
    if (!inBoundsTile(gx,gy) || !id){ if (_state.preview && !inBoundsTile(gx,gy)) emitPreviewEvent({invalid:true}); return; }

    const def=getBuildingDef(id);
    const s=_state.tile*_state.zoom;
    const pos=worldToScreen(gx*_state.tile, gy*_state.tile);
    const ok=canPlaceAtFootprint(gx,gy,id);
    drawRect(ctx,pos.sx,pos.sy,def.size.w*s,def.size.h*s,ok);

    // Eingänge debug (optional)
    // const entrancesAbs=computeEntrancesAbs(gx,gy,def); ... (weggelassen, war ok)

    emitPreviewEvent({
      id, gx, gy, sx:pos.sx, sy:pos.sy, size:s, invalid:!ok,
      w:def.size.w, h:def.size.h, door:{...def.door},
      entrances:def.entrances.slice()
    });
  }

  // == Frame ================================================================
  function frame(ts){
    if(!_state.started) return;
    const {ctx,canvas,map}=_state; if(!ctx||!canvas) return;

    map?.draw();

    ctx.setTransform(1,0,0,1,0,0);
    ctx.save();
    drawGhost(ctx);
    drawPlacements(ctx);
    ctx.restore();

    _state.rafId=requestAnimationFrame(frame);
  }

  // == Map laden / Input / Build-Flow (wie gehabt) ==========================
  // (… unverändert zu deiner funktionierenden Basis – alles aus deiner v18.7.0 bleibt)
  // -- ich lasse hier bewusst den ganze Input-Block aus, da er bei dir läuft --
  // -- ↓↓↓ NUR INIT/START sichtbar, Rest wie in deiner Datei belassen ↓↓↓ --

  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas=canvas;
    _state.ctx   =canvas.getContext('2d');

    // (Dein übriges init bleibt unverändert)
    window.addEventListener('resize',()=>{ /* clamp + size anpassen – wie bei dir */ });

    log('init ✓');
  }

  async function start(mapId){
    _state.mapId=mapId||_state.mapId||'data/maps/map-mini.json';
    _state.started=true;

    // (Map laden + centerCamera etc. wie bei dir)
    cancelAnimationFrame(_state.rafId);
    _state.rafId=requestAnimationFrame(frame);
    EVT('cb:res:change',{..._state.resources});
  }

  // API
  window.Game={ init, start, getState:()=>({ started:_state.started, mapId:_state.mapId }), getResources:()=>({ ..._state.resources }) };
})();
