/* game.js — Siedler‑Mini Runtime V15.1.0
   - Atlas (tileset.json + tileset.png)
   - Zoom/Pan nur Canvas, DPR‑sicheres Full‑Clear (kein Rand‑„Kleben“)
   - Debug‑Overlay + Log‑Buffer + Save (SM_DEBUG)
   - Actors (Platzhalter‑Kreise): carrier/lumberjack/stonemason
   - Öffentliche API: GameLoader, GameCamera, SM (spawn/clear/pause/paths)
*/
(() => {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const $ = s => document.querySelector(s);
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const rand = (a,b)=> a + Math.random()*(b-a);

  const logBuf = [];
  function klog(tag, ...a){
    const msg = `[${tag}] ${a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')}`;
    logBuf.push(msg); if (logBuf.length>2000) logBuf.shift(); console.log(msg);
  }
  function saveLog(){
    const blob = new Blob([logBuf.join('\n')], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=`siedler-mini-debug-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
  }
  window.SM_DEBUG = { saveLog, lines:()=>logBuf.slice() };

  // ── Canvas/DPR ─────────────────────────────────────────────────────────────
  const canvas = $('#stage') || (()=>{ const c=document.createElement('canvas'); c.id='stage'; document.body.appendChild(c); return c; })();
  const ctx = canvas.getContext('2d', { alpha:true, desynchronized:true });
  ctx.imageSmoothingEnabled = false;

  const dbg = $('#debugOverlay') || (()=>{ const p=document.createElement('pre'); p.id='debugOverlay'; document.body.appendChild(p); return p; })();
  function setDebug(text){
    if (!document.body.classList.contains('debug-on')) { dbg.style.display='none'; return; }
    dbg.style.display='block'; dbg.textContent = text || '';
  }
  window.setDebug = setDebug;

  const state = {
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio||1)),
    running:false,
    cam:{ x:0, y:0, z:1, zMin:0.5, zMax:3.5 },

    map:{ url:null, rows:16, cols:16, tile:64, layers:[] },

    atlas:{ frames:null, image:null, ok:false },

    // actors
    actors: [], actorId:1, showActorPaths:false, simPaused:false,

    // input
    drag:false, down:{x:0,y:0}, cam0:{x:0,y:0}, pinch:null,

    // timing
    tLast:0, fps:0, fpsAccum:0, fpsCount:0
  };

  function resizeCanvas(){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    state.dpr = dpr;
    const r = canvas.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.round(r.width  * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  window.addEventListener('resize', resizeCanvas, {passive:true});

  // ── Kamera & Input ────────────────────────────────────────────────────────
  function applyCam(){
    const cx = Math.floor((canvas.width/state.dpr)/2);
    const cy = Math.floor((canvas.height/state.dpr)/2);
    const x = Math.round(state.cam.x), y = Math.round(state.cam.y);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(cx, cy); ctx.scale(state.cam.z, state.cam.z); ctx.translate(-x, -y);
  }
  function cssToWorld(px, py){
    const w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
    return { x:(px-w/2)/state.cam.z + state.cam.x, y:(py-h/2)/state.cam.z + state.cam.y };
  }
  function zoomTo(z, cx, cy){
    const nz = clamp(z, state.cam.zMin, state.cam.zMax);
    if (cx!=null && cy!=null){
      const before = cssToWorld(cx, cy); state.cam.z = nz; const after = cssToWorld(cx, cy);
      state.cam.x += (before.x-after.x); state.cam.y += (before.y-after.y);
    } else state.cam.z = nz;
  }
  canvas.addEventListener('wheel', (e)=>{ e.preventDefault(); zoomTo(state.cam.z + (-Math.sign(e.deltaY))*0.1, e.clientX, e.clientY); }, {passive:false});
  canvas.addEventListener('pointerdown', (e)=>{ canvas.setPointerCapture(e.pointerId); if (e.isPrimary){ state.drag=true; state.down.x=e.clientX; state.down.y=e.clientY; state.cam0.x=state.cam.x; state.cam0.y=state.cam.y; }});
  canvas.addEventListener('pointermove', (e)=>{ if (!state.drag) return; const dx=(e.clientX-state.down.x)/state.cam.z, dy=(e.clientY-state.down.y)/state.cam.z; state.cam.x=state.cam0.x - dx; state.cam.y=state.cam0.y - dy; });
  window.addEventListener('pointerup', ()=>{ state.drag=false; });
  canvas.addEventListener('touchstart',(e)=>{ if (e.touches.length===2){ e.preventDefault(); const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); state.pinch={d,z0:state.cam.z}; }},{passive:false});
  canvas.addEventListener('touchmove',(e)=>{ if (state.pinch && e.touches.length===2){ e.preventDefault(); const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); zoomTo(state.pinch.z0*(d/Math.max(1,state.pinch.d))); }},{passive:false});
  canvas.addEventListener('touchend', ()=>{ state.pinch=null; }, {passive:true});

  window.addEventListener('keydown', (e)=>{
    if ((e.ctrlKey||e.metaKey) && e.code==='KeyD'){ e.preventDefault(); saveLog(); }
    if (e.code==='F2'){ const on=!document.body.classList.contains('debug-on'); document.body.classList.toggle('debug-on', on); setDebug(on?'Debug aktiv …':''); }
    if (e.code==='KeyP') state.simPaused = !state.simPaused;
    if (e.code==='KeyH') state.showActorPaths = !state.showActorPaths;
    if (e.code==='KeyC') spawnActor('carrier');
    if (e.code==='KeyL') spawnActor('lumberjack');
    if (e.code==='KeyS') spawnActor('stonemason');
    if (e.code==='KeyX') state.actors.length = 0;
  });

  // ── Map/Atlas ─────────────────────────────────────────────────────────────
  async function loadMap(url){
    state.map.url = url;
    klog('map','lade', url);
    state.atlas.ok=false; state.atlas.frames=null; state.atlas.image=null;
    state.map.layers=[];

    try{
      const res = await fetch(url, {cache:'no-store'}); if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const map = await res.json();

      state.map.rows = Number(map.rows)||state.map.rows;
      state.map.cols = Number(map.cols)||state.map.cols;
      state.map.tile = Number(map.tileSize||map.tile)||state.map.tile;

      const L0 = map.layers && map.layers[0];
      if (L0?.grid && Array.isArray(L0.grid)) state.map.layers = [{ grid:L0.grid.slice() }];
      else {
        const g=[]; for(let r=0;r<state.map.rows;r++){ for(let c=0;c<state.map.cols;c++){ g.push(((r+c)&1)?'grass':'dirt'); } }
        state.map.layers = [{ grid:g }];
      }

      const base = url.substring(0, url.lastIndexOf('/')+1);
      const atlasJson = map?.atlas?.json  ? new URL(map.atlas.json, base).toString()  : null;
      const atlasImg  = map?.atlas?.image ? new URL(map.atlas.image, base).toString() : null;
      if (atlasJson && atlasImg){
        const [j, im] = await Promise.all([
          fetch(atlasJson, {cache:'no-store'}).then(r=>r.ok?r.json():null),
          loadImage(atlasImg)
        ]);
        if (j && im){ state.atlas.frames = j.frames||j; state.atlas.image=im; state.atlas.ok=true; klog('atlas','OK', atlasJson.split('/').slice(-2).join('/')); }
        else klog('atlas','fehlend → Fallback‑Farben');
      } else klog('atlas','nicht angegeben → Fallback‑Farben');

      state.cam.x = (state.map.cols*state.map.tile)/2;
      state.cam.y = (state.map.rows*state.map.tile)/2;

      state.running=true;
    } catch(err){
      klog('ERR','map load', String(err?.message||err));
      state.running=true;
    }
  }
  function loadImage(src){
    return new Promise((resolve)=>{ const im=new Image(); im.onload=()=>resolve(im); im.onerror=()=>resolve(null); im.src=src+(src.includes('?')?'&':'?')+'v='+Date.now(); });
  }

  // ── Actors (Platzhalter‑Kreise) ────────────────────────────────────────────
  const ROLE_COLOR = {
    carrier:   { empty:'#2ea7d3', full:'#12749a' },
    lumberjack:{ empty:'#8b5a2b', full:'#5b3a19' },
    stonemason:{ empty:'#9aa5af', full:'#5c6a78' }
  };
  class Actor {
    constructor(role, id, x, y, tile){
      this.id=id; this.role=role; this.cargo='empty';
      this.x=x; this.y=y; this.phase=Math.random()*Math.PI*2;
      this.r=Math.max(6, Math.min(14, tile*0.28)); this.speed=Math.max(40, tile*1.5);
      this.target=null; this.taskTimer=0;
    }
    color(){ const c=ROLE_COLOR[this.role]||ROLE_COLOR.carrier; return (this.cargo==='full')?c.full:c.empty; }
  }
  function spawnActor(role='carrier'){
    const t=state.map.tile, cx=(state.map.cols*t)/2, cy=(state.map.rows*t)/2;
    const a=new Actor(role, state.actorId++, cx+rand(-t,t), cy+rand(-t,t), t);
    pickNewJob(a); state.actors.push(a); klog('actor','spawn',role,'#'+a.id); return a;
  }
  function pickNewJob(a){
    const {tile,cols,rows}=state.map, m=1; let tx,ty;
    if (a.role==='lumberjack'){ tx=rand(m*tile,(cols/2-m)*tile); ty=rand(m*tile,(rows/2-m)*tile); }
    else if (a.role==='stonemason'){ tx=rand((cols/2+m)*tile,(cols-m)*tile); ty=rand(m*tile,(rows/2-m)*tile); }
    else { tx=rand(m*tile,(cols-m)*tile); ty=rand((rows/3)*tile,(rows*2/3)*tile); }
    a.target={x:tx,y:ty}; a.taskTimer=0;
  }
  function updateActors(dt){
    if (state.simPaused) return;
    for (const a of state.actors){
      a.phase += dt*6;
      if (!a.target){ pickNewJob(a); continue; }
      const dx=a.target.x-a.x, dy=a.target.y-a.y, d=Math.hypot(dx,dy);
      if (d<4){
        a.taskTimer += dt; if (a.taskTimer>=0.7){ a.cargo=(a.cargo==='empty')?'full':'empty'; pickNewJob(a); }
      } else {
        const k=a.speed*(a.cargo==='full'?0.85:1.0); a.x += (dx/d)*k*dt; a.y += (dy/d)*k*dt;
      }
    }
  }
  function drawActors(){
    for (const a of state.actors){
      ctx.save(); ctx.translate(a.x,a.y); const bob=Math.sin(a.phase)*0.6; ctx.translate(0,-bob);
      // Pfad
      if (state.showActorPaths && a.target){
        ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=2/state.cam.z;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(a.target.x-a.x, a.target.y-a.y); ctx.stroke();
      }
      // Körper
      ctx.beginPath(); ctx.fillStyle=a.color(); ctx.arc(0,0,a.r,0,Math.PI*2); ctx.fill();
      ctx.lineWidth=2/state.cam.z; ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.stroke();
      // Cargo-Ring
      if (a.cargo==='full'){ ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,.65)'; ctx.arc(0,0,a.r*0.55,0,Math.PI*2); ctx.stroke(); }
      // „Blick“
      ctx.beginPath(); ctx.fillStyle='rgba(0,0,0,.45)'; ctx.arc(a.r*0.5,-a.r*0.2,a.r*0.18,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Renderloop ─────────────────────────────────────────────────────────────
  function drawGrid(tile, cols, rows, alpha=0.06){
    ctx.strokeStyle=`rgba(255,255,255,${alpha})`; ctx.lineWidth=1/state.cam.z; ctx.beginPath();
    for (let c=0;c<=cols;c++){ const x=c*tile+0.5; ctx.moveTo(x,0); ctx.lineTo(x,rows*tile); }
    for (let r=0;r<=rows;r++){ const y=r*tile+0.5; ctx.moveTo(0,y); ctx.lineTo(cols*tile,y); }
    ctx.stroke();
  }
  function drawMap(){
    const tile=state.map.tile, cols=state.map.cols, rows=state.map.rows;
    ctx.fillStyle='#102433'; ctx.fillRect(0,0,cols*tile,rows*tile);
    const L0 = state.map.layers[0]?.grid;
    if (!L0){ drawGrid(tile,cols,rows); return; }
    if (state.atlas.ok){
      const F=state.atlas.frames, IMG=state.atlas.image;
      for (let i=0;i<L0.length;i++){
        const k=L0[i]; if(!k) continue; const f=F[k]; if(!f) continue;
        const r=(i/cols)|0, c=i%cols; ctx.drawImage(IMG, f.x, f.y, f.w, f.h, c*tile, r*tile, tile, tile);
      }
    } else {
      const col = (k)=> k==='grass'?'#2b7d2e': k==='dirt'?'#7a5a2a': k==='water'?'#1e4a6a': k==='rock'?'#5b6672': k==='snow'?'#cfd7df': k==='sand'?'#bda36c': k==='lava'?'#6b2b1e':'#3a4a59';
      for (let i=0;i<L0.length;i++){
        const k=L0[i]; if(!k) continue; const r=(i/cols)|0, c=i%cols;
        ctx.fillStyle=col(k); ctx.fillRect(c*tile, r*tile, tile, tile);
      }
    }
    drawGrid(tile,cols,rows,0.06);
  }
  function updateOverlay(){
    if (!document.body.classList.contains('debug-on')) return;
    const size = `${Math.round(canvas.clientWidth)}x${Math.round(canvas.clientHeight)}`;
    setDebug(
`Cam: x=${state.cam.x.toFixed(1)}  y=${state.cam.y.toFixed(1)}  zoom=${state.cam.z.toFixed(2)}
Map: ${state.map.url || '—'}
rows=${state.map.rows}  cols=${state.map.cols}  tile=${state.map.tile}
Atlas: ${state.atlas.ok?'OK':'—'}   Actors=${state.actors.length}   FPS=${state.fps}`
    );
  }
  function render(ts){
    // FPS
    const dt = state.tLast ? (ts-state.tLast)/1000 : 0; state.tLast = ts;
    state.fpsAccum += dt; state.fpsCount++; if (state.fpsAccum>=0.5){ state.fps = Math.round((state.fpsCount/state.fpsAccum)*10)/10; state.fpsAccum=0; state.fpsCount=0; }

    // Identity clear + BG
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#0f1b26'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Kamera
    applyCam();

    // Map & Actors
    drawMap();
    updateActors(dt);
    drawActors();

    // Debug
    updateOverlay();
  }
  function loop(ts){ if (state.running) render(ts); requestAnimationFrame(loop); }

  // ── Bridges ────────────────────────────────────────────────────────────────
  window.addEventListener('ui:start',  e=>{ const u=e.detail?.map; if(u) startGame(u); });
  window.addEventListener('ui:reload', e=>{ const u=e.detail?.map; if(u) startGame(u); });
  document.addEventListener('app:start', e=>{ const u=e.detail?.mapUrl; if(u) startGame(u); });

  async function startGame(url){ await loadMap(url); }
  async function reloadGame(url){ await loadMap(url || state.map.url); }

  window.GameLoader = { start:(u)=>startGame(u), reload:(u)=>reloadGame(u) };
  window.GameCamera = { setZoom:(z)=>zoomTo(z), setPosition:(x,y)=>{ state.cam.x=x; state.cam.y=y; } };

  // Öffentliche Dev‑Tools (HUD nutzt diese)
  window.SM = {
    spawn: (role)=>spawnActor(role),
    clear: ()=>{ state.actors.length=0; },
    pause: (on)=>{ state.simPaused = (on!==undefined)?!!on:!state.simPaused; },
    paths: (on)=>{ state.showActorPaths = (on!==undefined)?!!on:!state.showActorPaths; }
  };

  // ── Boot ───────────────────────────────────────────────────────────────────
  resizeCanvas();
  state.cam.z=1; state.cam.x=(state.map.cols*state.map.tile)/2; state.cam.y=(state.map.rows*state.map.tile)/2;
  klog('boot','Runtime bereit');
  requestAnimationFrame(loop);

  // Mini‑Auto‑Spawn zum Test
  setTimeout(()=>{ ['carrier','lumberjack','stonemason'].forEach(r=> spawnActor(r)); }, 250);
})();
