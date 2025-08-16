// Siedler‑Mini V15.2
// - 64x64-Tiles, Boden-Texturen, Straßen-Autotiles, Gebäude-Icons (Top-Down)
// - Fallback-Zeichenstil, wenn PNG fehlt
// Assets erwartet in assets/tex/  (Dateien optional)

export const game = (() => {
  // ======= Konstante =======
  const TILE = 64;
  const WORLD_W = 96, WORLD_H = 96; // einfache große Map
  const COLORS = {
    grid: "#183048",
    roadLine: "#78d9a8",
    hq:"#43aa62", woodcutter:"#3f8cff", depot:"#d55384",
    txt:"#cfe3ff"
  };

  // ======= State =======
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
    ground: [],          // int map: 0=grass,1=dirt,2=forest,3=water
    roads : new Set(),   // "x,y" Knoten
    buildings: [],       // {type,x,y,w,h,img?}
    // Texturen
    tex: {},
  };

  const groundKeys = ['topdown_grass','topdown_dirt','topdown_forest','topdown_water'];
  const roadKeys   = ['topdown_road_straight','topdown_road_corner','topdown_road_t','topdown_road_cross'];
  const bldKeys    = ['topdown_hq','topdown_woodcutter','topdown_depot','hq_wood']; // hq_wood als alternativer Name

  // ======= Utils =======
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const snap =(v)=>Math.round(v/TILE)*TILE;
  const key  =(x,y)=>`${x},${y}`;

  function toWorld(cssX, cssY){
    const cssW = S.width / S.DPR, cssH = S.height / S.DPR;
    return {
      x: (cssX - cssW/2)/S.zoom + S.camX,
      y: (cssY - cssH/2)/S.zoom + S.camY
    };
  }
  function toScreen(wx,wy){
    const cssW = S.width / S.DPR, cssH = S.height / S.DPR;
    return {
      x: (wx - S.camX)*S.zoom + cssW/2,
      y: (wy - S.camY)*S.zoom + cssH/2
    };
  }
  const setHUD=(k,v)=>S.onHUD?.(k,v);
  const setDBG=(s)=>{ S.dbgTxt=s; if (S.debug) S.onDebug?.(s); };
  const writeZoom=()=>setHUD('Zoom', `${S.zoom.toFixed(2)}x`);

  // ======= Texturen laden (optional) =======
  function loadImage(src){
    return new Promise((resolve)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>resolve(null); img.src=src; });
  }
  async function loadTextures(){
    // Boden
    for (const k of groundKeys){
      S.tex[k] = await loadImage(`./assets/tex/${k}.png`);
    }
    // Straßen
    for (const k of roadKeys){
      S.tex[k] = await loadImage(`./assets/tex/${k}.png`);
    }
    // Gebäude (mehrere mögliche Namen für HQ)
    S.tex['topdown_hq'] = await loadImage(`./assets/tex/topdown_hq.png`) || await loadImage(`./assets/tex/hq_wood.png`);
    S.tex['topdown_woodcutter'] = await loadImage(`./assets/tex/topdown_woodcutter.png`);
    S.tex['topdown_depot'] = await loadImage(`./assets/tex/topdown_depot.png`);
  }

  // ======= Welt erzeugen =======
  function genWorld(){
    S.ground = new Array(WORLD_W*WORLD_H).fill(0);
    // einfache Perlin-ähnliche Mischung (ohne Lib): Ringe & Flecken
    for (let y=0;y<WORLD_H;y++){
      for (let x=0;x<WORLD_W;x++){
        let v = 0;
        v += 0.6*Math.sin(x*0.08)+0.6*Math.cos(y*0.07);
        v += 0.4*Math.sin(x*0.03+y*0.05);
        const d = Math.hypot(x-WORLD_W*0.5, y-WORLD_H*0.5);
        v -= d*0.02;
        let t=0;
        if (v>1.0) t=2;          // forest
        else if (v>0.2) t=0;     // grass
        else if (v>-0.4) t=1;    // dirt
        else t=3;                // water
        S.ground[y*WORLD_W+x]=t;
      }
    }

    // Start-HQ zentriert (Welt‑Mitte)
    const cx = Math.floor(WORLD_W/2), cy = Math.floor(WORLD_H/2);
    addBuilding('hq', cx*TILE, cy*TILE);
    center();
  }

  function addBuilding(type, wx, wy){
    const img =
      type==='hq' ? (S.tex['topdown_hq']||null) :
      type==='woodcutter' ? (S.tex['topdown_woodcutter']||null) :
      type==='depot' ? (S.tex['topdown_depot']||null) : null;
    S.buildings.push({type, x:snap(wx), y:snap(wy), w:TILE, h:TILE, img});
  }

  // ======= Zeichnen =======
  function draw(){
    const ctx=S.ctx; ctx.save();
    ctx.clearRect(0,0,S.width,S.height);

    // Sichtfenster → Tile‑Bounds
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
        const gid = S.ground[ty*WORLD_W+tx] ?? 0;
        const img = S.tex[ groundKeys[gid] ];
        const wx = tx*TILE, wy=ty*TILE;
        const p = toScreen(wx,wy);
        const dw=TILE*S.zoom*S.DPR, dh=dw;
        if (img){
          ctx.drawImage(img, p.x*S.DPR, p.y*S.DPR, dw, dh);
        }else{
          // Fallback
          ctx.fillStyle = gid===3 ? '#29507a' : gid===2 ? '#204a2a' : gid===1 ? '#5c4a2e' : '#2a5a34';
          ctx.fillRect(p.x*S.DPR, p.y*S.DPR, dw, dh);
        }
      }
    }

    // Straßen (Autotile je Knoten)
    drawRoads(ctx, minX, minY, maxX, maxY);

    // Gebäude
    for (const b of S.buildings){
      const p = toScreen(b.x, b.y);
      const dw=TILE*S.zoom*S.DPR, dh=dw;
      if (b.img){
        ctx.drawImage(b.img, (p.x*S.DPR)-dw/2, (p.y*S.DPR)-dh/2, dw, dh);
      }else{
        ctx.fillStyle = b.type==='hq'?COLORS.hq: b.type==='woodcutter'?COLORS.woodcutter: COLORS.depot;
        ctx.fillRect((p.x*S.DPR)-dw/2,(p.y*S.DPR)-dh/2, dw, dh);
        ctx.fillStyle = COLORS.txt; ctx.font=`${Math.round(12*S.DPR*S.zoom)}px system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(b.type==='hq'?'HQ':b.type==='woodcutter'?'Holz':'Depot', p.x*S.DPR, p.y*S.DPR);
      }
    }

    // Debug
    if (S.debug){
      setDBG(`V15.2  DPR ${S.DPR.toFixed(2)}  view ${Math.round(cssW)}×${Math.round(cssH)}
cam (${S.camX.toFixed(1)},${S.camY.toFixed(1)}) z=${S.zoom.toFixed(2)} tool=${S.pointerTool}
roads=${S.roads.size} buildings=${S.buildings.length}`);
    }

    ctx.restore();
    requestAnimationFrame(draw);
  }

  function drawRoads(ctx, minX, minY, maxX, maxY){
    // Jeder Straßen-Knoten liegt auf Tilemittelpunkt (x*TILE+TILE/2)
    // Für Autotile prüfen wir 4 Nachbarn (N,E,S,W)
    for (let ty=minY; ty<=maxY; ty++){
      if (ty<0||ty>=WORLD_H) continue;
      for (let tx=minX; tx<=maxX; tx++){
        const k = key(tx,ty);
        if (!S.roads.has(k)) continue;
        const n = S.roads.has(key(tx,ty-1));
        const e = S.roads.has(key(tx+1,ty));
        const s = S.roads.has(key(tx,ty+1));
        const w = S.roads.has(key(tx-1,ty));

        const wx = tx*TILE + TILE/2, wy = ty*TILE + TILE/2;
        const p = toScreen(wx - TILE/2, wy - TILE/2);
        const dw=TILE*S.zoom*S.DPR, dh=dw;

        let sprite=null, rot=0;

        const imgStraight = S.tex['topdown_road_straight'];
        const imgCorner   = S.tex['topdown_road_corner'];
        const imgT        = S.tex['topdown_road_t'];
        const imgCross    = S.tex['topdown_road_cross'];

        const cnt = (n?1:0)+(e?1:0)+(s?1:0)+(w?1:0);

        if (cnt>=3 && imgT){
          sprite=imgT;
          // Ausrichtung: offener Arm zeigt zu fehlender Richtung
          if (!n) rot=0; else if (!e) rot=Math.PI*0.5; else if (!s) rot=Math.PI; else rot=Math.PI*1.5;
        } else if (cnt===4 && imgCross){
          sprite=imgCross; rot=0;
        } else if (cnt===2 && ((n&&s) || (e&&w)) && imgStraight){
          sprite=imgStraight; rot = (n&&s)? 0 : Math.PI*0.5;
        } else if (cnt===2 && imgCorner && (
          (n&&e)||(e&&s)||(s&&w)||(w&&n)
        )){
          sprite=imgCorner;
          if (n&&e) rot=0;
          else if (e&&s) rot=Math.PI*0.5;
          else if (s&&w) rot=Math.PI;
          else if (w&&n) rot=Math.PI*1.5;
        } else if (cnt===1 && imgStraight){
          // Endstück als Straight
          sprite=imgStraight;
          rot = n?0 : e?Math.PI*0.5 : s?0 : Math.PI*0.5;
        }

        if (sprite){
          ctx.save();
          // an Tile‑Mitte zeichnen
          const center = toScreen(wx, wy);
          ctx.translate(center.x*S.DPR, center.y*S.DPR);
          ctx.rotate(rot);
          ctx.drawImage(sprite, -dw/2, -dh/2, dw, dh);
          ctx.restore();
        } else {
          // Fallback als Linie zu jedem Nachbarn
          const c = toScreen(wx,wy);
          ctx.save();
          ctx.strokeStyle = COLORS.roadLine; ctx.lineWidth = 6*S.zoom*S.DPR; ctx.lineCap='round';
          ctx.beginPath();
          if (n){ const t=toScreen(wx, wy-TILE); ctx.moveTo(c.x*S.DPR,c.y*S.DPR); ctx.lineTo(t.x*S.DPR,t.y*S.DPR); }
          if (e){ const t=toScreen(wx+TILE, wy); ctx.moveTo(c.x*S.DPR,c.y*S.DPR); ctx.lineTo(t.x*S.DPR,t.y*S.DPR); }
          if (s){ const t=toScreen(wx, wy+TILE); ctx.moveTo(c.x*S.DPR,c.y*S.DPR); ctx.lineTo(t.x*S.DPR,t.y*S.DPR); }
          if (w){ const t=toScreen(wx-TILE, wy); ctx.moveTo(c.x*S.DPR,c.y*S.DPR); ctx.lineTo(t.x*S.DPR,t.y*S.DPR); }
          ctx.stroke(); ctx.restore();
        }
      }
    }
  }

  // ======= Straßen/Bauen/Abriss =======
  let roadStart=null;
  function tileFromWorld(wx,wy){ return {tx:Math.floor(wx/TILE), ty:Math.floor(wy/TILE)}; }

  function placeRoad(wx,wy){
    const {tx,ty}=tileFromWorld(wx,wy);
    const k=key(tx,ty);
    if (!roadStart){ roadStart={tx,ty}; S.roads.add(k); return true; }
    // Bresenham zwischen roadStart und (tx,ty)
    bresenham(roadStart.tx,roadStart.ty, tx,ty, (x,y)=>S.roads.add(key(x,y)));
    roadStart=null; return true;
  }

  function bresenham(x0,y0,x1,y1, plot){
    let dx=Math.abs(x1-x0), sx=x0<x1?1:-1;
    let dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
    let err=dx+dy;
    while(true){
      plot(x0,y0);
      if (x0===x1 && y0===y1) break;
      const e2=2*err;
      if (e2>=dy){ err+=dy; x0+=sx; }
      if (e2<=dx){ err+=dx; y0+=sy; }
    }
  }

  function placeBuilding(type, wx,wy){
    addBuilding(type, wx, wy);
    return true;
  }

  function eraseAt(wx,wy){
    // Gebäude
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i], x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ S.buildings.splice(i,1); return true; }
    }
    // Straße (Knoten)
    const {tx,ty}=tileFromWorld(wx,wy); const k=key(tx,ty);
    if (S.roads.delete(k)) return true;
    return false;
  }

  // ======= Input =======
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
  function resizeCanvas(){
    const r=S.canvas.getBoundingClientRect();
    const w=Math.max(1,Math.floor(r.width*(S.DPR)));
    const h=Math.max(1,Math.floor(r.height*(S.DPR)));
    if (S.canvas.width!==w || S.canvas.height!==h){ S.canvas.width=w; S.canvas.height=h; S.width=w; S.height=h; }
  }
  function onWheel(e){
    e.preventDefault();
    const before=toWorld(e.clientX,e.clientY);
    const old=S.zoom;
    S.zoom = clamp(S.zoom + (-Math.sign(e.deltaY)*0.1), S.minZoom, S.maxZoom);
    if (S.zoom!==old){
      const after=toWorld(e.clientX,e.clientY);
      S.camX += (before.x-after.x); S.camY += (before.y-after.y);
      writeZoom();
    }
  }
  function isPrimary(e){ return (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==='touch'); }
  function onPointerDown(e){
    if (!isPrimary(e)) return;
    try{ S.canvas.setPointerCapture(e.pointerId); }catch{}
    S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (S.pointers.size>=2) return; // Pinch

    const {x,y}=toWorld(e.clientX,e.clientY);
    let acted=false;
    if (S.pointerTool==='pointer'){
      S.isPanning=true; S.panStartX=e.clientX; S.panStartY=e.clientY; S.camStartX=S.camX; S.camStartY=S.camY;
    } else if (S.pointerTool==='road'){ acted = placeRoad(x,y);
    } else if (S.pointerTool==='hq'){ acted = placeBuilding('hq', snap(x), snap(y));
    } else if (S.pointerTool==='woodcutter'){ acted = placeBuilding('woodcutter', snap(x), snap(y));
    } else if (S.pointerTool==='depot'){ acted = placeBuilding('depot', snap(x), snap(y));
    } else if (S.pointerTool==='erase'){ acted = eraseAt(x,y); }

    if (acted && S.pointerTool!=='pointer' && S.pointerTool!=='erase'){
      setTool('pointer');
    }
  }
  function onPointerMove(e){
    if (!S.pointers.has(e.pointerId)) return;
    S.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (S.pointers.size>=2){
      // Pinch
      const pts=Array.from(S.pointers.values()); const a=pts[0], b=pts[1];
      const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2; const d=Math.hypot(b.x-a.x,b.y-a.y);
      if (!S._pinchPrev){ S._pinchPrev={d,cx,cy}; return; }
      const dd = d - S._pinchPrev.d;
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

  // ======= API =======
  function setTool(name){
    S.pointerTool=name;
    if (name!=='road') roadStart=null;
    setHUD('Tool', name==='road'?'Straße': name==='hq'?'HQ': name==='woodcutter'?'Holzfäller': name==='depot'?'Depot': name==='erase'?'Abriss':'Zeiger');
  }
  function center(){
    const hq=S.buildings.find(b=>b.type==='hq');
    if (hq){ S.camX = hq.x; S.camY = hq.y; }
    else { S.camX = WORLD_W*TILE/2; S.camY = WORLD_H*TILE/2; }
  }
  function toggleDebug(){ S.debug=!S.debug; if (!S.debug) S.onDebug?.(''); else setDBG(S.dbgTxt); }

  async function startGame(opts){
    if (S.running) return;
    if (opts?.onHUD) S.onHUD=opts.onHUD;
    if (opts?.onDebug) S.onDebug=opts.onDebug;
    S.canvas = opts.canvas; S.ctx = S.canvas.getContext('2d');
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    addInput(); resizeCanvas(); writeZoom();

    await loadTextures();
    genWorld();

    S.running=true;
    requestAnimationFrame(draw);
  }

  return { startGame, setTool, center, toggleDebug, get state(){return S;} };
})();
