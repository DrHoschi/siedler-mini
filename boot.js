// boot.js — V14.6-mobil
const version = "V14.6";
const $ = (sel, root=document) => root.querySelector(sel);

const elCanvas = $("#canvas");
const ctx = elCanvas.getContext("2d");
const hud = {
  tool: $("#hudTool"),
  zoom: $("#hudZoom"),
  holz: $("#hudHolz"),
  stein: $("#hudStein"),
  nahrung: $("#hudNahrung"),
  gold: $("#hudGold"),
  traeger: $("#hudTraeger"),
};
const startCard = $("#startCard");
const btnStart = $("#btnStart");
const btnReset = $("#btnReset");
const btnFs = $("#btnFs");
const btnFull = $("#btnFull");
const btnCenter = $("#btnCenter");

const dpi = () => (window.devicePixelRatio || 1);

let state = {
  tool: "pointer",
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 2.5,
  cx: 0, cy: 0,                 // Karte zentriert um (0,0)
  dragging: false,
  lastX: 0, lastY: 0,
  grid: true,
  started: false,
  hasGameModule: false,
  // demo-assets
  hq: { x: 0, y: 0, w: 360, h: 200 }
};

// ---------- Utilities
function setHUD(){
  hud.tool.textContent = toolName(state.tool);
  hud.zoom.textContent = state.zoom.toFixed(2) + "x";
}
function toolName(t){
  switch(t){
    case "pointer": return "Zeiger";
    case "road": return "Straße";
    case "hq": return "HQ";
    case "woodcutter": return "Holzfäller";
    case "depot": return "Depot";
    case "erase": return "Abriss";
    default: return t;
  }
}
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// ---------- Resize & DPR
function resize(){
  const DPR = dpi();
  const w = Math.floor(elCanvas.clientWidth * DPR);
  const h = Math.floor(elCanvas.clientHeight * DPR);
  if (elCanvas.width !== w || elCanvas.height !== h){
    elCanvas.width = w;
    elCanvas.height = h;
  }
  draw();
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);

// ---------- Fullscreen (robust inkl. iOS WebKit)
function isFull(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
async function toggleFullscreen(){
  const el = document.documentElement; // oder: elCanvas
  try{
    if (!isFull()){
      if (el.requestFullscreen) await el.requestFullscreen({navigationUI:"hide"});
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }else{
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
  }catch(e){ console.warn("Fullscreen error", e); }
}
btnFs.addEventListener("click", toggleFullscreen);
btnFull.addEventListener("click", toggleFullscreen);
// Doppeltipp aufs Canvas -> Vollbild
let lastTap = 0;
elCanvas.addEventListener("pointerdown", (e)=>{
  const t = Date.now();
  if (t - lastTap < 300) toggleFullscreen();
  lastTap = t;
}, {passive:true});

// ---------- Tool-Leiste
$("#tools").addEventListener("click", (e)=>{
  const b = e.target.closest("[data-tool]");
  if (!b) return;
  state.tool = b.getAttribute("data-tool");
  setHUD();
});

// ---------- Center
btnCenter.addEventListener("click", ()=>{
  state.cx = 0; state.cy = 0; state.zoom = 1;
  setHUD(); draw();
});

// ---------- Start / Reset
btnReset.addEventListener("click", ()=>{
  // nur optisch: kleines Blinken
  startCard.style.transform = "translate(-50%,-50%) scale(0.98)";
  setTimeout(()=> startCard.style.transform = "translate(-50%,-50%)", 120);
});

btnStart.addEventListener("click", async ()=>{
  startCard.style.display = "none";
  state.started = true;
  // Versuche, ein echtes Spielmodul zu laden:
  try{
    const mod = await import("./game.js?v=146m3");
    if (mod && typeof mod.startGame === "function"){
      state.hasGameModule = true;
      await mod.startGame({
        canvas: elCanvas,
        DPR: dpi(),
        onHUD: (key, val)=>{
          if (hud[key]) hud[key].textContent = String(val);
        }
      });
      return;
    }else{
      alert("Startfehler: game.startGame(opts) fehlt oder ist keine Funktion.");
    }
  }catch(e){
    console.warn("Kein game.js, nutze Demo-Fallback.", e);
  }
  // Fallback-Demo aktivieren:
  draw();
});

// ---------- Pointer / Gesten
let activePointers = new Map();
elCanvas.addEventListener("pointerdown", (e)=>{
  elCanvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (state.tool === "pointer" && activePointers.size === 1){
    state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY;
  }
});
elCanvas.addEventListener("pointermove", (e)=>{
  if (!state.started) return;
  const p = activePointers.get(e.pointerId);
  if (p){ p.x = e.clientX; p.y = e.clientY; }

  if (state.tool === "pointer"){
    // Pan (1 Finger)
    if (state.dragging && activePointers.size === 1){
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX; state.lastY = e.clientY;

      state.cx += dx / state.zoom;
      state.cy += dy / state.zoom;
      draw();
    }
    // Pinch (2 Finger)
    if (activePointers.size === 2){
      const pts = [...activePointers.values()];
      const d = (a,b)=>Math.hypot(a.x-b.x, a.y-b.y);
      if (!state._pinchBase){
        state._pinchBase = {dist: d(pts[0], pts[1]), zoom: state.zoom};
      }else{
        const scale = d(pts[0], pts[1]) / (state._pinchBase.dist || 1);
        state.zoom = clamp(state._pinchBase.zoom * scale, state.minZoom, state.maxZoom);
        setHUD(); draw();
      }
    }
  }
});
elCanvas.addEventListener("pointerup", (e)=>{
  activePointers.delete(e.pointerId);
  state.dragging = false;
  if (activePointers.size < 2) state._pinchBase = null;

  // Tap-Bauen (vereinfachter Platzhalter)
  if (state.started && state.tool !== "pointer" && !state.hasGameModule){
    // hier könnte man später echte Bau-Logik ergänzen
    // fürs Demo nur kurzes Blinken:
    flashHQ();
  }
});
elCanvas.addEventListener("pointercancel", (e)=>{
  activePointers.delete(e.pointerId);
  state.dragging = false;
  state._pinchBase = null;
}, {passive:true});

// Scroll-Zoom (Maus/Trackpad)
elCanvas.addEventListener("wheel", (e)=>{
  if (!state.started){ return; }
  e.preventDefault();
  const s = Math.exp((-e.deltaY) * 0.0015);
  state.zoom = clamp(state.zoom * s, state.minZoom, state.maxZoom);
  setHUD(); draw();
}, {passive:false});

// ---------- Demo-Render (Fallback)
function draw(){
  const DPR = dpi();
  const W = elCanvas.width, H = elCanvas.height;

  // Hintergrund
  ctx.save();
  ctx.clearRect(0,0,W,H);
  ctx.scale(DPR, DPR); // nur für Logos etc., aber W/H sind schon in DPR
  ctx.restore();

  // Welt -> Bildschirm
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(state.cx, state.cy);

  // Raster
  drawGrid();

  // HQ placeholder
  ctx.save();
  ctx.translate(-state.hq.w/2, -state.hq.h/2);
  ctx.fillStyle = "#2fa24a";
  ctx.fillRect(0,0,state.hq.w, state.hq.h);
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = "48px system-ui, -apple-system, Segoe UI";
  ctx.textBaseline = "top";
  ctx.fillText("HQ (Platzhalter)", -40, -70);
  ctx.restore();

  ctx.restore();

  // Version
  ctx.save();
  ctx.fillStyle = "rgba(207,227,255,0.6)";
  ctx.font = "12px system-ui,-apple-system";
  ctx.textAlign = "right";
  ctx.fillText("JS "+version, elCanvas.width-10, elCanvas.height-10);
  ctx.restore();

  setHUD();
}
function drawGrid(){
  const W = elCanvas.width, H = elCanvas.height;
  const step = 120; // Welt-Einheiten
  ctx.save();
  ctx.strokeStyle = "#2b3b53";
  ctx.lineWidth = 1 / state.zoom;
  for (let x=-2000; x<=2000; x+=step){
    ctx.beginPath();
    ctx.moveTo(x, -2000);
    ctx.lineTo(x,  2000);
    ctx.stroke();
  }
  for (let y=-2000; y<=2000; y+=step){
    ctx.beginPath();
    ctx.moveTo(-2000, y);
    ctx.lineTo( 2000, y);
    ctx.stroke();
  }
  ctx.restore();
}
function flashHQ(){
  const old = ctx.globalAlpha;
  let t = 0;
  const tick = ()=>{
    t += 0.08;
    if (t>1){ ctx.globalAlpha = old; draw(); return; }
    draw();
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.25*Math.sin(t*6.28);
    ctx.translate(elCanvas.width/2, elCanvas.height/2);
    ctx.scale(state.zoom, state.zoom);
    ctx.translate(state.cx, state.cy);
    ctx.translate(-state.hq.w/2, -state.hq.h/2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-6, -6, state.hq.w+12, state.hq.h+12);
    ctx.restore();
    requestAnimationFrame(tick);
  };
  tick();
}

// ---------- Boot
resize();
setHUD();
draw();

// Debug-Button (ein/aus)
let debugOn = false;
$("#btnDebug").addEventListener("click", ()=>{
  debugOn = !debugOn;
  alert(debugOn ? "Debug an (Platzhalter)" : "Debug aus");
});
