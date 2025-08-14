/* game.js — Siedler‑Mini V14.7g (Mobile)
   - Top‑Down Draufsicht
   - Punkt‑zu‑Punkt-Straßenbau (Kettenbau, neuer Start wenn Tap weit weg)
   - Abriss (Straßen/Buildings)
   - Träger (gelbe Punkte) laufen HQ → Holzfäller → Depot → zurück
   - Öffentliche API: window.game.startGame({canvas,DPR,onHUD}), setTool, center, setZoom, reset, toggleDebug
*/
(function () {
  'use strict';

  // ====== Util ======
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  function rasterLine(x0, y0, x1, y1) {
    const pts = [];
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      pts.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      let e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return pts;
  }
  class Queue{constructor(){this.a=[];this.b=0;}push(v){this.a.push(v);}shift(){return this.a[this.b++];}get length(){return this.a.length-this.b;}}

  // ====== Welt / State ======
  const TILE = 40;
  const WORLD_W = 128, WORLD_H = 128;

  const Tools = { POINTER:'pointer', ROAD:'road', HQ:'hq', WOOD:'woodcutter', DEPOT:'depot', ERASE:'erase' };
  const Colors = {
    bg:'#0b1628', grid:'#172436', grid2:'#0f1b2a',
    road:'#6ed39a', hq:'#39b36a', wood:'#4d86ff', depot:'#e04586',
    text:'#cfe3ff', carrier:'#ffe08a', carrierShadow:'rgba(0,0,0,.25)'
  };

  const state = {
    canvas:null, ctx:null, DPR:1, onHUD:(k,v)=>{},
    cam:{x:WORLD_W/2, y:WORLD_H/2, z:1},
    tool:Tools.POINTER,
    dragging:false, dragStart:{x:0,y:0}, camAtDrag:{x:0,y:0},
    buildings:[],                    // {id,type,x,y,w,h}
    roads:new Set(),                 // Set "x,y"
    roadChainStart:null, previewTile:null,
    carriers:[],                     // {path, seg, t, speed}
    debug:false
  };

  const key = (x,y)=>`${x},${y}`;

  // ====== HUD Helpers ======
  function hudTool(){ state.onHUD('Tool', labelTool(state.tool)); }
  function hudZoom(){ state.onHUD('Zoom', state.cam.z.toFixed(2)+'x'); }
  function labelTool(t){
    switch(t){
      case 'pointer': return 'Zeiger';
      case 'road': return 'Straße';
      case 'hq': return 'HQ';
      case 'woodcutter': return 'Holzfäller';
      case 'depot': return 'Depot';
      case 'erase': return 'Abriss';
      default: return t;
    }
  }

  // ====== Transform ======
  function worldToScreen(x, y) {
    const { cam } = state;
    const px = (x - cam.x) * (TILE*cam.z) + state.canvas.width/2;
    const py = (y - cam.y) * (TILE*cam.z) + state.canvas.height/2;
    return { x: px, y: py };
  }
  function screenToWorld(px, py) {
    const { cam } = state;
    const x = (px - state.canvas.width/2) / (TILE*cam.z) + cam.x;
    const y = (py - state.canvas.height/2) / (TILE*cam.z) + cam.y;
    return { x, y };
  }
  function screenToTile(px, py) {
    const w = screenToWorld(px, py);
    return { x: Math.round(w.x), y: Math.round(w.y) };
  }

  // ====== Welt ======
  function place(id,type,x,y,w,h){ state.buildings.push({id,type,x,y,w,h}); }
  function placeHQ(x, y){ place(randId(),'hq',x,y,3,2); }
  function placeBuilding(type,x,y){
    const w = type==='hq'?3:2, h = type==='hq'?2:2;
    place(randId(), type, x, y, w, h);
  }
  function buildingAt(tx, ty){
    return state.buildings.find(b => tx>=b.x && tx<b.x+b.w && ty>=b.y && ty<b.y+b.h);
  }
  function addRoadLine(a,b){ rasterLine(a.x,a.y,b.x,b.y).forEach(p=>state.roads.add(key(p.x,p.y))); }
  function removeRoadAt(tx,ty){ const k=key(tx,ty); if(state.roads.has(k)){state.roads.delete(k); return true;} return false; }
  function randId(){ return Math.random().toString(36).slice(2,10); }

  // ====== Pfade & Träger ======
  function neighbors(x,y){
    const res=[], opts=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy] of opts){ const kxy=key(x+dx,y+dy); if(state.roads.has(kxy)) res.push({x:x+dx,y:y+dy}); }
    return res;
  }
  function nearestRoadToRect(b){
    const cx=Math.round(b.x+b.w/2), cy=Math.round(b.y+Math.floor(b.h/2));
    let best=null, bestD=1e9;
    for(let r=0;r<=3;r++){
      for(let dx=-r;dx<=r;dx++){
        for(let dy=-r;dy<=r;dy++){
          const kxy=key(cx+dx,cy+dy);
          if(state.roads.has(kxy)){
            const d=Math.abs(dx)+Math.abs(dy);
            if(d<bestD){bestD=d; best={x:cx+dx,y:cy+dy};}
          }
        }
      }
      if(best) break;
    }
    return best;
  }
  function bfsPath(a,b){
    if(!a||!b) return null;
    const ak=key(a.x,a.y), bk=key(b.x,b.y);
    if(!state.roads.has(ak)||!state.roads.has(bk)) return null;
    const came=new Map(); const q=new Queue();
    came.set(ak,null); q.push(ak);
    while(q.length){
      const kx=q.shift(); if(kx===bk) break;
      const [xs,ys]=kx.split(','); const x=+xs,y=+ys;
      for(const n of neighbors(x,y)){
        const nk=key(n.x,n.y);
        if(!came.has(nk)){ came.set(nk,kx); q.push(nk); }
      }
    }
    if(!came.has(bk)) return null;
    const path=[]; let ck=bk;
    while(ck){ const [xs,ys]=ck.split(','); path.push({x:+xs,y:+ys}); ck=came.get(ck); }
    return path.reverse();
  }
  function rebuildCarriers(){
    state.carriers.length=0;
    const hq=state.buildings.find(b=>b.type==='hq');
    const wc=state.buildings.find(b=>b.type==='woodcutter');
    const dp=state.buildings.find(b=>b.type==='depot');
    if(!hq||!wc||!dp) return;
    const hqR=nearestRoadToRect(hq), wcR=nearestRoadToRect(wc), dpR=nearestRoadToRect(dp);
    if(!hqR||!wcR||!dpR) return;
    const p1=bfsPath(hqR,wcR), p2=bfsPath(wcR,dpR);
    if(p1&&p2){
      const fwd=p1.concat(p2.slice(1));
      state.carriers.push({path:fwd, seg:0, t:0, speed:1.5});
      state.carriers.push({path:fwd.slice().reverse(), seg:0, t:0, speed:1.5});
    }
  }

  // ====== Render ======
  function drawGrid(ctx){
    const s=TILE*state.cam.z;
    const w=state.canvas.width, h=state.canvas.height;
    ctx.save();
    ctx.translate(w/2 - (state.cam.x*s % s), h/2 - (state.cam.y*s % s));
    ctx.strokeStyle=Colors.grid2; ctx.lineWidth=1;
    for(let x=-20000; x<=w+20000; x+=s){ ctx.beginPath(); ctx.moveTo(x,-20000); ctx.lineTo(x,h+20000); ctx.stroke(); }
    for(let y=-20000; y<=h+20000; y+=s){ ctx.beginPath(); ctx.moveTo(-20000,y); ctx.lineTo(w+20000,y); ctx.stroke(); }
    ctx.restore();
  }
  function drawRoads(ctx){
    ctx.save();
    ctx.lineWidth=Math.max(2,4*state.cam.z);
    ctx.strokeStyle=Colors.road;
    for(const kxy of state.roads){
      const [tx,ty]=kxy.split(',').map(Number);
      const p=worldToScreen(tx,ty), s=TILE*state.cam.z;
      ctx.beginPath(); ctx.moveTo(p.x - s*0.45, p.y); ctx.lineTo(p.x + s*0.45, p.y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBuildings(ctx){
    const s=TILE*state.cam.z;
    for(const b of state.buildings){
      const p=worldToScreen(b.x,b.y); const w=b.w*s, h=b.h*s;
      ctx.save();
      ctx.fillStyle=(b.type==='hq')?Colors.hq:(b.type==='woodcutter'?Colors.wood:Colors.depot);
      ctx.beginPath(); ctx.roundRect(p.x,p.y,w,h,8*state.cam.z); ctx.fill();
      ctx.fillStyle=Colors.text; ctx.font=`${Math.max(10, 14*state.cam.z)}px system-ui,-apple-system`;
      ctx.fillText(b.type==='woodcutter'?'Holzfäller':b.type.toUpperCase(), p.x+8*state.cam.z, p.y+18*state.cam.z);
      ctx.restore();
    }
  }
  function drawCarriers(ctx){
    for(const c of state.carriers){
      if(!c.path||c.path.length<2) continue;
      const a=c.path[c.seg], b=c.path[c.seg+1]; if(!a||!b) continue;
      const x=lerp(a.x,b.x,c.t), y=lerp(a.y,b.y,c.t);
      const p=worldToScreen(x,y);
      const r=Math.max(2,3.5*state.cam.z);
      ctx.save();
      ctx.fillStyle=Colors.carrierShadow; ctx.beginPath(); ctx.arc(p.x+2,p.y+2,r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=Colors.carrier; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
  function render(){
    const {ctx,canvas}=state;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle=Colors.bg; ctx.fillRect(0,0,canvas.width,canvas.height);
    drawGrid(ctx); drawRoads(ctx); drawBuildings(ctx); drawCarriers(ctx);
    // Straßen‑Vorschau
    if(state.tool===Tools.ROAD && state.roadChainStart && state.previewTile){
      const a=state.roadChainStart, b=state.previewTile;
      const pts=rasterLine(a.x,a.y,b.x,b.y);
      ctx.save(); ctx.strokeStyle='#9cdcc0'; ctx.lineWidth=Math.max(1,2*state.cam.z);
      for(const p of pts){ const sp=worldToScreen(p.x,p.y), s=TILE*state.cam.z;
        ctx.beginPath(); ctx.moveTo(sp.x-s*0.45, sp.y); ctx.lineTo(sp.x+s*0.45, sp.y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ====== Loop ======
  let raf=0, last=0;
  function step(dt){
    for(const c of state.carriers){
      if(!c.path||c.path.length<2) continue;
      c.t += (c.speed*dt)/60;
      while(c.t>=1){ c.t-=1; c.seg++; if(c.seg>=c.path.length-1){c.seg=0; c.t=0;} }
    }
  }
  function loop(ts){
    raf=requestAnimationFrame(loop);
    const dt=(ts-last)/16.6667||1; last=ts;
    step(dt); render();
  }

  // ====== Input ======
  function onPointerDown(e){
    const r=state.canvas.getBoundingClientRect();
    const px=(e.clientX-r.left)*state.DPR, py=(e.clientY-r.top)*state.DPR;
    const t=screenToTile(px,py);

    if(state.tool===Tools.POINTER){
      state.dragging=true;
      state.dragStart={x:px,y:py}; state.camAtDrag={x:state.cam.x,y:state.cam.y};
      return;
    }
    if(state.tool===Tools.ROAD){
      if(!state.roadChainStart || Math.hypot(t.x-(state.roadChainStart.x||1e9), t.y-(state.roadChainStart.y||1e9))>2){
        state.roadChainStart=t; state.previewTile=t;
      }else{
        addRoadLine(state.roadChainStart, t);
        state.roadChainStart=t; state.previewTile=null;
        rebuildCarriers();
      }
      return;
    }
    if(state.tool===Tools.ERASE){
      if(removeRoadAt(t.x,t.y)){ rebuildCarriers(); return; }
      const b=buildingAt(t.x,t.y);
      if(b){ state.buildings=state.buildings.filter(x=>x!==b); rebuildCarriers(); }
      return;
    }
    if(state.tool===Tools.HQ||state.tool===Tools.WOOD||state.tool===Tools.DEPOT){
      if(buildingAt(t.x,t.y)) return;
      placeBuilding(state.tool===Tools.HQ?'hq':state.tool===Tools.WOOD?'woodcutter':'depot', t.x,t.y);
      rebuildCarriers(); return;
    }
  }
  function onPointerMove(e){
    const r=state.canvas.getBoundingClientRect();
    const px=(e.clientX-r.left)*state.DPR, py=(e.clientY-r.top)*state.DPR;
    if(state.tool===Tools.POINTER && state.dragging){
      const dx=(px-state.dragStart.x)/(TILE*state.cam.z);
      const dy=(py-state.dragStart.y)/(TILE*state.cam.z);
      state.cam.x=state.camAtDrag.x-dx; state.cam.y=state.camAtDrag.y-dy;
      return;
    }
    if(state.tool===Tools.ROAD && state.roadChainStart){
      state.previewTile=screenToTile(px,py);
    }
  }
  function onPointerUp(){ state.dragging=false; }
  function onWheel(e){ e.preventDefault(); setZoom(state.cam.z*(e.deltaY<0?1.1:1/1.1)); }

  // ====== Public API ======
  function startGame({canvas,DPR=1,onHUD=()=>{}}){
    state.canvas=canvas; state.ctx=canvas.getContext('2d'); state.DPR=DPR; state.onHUD=onHUD;

    function resize(){
      const rect=canvas.getBoundingClientRect();
      canvas.width=Math.max(2, Math.floor(rect.width*DPR));
      canvas.height=Math.max(2, Math.floor(rect.height*DPR));
      render();
    }
    resize(); window.addEventListener('resize', resize);

    // Start‑Setup
    reset(false); // leere Welt, danach HQ + Straße setzen
    const cx=Math.floor(WORLD_W/2), cy=Math.floor(WORLD_H/2);
    placeHQ(cx-2, cy-1);
    addRoadLine({x:cx-1,y:cy},{x:cx+5,y:cy});
    rebuildCarriers();
    center();

    // Input
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, {passive:false});

    hudTool(); hudZoom();
    if(!raf) loop(performance.now());
  }
  function setTool(t){ state.tool=[Tools.POINTER,Tools.ROAD,Tools.HQ,Tools.WOOD,Tools.DEPOT,Tools.ERASE].includes(t)?t:Tools.POINTER; state.previewTile=null; hudTool(); }
  function center(){
    const hq=state.buildings.find(b=>b.type==='hq');
    const target=hq?{x:hq.x+1,y:hq.y+1}:{x:WORLD_W/2,y:WORLD_H/2};
    state.cam.x=target.x; state.cam.y=target.y;
  }
  function setZoom(z){ state.cam.z=clamp(z,0.4,2.5); hudZoom(); }
  function reset(place=true){
    state.buildings=[]; state.roads.clear(); state.carriers=[]; state.roadChainStart=null; state.previewTile=null;
    if(place){ const cx=Math.floor(WORLD_W/2), cy=Math.floor(WORLD_H/2); placeHQ(cx-2, cy-1); addRoadLine({x:cx-1,y:cy},{x:cx+3,y:cy}); rebuildCarriers(); }
    center(); render();
  }
  function toggleDebug(){ state.debug=!state.debug; }

  window.game = { startGame, setTool, center, setZoom, reset, toggleDebug };
})();
