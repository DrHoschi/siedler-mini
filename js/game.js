// game.js – Kernlogik: Kamera, Eingabe, Geister‑Platzierung, Bestätigen/Abbrechen
export const game = (()=>{
  const TILE = 64;                 // konsistent mit deinen 64x64‑Texturen
  const GRID = "#1a2a3e";

  const S = {
    canvas:null, ctx:null, DPR:1, w:0, h:0,
    camX:0, camY:0, zoom:1, minZ:0.6, maxZ:2.5,
    running:true,
    // world
    buildings:[],   // {type,x,y,w,h,tex}
    textures:new Map(), // url -> {img, w,h}
    buildTexByType:{}, tileTex:{},
    // placement
    tool:"pointer",                 // pointer | erase | build
    buildType:null,                 // z.B. "hq_wood"
    ghost:{ active:false, wx:0, wy:0, ok:false },
    confirmPending:false,
    // callbacks
    onHUD:()=>{}, onDebug:()=>{}, onGhostMove:()=>{}, onGhostHide:()=>{}, onNeedConfirm:()=>{}, onHideConfirm:()=>{},
  };

  const snap = v => Math.round(v / TILE) * TILE;

  // ===== Boot =====
  function start(opts){
    S.canvas = opts.canvas;
    S.ctx = S.canvas.getContext("2d");
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    S.buildTexByType = opts.buildTextures||{};
    S.tileTex = opts.tileTextures||{};
    S.onHUD   = opts.onHUD || S.onHUD;
    S.onDebug = opts.onDebug|| S.onDebug;
    S.onGhostMove   = opts.onGhostMove || S.onGhostMove;
    S.onGhostHide   = opts.onGhostHide || S.onGhostHide;
    S.onNeedConfirm = opts.onNeedConfirm|| S.onNeedConfirm;
    S.onHideConfirm = opts.onHideConfirm || S.onHideConfirm;

    resize();
    loadInitialTextures().then(()=>loop());
    addInput();
    S.onHUD("Tool","Zeiger");
    S.onHUD("Zoom",S.zoom.toFixed(2)+"x");
  }

  async function loadInitialTextures(){
    const urls = new Set();
    Object.values(S.buildTexByType).forEach(u=>urls.add(u));
    Object.values(S.tileTex).forEach(u=>urls.add(u));
    await Promise.all([...urls].map(loadTexture));
  }

  function loadTexture(url){
    if (S.textures.has(url)) return Promise.resolve(S.textures.get(url));
    return new Promise((res,rej)=>{
      const img = new Image(); img.decoding="async";
      img.onload = ()=>{ S.textures.set(url,{img,w:img.naturalWidth,h:img.naturalHeight}); res(img); };
      img.onerror= ()=>{ console.warn("IMG FAIL:",url); res(null); };
      img.src = url;
    });
  }

  // ===== Input & Camera =====
  function addInput(){
    const el=S.canvas;
    el.addEventListener("pointerdown",onPD,{passive:false});
    el.addEventListener("pointermove",onPM,{passive:false});
    el.addEventListener("pointerup",  onPU,{passive:false});
    el.addEventListener("wheel", onWheel,{passive:false});
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    document.addEventListener("webkitfullscreenchange", resize);
  }

  function toWorld(sx,sy){
    const x = (sx*S.DPR - S.w/2)/S.zoom + S.camX;
    const y = (sy*S.DPR - S.h/2)/S.zoom + S.camY;
    return {x,y};
  }
  function toScreen(wx,wy){
    const x = (wx - S.camX)*S.zoom + S.w/2;
    const y = (wy - S.camY)*S.zoom + S.h/2;
    return {x,y};
  }

  let panning=false, psx=0, psy=0, pcx=0, pcy=0;
  function onPD(e){
    if (S.confirmPending){ // solange Confirm sichtbar, keine neuen Aktionen
      e.preventDefault(); return;
    }
    S.canvas.setPointerCapture?.(e.pointerId);
    psx=e.clientX; psy=e.clientY; pcx=S.camX; pcy=S.camY;

    if (S.tool==="pointer"){
      panning=true;
    }else if (S.tool==="erase"){
      const {x,y}=toWorld(e.clientX,e.clientY);
      tryErase(x,y);
    }else if (S.tool==="build" && S.buildType){
      // erste Tap setzt Ghost auf Raster; Confirm erscheint
      const {x,y}=toWorld(e.clientX,e.clientY);
      placeGhost(x,y);
      S.confirmPending=true;
      const sc=toScreen(S.ghost.wx,S.ghost.wy);
      S.onNeedConfirm(sc.x,sc.y);
    }
  }
  function onPM(e){
    if (panning){
      e.preventDefault();
      const dx=(e.clientX-psx)/S.zoom, dy=(e.clientY-psy)/S.zoom;
      S.camX = pcx - dx; S.camY = pcy - dy;
    }else if (S.tool==="build" && S.ghost.active && !S.confirmPending){
      const {x,y}=toWorld(e.clientX,e.clientY);
      placeGhost(x,y);
    }
  }
  function onPU(e){
    panning=false;
    try{S.canvas.releasePointerCapture?.(e.pointerId);}catch{}
  }
  function onWheel(e){
    e.preventDefault();
    const d = -Math.sign(e.deltaY)*0.1;
    const last=S.zoom;
    S.zoom = clamp(S.zoom+d,S.minZ,S.maxZ);
    if (S.zoom!==last) S.onHUD("Zoom",S.zoom.toFixed(2)+"x");
  }
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

  function resize(){
    const r=S.canvas.getBoundingClientRect();
    S.w=Math.max(1,Math.floor(r.width*S.DPR));
    S.h=Math.max(1,Math.floor(r.height*S.DPR));
    if (S.canvas.width!==S.w) S.canvas.width=S.w;
    if (S.canvas.height!==S.h) S.canvas.height=S.h;
  }

  // ===== Build API =====
  function setTool(t){
    S.tool=t;
    if (t!=="build"){ cancelBuild(); }
    S.onHUD("Tool", t==="pointer"?"Zeiger": t==="erase"?"Abriss":"Bauen");
  }
  function chooseBuilding(type){
    S.buildType = type;
    setTool("build");
    // sofort Ghost aktivieren, aber noch ohne Confirm
    S.ghost.active=true; S.confirmPending=false;
  }
  function cancelBuild(){
    S.ghost.active=false; S.confirmPending=false;
    S.buildType=null;
    S.onGhostHide(); S.onHideConfirm();
  }
  function confirmBuild(){
    if (!S.confirmPending || !S.ghost.ok || !S.buildType) return;
    const texURL = S.buildTexByType[S.buildType];
    S.buildings.push({type:S.buildType, x:S.ghost.wx, y:S.ghost.wy, w:TILE, h:TILE, tex:texURL});
    S.onHideConfirm();
    // Ghost bleibt aktiv, um mehrere gleichartige Bauten zu erlauben:
    S.confirmPending=false;
  }

  function placeGhost(wx,wy){
    const gx = snap(wx), gy = snap(wy);
    const ok = canPlaceAt(gx,gy,TILE,TILE);
    S.ghost.active=true; S.ghost.wx=gx; S.ghost.wy=gy; S.ghost.ok=ok;
    const sc=toScreen(gx,gy);
    S.onGhostMove(sc.x,sc.y,ok);
  }

  function canPlaceAt(x,y,w,h){
    // einfache Kollisionsprüfung: nicht über andere Gebäude
    for (const b of S.buildings){
      if (intersectAABB(x-w/2,y-h/2,w,h, b.x-b.w/2,b.y-b.h/2,b.w,b.h)) return false;
    }
    // später: Terrain prüfen (z.B. Wasser verbieten)
    return true;
  }
  function intersectAABB(ax,ay,aw,ah, bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  function tryErase(wx,wy){
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i];
      const x0=b.x-b.w/2, y0=b.y-b.h/2;
      if (wx>=x0 && wx<=x0+b.w && wy>=y0 && wy<=y0+b.h){
        S.buildings.splice(i,1); return true;
      }
    }
    return false;
  }

  function center(){ S.camX=0; S.camY=0; }

  // ===== Render =====
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth=1; ctx.strokeStyle=GRID;
    const step=TILE*S.zoom*S.DPR;
    const ox=(S.w/2 - (S.camX*S.zoom)*S.DPR) % step;
    const oy=(S.h/2 - (S.camY*S.zoom)*S.DPR) % step;
    ctx.beginPath();
    for(let x=ox; x<=S.w; x+=step){ctx.moveTo(x,0);ctx.lineTo(x,S.h);}
    for(let y=oy; y<=S.h; y+=step){ctx.moveTo(0,y);ctx.lineTo(S.w,y);}
    ctx.stroke();
    ctx.restore();
  }

  function drawImageWorld(ctx, url, wx,wy, w=TILE,h=TILE, alpha=1){
    const t=S.textures.get(url); if(!t) return;
    const sc=toScreen(wx,wy); const sw=w*S.zoom, sh=h*S.zoom;
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.drawImage(t.img, 0,0,t.w,t.h, (sc.x*S.DPR)-sw/2*S.DPR,(sc.y*S.DPR)-sh/2*S.DPR, sw*S.DPR, sh*S.DPR);
    ctx.restore();
  }

  function render(){
    const ctx=S.ctx;
    ctx.clearRect(0,0,S.w,S.h);
    drawGrid(ctx);

    // (optional) Boden/Paths kämen hier kachelweise

    // Gebäude
    for (const b of S.buildings){
      drawImageWorld(ctx, b.tex || S.buildTexByType[b.type] || "", b.x,b.y, b.w,b.h, 1);
    }

    // Ghost obenauf
    if (S.ghost.active){
      const url = S.buildTexByType[S.buildType];
      drawImageWorld(ctx, url, S.ghost.wx,S.ghost.wy, TILE,TILE, S.ghost.ok?0.7:0.35);
    }
  }

  function loop(){
    render();
    requestAnimationFrame(loop);
  }

  return {
    start,
    center,
    setTool,
    chooseBuilding,
    cancelBuild,
    confirmBuild,
  };
})();
