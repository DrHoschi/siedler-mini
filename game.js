/* Siedler-Mini V14.7 – game.js (mobile / top-down)  —  Build: hf3
   – iPhone 16 Pro / iOS 18.x ready
   – Sprite-Träger aktiv (mit Fallback auf Punkt)
*/

const Assets = (() => {
  const CACHE = new Map();
  const EXTS = ['.png','.PNG','.jpg','.JPG','.jpeg','.JPEG'];
  function tryLoad(url){
    return new Promise((res,rej)=>{
      const img=new Image();
      img.decoding='async'; img.crossOrigin='anonymous';
      img.onload=()=>res(img); img.onerror=()=>rej(new Error('404: '+url));
      const bust=(url.includes('?')?'&':'?')+'v='+Date.now(); img.src=url+bust;
    });
  }
  async function loadImage(base){
    if (CACHE.has(base)) return CACHE.get(base);
    let last;
    for (const ext of EXTS){ try{ const i=await tryLoad(base+ext); CACHE.set(base,i); return i; }catch(e){last=e;} }
    throw last??new Error('Asset not found: '+base);
  }
  async function loadFirstAvailable(bases){
    for (const b of bases){ try{ return await loadImage(b);}catch{} }
    throw new Error('No base: '+bases.join(', '));
  }
  return {loadImage,loadFirstAvailable};
})();

export const game = (() => {
  const TILE=64, GRID_COLOR='#1e2a3d', TEXT_COLOR='#cfe3ff';

  // Produktion/Träger (tuning)
  const WOOD_PROD_EVERY=4.0;
  const CARRIER_SPAWN_WAIT=3.0;   // ~3s bis loslaufen
  const CARRIER_SPEED=28;         // sanfter

  const TOOL={POINTER:'pointer',ROAD:'road',HQ:'hq',WC:'woodcutter',DEPOT:'depot',ERASE:'erase'};

  const state={
    canvas:null,ctx:null,DPR:1,w:0,h:0,
    camX:0,camY:0,zoom:1,minZoom:.5,maxZoom:2,
    tool:TOOL.POINTER,isPanning:false,panSX:0,panSY:0,camSX:0,camSY:0,
    pointers:new Map(),
    running:false,
    roads:[],
    buildings:[],
    carriers:[],
    res:{wood:0,stone:0,food:0,gold:0},
    tex:{grass:null,dirt:null,hq:null,wc:null,depot:null,placeholder:null},
    roadTex:{straight:null,corner:null,t:null,cross:null},
    sprites:{ carrier:null },   // <— neu
    onHUD:(k,v)=>{},
    roadStart:null,
    _graph:null,
  };

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const snap=v=>Math.round(v/TILE)*TILE;
  const setHUD=(k,v)=>state.onHUD?.(k,v);
  function setTool(name){ state.tool=name; if(name!==TOOL.ROAD) state.roadStart=null; setHUD('Tool',name); }

  // DPR-sichere Canvas/Koordinaten
  function attachCanvas(canvas){
    state.canvas=canvas; state.ctx=canvas.getContext('2d');
    state.DPR=Math.max(1,Math.min(3,window.devicePixelRatio||1));
    resizeCanvas(); setHUD('Zoom',state.zoom.toFixed(2)+'x');
  }
  function resizeCanvas(){
    const r=state.canvas.getBoundingClientRect();
    state.w=Math.max(1,Math.floor(r.width*state.DPR));
    state.h=Math.max(1,Math.floor(r.height*state.DPR));
    if(state.canvas.width!==state.w||state.canvas.height!==state.h){ state.canvas.width=state.w; state.canvas.height=state.h; }
  }
  function toWorld(sx,sy){
    const viewW=state.w/state.DPR, viewH=state.h/state.DPR;
    return { x:(sx-viewW/2)/state.zoom+state.camX, y:(sy-viewH/2)/state.zoom+state.camY };
  }
  function toScreen(wx,wy){
    const viewW=state.w/state.DPR, viewH=state.h/state.DPR;
    return { x:(wx-state.camX)*state.zoom+viewW/2, y:(wy-state.camY)*state.zoom+viewH/2 };
  }

  // Sprite-Helper (einfaches Frame-Array aus TexturePacker-JSON)
  // --- in game.js: buildSimpleSprite ersetzen ---
function buildSimpleSprite(img, json){
  // Array ODER Object unterstützen
  const raw = Array.isArray(json.frames) ? json.frames : Object.values(json.frames || {});
  const frames = raw.map(f=>{
    // TexturePacker: f.frame vorhanden, sonst direkt x/y/w/h
    const r = f.frame || f;
    return { x: r.x|0, y: r.y|0, w: r.w|0, h: r.h|0 };
  });

  return {
    img, frames,
    draw(ctx, wx, wy, zoom, phase){
      if(!frames.length) return;
      const f = frames[Math.floor(phase*frames.length)%frames.length];
      const p = toScreen(wx,wy);
      const scale = Math.max(1, 1.0*zoom);
      const dw = Math.round(f.w*scale*state.DPR), dh = Math.round(f.h*scale*state.DPR);
      const dx = Math.round(p.x*state.DPR - dw/2), dy = Math.round(p.y*state.DPR - dh/2);
      ctx.drawImage(img, f.x,f.y,f.w,f.h, dx,dy, dw,dh);
    }
  };
}

  async function loadTextures(){
    // Placeholder
    try{ state.tex.placeholder=await Assets.loadImage('assets/tex/placeholder64'); }
    catch{
      const c=document.createElement('canvas'); c.width=c.height=64;
      const cx=c.getContext('2d'); cx.fillStyle='#666'; cx.fillRect(0,0,64,64);
      const i=new Image(); i.src=c.toDataURL(); await i.decode(); state.tex.placeholder=i;
    }
    async function tryTex(bases){ try{ return await Assets.loadFirstAvailable(bases);}catch{ return state.tex.placeholder; } }

    // Terrain
    state.tex.grass=await tryTex(['assets/tex/terrain/topdown_grass','assets/textures/topdown_grass','assets/tex/grass']);
    state.tex.dirt =await tryTex(['assets/tex/terrain/topdown_dirt','assets/textures/topdown_dirt','assets/tex/dirt']);

    // Gebäude
    state.tex.hq   =await tryTex(['assets/tex/building/topdown_hq','assets/textures/topdown_hq','assets/tex/hq_top']);
    state.tex.wc   =await tryTex(['assets/tex/building/topdown_woodcutter','assets/textures/topdown_woodcutter','assets/tex/woodcutter_top']);
    state.tex.depot=await tryTex(['assets/tex/building/topdown_depot','assets/textures/topdown_depot','assets/tex/depot_top']);

    // Straßen
    state.roadTex.straight=await tryTex(['assets/tex/road/topdown_road_straight','assets/textures/topdown_road_straight','assets/tex/road_straight_topdown']);
    state.roadTex.corner  =await tryTex(['assets/tex/road/topdown_road_corner','assets/textures/topdown_road_corner','assets/tex/road_corner_topdown']);
    state.roadTex.t       =await tryTex(['assets/tex/road/topdown_road_t','assets/textures/topdown_road_t','assets/tex/road_t_topdown']);
    state.roadTex.cross   =await tryTex(['assets/tex/road/topdown_road_cross','assets/textures/topdown_road_cross','assets/tex/road_cross_topdown']);

    // === Neu: Träger-Sprite laden (falls vorhanden), sonst Fallback ===
    try{
      const carrierImg = await tryTex(['assets/units/carrier_topdown_v2','assets/units/carrier']);
      const json = await fetch('assets/units/carrier_topdown_v2.json?cb='+Date.now()).then(r=>r.json());
      state.sprites.carrier = buildSimpleSprite(carrierImg, json);
    }catch{
      state.sprites.carrier = null; // → Punkte zeichnen
    }

    /*  OPTIONAL / AUSKOMMENTIERT: Woodcutter-Sprite
    try{
      const wcImg = await tryTex(['assets/units/woodcutter_topdown_v1']);
      const wcJson= await fetch('assets/units/woodcutter_topdown_v1.json?cb='+Date.now()).then(r=>r.json());
      state.sprites.woodcutter = buildSimpleSprite(wcImg, wcJson);
    }catch{}
    */
  }

  // Welt-Helper
  function addBuilding(type,wx,wy){
    const b={ id:Math.random().toString(36).slice(2), type,
      x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2,
      stock:0, timer:0, connected:false };
    state.buildings.push(b); rebuildConnectivity();
  }
  function addRoad(wx1,wy1,wx2,wy2){
    const x1=snap(wx1),y1=snap(wy1),x2=snap(wx2),y2=snap(wy2);
    if(Math.hypot(x2-x1,y2-y1)<1) return;
    state.roads.push({x1,y1,x2,y2}); rebuildConnectivity();
  }
  function eraseAt(wx,wy){
    for(let i=state.buildings.length-1;i>=0;i--){
      const b=state.buildings[i], x0=b.x-b.w/2,x1=b.x+b.w/2,y0=b.y-b.h/2,y1=b.y+b.h/2;
      if(wx>=x0&&wx<=x1&&wy>=y0&&wy<=y1){ state.buildings.splice(i,1); rebuildConnectivity(); return true; }
    }
    const hit=8/state.zoom;
    for(let i=state.roads.length-1;i>=0;i--){
      const r=state.roads[i]; if(distPointSeg(wx,wy,r.x1,r.y1,r.x2,r.y2)<=hit){ state.roads.splice(i,1); rebuildConnectivity(); return true; }
    }
    return false;
  }
  function distPointSeg(px,py,x1,y1,x2,y2){
    const A=px-x1,B=py-y1,C=x2-x1,D=y2-y1, dot=A*C+B*D, len2=C*C+D*D;
    const t=len2?clamp(dot/len2,0,1):0, x=x1+t*C, y=y1+t*D; return Math.hypot(px-x,py-y);
  }

  // Konnektivität/Pfade
  function rebuildConnectivity(){
    const key=(x,y)=>`${x},${y}`;
    const nodes=new Map(); const ensure=(x,y)=>{const k=key(x,y); if(!nodes.has(k)) nodes.set(k,{x,y,adj:new Set()}); return nodes.get(k);};
    const link=(a,b)=>{a.adj.add(key(b.x,b.y)); b.adj.add(key(a.x,a.y));};
    for(const r of state.roads){ const a=ensure(r.x1,r.y1), b=ensure(r.x2,r.y2); link(a,b); }
    const bNode=new Map();
    for(const b of state.buildings){
      const bn=ensure(b.x,b.y); bNode.set(b.id,key(b.x,b.y));
      for(const [,n] of nodes){ const man=Math.abs(n.x-b.x)+Math.abs(n.y-b.y); if(man<=TILE) link(bn,n); }
    }
    const active=new Set(), q=[];
    for(const b of state.buildings){ if(b.type===TOOL.HQ){ const k=bNode.get(b.id); if(k){active.add(k); q.push(k);} } }
    while(q.length){ const k=q.shift(), n=nodes.get(k); if(!n) continue; for(const nk of n.adj){ if(!active.has(nk)){active.add(nk); q.push(nk);} } }
    for(const b of state.buildings){ const k=bNode.get(b.id); b.connected = k?active.has(k):false; }
    state._graph={nodes,bNode,active};
  }
  function shortestPath(wx1,wy1,wx2,wy2){
    const G=state._graph; if(!G) return null;
    const s=`${wx1},${wy1}`, g=`${wx2},${wy2}`; if(!G.nodes.has(s)||!G.nodes.has(g)) return null;
    const prev=new Map(), seen=new Set([s]), q=[s];
    while(q.length){ const k=q.shift(); if(k===g) break; const n=G.nodes.get(k); for(const nk of n.adj){ if(!seen.has(nk)){seen.add(nk); prev.set(nk,k); q.push(nk);} } }
    if(!prev.has(g)&&s!==g) return null;
    const out=[]; let cur=g; out.push(cur); while(cur!==s){ cur=prev.get(cur); if(!cur) return null; out.push(cur); } out.reverse();
    return out.map(k=>{const [x,y]=k.split(',').map(Number); return {x,y};});
  }
  function nearestHQorDepot(wx,wy){
    const cs=state.buildings.filter(b=>(b.type===TOOL.HQ||b.type===TOOL.DEPOT)&&b.connected);
    if(!cs.length) return null; let best=null,bd=1e9; for(const b of cs){ const d=Math.hypot(b.x-wx,b.y-wy); if(d<bd){bd=d; best=b;} } return best;
  }

  // Produktion/Träger
  function updateProduction(dt){
    for(const b of state.buildings){
      if(b.type!==TOOL.WC||!b.connected) continue;
      b.timer+=dt; if(b.timer>=WOOD_PROD_EVERY){ b.timer-=WOOD_PROD_EVERY; b.stock=(b.stock||0)+1; maybeDispatchCarrier(b); }
    }
  }
  function maybeDispatchCarrier(wc){
    const already=state.carriers.some(c=>c.targetWC===wc.id&&!c.carrying); if(already) return;
    if((wc.stock||0)<=0) return;
    const base=nearestHQorDepot(wc.x,wc.y); if(!base) return;
    const path=shortestPath(wc.x,wc.y,base.x,base.y); if(!path||path.length<2) return;
    state.carriers.push({ x:wc.x,y:wc.y, path, onNodeIndex:0, speed:CARRIER_SPEED, nextWait:CARRIER_SPAWN_WAIT, carrying:false, targetWC:wc.id, phase:0 });
  }
  function updateCarriers(dt){
    for(const c of state.carriers){
      if(c.nextWait>0){ c.nextWait-=dt; continue; }
      if(!c.path||c.path.length<2) continue;
      const i=c.onNodeIndex, a=c.path[i], b=c.path[i+1]||a;
      const dx=b.x-c.x, dy=b.y-c.y, dist=Math.hypot(dx,dy), step=c.speed*dt;
      c.phase = (c.phase+dt*4)%1; // Animationsphase (für Sprite)
      if(dist<=step){
        c.x=b.x; c.y=b.y; c.onNodeIndex++;
        if(c.onNodeIndex>=c.path.length-1){
          if(!c.carrying){
            const wc=state.buildings.find(bb=>bb.id===c.targetWC);
            if(wc&&wc.stock>0){
              wc.stock--; c.carrying=true;
              const base=nearestHQorDepot(c.x,c.y);
              const back=base?shortestPath(c.x,c.y,base.x,base.y):null;
              c.path=back||c.path.slice().reverse(); c.onNodeIndex=0; c.nextWait=.2;
            }else{ c._done=true; }
          }else{
            state.res.wood+=1; setHUD('Wood',state.res.wood); c._done=true;
          }
        }
      }else{
        const vx=dx/dist, vy=dy/dist; c.x+=vx*step; c.y+=vy*step;
      }
    }
    state.carriers=state.carriers.filter(c=>!c._done);
  }

  // Rendering
  function clear(){ state.ctx.clearRect(0,0,state.w,state.h); }
  function drawGrid(){
    const ctx=state.ctx, viewW=state.w/state.DPR, viewH=state.h/state.DPR;
    ctx.save(); ctx.strokeStyle=GRID_COLOR; ctx.lineWidth=1;
    const step=TILE*state.zoom, ox=(viewW/2-state.camX*state.zoom)%step, oy=(viewH/2-state.camY*state.zoom)%step;
    ctx.beginPath();
    for(let x=ox;x<=viewW;x+=step){ ctx.moveTo(x*state.DPR,0); ctx.lineTo(x*state.DPR,viewH*state.DPR); }
    for(let y=oy;y<=viewH;y+=step){ ctx.moveTo(0,y*state.DPR); ctx.lineTo(viewW*state.DPR,y*state.DPR); }
    ctx.stroke(); ctx.restore();
  }
  function drawTile(img,wx,wy){
    const p=toScreen(wx,wy), s=TILE*state.zoom;
    state.ctx.drawImage(img, Math.round((p.x-s/2)*state.DPR), Math.round((p.y-s/2)*state.DPR), Math.round(s*state.DPR), Math.round(s*state.DPR));
  }
  function drawTileRot(img,wx,wy,deg){
    const p=toScreen(wx,wy), s=TILE*state.zoom, cx=Math.round(p.x*state.DPR), cy=Math.round(p.y*state.DPR);
    const w=Math.round(s*state.DPR), h=w, ctx=state.ctx; ctx.save(); ctx.translate(cx,cy); ctx.rotate(deg*Math.PI/180);
    ctx.drawImage(img,-w/2,-h/2,w,h); ctx.restore();
  }
  function drawLabel(text,wx,wy){
    const p=toScreen(wx,wy), ctx=state.ctx;
    ctx.save(); ctx.fillStyle=TEXT_COLOR; ctx.font=`${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(text, Math.round(p.x*state.DPR), Math.round((p.y-4)*state.DPR)); ctx.restore();
  }
  function roadNeighborsAt(x,y){
    const has={N:false,E:false,S:false,W:false};
    for(const r of state.roads){
      if(r.x1===x&&r.y1===y){
        if(r.x2===x&&r.y2===y-TILE)has.N=true;
        if(r.x2===x+TILE&&r.y2===y)has.E=true;
        if(r.x2===x&&r.y2===y+TILE)has.S=true;
        if(r.x2===x-TILE&&r.y2===y)has.W=true;
      }else if(r.x2===x&&r.y2===y){
        if(r.x1===x&&r.y1===y-TILE)has.N=true;
        if(r.x1===x+TILE&&r.y1===y)has.E=true;
        if(r.x1===x&&r.y1===y+TILE)has.S=true;
        if(r.x1===x-TILE&&r.y1===y)has.W=true;
      }
    }
    return has;
  }
  function drawRoadNetwork(){
    const seen=new Set();
    for(const r of state.roads){
      for(const p of [{x:r.x1,y:r.y1},{x:r.x2,y:r.y2}]){
        const k=`${p.x},${p.y}`; if(seen.has(k)) continue; seen.add(k);
        const nb=roadNeighborsAt(p.x,p.y);
        const c=(nb.N?1:0)+(nb.E?1:0)+(nb.S?1:0)+(nb.W?1:0);
        let tex=state.roadTex.straight, rot=0;
        if(c===4){ tex=state.roadTex.cross; rot=0; }
        else if(c===3){
          tex=state.roadTex.t;
          if(!nb.N)rot=180; else if(!nb.E)rot=270; else if(!nb.S)rot=0; else if(!nb.W)rot=90;
        }else if(c===2){
          if((nb.N&&nb.S)||(nb.E&&nb.W)){ tex=state.roadTex.straight; rot=(nb.N&&nb.S)?0:90; }
          else{
            tex=state.roadTex.corner;
            if(nb.N&&nb.E)rot=0; else if(nb.E&&nb.S)rot=90; else if(nb.S&&nb.W)rot=180; else if(nb.W&&nb.N)rot=270;
          }
        }else if(c===1){ tex=state.roadTex.straight; rot=(nb.N||nb.S)?0:90; }
        drawTileRot(tex,p.x,p.y,rot);
      }
    }
  }
  function drawBuilding(b){
    const img=b.type===TOOL.HQ?state.tex.hq : b.type===TOOL.WC?state.tex.wc : state.tex.depot;
    // Untergrund 2×2 Dirt
    drawTile(state.tex.dirt, b.x-TILE/2, b.y-TILE/2);
    drawTile(state.tex.dirt, b.x+TILE/2, b.y-TILE/2);
    drawTile(state.tex.dirt, b.x-TILE/2, b.y+TILE/2);
    drawTile(state.tex.dirt, b.x+TILE/2, b.y+TILE/2);
    // Gebäude drauf
    const p=toScreen(b.x,b.y), w=2*TILE*state.zoom, h=w;
    state.ctx.drawImage( img,
      Math.round((p.x-w/2)*state.DPR), Math.round((p.y-h/2)*state.DPR),
      Math.round(w*state.DPR), Math.round(h*state.DPR));
    if(b.type===TOOL.WC && b.stock>0) drawLabel(`Holz ×${b.stock}`, b.x, b.y-b.h*.6);
  }
  function drawWorld(){
    clear();
    const viewW=state.w/state.DPR, viewH=state.h/state.DPR;
    const left=Math.floor((state.camX-viewW/2)/TILE)-2, right=Math.ceil((state.camX+viewW/2)/TILE)+2;
    const top=Math.floor((state.camY-viewH/2)/TILE)-2, bottom=Math.ceil((state.camY+viewH/2)/TILE)+2;
    for(let gy=top; gy<=bottom; gy++){ for(let gx=left; gx<=right; gx++){ drawTile(state.tex.grass, gx*TILE, gy*TILE); } }
    drawRoadNetwork();
    for(const b of state.buildings) drawBuilding(b);

    // Carrier: Sprite oder Punkt
    const ctx=state.ctx; ctx.save();
    for(const c of state.carriers){
      if(state.sprites.carrier){
        state.sprites.carrier.draw(ctx, c.x, c.y, state.zoom, c.phase||0);
      }else{
        const p=toScreen(c.x,c.y); ctx.fillStyle=c.carrying?'#ffd166':'#4ecdc4';
        const r=Math.max(2,Math.round(3*state.zoom*state.DPR));
        ctx.beginPath(); ctx.arc(Math.round(p.x*state.DPR),Math.round(p.y*state.DPR),r,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
    drawGrid();
  }

  // Input
  function addInput(){
    const el=state.canvas;
    el.addEventListener('pointerdown',onPD,{passive:false});
    el.addEventListener('pointermove',onPM,{passive:false});
    el.addEventListener('pointerup',onPU,{passive:false});
    el.addEventListener('pointercancel',onPU,{passive:false});
    el.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('resize',()=>{resizeCanvas();});
    window.addEventListener('orientationchange',()=>setTimeout(resizeCanvas,250));
    document.addEventListener('fullscreenchange',resizeCanvas);
    document.addEventListener('webkitfullscreenchange',resizeCanvas);
  }
  function onWheel(e){
    e.preventDefault(); const delta=-Math.sign(e.deltaY)*.1; const before=state.zoom;
    state.zoom=clamp(state.zoom+delta,state.minZoom,state.maxZoom); if(state.zoom!==before)setHUD('Zoom',state.zoom.toFixed(2)+'x');
  }
  function onPD(e){
    try{ state.canvas.setPointerCapture(e.pointerId);}catch{}
    state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(state.pointers.size===2){ state._pinch=startPinch(); return; }
    const {x,y}=toWorld(e.clientX,e.clientY);
    if(state.tool===TOOL.POINTER){
      state.isPanning=true; state.panSX=e.clientX; state.panSY=e.clientY; state.camSX=state.camX; state.camSY=state.camY;
    }else if(state.tool===TOOL.ROAD){
      if(!state.roadStart) state.roadStart={x:snap(x),y:snap(y)};
      else{ addRoad(state.roadStart.x,state.roadStart.y,x,y); state.roadStart=null; }
    }else if(state.tool===TOOL.HQ){ addBuilding(TOOL.HQ,x,y); }
    else if(state.tool===TOOL.WC){ addBuilding(TOOL.WC,x,y); }
    else if(state.tool===TOOL.DEPOT){ addBuilding(TOOL.DEPOT,x,y); }
    else if(state.tool===TOOL.ERASE){ eraseAt(x,y); }
  }
  function onPM(e){
    const p=state.pointers.get(e.pointerId); if(p){p.x=e.clientX;p.y=e.clientY;}
    if(state.pointers.size===2){ doPinch(); return; }
    if(state.isPanning&&state.tool===TOOL.POINTER){
      e.preventDefault(); const dx=(e.clientX-state.panSX)/state.zoom, dy=(e.clientY-state.panSY)/state.zoom;
      state.camX=state.camSX-dx; state.camY=state.camSY-dy;
    }
  }
  function onPU(e){ try{state.canvas.releasePointerCapture(e.pointerId);}catch{} state.pointers.delete(e.pointerId); state.isPanning=false; state._pinch=null; }
  function startPinch(){ const pts=[...state.pointers.values()], d0=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y); return {d0,z0:state.zoom}; }
  function doPinch(){ if(!state._pinch)return; const pts=[...state.pointers.values()]; if(pts.length<2)return;
    const d=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y), scale=d/(state._pinch.d0||1);
    const before=state.zoom; state.zoom=clamp(state._pinch.z0*scale,state.minZoom,state.maxZoom); if(state.zoom!==before)setHUD('Zoom',state.zoom.toFixed(2)+'x'); }

  // Loop
  let last=0;
  function loop(ts){
    if(!state.running){ drawWorld(); requestAnimationFrame(loop); return; }
    const dt=Math.min(.05,(ts-last)/1000||0); last=ts;
    updateProduction(dt); updateCarriers(dt); drawWorld(); requestAnimationFrame(loop);
  }

  async function startGame(opts={}){
    if(state.running) return;
    attachCanvas(opts.canvas); state.onHUD=opts.onHUD||(()=>{});
    await loadTextures();
    state.zoom=1.0; state.camX=0; state.camY=0;
    setHUD('Zoom',state.zoom.toFixed(2)+'x');
    setHUD('Wood',state.res.wood); setHUD('Stone',state.res.stone);
    setHUD('Food',state.res.food); setHUD('Gold',state.res.gold);
    setHUD('Carriers',state.carriers.length);
    if(!state.buildings.some(b=>b.type===TOOL.HQ)) addBuilding(TOOL.HQ,0,0);
    addInput(); state.running=true; requestAnimationFrame(loop);
  }
  function center(){ state.camX=0; state.camY=0; }

  return { startGame, setTool, center, get state(){return state;}, TOOL };
})();
