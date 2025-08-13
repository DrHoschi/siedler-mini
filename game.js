const STORE_KEY='sm_v146';
const clamp=(v,mi,ma)=>Math.max(mi,Math.min(ma,v));
const snap=(v,s)=>Math.round(v/s)*s;
const key=(x,y)=>`${x},${y}`;

const COSTS={
  road:{holz:1,stein:0,gold:0},
  hq:{holz:20,stein:20,gold:0},        // erstes HQ gratis (beim Erststart)
  lumber:{holz:8,stein:4,gold:0},
  depot:{holz:10,stein:6,gold:0},
};
const REFUND_FACTOR=0.5;

export async function run(opts){
  const {canvas,DPR=1,onHUD=()=>{},onTool=()=>{},onZoom=()=>{},onError=()=>{},onReady=()=>{}}=opts||{};
  if(!canvas) throw new Error('Canvas fehlt');
  const ctx = canvas.getContext('2d');

  // Welt/Kamera
  const grid=64;
  let zoom=1, Z_MIN=0.5, Z_MAX=2.5;
  let camX=0, camY=0;

  // State
  let state={
    res:{holz:30,stein:20,nahrung:0,gold:0,traeger:0},
    hq:{x:0,y:0,placed:true},           // mittig & gratis
    roads:new Set(),
    buildings:{},
    dbg:false,
    tool:'pointer',
    lastProd:0
  };

  // Load
  try{
    const raw=localStorage.getItem(STORE_KEY);
    if(raw){
      const j=JSON.parse(raw);
      state={...state,...j};
      state.roads=new Set(j.roads||[]);
    }
  }catch(e){ console.warn('load failed',e); }

  // Resize
  function resize(){
    const w=Math.floor(canvas.clientWidth*DPR), h=Math.floor(canvas.clientHeight*DPR);
    if(canvas.width!==w) canvas.width=w;
    if(canvas.height!==h) canvas.height=h;
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Transforms
  const worldToScreen=(wx,wy)=>[
    Math.floor((wx-camX)*zoom*DPR+canvas.width/2),
    Math.floor((wy-camY)*zoom*DPR+canvas.height/2)
  ];
  const screenToWorld=(sx,sy)=>[
    ((sx-canvas.width/2)/(zoom*DPR)+camX),
    ((sy-canvas.height/2)/(zoom*DPR)+camY)
  ];

  function save(){
    try{
      const json={...state, roads:[...state.roads]};
      localStorage.setItem(STORE_KEY, JSON.stringify(json));
    }catch(e){ console.warn('save failed',e); }
  }

  // Drawing
  function clear(){ ctx.fillStyle='#0f1823'; ctx.fillRect(0,0,canvas.width,canvas.height); }
  function drawGrid(){
    if(!state.dbg) return;
    ctx.save(); ctx.lineWidth=1*DPR; ctx.strokeStyle='rgba(255,255,255,.10)';
    const step=grid*zoom*DPR;
    const [sx0,sy0]=worldToScreen(-99999,-99999);
    const [sx1,sy1]=worldToScreen( 99999, 99999);
    const xStart=Math.floor((sx0)/step)*step, yStart=Math.floor((sy0)/step)*step;
    for(let x=xStart;x<sx1+step;x+=step){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke(); }
    for(let y=yStart;y<sy1+step;y+=step){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke(); }
    ctx.restore();
  }
  function drawHQ(){
    const w=grid*4,h=grid*2;
    const [sx,sy]=worldToScreen(state.hq.x,state.hq.y);
    ctx.save();
    ctx.fillStyle='#36a14f';
    ctx.fillRect(sx-w/2*zoom*DPR, sy-h/2*zoom*DPR, w*zoom*DPR, h*zoom*DPR);
    ctx.fillStyle='rgba(255,255,255,.92)'; ctx.font=`${18*DPR}px system-ui`; ctx.textAlign='center';
    ctx.fillText('HQ (Platzhalter)', sx, sy-(h*zoom*DPR)/2-10*DPR);
    ctx.restore();
  }
  function drawRoads(){
    ctx.save(); ctx.fillStyle='#7b8b99';
    const size=grid*0.8;
    for(const k of state.roads){
      const [gx,gy]=k.split(',').map(Number);
      const wx=gx*grid, wy=gy*grid;
      const [sx,sy]=worldToScreen(wx,wy);
      ctx.fillRect(sx-(size/2)*zoom*DPR, sy-(size/2)*zoom*DPR, size*zoom*DPR, size*zoom*DPR);
    }
    ctx.restore();
  }
  function drawBuildings(){
    ctx.save();
    for(const k in state.buildings){
      const b=state.buildings[k];
      const wx=b.gx*grid, wy=b.gy*grid;
      const [sx,sy]=worldToScreen(wx,wy);
      const w=b.w*grid, h=b.h*grid;
      ctx.fillStyle = b.type==='lumber' ? '#2e9146' : '#2f6aa8';
      ctx.globalAlpha = 0.95;
      ctx.fillRect(sx-w/2*zoom*DPR, sy-h/2*zoom*DPR, w*zoom*DPR, h*zoom*DPR);
      ctx.globalAlpha=1;
      ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font=`${14*DPR}px system-ui`; ctx.textAlign='center';
      ctx.fillText(b.type, sx, sy - (h*zoom*DPR)/2 - 8*DPR);
    }
    ctx.restore();
  }
  function render(){
    clear(); drawGrid(); drawRoads(); drawBuildings(); drawHQ(); if(ghost) drawGhost();
  }

  // Ghost
  let ghost=null;
  function mkGhost(type, wx,wy){
    if(type==='road'){
      const gx=Math.round(wx/grid), gy=Math.round(wy/grid);
      const valid=!state.roads.has(key(gx,gy));
      const affordable=canPay('road');
      return {type, gx,gy, wx:gx*grid, wy:gy*grid, w:0.8*grid, h:0.8*grid, color:(valid&&affordable?'#9db4c6':'#b25a5a'), valid:valid&&affordable};
    }
    const w= type==='hq' ? 4 : 3;
    const h= type==='hq' ? 2 : 1.6;
    const gx=Math.round(wx/grid), gy=Math.round(wy/grid);
    const wx2=gx*grid, wy2=gy*grid;
    const overlap = collidesAny(gx,gy,w,h);
    const affordable=canPay(type);
    return {type,gx,gy,wx:wx2,wy:wy2,w:w*grid,h:h*grid,color:(!(overlap)&&affordable?'#3ca14e':'#b25a5a'), valid:!overlap&&affordable};
  }
  function drawGhost(){
    const [sx,sy]=worldToScreen(ghost.wx,ghost.wy);
    ctx.save(); ctx.globalAlpha=ghost.valid?0.35:0.18; ctx.fillStyle=ghost.color;
    ctx.fillRect(sx-ghost.w/2*zoom*DPR, sy-ghost.h/2*zoom*DPR, ghost.w*zoom*DPR, ghost.h*zoom*DPR);
    ctx.restore();
  }

  // Kollision
  function collidesAny(gx,gy,w,h){
    const hqW=4,hqH=2;
    const hqGX=Math.round(state.hq.x/grid), hqGY=Math.round(state.hq.y/grid);
    if(rectsOverlap(gx-w/2,gy-h/2,w,h, hqGX-hqW/2,hqGY-hqH/2,hqW,hqH)) return true;
    for(const k in state.buildings){
      const b=state.buildings[k];
      if(rectsOverlap(gx-w/2,gy-h/2,w,h, b.gx-b.w/2,b.gy-b.h/2,b.w,b.h)) return true;
    }
    return false;
  }
  function rectsOverlap(ax,ay,aw,ah, bx,by,bw,bh){
    return !(ax+aw<=bx || bx+bw<=ax || ay+ah<=by || by+bh<=ay);
  }

  // Kosten
  function canPay(type){ const c=COSTS[type]; if(!c) return true; return state.res.holz>=c.holz && state.res.stein>=c.stein && state.res.gold>=c.gold; }
  function pay(type){ const c=COSTS[type]; if(!c) return; state.res.holz-=c.holz; state.res.stein-=c.stein; state.res.gold-=c.gold; updateHUD(); }
  function refund(type){ const c=COSTS[type]; if(!c) return; state.res.holz+=Math.floor(c.holz*0.5); state.res.stein+=Math.floor(c.stein*0.5); state.res.gold+=Math.floor(c.gold*0.5); updateHUD(); }
  function updateHUD(){ onHUD('holz',state.res.holz); onHUD('stein',state.res.stein); onHUD('nahrung',state.res.nahrung); onHUD('gold',state.res.gold); onHUD('traeger',state.res.traeger); }

  // Netz (Straßen mit HQ verbunden)
  function computeConnectedRoads(){
    const startGX=Math.round(state.hq.x/grid), startGY=Math.round(state.hq.y/grid);
    const startNeighbors=[key(startGX+1,startGY),key(startGX-1,startGY),key(startGX,startGY+1),key(startGX,startGY-1)]
      .filter(k=>state.roads.has(k));
    const vis=new Set(), q=[...startNeighbors];
    while(q.length){
      const k=q.shift(); if(vis.has(k)) continue; vis.add(k);
      const [gx,gy]=k.split(',').map(Number);
      for(const nk of [key(gx+1,gy),key(gx-1,gy),key(gx,gy+1),key(gx,gy-1)])
        if(state.roads.has(nk) && !vis.has(nk)) q.push(nk);
    }
    return vis;
  }
  function isBuildingConnected(b){
    const connected=computeConnectedRoads();
    for(let dx=-Math.floor(b.w/2); dx<=Math.floor(b.w/2); dx++){
      if(connected.has(key(b.gx+dx, b.gy+Math.ceil(b.h/2)))) return true;
      if(connected.has(key(b.gx+dx, b.gy-Math.ceil(b.h/2)))) return true;
    }
    for(let dy=-Math.floor(b.h/2); dy<=Math.floor(b.h/2); dy++){
      if(connected.has(key(b.gx+Math.ceil(b.w/2), b.gy+dy))) return true;
      if(connected.has(key(b.gx-Math.ceil(b.w/2), b.gy+dy))) return true;
    }
    return false;
  }

  // Kamera
  function center(){ camX=state.hq.x; camY=state.hq.y; render(); }
  function setZoom(z,pivotScreen){
    const old=zoom; zoom=clamp(z,0.5,2.5);
    if(pivotScreen){
      const [wx,wy]=screenToWorld(pivotScreen[0],pivotScreen[1]);
      const [sx,sy]=worldToScreen(wx,wy);
      camX += (wx - camX) - ((sx - canvas.width/2)/(zoom*DPR));
      camY += (wy - camY) - ((sy - canvas.height/2)/(zoom*DPR));
    }
    if(old!==zoom) onZoom(zoom);
    render();
  }

  // Input
  let dragging=false; let last={x:0,y:0}; let pinch=null;
  canvas.addEventListener('pointerdown',(e)=>{ canvas.setPointerCapture(e.pointerId); dragging=true; last.x=e.clientX; last.y=e.clientY; });
  canvas.addEventListener('pointerup',  (e)=>{ canvas.releasePointerCapture(e.pointerId); dragging=false; });
  canvas.addEventListener('pointercancel', ()=>{ dragging=false; pinch=null; });

  canvas.addEventListener('touchstart',(e)=>{
    if(e.touches.length===2){
      const a=e.touches[0], b=e.touches[1];
      pinch={ d:Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY), cx:(a.clientX+b.clientX)/2, cy:(a.clientY+b.clientY)/2, startZoom:zoom };
    }
  },{passive:false});
  canvas.addEventListener('touchmove',(e)=>{
    if(pinch && e.touches.length===2){
      e.preventDefault();
      const a=e.touches[0], b=e.touches[1];
      const d2=Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY);
      const ratio=d2/pinch.d;
      setZoom(zoom*ratio, [pinch.cx*DPR, pinch.cy*DPR]);
    }
  },{passive:false});
  canvas.addEventListener('touchend',()=>{ pinch=null; });

  canvas.addEventListener('wheel',(e)=>{
    e.preventDefault();
    const delta=e.deltaY>0?0.94:1.06;
    const r=canvas.getBoundingClientRect();
    setZoom(zoom*delta, [(e.clientX-r.left)*DPR,(e.clientY-r.top)*DPR]);
  },{passive:false});

  canvas.addEventListener('pointermove',(e)=>{
    const r=canvas.getBoundingClientRect();
    const sx=(e.clientX-r.left)*DPR, sy=(e.clientY-r.top)*DPR;
    const [wx,wy]=screenToWorld(sx,sy);

    if(state.tool!=='pointer') ghost=mkGhost(state.tool, wx,wy);
    else ghost=null;

    if(dragging && state.tool==='pointer'){
      const dx=(e.clientX-last.x), dy=(e.clientY-last.y);
      last.x=e.clientX; last.y=e.clientY;
      camX-=dx/(zoom); camY-=dy/(zoom);
      render();
    }else if(ghost){ render(); }
  });

  canvas.addEventListener('click',(e)=>{
    const r=canvas.getBoundingClientRect();
    const sx=(e.clientX-r.left)*DPR, sy=(e.clientY-r.top)*DPR;
    const [wx,wy]=screenToWorld(sx,sy);

    if(state.tool==='pointer') return;

    if(state.tool==='road'){
      const gx=Math.round(wx/grid), gy=Math.round(wy/grid);
      const k=key(gx,gy);
      if(state.roads.has(k)){ state.roads.delete(k); refund('road'); save(); render(); return; }
      if(!canPay('road')) return;
      state.roads.add(k); pay('road'); save(); render(); return;
    }

    if(state.tool==='erase'){
      const gx=Math.round(wx/grid), gy=Math.round(wy/grid);
      const k=key(gx,gy);
      if(state.roads.delete(k)){ refund('road'); save(); render(); return; }
      for(const bk in state.buildings){
        const b=state.buildings[bk];
        if(pointInRect(gx,gy, b.gx-b.w/2,b.gy-b.h/2,b.w,b.h)){
          delete state.buildings[bk]; refund(b.type); save(); render(); return;
        }
      }
      return;
    }

    const type=state.tool;
    const g=mkGhost(type, wx,wy);
    if(!g.valid) return;

    if(type==='hq'){
      // weiteres HQ kostet
      if(!canPay('hq')) return;
      pay('hq'); state.hq={x:g.wx,y:g.wy,placed:true}; save(); render(); return;
    }

    const b={type, gx:g.gx, gy:g.gy, w:(type==='lumber'||type==='depot')?3:3, h:(type==='lumber'||type==='depot')?1.6:1.6};
    if(collidesAny(b.gx,b.gy,b.w,b.h)) return;
    if(!canPay(type)) return;
    pay(type);
    state.buildings[key(b.gx,b.gy)] = b;
    save(); render();
  });

  function pointInRect(px,py, rx,ry,rw,rh){
    return (px>=rx && px<=rx+rw && py>=ry && py<=ry+rh);
  }

  // Produktion alle 5s (nur verbunden)
  function tickProduction(t){
    if(!state.lastProd) state.lastProd=t;
    if(t - state.lastProd >= 5000){
      state.lastProd = t;
      for(const k in state.buildings){
        const b=state.buildings[k];
        if(!isBuildingConnected(b)) continue;
        if(b.type==='lumber'){ state.res.holz+=1; }
        if(b.type==='depot'){ state.res.traeger+=1; }
      }
      updateHUD(); save();
    }
  }

  // API
  function setTool(name){ state.tool=name; onTool(name); render(); }
  function toggleDebug(){ state.dbg=!state.dbg; render(); }
  function center(){ camX=state.hq.x; camY=state.hq.y; render(); }

  updateHUD(); onTool(state.tool); onZoom(zoom); onReady(); center();

  let raf=null, lastT=0;
  function loop(t){ if(t-lastT>33){ render(); lastT=t; } tickProduction(t); raf=requestAnimationFrame(loop); }
  raf=requestAnimationFrame(loop);
  window.addEventListener('beforeunload',()=>{ if(raf) cancelAnimationFrame(raf); });

  return { center, setTool, toggleDebug, reset:()=>{ localStorage.removeItem(STORE_KEY); location.reload(); } };
}
export default { run };
