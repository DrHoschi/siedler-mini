// Siedler‑Mini V15.3
// - KEINE manuell gebauten Straßen (auskommentiert)
// - Arbeiter laufen HQ ↔ Gebäude; pro Schritt wird "pathWear" erhöht
// - pathWear rendert leichte → mittlere → starke Pfad‑Texturen (oder Fallback)
// - Build: HQ, Depot, Holzfäller; Abriss; Pan/Zoom; Vollbild

export const game = (() => {
  const TILE = 64;
  const WORLD_W = 96, WORLD_H = 96;

  const COLORS = {
    grid:"#183048",
    txt:"#cfe3ff",
    b_hq:"#43aa62", b_wc:"#3f8cff", b_dp:"#d55384",
    wear1:"rgba(125, 99, 60, 0.25)",
    wear2:"rgba(110, 85, 50, 0.35)",
    wear3:"rgba(95, 72, 42, 0.45)"
  };

  const S = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.55, maxZoom:2.8,
    pointerTool:'pointer',
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0, panSpeed:0.9,
    pointers:new Map(), _pinchPrev:null,
    onHUD:(k,v)=>{}, onDebug:(s)=>{}, debug:false, dbgTxt:'',

    // World
    ground: [],              // 0=grass,1=dirt,2=forest,3=water
    // roads: new Set(),     // <<< AUSKOMMENTIERT
    buildings: [],           // {type,x,y,w,h,img?, workerId?}
    pathWear: null,          // Float32Array(WORLD_W*WORLD_H) 0..∞
    workers: [],             // {type:'carrier', x,y, tx,ty, speed, phase, target:{x,y}, fromBld,toBld}
    nextWorkerId:1,

    // Texturen
    tex: {}
  };

  const groundKeys = ['topdown_grass','topdown_dirt','topdown_forest','topdown_water'];

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function snap(v){return Math.round(v/TILE)*TILE;}
  function idx(x,y){return y*WORLD_W+x;}
  function inBounds(x,y){return x>=0&&y>=0&&x<WORLD_W&&y<WORLD_H;}

  function toWorld(cssX, cssY){
    const cssW = S.width / S.DPR, cssH = S.height / S.DPR;
    return { x:(cssX - cssW/2)/S.zoom + S.camX, y:(cssY - cssH/2)/S.zoom + S.camY };
  }
  function toScreen(wx,wy){
    const cssW = S.width / S.DPR, cssH = S.height / S.DPR;
    return { x:(wx - S.camX)*S.zoom + cssW/2, y:(wy - S.camY)*S.zoom + cssH/2 };
  }
  const setHUD=(k,v)=>S.onHUD?.(k,v);
  const setDBG=(s)=>{ S.dbgTxt=s; if (S.debug) S.onDebug?.(s); };
  const writeZoom=()=>setHUD('Zoom', `${S.zoom.toFixed(2)}x`);

  // ===== Texturen laden =====
  function loadImage(src){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; }); }
  async function loadTextures(){
    for (const k of groundKeys){ S.tex[k] = await loadImage(`./assets/tex/${k}.png`); }
    S.tex.topdown_hq         = await loadImage(`./assets/tex/topdown_hq.png`) || await loadImage(`./assets/tex/hq_wood.png`);
    S.tex.topdown_woodcutter = await loadImage(`./assets/tex/topdown_woodcutter.png`);
    S.tex.topdown_depot      = await loadImage(`./assets/tex/topdown_depot.png`);
    // optionale Pfad‑Texturen
    S.tex.topdown_path1      = await loadImage(`./assets/tex/topdown_path1.png`);
    S.tex.topdown_path2      = await loadImage(`./assets/tex/topdown_path2.png`);
    S.tex.topdown_path3      = await loadImage(`./assets/tex/topdown_path3.png`);
  }

  // ===== Welt =====
  function genWorld(){
    S.ground = new Array(WORLD_W*WORLD_H).fill(0);
    S.pathWear = new Float32Array(WORLD_W*WORLD_H);

    // simple Noise‑Mischung
    for (let y=0;y<WORLD_H;y++){
      for (let x=0;x<WORLD_W;x++){
        let v=0; v+=0.6*Math.sin(x*0.08)+0.6*Math.cos(y*0.07); v+=0.4*Math.sin(x*0.03+y*0.05);
        const d=Math.hypot(x-WORLD_W*0.5,y-WORLD_H*0.5); v -= d*0.02;
        let t=0; if (v>1.0) t=2; else if (v>0.2) t=0; else if (v>-0.4) t=1; else t=3;
        S.ground[idx(x,y)] = t;
      }
    }

    // HQ in die Mitte
    const cx=Math.floor(WORLD_W/2), cy=Math.floor(WORLD_H/2);
    const hq = addBuilding('hq', cx*TILE, cy*TILE);

    // Kamera auf HQ
    center();

    // Start‑Arbeiter: keiner – erst wenn Holzfäller gebaut wird, spawnen wir dessen Läufer
  }

  function addBuilding(type, wx, wy){
    const img = type==='hq' ? (S.tex.topdown_hq||null) :
               type==='woodcutter' ? (S.tex.topdown_woodcutter||null) :
               type==='depot' ? (S.tex.topdown_depot||null) : null;
    const b={type, x:snap(wx), y:snap(wy), w:TILE, h:TILE, img};
    S.buildings.push(b);
    // Wenn ein Holzfäller gebaut wird: einen Arbeiter anlegen, der HQ↔Holzfäller läuft
    if (type==='woodcutter'){
      const hq=findNearestOfType('hq', b.x, b.y) || findAnyHQ();
      if (hq) spawnWorker(hq, b);
    }
    return b;
  }

  function removeBuildingAt(wx,wy){
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i], x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0&&wx<=x1&&wy>=y0&&wy<=y1){
        // dazugehörige Worker entfernen
        S.workers = S.workers.filter(w=>!(w.fromBld===b||w.toBld===b));
        S.buildings.splice(i,1);
        return true;
      }
    }
    return false;
  }

  function findAnyHQ(){ return S.buildings.find(b=>b.type==='hq')||null; }
  function findNearestOfType(type, wx,wy){
    let best=null, bestD=1e9;
    for(const b of S.buildings) if (b.type===type){
      const d=Math.hypot(b.x-wx,b.y-wy);
      if (d<bestD){best=b;bestD=d;}
    }
    return best;
  }

  // ===== Arbeiter & Pfadverschleiß =====
  function spawnWorker(hq, woodcutter){
    const id=S.nextWorkerId++;
    // Starten wir beim Holzfäller: holt Nahrung aus HQ (erste Phase)
    const w={
      id, type:'carrier',
      x: woodcutter.x, y: woodcutter.y,
      speed: 60,            // px/s (später tunen)
      phase: 'toHQ',        // toHQ -> toWC -> loop
      fromBld: woodcutter, toBld: hq,
      target:{x:hq.x, y:hq.y},
      tAccum:0
    };
    S.workers.push(w);
  }

  function stepWorkers(dt){
    for (const w of S.workers){
      // Ziel erreicht?
      const dx=w.target.x - w.x, dy=w.target.y - w.y;
      const dist=Math.hypot(dx,dy);
      const step = w.speed * dt;
      if (dist <= step){
        // Endpunkt erreicht: minimal wear für letzte Zelle
        addWearAtWorld(w.target.x, w.target.y, 0.02);
        // Phase wechseln
        if (w.phase==='toHQ'){
          w.phase='toWC';
          w.fromBld = w.toBld;
          w.toBld = S.buildings.find(b=>b===w.fromBld) ? findNearestOfType('woodcutter', w.x, w.y) : w.fromBld;
          // konkret: zu dem initialen woodcutter zurück
          w.toBld = w.fromBld.type==='woodcutter' ? w.fromBld : (S.buildings.find(b=>b.type==='woodcutter')||w.fromBld);
          if (!w.toBld) continue;
          w.target={x:w.toBld.x,y:w.toBld.y};
        } else {
          w.phase='toHQ';
          const hq=findAnyHQ();
          if (!hq) continue;
          w.target={x:hq.x,y:hq.y};
        }
        continue;
      }
      // Bewegung
      const nx = w.x + (dx/dist)*step;
      const ny = w.y + (dy/dist)*step;

      // Pfadverschleiß entlang des kleinen Segments (w.x,w.y) -> (nx,ny)
      addWearAlongSegment(w.x,w.y, nx,ny, 0.02);

      w.x=nx; w.y=ny;
    }
  }

  function addWearAtWorld(wx,wy, amount){
    const tx=Math.floor(wx/TILE), ty=Math.floor(wy/TILE);
    if (!inBounds(tx,ty)) return;
    const id=idx(tx,ty);
    // Wasser bitte nicht „abnutzen“
    if (S.ground[id]===3) return;
    S.pathWear[id] = Math.min(S.pathWear[id] + amount, 999);
  }
  function addWearAlongSegment(x0,y0,x1,y1, amount){
    // Bresenham über Tile‑Zellen
    let tx0=Math.floor(x0/TILE), ty0=Math.floor(y0/TILE);
    const tx1=Math.floor(x1/TILE), ty1=Math.floor(y1/TILE);
    let dx=Math.abs(tx1-tx0), sx=tx0<tx1?1:-1;
    let dy=-Math.abs(ty1-ty0), sy=ty0<ty1?1:-1;
    let err=dx+dy;
    while(true){
      if (inBounds(tx0,ty0)){
        const id=idx(tx0,ty0);
        if (S.ground[id]!==3) S.pathWear[id]=Math.min(S.pathWear[id]+amount,999);
      }
      if (tx0===tx1 && ty0===ty1) break;
      const e2=2*err;
      if (e2>=dy){ err+=dy; tx0+=sx; }
      if (e2<=dx){ err+=dx; ty0+=sy; }
    }
  }

  // ===== Rendern =====
  function resizeCanvas(){
    const r=S.canvas.getBoundingClientRect();
    const w=Math.max(1,Math.floor(r.width*(S.DPR)));
    const h=Math.max(1,Math.floor(r.height*(S.DPR)));
    if (S.canvas.width!==w || S.canvas.height!==h){ S.canvas.width=w; S.canvas.height=h; S.width=w; S.height=h; }
  }

  function draw(){
    const ctx=S.ctx; ctx.save();
    ctx.clearRect(0,0,S.width,S.height);

    const cssW=S.width/S.DPR, cssH=S.height/S.DPR;
    const minX = Math.floor((S.camX - cssW/(2*S.zoom))/TILE)-2;
    const maxX = Math.ceil ((S.camX + cssW/(2*S.zoom))/TILE)+2;
    const minY = Math.floor((S.camY - cssH/(2*S.zoom))/TILE)-2;
    const maxY = Math.ceil ((S.camY + cssH/(2*S.zoom))/TILE)+2;

    // Boden
    for (let ty=minY; ty<=maxY; ty++){
      if (ty<0||ty>=WORLD_H) continue;
      for (let tx=minX; tx<=maxX; tx++){
        if (tx<0||tx>=WORLD_W) continue;
        const gid=S.ground[idx(tx,ty)] ?? 0;
        const img=S.tex[ groundKeys[gid] ];
        const wx=tx*TILE, wy=ty*TILE;
        const p=toScreen(wx,wy); const dw=TILE*S.zoom*S.DPR;

        if (img){ ctx.drawImage(img, p.x*S.DPR, p.y*S.DPR, dw, dw); }
        else{
          ctx.fillStyle = gid===3 ? '#29507a' : gid===2 ? '#204a2a' : gid===1 ? '#5c4a2e' : '#2a5a34';
          ctx.fillRect(p.x*S.DPR, p.y*S.DPR, dw, dw);
        }
      }
    }

    // Trampelpfad‑Overlay
    for (let ty=minY; ty<=maxY; ty++){
      if (ty<0||ty>=WORLD_H) continue;
      for (let tx=minX; tx<=maxX; tx++){
        if (tx<0||tx>=WORLD_W) continue;
        const w = S.pathWear[idx(tx,ty)];
        if (w<=0.001) continue;

        const wx=tx*TILE, wy=ty*TILE;
        const p=toScreen(wx,wy); const dw=TILE*S.zoom*S.DPR;
        // Level bestimmen
        let level=0;
        if (w>2.0) level=3; else if (w>0.8) level=2; else if (w>0.2) level=1;
        // Textur oder Fallback
        let tex=null;
        if (level===1) tex=S.tex.topdown_path1;
        else if (level===2) tex=S.tex.topdown_path2;
        else if (level===3) tex=S.tex.topdown_path3;

        if (tex){
          S.ctx.drawImage(tex, p.x*S.DPR, p.y*S.DPR, dw, dw);
        } else {
          // Fallback: weiches „Dreck‑Oval“
          ctx.save();
          ctx.translate((p.x+TILE*0.5*S.zoom)*S.DPR, (p.y+TILE*0.5*S.zoom)*S.DPR);
          const r=TILE*0.42*S.zoom*S.DPR;
          const col = level===3? COLORS.wear3 : level===2? COLORS.wear2 : COLORS.wear1;
          ctx.fillStyle=col;
          ctx.beginPath(); ctx.ellipse(0,0, r*1.0, r*0.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      }
    }

    // Gebäude
    for (const b of S.buildings){
      const p=toScreen(b.x,b.y); const dw=TILE*S.zoom*S.DPR;
      if (b.img){ ctx.drawImage(b.img, (p.x*S.DPR)-dw/2, (p.y*S.DPR)-dw/2, dw, dw); }
      else{
        ctx.fillStyle = b.type==='hq'?COLORS.b_hq: b.type==='woodcutter'?COLORS.b_wc: COLORS.b_dp;
        ctx.fillRect((p.x*S.DPR)-dw/2,(p.y*S.DPR)-dw/2, dw, dw);
        ctx.fillStyle=COLORS.txt; ctx.font=`${Math.round(12*S.DPR*S.zoom)}px system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(b.type==='hq'?'HQ': b.type==='woodcutter'?'Holz':'Depot', p.x*S.DPR, p.y*S.DPR);
      }
    }

    // Arbeiter (kleine Punkte)
    for (const w of S.workers){
      const p=toScreen(w.x,w.y);
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.arc(p.x*S.DPR, p.y*S.DPR, Math.max(2, 4*S.zoom)*S.DPR, 0, Math.PI*2);
      ctx.fill();
    }

    // Debug
    if (S.debug){
      const cssW=S.width/S.DPR, cssH=S.height/S.DPR;
      setDBG(`V15.3 DPR ${S.DPR.toFixed(2)} view ${Math.round(cssW)}×${Math.round(cssH)}
cam (${S.camX.toFixed(1)},${S.camY.toFixed(1)}) z=${S.zoom.toFixed(2)} tool=${S.pointerTool}
buildings=${S.buildings.length} workers=${S.workers.length}`);
    }

    ctx.restore();
    requestAnimationFrame(frame);
  }

  // Haupt‑Frame: Physics + Draw
  let prevTs=0;
  function frame(ts){
    const dt = Math.min(0.05, (ts - prevTs)/1000 || 0);
    prevTs=ts;
    stepWorkers(dt);
    draw();
  }

  // ===== Input =====
  function addInput(){
    const el=S.canvas;
    el.addEventListener('pointerdown', onPointerDown, {passive:false});
    el.addEventListener('pointermove', onPointerMove, {passive:false});
    el.addEventListener('pointerup', onPointerUp, {passive:false});
    el.addEventListener('pointercancel', onPointerUp, {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});

    window.addEventListener('resize', ()=>resizeCanvas());
    window.addEventListener('orientationchange', ()=>setTimeout(resizeCanvas,250));
    document.addEventListener('fullscreenchange', resizeCanvas);
    document.addEventListener('webkitfullscreenchange', resizeCanvas);
  }
  function onWheel(e){
    e.preventDefault();
    const before=toWorld(e.clientX,e.clientY);
    const old=S.zoom;
    S.zoom = clamp(S.zoom + (-Math.sign(e.deltaY)*0.1), S.minZoom, S.maxZoom);
    if (S.zoom!==old){
      const after=toWorld(e.clientX,e.clientY);
      S.camX+=(before.x-after.x); S.camY+=(before.y-after.y);
      writeZoom();
    }
  }
  function isPrimary(e){ return (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==='touch'); }

  function onPointerDown(e){
    if (!isPrimary(e)) return;
    try{ S.canvas.setPointerCapture(e.pointerId); }catch{}
    S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (S.pointers.size>=2) return; // Pinch handled in move

    const {x,y}=toWorld(e.clientX,e.clientY);
    let acted=false;
    if (S.pointerTool==='pointer'){
      S.isPanning=true; S.panStartX=e.clientX; S.panStartY=e.clientY; S.camStartX=S.camX; S.camStartY=S.camY;
    } else if (S.pointerTool==='hq'){ acted = !!addBuilding('hq', snap(x), snap(y));
    } else if (S.pointerTool==='woodcutter'){ acted = !!addBuilding('woodcutter', snap(x), snap(y));
    } else if (S.pointerTool==='depot'){ acted = !!addBuilding('depot', snap(x), snap(y));
    } else if (S.pointerTool==='erase'){ acted = removeBuildingAt(x,y); }

    if (acted && S.pointerTool!=='pointer' && S.pointerTool!=='erase'){
      setTool('pointer');
    }
  }

  function onPointerMove(e){
    if (!S.pointers.has(e.pointerId)) return;
    S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (S.pointers.size>=2){
      const pts=Array.from(S.pointers.values()); const a=pts[0], b=pts[1];
      const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2; const d=Math.hypot(b.x-a.x,b.y-a.y);
      if (!S._pinchPrev){ S._pinchPrev={d,cx,cy}; return; }
      const dd=d - S._pinchPrev.d;
      if (Math.abs(dd)>0){
        const before=toWorld(cx,cy);
        const old=S.zoom; S.zoom=clamp(S.zoom+(dd/300), S.minZoom, S.maxZoom);
        if (S.zoom!==old){ const after=toWorld(cx,cy); S.camX+=(before.x-after.x); S.camY+=(before.y-after.y); writeZoom(); }
      }
      S._pinchPrev={d,cx,cy}; return;
    }
    if (S.isPanning && S.pointerTool==='pointer'){
      e.preventDefault();
      const dx=(e.clientX-S.panStartX)/S.zoom, dy=(e.clientY-S.panStartY)/S.zoom;
      S.camX = S.camStartX - dx*S.panSpeed; S.camY = S.camStartY - dy*S.panSpeed;
    }
  }
  function onPointerUp(e){
    try{ S.canvas.releasePointerCapture(e.pointerId); }catch{}
    S.pointers.delete(e.pointerId);
    if (S.pointers.size<2) S._pinchPrev=null;
    S.isPanning=false;
  }

  // ===== API =====
  function setTool(name){
    S.pointerTool=name;
    setHUD('Tool', name==='hq'?'HQ': name==='woodcutter'?'Holzfäller': name==='depot'?'Depot': name==='erase'?'Abriss':'Zeiger');
  }
  function center(){
    const hq = findAnyHQ();
    if (hq){ S.camX=hq.x; S.camY=hq.y; }
    else { S.camX = WORLD_W*TILE/2; S.camY = WORLD_H*TILE/2; }
  }
  function toggleDebug(){ S.debug=!S.debug; if (!S.debug) S.onDebug?.(''); else setDBG(S.dbgTxt); }

  async function startGame(opts){
    if (S.running) return;
    if (opts?.onHUD) S.onHUD=opts.onHUD;
    if (opts?.onDebug) S.onDebug=opts.onDebug;
    S.canvas=opts.canvas; S.ctx=S.canvas.getContext('2d');
    S.DPR=Math.max(1,Math.min(3,window.devicePixelRatio||1));
    addInput(); resizeCanvas(); writeZoom();
    await loadTextures();
    genWorld();
    S.running=true;
    requestAnimationFrame(frame);
  }

  return { startGame, setTool, center, toggleDebug, get state(){ return S; } };
})();
