/* Siedler‑Mini V11.1 – app-v11.1r6.js */
(() => {
  function badge(txt){
    const b=document.createElement('div');
    b.textContent=txt;
    Object.assign(b.style,{position:'fixed',right:'10px',bottom:'10px',padding:'4px 8px',background:'rgba(0,0,0,.5)',color:'#6ee7a9',borderRadius:'6px',font:'12px system-ui',zIndex:3000});
    document.body.appendChild(b);
    return b;
  }
  function errorBox(msg){
    let box=document.getElementById('diagErr');
    if(!box){ box=document.createElement('div'); box.id='diagErr';
      Object.assign(box.style,{position:'fixed',left:'10px',bottom:'10px',maxWidth:'70vw',padding:'10px 12px',background:'rgba(170,30,30,.9)',color:'#fff',borderRadius:'8px',font:'12px system-ui',zIndex:3500,whiteSpace:'pre-wrap'});
      document.body.appendChild(box);
    }
    box.textContent='Fehler: '+msg;
  }
  window.addEventListener('error', e=>errorBox(e.message||String(e)));
  badge('JS r6');

  const canvas=document.getElementById('canvas');
  if(!canvas){ errorBox('#canvas nicht gefunden – stimmt index.html?'); return; }
  const ctx=canvas.getContext('2d',{alpha:false});
  const DPR=Math.max(1,Math.min(devicePixelRatio||1,2));
  let W=0,H=0;
  function resize(){
    const headerH=(document.querySelector('header')?.offsetHeight)||0;
    const tbH=(document.getElementById('toolbar')?.offsetHeight)||0;
    W=Math.floor(innerWidth); H=Math.max(120,Math.floor(innerHeight-headerH-tbH));
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    canvas.width=Math.floor(W*DPR); canvas.height=Math.floor(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0); drawAll();
  }
  addEventListener('resize',resize,{passive:true}); resize();

  let viewMode='iso';
  const cam={x:0,y:0,z:1};
  const viewLbl=document.getElementById('viewLbl');
  const toggle=document.getElementById('toggleView');
  if(toggle) toggle.onclick=()=>{
    viewMode = viewMode==='iso'?'top':(viewMode==='top'?'persp':'iso');
    if(viewLbl) viewLbl.textContent = viewMode==='iso'?'Iso':(viewMode==='top'?'Top':'Persp');
    let cx=(MAP.W/2)|0, cy=(MAP.H/2)|0;
    for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++) if(grid[y][x].building==='hq'){cx=x;cy=y;}
    centerCamToCell(cx,cy); drawAll();
  };

  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const r=canvas.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top;
    const bx=sx/cam.z+cam.x, by=sy/cam.z+cam.y;
    cam.z=Math.max(0.5,Math.min(2.5,cam.z*(e.deltaY>0?0.9:1.1)));
    cam.x=bx - sx/cam.z; cam.y=by - sy/cam.z; drawAll();
  },{passive:false});

  let panning=false,last={x:0,y:0};
  canvas.addEventListener('pointerdown',e=>{
    if(e.button===2){ panning=true; last={x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!panning) return;
    const dx=(e.clientX-last.x)/cam.z, dy=(e.clientY-last.y)/cam.z;
    cam.x-=dx; cam.y-=dy; last={x:e.clientX,y:e.clientY}; drawAll();
  });
  canvas.addEventListener('pointerup',()=>panning=false);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  let tStart=null;
  canvas.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      const p0=e.touches[0], p1=e.touches[1];
      tStart={cx:(p0.clientX+p1.clientX)/2, cy:(p0.clientY+p1.clientY)/2,
              d:Math.hypot(p0.clientX-p1.clientX,p0.clientY-p1.clientY), cam:{...cam}};
    }
  },{passive:true});
  canvas.addEventListener('touchmove',e=>{
    if(!tStart||e.touches.length!==2) return; e.preventDefault();
    const p0=e.touches[0], p1=e.touches[1];
    const cx=(p0.clientX+p1.clientX)/2, cy=(p0.clientY+p1.clientY)/2;
    const d=Math.hypot(p0.clientX-p1.clientX,p0.clientY-p1.clientY);
    const s=d/tStart.d; cam.z=Math.max(0.5,Math.min(2.5,tStart.cam.z*s));
    cam.x=tStart.cam.x - (cx - tStart.cx)/cam.z; cam.y=tStart.cam.y - (cy - tStart.cy)/cam.z; drawAll();
  },{passive:false});
  canvas.addEventListener('touchend',()=>{tStart=null;},{passive:true});

  const res={wood:20,stone:10,food:10,gold:0,pop:5};
  function hud(){ for(const id of ['wood','stone','food','gold','pop']){ const el=document.getElementById(id); if(el) el.textContent=Math.floor(res[id]); } }
  hud();

  const IMAGES={}; const MISSING=[];
  function loadImage(key,src){ return new Promise(resolve=>{ const img=new Image(); img.onload=()=>{IMAGES[key]=img; resolve();}; img.onerror=()=>{MISSING.push(src); resolve();}; img.src=src; }); }
  const toLoad=[ ['grass','assets/grass.png'], ['water','assets/water.png'], ['shore','assets/shore.png'], ['hq','assets/hq_wood.png'] ];

  const MAP={W:36,H:28,TILE:64};
  const grid=Array.from({length:MAP.H},()=>Array.from({length:MAP.W},()=>({ground:'grass',road:false,building:null,node:null,active:false,timer:0})));

  function generateGround(){
    for(let y=14;y<22;y++) for(let x=4;x<14;x++) grid[y][x].ground='water';
    for(let y=1;y<MAP.H-1;y++) for(let x=1;x<MAP.W-1;x++){
      if(grid[y][x].ground==='water') continue;
      const n=grid[y-1][x].ground==='water'||grid[y+1][x].ground==='water'||grid[y][x-1].ground==='water'||grid[y][x+1].ground==='water';
      if(n) grid[y][x].ground='shore';
    }
  }
  function generateForests(){
    function blob(cx,cy,r){
      for(let y=Math.max(1,cy-r); y<=Math.min(MAP.H-2,cy+r); y++)
        for(let x=Math.max(1,cx-r); x<=Math.min(MAP.W-2,cx+r); x++){
          const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy<=r*r && grid[y][x].ground==='grass') grid[y][x].node='forest';
        }
    }
    blob(10,10,3); blob(20,7,2); blob(26,18,4);
  }

  function projRect(x,y){
    if(viewMode==='top') return {x:x*MAP.TILE - cam.x, y:y*MAP.TILE - cam.y, w:MAP.TILE, h:MAP.TILE};
    if(viewMode==='persp'){ const h=MAP.TILE*0.82; return {x:x*MAP.TILE - cam.x, y:y*h - cam.y, w:MAP.TILE, h}; }
    const isoX=(x-y)*(MAP.TILE*0.75), isoY=(x+y)*(MAP.TILE*0.38);
    return {x:isoX - cam.x, y:isoY - cam.y, w:MAP.TILE*0.92, h:MAP.TILE*0.92};
  }
  function centerCamToCell(cx,cy){ const r=projRect(cx,cy); cam.x=r.x+r.w/2 - (innerWidth/cam.z)/2; cam.y=r.y+r.h/2 - ((innerHeight)/cam.z)/2; }
  function screenToCell(sx,sy){ const wx=sx/cam.z+cam.x, wy=sy/cam.z+cam.y;
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){ const r=projRect(x,y); if(wx>=r.x&&wy>=r.y&&wx<r.x+r.w&&wy<r.y+r.h) return {x,y}; }
    return null;
  }

  function updateConnectivity(){
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++) grid[y][x].active=false;
    const q=[]; for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++) if(grid[y][x].building==='hq'){ grid[y][x].active=true; q.push([x,y]); }
    const pass=(x,y)=>grid[y]?.[x] && (grid[y][x].road || grid[y][x].building==='hq'); const N=[[1,0],[-1,0],[0,1],[0,-1]];
    while(q.length){ const [cx,cy]=q.shift(); for(const d of N){ const nx=cx+d[0], ny=cy+d[1]; if(!grid[ny]?.[nx]||grid[ny][nx].active) continue;
      if(pass(nx,ny)){ grid[ny][nx].active=true; q.push([nx,ny]); } else if(grid[ny][nx].building && grid[ny][nx].building!=='hq'){ grid[ny][nx].active=true; }
    } }
  }

  const PROD={ lumber:{out:'wood',every:3.0,needNode:'forest'} };
  function hasAdjacentNode(x,y,node){ const N=[[1,0],[-1,0],[0,1],[0,-1]]; for(const d of N){ const nx=x+d[0], ny=y+d[1]; if(grid[ny]?.[nx]?.node===node) return true; } return false; }
  function tick(dt){ for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){ const t=grid[y][x], b=t.building, p=PROD[b]; if(!p||!t.active) continue; if(p.needNode&&!hasAdjacentNode(x,y,p.needNode)) continue; t.timer+=dt; if(t.timer>=p.every){ t.timer-=p.every; res[p.out]=(res[p.out]||0)+1; } } }

  let started=false;
  (function bindStartReset(){
    const s=document.querySelector('#overlay [data-action="start"]');
    const r=document.querySelector('#overlay [data-action="reset"]');
    if(s) s.onclick=()=>startGame();
    if(r) r.onclick=()=>resetGame();
    canvas.addEventListener('click',()=>{ if(!started) startGame(); });
  })();

  function startGame(){
    if(started) return; started=true;
    const ov=document.getElementById('overlay'); if(ov) ov.style.display='none';
    const cx=(MAP.W/2)|0, cy=(MAP.H/2)|0; grid[cy][cx].building='hq';
    centerCamToCell(cx,cy); updateConnectivity(); hud(); drawAll();
  }
  function resetGame(){
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++) grid[y][x]={ground:'grass',road:false,building:null,node:null,active:false,timer:0};
    generateGround(); generateForests(); started=false; const ov=document.getElementById('overlay'); if(ov) ov.style.display='flex';
    cam.x=cam.y=0; cam.z=1; centerCamToCell((MAP.W/2)|0,(MAP.H/2)|0); res.wood=20; res.stone=10; res.food=10; res.gold=0; res.pop=5; hud(); drawAll();
  }

  let tool='road';
  [...document.querySelectorAll('#toolbar .btn')].forEach(b=>{
    b.addEventListener('click',()=>{ document.querySelectorAll('#toolbar .btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); tool=b.dataset.tool; });
  });
  const costs={ road:{wood:1}, lumber:{wood:5}, quarry:{wood:5,food:2}, farm:{wood:5}, house:{wood:10,stone:5,food:5}, depot:{wood:8,stone:2}};
  function canPay(c){ for(const k in c) if((res[k]||0)<c[k]) return false; return true; }
  function pay(c){ for(const k in c) res[k]-=c[k]; hud(); }
  function inb(x,y){ return x>=0&&y>=0&&x<MAP.W&&y<MAP.H; }

  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0) return;
    const r=canvas.getBoundingClientRect(); const cell=screenToCell(e.clientX-r.left, e.clientY-r.top); if(!cell) return;
    const gx=cell.x, gy=cell.y; if(!inb(gx,gy)) return;
    if(tool==='bulldoze'){ if(grid[gy][gx].building==='hq') return; grid[gy][gx].road=false; grid[gy][gx].building=null; grid[gy][gx].timer=0; updateConnectivity(); drawAll(); return; }
    if(tool==='road'){ if(!grid[gy][gx].road && grid[gy][gx].ground!=='water'){ if(!canPay(costs.road)) return; pay(costs.road); grid[gy][gx].road=true; updateConnectivity(); } drawAll(); return; }
    if(!grid[gy][gx].building && !grid[gy][gx].road && grid[gy][gx].ground!=='water'){ if(!canPay(costs[tool]||{})) return; if(tool==='lumber' && !hasAdjacentNode(gx,gy,'forest')) return; pay(costs[tool]||{}); grid[gy][gx].building=tool; updateConnectivity(); drawAll(); }
  });

  function drawGround(){
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
      const g=grid[y][x].ground; const img=g==='water'?IMAGES.water:(g==='shore'?IMAGES.shore:IMAGES.grass); const r=projRect(x,y);
      if(img&&img.width) ctx.drawImage(img,r.x,r.y,r.w,r.h); else { ctx.fillStyle=g==='water'?'#0e2233':(g==='shore'?'#2a3f2a':'#1b2e19'); ctx.fillRect(r.x,r.y,r.w,r.h); }
      ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.strokeRect(r.x,r.y,r.w,r.h);
    }
  }
  function drawNodes(){
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
      if(grid[y][x].node==='forest'){ const r=projRect(x,y); ctx.fillStyle='rgba(30,120,40,0.55)';
        ctx.beginPath(); ctx.ellipse(r.x+r.w*0.5, r.y+r.h*0.6, r.w*0.28, r.h*0.18, 0, 0, Math.PI*2); ctx.fill(); }
    }
  }
  function drawRoads(){
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
      if(!grid[y][x].road) continue; const r=projRect(x,y); ctx.fillStyle='#6b6f7a'; ctx.fillRect(r.x+r.w*0.16, r.y+r.h*0.34, r.w*0.68, r.h*0.32);
    }
  }
  function drawBuildings(){
    for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
      const t=grid[y][x]; const b=t.building; if(!b) continue; const r=projRect(x,y);
      if(b==='hq'){ const img=IMAGES.hq; if(img&&img.width){ const w=r.w*1.15, h=img.height*(w/img.width); ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h-h+r.h*0.12, w, h); }
        else { ctx.fillStyle='#6a4'; ctx.fillRect(r.x+r.w*0.1, r.y+r.h*0.1, r.w*0.8, r.h*0.8); } continue; }
      const active=t.active;
      ctx.fillStyle = b==='lumber'?(active?'#4aa45a':'#3f6a3f') : b==='quarry'?(active?'#8a92a3':'#5b6370') : b==='farm'?(active?'#a9c35b':'#8aa34f') : b==='house'?(active?'#93a4b3':'#6f7c8a') : b==='depot'?(active?'#b2895a':'#8a6a46') : '#445';
      ctx.fillRect(r.x+r.w*0.12, r.y+r.h*0.12, r.w*0.76, r.h*0.76);
    }
  }
  function drawAll(){ ctx.save(); ctx.scale(cam.z,cam.z); drawGround(); drawNodes(); drawRoads(); drawBuildings(); ctx.restore(); }

  let last=performance.now(), acc=0;
  function loop(ts){ const dt=Math.min(0.05,(ts-last)/1000); last=ts; acc+=dt; while(acc>0.2){ tick(0.2); acc-=0.2; } hud(); drawAll(); requestAnimationFrame(loop); }

  function boot(){ generateGround(); generateForests(); centerCamToCell((MAP.W/2)|0,(MAP.H/2)|0); drawAll(); requestAnimationFrame(loop); }

  Promise.all(toLoad.map(([k,s])=>loadImage(k,s))).then(()=>{ if(MISSING.length){ errorBox('Fehlende Assets:\n'+MISSING.join('\n')); } boot(); setTimeout(()=>{ if(!started) startGame(); }, 800); });

})();
