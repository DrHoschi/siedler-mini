/* game.js — V15 Terrain‑Integration (Top‑Down)
   - Nutzt Assets + Terrain (64px‑Tiles)
   - Lädt automatisch mögliche Terrain‑Shapes aus assets/tex/terrain/
   - Zeichnet: Terrain -> Roads -> Buildings
   - Behält Build‑Ghost + OK/Abbrechen (vereinfachte Version)
*/

import { ASSETS } from "./assets.js";
import { Terrain, TILE_PX } from "./terrain.js";

export const game = (() => {
  // ====== State ======
  const state = {
    running:false,
    canvas:null, ctx:null, DPR:1,
    width:0, height:0,
    camX: 0, camY: 0, zoom: 1, minZoom:0.5, maxZoom:2.5,

    // Welt
    terrain: null,
    roads: [],
    buildings: [],

    // Build‑Ghost
    tool: "pointer",            // "pointer"|"road"|"hq"|"woodcutter"|"depot"|...
    ghost: null,                // {type,x,y,w,h}
    confirmMode: false,         // OK/Abbrechen sichtbar

    // Input
    panning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,

    // HUD hook
    onHUD:(k,v)=>{},
  };

  // ===== Helpers =====
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const toWorld = (sx,sy)=>({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const isPrimary = (e)=> (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==="touch");
  const snap = v => Math.round(v / TILE_PX) * TILE_PX;

  // ===== Boot/Resize =====
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    resize();
    requestAnimationFrame(tick);
  }
  function resize(){
    const rect = state.canvas.getBoundingClientRect();
    const W = Math.max(1, Math.floor(rect.width  * state.DPR));
    const H = Math.max(1, Math.floor(rect.height * state.DPR));
    if (state.canvas.width !== W || state.canvas.height !== H) {
      state.canvas.width = state.width = W;
      state.canvas.height = state.height = H;
    } else {
      state.width = W; state.height = H;
    }
  }

  // ===== Terrain / Assets laden =====
  async function loadAll(){
    await ASSETS.loadTerrainAll();            // lädt Atlas (optional) + Einzel‑Shapes
    state.terrain = new Terrain(128,128);     // Karte 128×128 Tiles
  }

  // ===== Zeichnen =====
  function draw(){
    const ctx = state.ctx;
    ctx.clearRect(0,0,state.width, state.height);

    // 1) Terrain
    if (state.terrain) {
      state.terrain.draw(ctx, state.camX, state.camY, state.zoom, state.DPR, state.width, state.height);
    }

    // 2) Roads (vorerst einfache Linien)
    ctx.save();
    ctx.lineWidth = 3 * state.zoom * state.DPR;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#7ad39f";
    for (const r of state.roads) {
      const a = toScreen(r.x1,r.y1);
      const b = toScreen(r.x2,r.y2);
      ctx.beginPath();
      ctx.moveTo(a.x*state.DPR, a.y*state.DPR);
      ctx.lineTo(b.x*state.DPR, b.y*state.DPR);
      ctx.stroke();
    }
    ctx.restore();

    // 3) Buildings (Kacheln als Platzhalter‑Rechtecke, bis deine Top‑Down‑Sprites dran sind)
    for (const b of state.buildings) {
      drawBuildingRect(b);
    }

    // 4) Ghost + OK/Cancel
    drawGhost();
  }

  function toScreen(wx,wy){
    return {
      x: (wx - state.camX) * state.zoom + state.width /(2),
      y: (wy - state.camY) * state.zoom + state.height/(2),
    };
  }

  function drawBuildingRect(b) {
    const ctx = state.ctx;
    const p = toScreen(b.x,b.y);
    const w = b.w * state.zoom * state.DPR;
    const h = b.h * state.zoom * state.DPR;
    ctx.save();
    ctx.fillStyle =
      b.type==="hq"         ? "#2aa06a" :
      b.type==="woodcutter" ? "#3f8cff" :
      b.type==="depot"      ? "#d55384" :
      b.type==="farm"       ? "#c2a74b" :
      b.type==="bakery"     ? "#d49562" :
      b.type==="mill"       ? "#cbb27b" :
      b.type==="watermill"  ? "#8bb0c9" :
      b.type==="mine"       ? "#9b9fa8" :
      b.type==="smith"      ? "#9a6d58" : "#6e7f8b";
    ctx.fillRect(
      (p.x*state.DPR) - w/2,
      (p.y*state.DPR) - h/2,
      w, h
    );
    ctx.restore();
  }

  function drawGhost(){
    if (!state.ghost) return;
    const { type, x, y, w, h, placeable } = state.ghost;
    const ctx = state.ctx;
    const p = toScreen(x,y);
    const W = w * state.zoom * state.DPR;
    const H = h * state.zoom * state.DPR;

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = placeable ? "#2a7f33" : "#8c2e2e";
    ctx.fillRect((p.x*state.DPR) - W/2, (p.y*state.DPR) - H/2, W, H);
    ctx.restore();

    // OK/Cancel Buttons neben Ghost
    const pad = 16 * state.zoom * state.DPR;
    drawUiButton(p.x*state.DPR + W/2 + pad, p.y*state.DPR, 28*state.DPR, 28*state.DPR, "ok");
    drawUiButton(p.x*state.DPR + W/2 + pad + 40*state.DPR, p.y*state.DPR, 28*state.DPR, 28*state.DPR, "cancel");
  }

  function drawUiButton(cx, cy, w, h, kind){
    const ctx = state.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.fillStyle = kind==="ok" ? "#27ae60" : "#c0392b";
    ctx.strokeStyle = "#0d1b2a";
    ctx.lineWidth = 2;
    ctx.rect(-w/2, -h/2, w, h);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = `${Math.round(14*state.DPR)}px system-ui, -apple-system, Segoe UI`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(kind==="ok" ? "✓" : "✕", 0, 1);
    ctx.restore();
  }

  // ===== Game Loop =====
  function tick(){
    if (!state.running) { draw(); return requestAnimationFrame(tick); }
    draw();
    requestAnimationFrame(tick);
  }

  // ===== Build‑/UI‑Logik =====
  function setTool(name){
    state.tool = name;
    if (state.onHUD) state.onHUD("Tool", name);
    // Ghost löschen, wenn kein Bau‑Tool
    if (name==="pointer" || name==="erase") state.ghost = null;
  }

  function beginGhost(type, wx, wy){
    state.ghost = {
      type,
      x: snap(wx), y: snap(wy),
      w: TILE_PX*2, h: TILE_PX*2,
      placeable: true
    };
    state.confirmMode = true;
  }

  function updateGhost(wx, wy){
    if (!state.ghost) return;
    state.ghost.x = snap(wx);
    state.ghost.y = snap(wy);
    // einfache Kollision: nicht außerhalb Terrain
    const gx = state.ghost.x / TILE_PX;
    const gy = state.ghost.y / TILE_PX;
    state.ghost.placeable =
      gx>=0 && gx<state.terrain.w && gy>=0 && gy<state.terrain.h;
  }

  function confirmGhost(){
    if (!state.ghost || !state.ghost.placeable) return;
    const b = { type: state.ghost.type, x: state.ghost.x, y: state.ghost.y, w: state.ghost.w, h: state.ghost.h };
    state.buildings.push(b);
    state.ghost = null;
    state.confirmMode = false;
    // setTool("pointer"); // optional: nach Platzierung zurück zum Zeiger
  }

  function cancelGhost(){
    state.ghost = null;
    state.confirmMode = false;
    // setTool("pointer"); // optional
  }

  // ===== Input =====
  function addInput(){
    const el = state.canvas;
    el.addEventListener("pointerdown", onDown, {passive:false});
    el.addEventListener("pointermove", onMove, {passive:false});
    el.addEventListener("pointerup",   onUp,   {passive:false});
    el.addEventListener("pointercancel", onUp, {passive:false});
    el.addEventListener("wheel", onWheel, {passive:false});
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", ()=>setTimeout(resize, 250));
  }

  function onWheel(e){
    e.preventDefault();
    const before = state.zoom;
    const d = -Math.sign(e.deltaY) * 0.1;
    state.zoom = clamp(state.zoom + d, state.minZoom, state.maxZoom);
    if (state.zoom !== before) state.onHUD?.("Zoom", `${state.zoom.toFixed(2)}x`);
  }

  function onDown(e){
    if (!isPrimary(e)) return;
    try { state.canvas.setPointerCapture(e.pointerId); } catch {}
    const {x,y} = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if (state.confirmMode) {
      // Klick auf OK/Cancel?
      const hit = ghostUiHit(e.clientX*state.DPR, e.clientY*state.DPR);
      if (hit==="ok")   { confirmGhost(); return; }
      if (hit==="cancel"){ cancelGhost();  return; }
      // ansonsten Ghost mitziehen
      updateGhost(x,y);
      return;
    }

    if (state.tool === "pointer") {
      state.panning = true; state.panStartX = e.clientX; state.panStartY = e.clientY;
      state.camStartX = state.camX; state.camStartY = state.camY;
      return;
    }

    // Bau‑Tools: Ghost starten
    if (["hq","woodcutter","depot","farm","bakery","smith","mine","watermill","mill"].includes(state.tool)) {
      beginGhost(state.tool, x,y);
      return;
    }

    if (state.tool === "erase") {
      tryErase(x,y);
    }
  }

  function ghostUiHit(sx, sy){
    // selbe Position wie drawUiButton berechnen
    if (!state.ghost) return null;
    const {x,y,w,h} = state.ghost;
    const p = toScreen(x,y);
    const DPR = state.DPR;
    const W = w * state.zoom * DPR, H = h * state.zoom * DPR;
    const pad = 16 * state.zoom * DPR;

    const ok = { cx: p.x*DPR + W/2 + pad, cy: p.y*DPR, w:28*DPR, h:28*DPR };
    const ca = { cx: ok.cx + 40*DPR,      cy: ok.cy,  w:28*DPR, h:28*DPR };

    if (hitRect(sx, sy, ok)) return "ok";
    if (hitRect(sx, sy, ca)) return "cancel";
    return null;
  }
  function hitRect(sx, sy, r){ return (sx >= r.cx - r.w/2 && sx <= r.cx + r.w/2 && sy >= r.cy - r.h/2 && sy <= r.cy + r.h/2); }

  function onMove(e){
    if (state.confirmMode && state.ghost) {
      const {x,y} = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);
      updateGhost(x,y);
      e.preventDefault();
      return;
    }
    if (state.panning && state.tool==="pointer"){
      e.preventDefault();
      const dx = (e.clientX - state.panStartX) / state.zoom;
      const dy = (e.clientY - state.panStartY) / state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    }
  }
  function onUp(e){
    state.panning = false;
    try { state.canvas.releasePointerCapture(e.pointerId); } catch {}
  }

  // ===== Erase simple =====
  function tryErase(wx, wy){
    // Buildings
    for (let i=state.buildings.length-1; i>=0; i--){
      const b = state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){
        state.buildings.splice(i,1);
        return true;
      }
    }
    // Roads
    for (let i=state.roads.length-1; i>=0; i--){
      const r = state.roads[i];
      const d = pointToSegmentDist(wx,wy, r.x1,r.y1, r.x2,r.y2);
      if (d <= 8/state.zoom){ state.roads.splice(i,1); return true; }
    }
    return false;
  }
  function pointToSegmentDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot = A*C + B*D;
    const len2 = C*C + D*D;
    let t = len2 ? (dot/len2) : -1;
    t = Math.max(0, Math.min(1,t));
    const x = x1 + t*C, y = y1 + t*D;
    const dx = px-x, dy = py-y;
    return Math.hypot(dx,dy);
  }

  // ===== API =====
  async function start({canvas, onHUD}){
    if (state.running) return;
    state.onHUD = onHUD || state.onHUD;
    attachCanvas(canvas);
    await loadAll();

    // Startkamera: auf Kartenmitte
    state.camX = (state.terrain.w * TILE_PX) / 2;
    state.camY = (state.terrain.h * TILE_PX) / 2;
    state.zoom = 1.0;
    state.onHUD?.("Zoom", `${state.zoom.toFixed(2)}x`);

    addInput();
    state.running = true;
  }

  function center(){
    if (!state.terrain) return;
    state.camX = (state.terrain.w * TILE_PX) / 2;
    state.camY = (state.terrain.h * TILE_PX) / 2;
  }

  return {
    start,
    setTool,
    center,
    confirmGhost,
    cancelGhost,
  };
})();
