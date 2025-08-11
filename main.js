/* Siedler‑Mini V12 – Iso, Mini‑Map, Autotile‑Straßen, Produktion & animierte Träger */
(() => {
  // ====== Canvas / Kamera ======
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha:false });
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');

  const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let W=0, H=0;
  function resize(){
    const headerH = (document.querySelector('header')?.offsetHeight) || 0;
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight - headerH);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    canvas.width=Math.floor(W*DPR); canvas.height=Math.floor(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    drawAll(true);
  }
  addEventListener('resize', resize, {passive:true});

  // Iso‑Kamera
  const cam = { x: 0, y: 0, z: 1.0 };
  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const rect=canvas.getBoundingClientRect();
    const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
    const wx = sx/cam.z + cam.x, wy = sy/cam.z + cam.y; // Welt vor Zoom
    cam.z = Math.max(0.5, Math.min(2.5, cam.z * (e.deltaY>0 ? 0.9 : 1.1)));
    cam.x = wx - sx/cam.z; cam.y = wy - sy/cam.z;
    drawAll(true);
  }, {passive:false});
  let panning=false, panLast={x:0,y:0};
  canvas.addEventListener('pointerdown', (e)=>{ if(e.button===2){ panning=true; panLast={x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId);} });
  canvas.addEventListener('pointermove', (e)=>{ if(!panning) return; const dx=(e.clientX-panLast.x)/cam.z, dy=(e.clientY-panLast.y)/cam.z; cam.x-=dx; cam.y-=dy; panLast={x:e.clientX,y:e.clientY}; drawAll(false); });
  canvas.addEventListener('pointerup', ()=>{ panning=false; });
  canvas.addEventListener('contextmenu', e=>e.preventDefault());

  // ====== Map / Daten ======
  const TILE = 64;           // logische Kachelgröße
  const MAP = { W: 44, H: 32 };
  const grid = Array.from({length: MAP.H}, ()=> Array.from({length: MAP.W}, ()=> ({
    ground:'grass', road:false, roadMask:0, building:null, node:null, active:false,
    prodTimer:0, stock:0 // für Produzenten
  })));

  // Ressourcen
  const res = { wood:20, stone:10, food:10, gold:0, pop:3 };
  function hud(){
    for (const id of ['wood','stone','food','gold','pop']){
      const el = document.getElementById(id); if (el) el.textContent = Math.floor(res[id]);
    }
  }

  // ====== Assets laden (mit Platzhalter) ======
  const IM = {};
  function load(key, src){ return new Promise((resolve)=>{ const i=new Image(); i.onload=()=>{IM[key]=i; resolve();}; i.onerror=()=>{IM[key]=null; resolve();}; i.src=src; }); }
  const toLoad = [
    ['grass','assets/grass.png'], ['water','assets/water.png'], ['shore','assets/shore.png'],
    ['hq','assets/hq_wood.png'],
    ['lumber','assets/lumberjack.png'],
    ['carrier','assets/carrier.png'], // Spritesheet optional
    // optionale Straßen-Texturen (wir haben Fallback‑Zeichnung)
    ['road_straight','assets/road_straight.png'],
    ['road_curve','assets/road_curve.png'],
    ['road_t','assets/road_t.png'],
    ['road_cross','assets/road_cross.png'],
    ['road_end','assets/road_end.png']
  ];

  // ====== Welt generieren ======
  function genWorld(){
    // See
    for (let y=14;y<24;y++) for (let x=6;x<18;x++) grid[y][x].ground='water';
    // Ufer
    for (let y=1;y<MAP.H-1;y++) for (let x=1;x<MAP.W-1;x++){
      if (grid[y][x].ground==='water') continue;
      const n = grid[y-1][x].ground==='water' || grid[y+1][x].ground==='water' || grid[y][x-1].ground==='water' || grid[y][x+1].ground==='water';
      if (n) grid[y][x].ground='shore';
    }
    // Waldknoten (für Lumberjack)
    function blob(cx,cy,r){
      for (let y=Math.max(1,cy-r); y<=Math.min(MAP.H-2,cy+r); y++)
        for (let x=Math.max(1,cx-r); x<=Math.min(MAP.W-2,cy+r); x++){
          const dx=x-cx, dy=y-cy; if (dx*dx+dy*dy<=r*r && grid[y][x].ground==='grass') grid[y][x].node='forest';
        }
    }
    blob(10, 10, 3); blob(24, 7, 2); blob(34, 20, 4);
  }

  // ====== Iso‑Projektion ======
  function cellToIso(x, y){
    const isoX = (x - y) * (TILE * 0.75);
    const isoY = (x + y) * (TILE * 0.38);
    return { x: isoX, y: isoY };
  }
  function rectForTile(x,y){
    const p = cellToIso(x,y);
    return { x: p.x - cam.x, y: p.y - cam.y, w: TILE*0.92, h: TILE*0.92 };
  }
  function worldToScreen(wx, wy){
    return { sx: (wx - cam.x) * cam.z, sy: (wy - cam.y) * cam.z };
  }
  function screenToCell(sx, sy){
    // Brute‑force Hit-Test: reicht bei TILE 64 / MAP moderat (einfach & robust)
    const wx = sx/cam.z + cam.x, wy = sy/cam.z + cam.y;
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++){
      const r = rectForTile(x,y);
      if (wx >= r.x && wy >= r.y && wx < r.x+r.w && wy < r.y+r.h) return {x,y};
    }
    return null;
  }

  // ====== Straßen‑Autotiling ======
  const N4 = [[1,0],[-1,0],[0,1],[0,-1]]; // E,W,S,N (aber Masken bauen wir als NESW)
  function computeRoadMasks(){
    const dirs = [[0,-1],[1,0],[0,1],[-1,0]]; // N,E,S,W -> Bits 1,2,4,8
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++){
      if (!grid[y][x].road){ grid[y][x].roadMask=0; continue; }
      let m=0;
      dirs.forEach((d,i)=>{
        const nx=x+d[0], ny=y+d[1];
        if (grid[ny]?.[nx]?.road) m |= (1<<i);
        else if (grid[ny]?.[nx]?.building && grid[ny][nx].building!=='hq') m |= 0; // nur Straßen zählen
      });
      grid[y][x].roadMask = m;
    }
  }

  // ====== HQ / Konnektivität ======
  let HQ = { x: (MAP.W/2)|0, y: (MAP.H/2)|0 };
  grid[HQ.y][HQ.x].building = 'hq';

  function updateConnectivity(){
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++) grid[y][x].active = false;
    const q=[[HQ.x,HQ.y]]; grid[HQ.y][HQ.x].active = true;
    while (q.length){
      const [cx,cy] = q.shift();
      for (const [dx,dy] of N4){
        const nx=cx+dx, ny=cy+dy;
        if (!grid[ny]?.[nx] || grid[ny][nx].active) continue;
        if (grid[ny][nx].road){ grid[ny][nx].active = true; q.push([nx,ny]); }
        else if (grid[ny][nx].building && !(nx===HQ.x && ny===HQ.y)){ grid[ny][nx].active = true; }
      }
    }
  }

  // ====== Produktion / Jobs ======
  const PROD = { lumber: { out:'wood', every:3.0, needNode:'forest' } };
  const jobs = []; // {type:'pickup', res:'wood', x,y, amount}
  function hasAdjNode(x,y,node){
    for (const [dx,dy] of N4){ const nx=x+dx, ny=y+dy; if (grid[ny]?.[nx]?.node===node) return true; }
    return false;
  }
  function producersTick(dt){
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++){
      const t=grid[y][x]; const b=t.building;
      if (!b || b==='hq') continue;
      if (!t.active) continue;
      const p = PROD[b]; if (!p) continue;
      if (p.needNode && !hasAdjNode(x,y,p.needNode)) continue;
      t.prodTimer += dt;
      if (t.prodTimer >= p.every){
        t.prodTimer -= p.every;
        t.stock = Math.min(9, t.stock + 1);
        // Wenn neu etwas da ist, Job einstellen (einfach pro Tick)
        if (!jobs.find(j=>j.x===x && j.y===y && j.type==='pickup')){
          jobs.push({type:'pickup', res:p.out, x, y, amount: Math.min(3, t.stock)});
        }
      }
    }
  }

  // ====== Träger / Pfade ======
  const carriers = []; // {x,y, px,py, tx,ty, path:[], carrying:{wood:n}, cap:3, anim:{row,frame,t}}
  function spawnCarrier(){
    carriers.push({
      x:HQ.x, y:HQ.y, px:0,py:0, tx:HQ.x,ty:HQ.y, path:[],
      carrying:{ wood:0 }, cap:3,
      anim:{ dir:0, frame:0, t:0 }
    });
  }
  function tileNeighbours(x,y){
    const out=[];
    for (const [dx,dy] of N4){
      const nx=x+dx, ny=y+dy;
      if (!grid[ny]?.[nx]) continue;
      if (grid[ny][nx].road || (nx===HQ.x && ny===HQ.y)) out.push([nx,ny]);
    }
    return out;
  }
  function bfsPath(sx,sy, gx,gy){
    const q=[[sx,sy]], seen=new Set([sx+','+sy]), prev=new Map();
    while (q.length){
      const [cx,cy]=q.shift();
      if (cx===gx && cy===gy) break;
      for (const [nx,ny] of tileNeighbours(cx,cy)){
        const k=nx+','+ny; if (seen.has(k)) continue;
        seen.add(k); prev.set(k, [cx,cy]); q.push([nx,ny]);
      }
    }
    // backtrack
    const path=[];
    let k=gx+','+gy;
    if (!prev.has(k) && !(sx===gx && sy===gy)) return null;
    while (k!==sx+','+sy){
      path.push(k.split(',').map(Number));
      const p=prev.get(k); if (!p) break; k=p[0]+','+p[1];
    }
    path.reverse();
    return path;
  }
  function takeJob(c){
    // simple: nächster Pickup
    for (let i=0;i<jobs.length;i++){
      const j=jobs[i];
      if (j.type!=='pickup') continue;
      // Pfad von Carrier‑Zelle zum Gebäude‑Nachbarn (Straßenfeld neben Producer)
      // Suche irgendeinen befahrbaren Nachbar des Producer‑Tiles:
      let target=null;
      for (const [dx,dy] of N4){ const nx=j.x+dx, ny=j.y+dy; if (grid[ny]?.[nx]?.road) { target=[nx,ny]; break; } }
      if (!target) continue; // Producer ist (noch) nicht ans Netz angebunden
      const path=bfsPath(c.x,c.y, target[0],target[1]);
      if (!path) continue;
      c.path=path; c.tx=target[0]; c.ty=target[1];
      c.job=j; jobs.splice(i,1);
      return true;
    }
    return false;
  }
  function dirIndex(dx,dy){
    // 6 Iso‑Richtungen (wir mappen N4 + diagonale Projektion grob)
    if (dx>0 && dy===0) return 0;      // E
    if (dx>0 && dy<0)  return 1;      // NE (approximiert)
    if (dx<0 && dy<0)  return 2;      // NW
    if (dx<0 && dy===0) return 3;     // W
    if (dx<0 && dy>0)  return 4;      // SW
    return 5;                         // SE / sonst
  }
  function carriersTick(dt){
    for (const c of carriers){
      // Wenn kein Job & keine Route → neuen suchen
      if ((!c.path || c.path.length===0) && !c.job){
        if (!takeJob(c)){
          // Idle: langsam hin und her wippen
          c.anim.t += dt;
          continue;
        }
      }
      // Bewege entlang Pfad
      if (c.path && c.path.length){
        const [nx,ny] = c.path[0];
        // Setze Position "Zelle für Zelle" – einfache Rasterbewegung
        const dx = nx - c.x, dy = ny - c.y;
        // anim dir
        c.anim.dir = dirIndex(dx,dy);
        // Reisegeschwindigkeit: 4 Tiles/Sek
        c.anim.t += dt;
        if (c.anim.t >= 0.25){ // alle ~250ms eine Zelle weiter + Framewechsel
          c.anim.t -= 0.25;
          c.x = nx; c.y = ny; c.path.shift();
          c.anim.frame = (c.anim.frame+1) % 4;
        }
        // Am Ziel‑Straßenfeld vor Producer angekommen?
        if (c.path.length===0 && c.job && c.job.type==='pickup'){
          // am Producer Nachbarn: Ware aufnehmen
          const t = grid[c.job.y][c.job.x];
          const take = Math.min(c.cap - c.carrying.wood, t.stock);
          if (take>0){ t.stock -= take; c.carrying.wood += take; }
          // Als nächstes Pfad zum HQ suchen (zu einer angrenzenden Straßenkachel des HQ)
          let hqTarget=null;
          for (const [dx,dy] of N4){ const nx=HQ.x+dx, ny=HQ.y+dy; if (grid[ny]?.[nx]?.road){ hqTarget=[nx,ny]; break; } }
          if (!hqTarget){ c.job=null; continue; } // kein Anschluss am HQ
          const path=bfsPath(c.x,c.y, hqTarget[0],hqTarget[1]);
          c.path = path||[]; c.tx=hqTarget[0]; c.ty=hqTarget[1];
          c.job = {type:'deliver'};
        }
      } else if (c.job && c.job.type==='deliver'){
        // Steht am HQ‑Zielnachbarn → abladen
        res.wood += c.carrying.wood; c.carrying.wood=0; hud();
        // bleibt wo er ist; Job erledigt
        c.job = null;
      }
    }
  }

  // ====== Eingabe / Bauen ======
  let tool='road';
  document.querySelectorAll('#toolbar .btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('#toolbar .btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); tool=b.dataset.tool;
    });
  });

  canvas.addEventListener('pointerdown', (e)=>{
    if (e.button!==0) return;
    const rect=canvas.getBoundingClientRect();
    const cell = screenToCell(e.clientX-rect.left, e.clientY-rect.top);
    if (!cell) return;
    const {x,y}=cell;
    if (tool==='bulldoze'){
      if (x===HQ.x && y===HQ.y) return;
      grid[y][x].road=false; grid[y][x].roadMask=0; grid[y][x].building=null; grid[y][x].stock=0;
      computeRoadMasks(); updateConnectivity();
      drawAll(true); return;
    }
    if (grid[y][x].ground==='water') return;

    if (tool==='road'){
      if (!grid[y][x].road && !grid[y][x].building){
        grid[y][x].road=true; computeRoadMasks(); updateConnectivity();
      }
    } else if (tool==='lumber'){
      if (!grid[y][x].building && !grid[y][x].road){
        grid[y][x].building='lumber';
      }
    }
    drawAll(true);
  });

  // ====== Zeichnen ======
  function drawGround(){
    for (let y=0;y<MAP.H;y++){
      for (let x=0;x<MAP.W;x++){
        const r = rectForTile(x,y);
        const g = grid[y][x].ground;
        const img = (g==='water'?IM.water : (g==='shore'?IM.shore : IM.grass));
        if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
        else {
          ctx.fillStyle = g==='water' ? '#0e2233' : (g==='shore' ? '#2a3f2a' : '#1b2e19');
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
        // Raster
        ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.strokeRect(r.x, r.y, r.w, r.h);
        // Waldknoten
        if (grid[y][x].node==='forest'){
          ctx.fillStyle='rgba(40,150,60,.55)'; ctx.beginPath();
          ctx.ellipse(r.x+r.w*0.5, r.y+r.h*0.6, r.w*0.28, r.h*0.18, 0, 0, Math.PI*2); ctx.fill();
        }
      }
    }
  }

  function drawRoads(){
    for (let y=0;y<MAP.H;y++){
      for (let x=0;x<MAP.W;x++){
        if (!grid[y][x].road) continue;
        const r = rectForTile(x,y);
        const m = grid[y][x].roadMask;
        // Wenn Bild vorhanden, wählen (sehr einfaches Mapping)
        let tex = null;
        if (m===0) tex = IM.road_end;
        else if (m===1||m===4||m===2||m===8) tex = IM.road_end;
        else if (m===5||m===10) tex = IM.road_straight;   // N‑S oder E‑W
        else if ([3,6,9,12].includes(m)) tex = IM.road_curve;
        else if ([7,11,13,14].includes(m)) tex = IM.road_t;
        else if (m===15) tex = IM.road_cross;

        if (tex){
          ctx.drawImage(tex, r.x, r.y, r.w, r.h);
        } else {
          // Fallback: Kopfstein‑Band
          ctx.fillStyle='#6b6f7a';
          ctx.fillRect(r.x + r.w*0.18, r.y + r.h*0.36, r.w*0.64, r.h*0.28);
          // kleine zufällige Steine
          ctx.fillStyle='rgba(255,255,255,.08)';
          for (let i=0;i<6;i++){
            const sx = r.x + r.w*0.2 + Math.random()*r.w*0.6;
            const sy = r.y + r.h*0.38 + Math.random()*r.h*0.22;
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
      }
    }
  }

  function drawBuildings(){
    for (let y=0;y<MAP.H;y++){
      for (let x=0;x<MAP.W;x++){
        const b = grid[y][x].building; if (!b) continue;
        const r = rectForTile(x,y);
        if (b==='hq'){
          const img = IM.hq;
          if (img) {
            const w=r.w*1.15, h=img.height*(w/img.width);
            ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h - h + r.h*0.12, w, h);
          } else { ctx.fillStyle='#6a4'; ctx.fillRect(r.x+r.w*.1,r.y+r.h*.1,r.w*.8,r.h*.8); }
        } else if (b==='lumber'){
          const img = IM.lumber;
          if (img){
            const w=r.w*1.0, h=img.height*(w/img.width);
            ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h - h + r.h*0.10, w, h);
          } else { ctx.fillStyle='#4aa45a'; ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76); }
          // Lager‑Anzeige (kleiner Stapel)
          if (grid[y][x].stock>0){
            ctx.fillStyle='#caa36a'; ctx.fillRect(r.x+r.w*.42, r.y+r.h*.38, r.w*.16, r.h*.12);
            ctx.fillStyle='#fff'; ctx.font='12px system-ui'; ctx.fillText(grid[y][x].stock, r.x+r.w*.5, r.y+r.h*.36);
          }
        }
      }
    }
  }

  function drawCarriers(){
    // Sortieren nach Iso‑Y (x+y) für korrektes Überdecken
    const order = carriers.map((c,i)=>({i, k:c.x+c.y})).sort((a,b)=>a.k-b.k);
    for (const {i} of order){
      const c = carriers[i];
      const r = rectForTile(c.x, c.y);
      if (IM.carrier){
        // Spritesheet: 6 Zeilen × 4 Spalten @ 32×32
        const fw=32, fh=32, cols=4;
        const row = Math.max(0, Math.min(5, c.anim.dir|0));
        const col = c.anim.frame|0;
        ctx.drawImage(IM.carrier, col*fw, row*fh, fw, fh,
                      r.x + r.w*0.35, r.y + r.h*0.10, r.w*0.3, r.w*0.3);
      } else {
        // Platzhalter
        ctx.fillStyle='#e3e7ef'; ctx.beginPath();
        ctx.arc(r.x+r.w*0.5, r.y+r.h*0.45, Math.min(r.w,r.h)*0.12, 0, Math.PI*2); ctx.fill();
        // Ladung
        if (c.carrying.wood>0){ ctx.fillStyle='#caa36a'; ctx.fillRect(r.x+r.w*.46, r.y+r.h*.35, r.w*.12, r.h*.08); }
      }
    }
  }

  function drawMiniMap(){
    const w = mini.width, h = mini.height;
    mctx.clearRect(0,0,w,h);
    // einfache Skalierung
    const sx = w / MAP.W, sy = h / MAP.H;
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++){
      const g = grid[y][x].ground;
      mctx.fillStyle = g==='water' ? '#1a3a55' : (g==='shore' ? '#2c4d2c' : '#244a21');
      mctx.fillRect(x*sx, y*sy, sx, sy);
      if (grid[y][x].road){ mctx.fillStyle='#888'; mctx.fillRect(x*sx, y*sy, sx, sy); }
      if (grid[y][x].building==='hq'){ mctx.fillStyle='#6ee7a9'; mctx.fillRect(x*sx, y*sy, sx, sy); }
      if (grid[y][x].building==='lumber'){ mctx.fillStyle='#9ad17a'; mctx.fillRect(x*sx, y*sy, sx, sy); }
    }
    // Kamera‑Ausschnitt (grob)
    // Bestimme ungefähr die sichtbaren Zellen aus der Kameraposition
    // (vereinfachte Box, reicht als Orientierung)
    mctx.strokeStyle='#fff'; mctx.lineWidth=1;
    mctx.strokeRect((MAP.W/2-8)*sx, (MAP.H/2-6)*sy, 16*sx, 12*sy);
  }

  function drawAll(force){
    ctx.save(); ctx.scale(cam.z, cam.z);
    ctx.fillStyle='#0b0e13'; ctx.fillRect(0,0,canvas.width,canvas.height);
    drawGround(); drawRoads(); drawBuildings(); drawCarriers();
    ctx.restore();
    drawMiniMap();
    if (force) hud();
  }

  // ====== Game Loop ======
  let last = performance.now(), acc=0;
  function loop(ts){
    const dt=Math.min(0.05,(ts-last)/1000); last=ts; acc+=dt;
    while (acc>0.20){
      producersTick(0.20);
      computeRoadMasks();
      updateConnectivity();
      carriersTick(0.20);
      acc-=0.20;
    }
    drawAll(false);
    requestAnimationFrame(loop);
  }

  // ====== Overlay / Start ======
  function bindOverlay(){
    const startBtn = document.querySelector('#overlay [data-action="start"]');
    const resetBtn = document.querySelector('#overlay [data-action="reset"]');
    if (startBtn) startBtn.onclick = startGame;
    if (resetBtn) resetBtn.onclick = resetGame;
  }
  function startGame(){
    document.getElementById('overlay').style.display='none';
    // Starte mit 2 Trägern
    if (carriers.length===0){ spawnCarrier(); spawnCarrier(); }
    drawAll(true);
  }
  function resetGame(){
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++){
      grid[y][x] = { ground:'grass', road:false, roadMask:0, building:null, node:null, active:false, prodTimer:0, stock:0 };
    }
    HQ = { x:(MAP.W/2)|0, y:(MAP.H/2)|0 };
    grid[HQ.y][HQ.x].building='hq';
    genWorld(); computeRoadMasks(); updateConnectivity();
    carriers.length=0; jobs.length=0;
    res.wood=20; res.stone=10; res.food=10; res.gold=0; res.pop=3;
    hud();
    document.getElementById('overlay').style.display='flex';
    drawAll(true);
  }

  // ====== Boot ======
  Promise.all(toLoad.map(([k,src])=>load(k,src))).then(()=>{
    genWorld(); computeRoadMasks(); updateConnectivity();
    resize(); bindOverlay(); hud();
    requestAnimationFrame(loop);
  });

})();
