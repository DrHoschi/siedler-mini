// game.js  –  Siedler‑Mini V14.7  (mobil)
// ------------------------------------------------------------
// Features in dieser Version:
// - Canvas-Engine mit Pan/Zoom (Pan nur im Zeiger-Tool)
// - Tools: pointer, road, hq, woodcutter, depot, erase
// - Raster, simple Gebäude, Straßen (Orthogonalsegmente)
// - Holzproduktion im Holzfäller (alle 6s -> 1 Holz)
// - Träger laufen vom Holzfäller zum nächsten Lager (HQ/Depot)
// - Sprite-Animation (carrier_topdown_v2.jpeg + .json) mit Fallback
// - HUD-Updates (Holz/Stein/Nahrung/Gold/Träger, Tool, Zoom)
//
// API nach außen (von boot.js genutzt):
//   window.game = { startGame(opts), resetGame() }
//
// ------------------------------------------------------------

(() => {
  const TAU = Math.PI * 2;

  // ---------- State ----------
  const state = {
    started: false,
    // Anzeige
    hudEls: {},
    // Welt
    ents: [],          // {id,type,x,y,w,h,label}
    roads: [],         // [{x1,y1,x2,y2}]
    carriers: [],      // laufende Träger
    nextId: 1,
    // Kamera
    cam: { x: 0, y: 0, z: 1 },
    // Input
    tool: 'pointer',
    roadBuild: null,   // {x,y} -> Startpunkt aktiver Straße
    pointerDown: false,
    lastTapTime: 0,
    // Ressourcen
    res: { holz: 0, stein: 0, nahrung: 0, gold: 0, traeger: 0 },
    // Produktionstimer pro Holzfäller
    prod: new Map(),   // id -> {t:0, period:6}
    // Gfx
    canvas: null,
    ctx: null,
    size: { w: 0, h: 0, dpr: 1 },
    // Sprites
    sprite: {
      ready: false,
      img: null,
      frames: [],    // [{x,y,w,h}]
      animIdx: 0,
      animFps: 8
    },
    // Zeit
    tPrev: 0
  };

  // ---------- Utils ----------
  const randId = () => state.nextId++;
  const lerp = (a,b,t)=>a+(b-a)*t;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
  const nowSec = () => performance.now()/1000;

  function worldToScreen(x,y){
    const c=state.cam;
    return [
      (x*c.z + state.size.w*0.5 - c.x*c.z),
      (y*c.z + state.size.h*0.5 - c.y*c.z)
    ];
  }
  function screenToWorld(sx,sy){
    const c=state.cam;
    return [
      (sx - state.size.w*0.5 + c.x*c.z)/c.z,
      (sy - state.size.h*0.5 + c.y*c.z)/c.z
    ];
  }

  // ---------- Assets: Carrier-Sprite ----------
  async function loadCarrierSprite(){
    try{
      const [json,resImg] = await Promise.all([
        fetch('./carrier_topdown_v2.json', {cache:'no-store'}).then(r=>r.ok?r.json():null),
        new Promise((res,rej)=>{
          const img=new Image();
          img.onload = ()=>res(img);
          img.onerror = rej;
          img.src = './carrier_topdown_v2.jpeg';
        })
      ]);
      if(!json) throw new Error('Sprite JSON fehlt');
      // TexturePacker-ähnlich: json.frames[frameName].frame => {x,y,w,h}
      const frames=[];
      const jf=json.frames || {};
      for(const k of Object.keys(jf)){
        const fr = jf[k].frame || jf[k]; // toleranter
        frames.push({x:fr.x,y:fr.y,w:fr.w,h:fr.h});
      }
      if(frames.length===0) throw new Error('Keine Frames im JSON');
      state.sprite.ready=true;
      state.sprite.img=resImg;
      state.sprite.frames=frames;
      state.sprite.animIdx=0;
    }catch(e){
      console.warn('Carrier-Sprite Fallback:', e.message);
      state.sprite.ready=false;
    }
  }

  // ---------- Entities ----------
  function addEntity(type,x,y){
    const baseSizes = { hq: 120, woodcutter: 70, depot: 90 };
    const w = baseSizes[type] || 40;
    const h = w;
    const e = { id:randId(), type, x, y, w, h, label: labelFor(type) };
    state.ents.push(e);
    if(type==='woodcutter'){
      state.prod.set(e.id, { t:0, period:6 });
    }
    return e;
  }
  function labelFor(type){
    if(type==='hq') return 'HQ';
    if(type==='woodcutter') return 'Holzfäller';
    if(type==='depot') return 'Depot';
    return type;
  }
  function centerOf(e){ return [e.x+e.w*0.5, e.y+e.h*0.5]; }

  // ---------- Roads ----------
  function addRoadSeg(x1,y1,x2,y2){
    state.roads.push({x1,y1,x2,y2});
  }

  // ---------- Production & Carriers ----------
  function nearestStorageFrom(x,y){
    let best=null, bd=Infinity;
    for(const e of state.ents){
      if(e.type==='hq'||e.type==='depot'){
        const [cx,cy]=centerOf(e);
        const d=dist(x,y,cx,cy);
        if(d<bd){ bd=d; best=e; }
      }
    }
    return best;
  }

  function connectedEnough(src, dst){
    // Für V14.7 genügt: Wenn es *irgendeine* Straße gibt und
    // Distanz < 1200, betrachten wir es als verbunden.
    return state.roads.length>0 && dist(src.x,src.y,dst.x,dst.y)<1200;
  }

  function spawnCarrier(fromEnt, toEnt){
    const [sx,sy]=centerOf(fromEnt);
    const [tx,ty]=centerOf(toEnt);
    const c = {
      id: randId(),
      x: sx, y: sy,
      sx, sy, tx, ty,
      t: 0,  // 0..1 entlang des Pfads
      speed: 90, // px/s
      frameAcc: 0,
    };
    state.carriers.push(c);
    state.res.traeger = state.carriers.length;
    updateHUD();
  }

  function updateProduction(dt){
    for(const e of state.ents){
      if(e.type!=='woodcutter') continue;
      const prod = state.prod.get(e.id);
      if(!prod) continue;
      // Produktion staut nicht auf: nur wenn Speicherziel existiert
      const dst = nearestStorageFrom(e.x,e.y);
      if(!dst) continue;
      if(!connectedEnough(e,dst)) continue;
      prod.t += dt;
      if(prod.t >= prod.period){
        prod.t = 0;
        spawnCarrier(e, dst);
      }
    }
  }

  function updateCarriers(dt){
    for(let i=state.carriers.length-1;i>=0;--i){
      const c = state.carriers[i];
      const dTot = dist(c.sx,c.sy,c.tx,c.ty);
      const dStep = (c.speed*dt);
      c.t = clamp(c.t + dStep/Math.max(1,dTot), 0, 1);
      c.x = lerp(c.sx, c.tx, c.t);
      c.y = lerp(c.sy, c.ty, c.t);

      // Animationstakt
      if(state.sprite.ready){
        state.sprite.animIdx = (state.sprite.animIdx + dt*state.sprite.animFps) % state.sprite.frames.length;
      }

      if(c.t>=1){
        // angekommen -> Holz +1, Carrier despawnen
        state.carriers.splice(i,1);
        state.res.holz += 1;
        state.res.traeger = state.carriers.length;
        updateHUD();
      }
    }
  }

  // ---------- Rendering ----------
  function clear(){
    const g=state.ctx, w=state.size.w, h=state.size.h;
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle = '#0b1628';
    g.fillRect(0,0,w,h);
    // world transform
    const c=state.cam;
    g.translate(w*0.5 - c.x*c.z, h*0.5 - c.y*c.z);
    g.scale(c.z,c.z);
  }

  function drawGrid(){
    const g=state.ctx, c=state.cam;
    const step = 80;
    const viewW = state.size.w / c.z;
    const viewH = state.size.h / c.z;
    const x0 = Math.floor((c.x - viewW*0.5)/step)*step;
    const y0 = Math.floor((c.y - viewH*0.5)/step)*step;
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 1/c.z;
    g.beginPath();
    for(let x=x0; x<=c.x+viewW; x+=step){
      g.moveTo(x, c.y-viewH*0.5); g.lineTo(x, c.y+viewH*0.5);
    }
    for(let y=y0; y<=c.y+viewH; y+=step){
      g.moveTo(c.x-viewW*0.5, y); g.lineTo(c.x+viewW*0.5, y);
    }
    g.stroke();
  }

  function drawRoads(){
    const g=state.ctx;
    g.strokeStyle='#79e3b7';
    g.lineWidth = 6/state.cam.z;
    g.lineCap='round';
    for(const r of state.roads){
      g.beginPath();
      g.moveTo(r.x1,r.y1); g.lineTo(r.x2,r.y2); g.stroke();
    }
  }

  function drawEntities(){
    const g=state.ctx;
    for(const e of state.ents){
      if(e.type==='hq'){ g.fillStyle='#3db26f'; }
      else if(e.type==='woodcutter'){ g.fillStyle='#4a83ff'; }
      else if(e.type==='depot'){ g.fillStyle='#d64e7f'; }
      else { g.fillStyle='#6b7a90'; }
      g.fillRect(e.x, e.y, e.w, e.h);

      // Label
      g.fillStyle='rgba(255,255,255,0.85)';
      g.font = `${14/state.cam.z}px system-ui`;
      g.textAlign='center';
      g.fillText(e.label, e.x+e.w*0.5, e.y-6/state.cam.z);
    }
  }

  function drawCarriers(){
    const g=state.ctx;
    for(const c of state.carriers){
      if(state.sprite.ready){
        const fr = state.sprite.frames[Math.floor(state.sprite.animIdx) % state.sprite.frames.length];
        const s = 0.6; // Zeichenskalierung
        const w = fr.w * s, h = fr.h * s;
        g.drawImage(state.sprite.img, fr.x, fr.y, fr.w, fr.h,
          c.x - w*0.5, c.y - h*0.5, w, h);
      }else{
        // Fallback: kleine Pille
        g.fillStyle = '#ffcf76';
        g.beginPath(); g.arc(c.x, c.y, 10, 0, TAU); g.fill();
        g.fillStyle='#72502a';
        g.fillRect(c.x-4, c.y-2, 8, 4);
      }
    }
  }

  function render(){
    clear();
    drawGrid();
    drawRoads();
    drawEntities();
    drawCarriers();
  }

  // ---------- Input ----------
  function setTool(name){
    state.tool = name;
    const map = { pointer:'Zeiger', road:'Straße', hq:'HQ', woodcutter:'Holzfäller', depot:'Depot', erase:'Abriss' };
    if(state.hudEls.tool) state.hudEls.tool.textContent = map[name] || name;
  }

  function onPointerDown(sx,sy){
    state.pointerDown=true;
    const [x,y]=screenToWorld(sx,sy);

    if(state.tool==='road'){
      if(state.roadBuild==null){
        state.roadBuild = {x,y};
      }else{
        // Orthogonal segmente: achsenausgleich
        const start = state.roadBuild;
        const dx=Math.abs(x-start.x), dy=Math.abs(y-start.y);
        if(dx>=dy){
          addRoadSeg(start.x, start.y, x, start.y);
          state.roadBuild = {x, y:start.y};
        }else{
          addRoadSeg(start.x, start.y, start.x, y);
          state.roadBuild = {x:start.x, y};
        }
      }
    }else if(state.tool==='hq' || state.tool==='woodcutter' || state.tool==='depot'){
      addEntity(state.tool, x-40, y-40);
    }else if(state.tool==='erase'){
      // einfacher Hit-Test zuerst Entitäten, dann Straßen
      for(let i=state.ents.length-1;i>=0;--i){
        const e=state.ents[i];
        if(x>=e.x && x<=e.x+e.w && y>=e.y && y<=e.y+e.h){
          state.ents.splice(i,1);
          state.prod.delete(e.id);
          return;
        }
      }
      for(let i=state.roads.length-1;i>=0;--i){
        const r=state.roads[i];
        const d = pointSegDist(x,y,r.x1,r.y1,r.x2,r.y2);
        if(d<10/state.cam.z){ state.roads.splice(i,1); return; }
      }
    }else{
      // pointer -> evtl. Start für Pan (handled in move)
    }
  }
  function onPointerUp(){
    state.pointerDown=false;
    if(state.tool==='road'){
      // Doppeltipp beendet Straßenbau
      const t=performance.now();
      if(t-state.lastTapTime<250){ state.roadBuild=null; }
      state.lastTapTime=t;
    }
  }
  function onPointerMove(sx,sy,dx,dy){
    if(!state.pointerDown) return;
    if(state.tool==='pointer'){
      // Pan
      state.cam.x -= dx/state.cam.z;
      state.cam.y -= dy/state.cam.z;
    }
  }
  function onWheel(ev){
    const s = clamp(state.cam.z * (ev.deltaY<0 ? 1.1: 1/1.1), 0.5, 2.5);
    state.cam.z = s;
    if(state.hudEls.zoom) state.hudEls.zoom.textContent = s.toFixed(2)+'x';
  }

  function pointSegDist(px,py,x1,y1,x2,y2){
    const vx=x2-x1, vy=y2-y1, wx=px-x1, wy=py-y1;
    const c1 = vx*wx+vy*wy;
    if(c1<=0) return Math.hypot(px-x1,py-y1);
    const c2 = vx*vx+vy*vy;
    if(c2<=c1) return Math.hypot(px-x2,py-y2);
    const t=c1/c2;
    const xx=x1+t*vx, yy=y1+t*vy;
    return Math.hypot(px-xx,py-yy);
  }

  // ---------- HUD ----------
  function updateHUD(){
    const H=state.hudEls;
    if(H.holz) H.holz.textContent = String(state.res.holz);
    if(H.stein) H.stein.textContent = String(state.res.stein);
    if(H.nahrung) H.nahrung.textContent = String(state.res.nahrung);
    if(H.gold) H.gold.textContent = String(state.res.gold);
    if(H.traeger) H.traeger.textContent = String(state.res.traeger);
  }

  // ---------- Loop ----------
  function tick(tNow){
    if(!state.started){ requestAnimationFrame(tick); return; }
    if(!state.tPrev) state.tPrev=tNow;
    const dt = Math.min(0.05, (tNow-state.tPrev)/1000);
    state.tPrev = tNow;

    updateProduction(dt);
    updateCarriers(dt);
    render();
    requestAnimationFrame(tick);
  }

  // ---------- Public ----------
  async function startGame(opts){
    if(state.started) return;

    // Canvas
    state.canvas = opts.canvas;
    state.size.dpr = opts.DPR || (window.devicePixelRatio||1);
    state.ctx = state.canvas.getContext('2d');

    // HUD
    state.hudEls = {
      holz: qs('#hudHolz'), stein: qs('#hudStein'), nahrung: qs('#hudNahrung'),
      gold: qs('#hudGold'), traeger: qs('#hudTraeger'),
      tool: qs('#hudTool'), zoom: qs('#hudZoom')
    };
    updateHUD();

    // Events
    resize();
    window.addEventListener('resize', resize);

    // Zeiger/Pan/Zoom
    let lastX=0,lastY=0;
    state.canvas.addEventListener('pointerdown', e=>{ state.canvas.setPointerCapture(e.pointerId); lastX=e.clientX; lastY=e.clientY; onPointerDown(e.clientX,e.clientY); });
    state.canvas.addEventListener('pointerup',   e=>{ onPointerUp(); });
    state.canvas.addEventListener('pointermove', e=>{
      const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
      onPointerMove(e.clientX,e.clientY,dx,dy);
    });
    state.canvas.addEventListener('wheel', (e)=>{ e.preventDefault(); onWheel(e); }, {passive:false});

    // Tool-Buttons
    document.querySelectorAll('#tools [data-tool]').forEach(btn=>{
      btn.addEventListener('click', ()=>setTool(btn.dataset.tool));
    });
    qs('#btnCenter')?.addEventListener('click', ()=>{
      state.cam.x=0; state.cam.y=0; state.cam.z=1;
      if(state.hudEls.zoom) state.hudEls.zoom.textContent='1.00x';
    });

    // Startwelt: ein HQ mittig
    addEntity('hq', -60, -60);

    // Assets
    await loadCarrierSprite();

    state.started = true;
    state.tPrev = 0;
    requestAnimationFrame(tick);
  }

  function resetGame(){
    state.ents.length=0;
    state.roads.length=0;
    state.carriers.length=0;
    state.res={holz:0,stein:0,nahrung:0,gold:0,traeger:0};
    state.cam={x:0,y:0,z:1};
    state.prod.clear();
    updateHUD();
    addEntity('hq', -60, -60);
  }

  function resize(){
    const dpr = state.size.dpr;
    const rect = state.canvas.getBoundingClientRect();
    state.size.w = Math.round(rect.width * dpr);
    state.size.h = Math.round(rect.height * dpr);
    state.canvas.width = state.size.w;
    state.canvas.height = state.size.h;
    state.ctx.setTransform(dpr,0,0,dpr,0,0); // High-DPI fix für Events nicht nötig, wir zeichnen mit Transformen
  }

  function qs(sel){ return document.querySelector(sel); }

  // Expose
  window.game = { startGame, resetGame };
})();
