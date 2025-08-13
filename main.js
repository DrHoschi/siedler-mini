// main.js  —  V13.8.3 (Mobile, Error-Popups & Debug)
import { loadAllAssets, IM }   from './core/assets.js';
import { createCamera }        from './core/camera.js';
import { attachInput }         from './core/input.js';
import { createRenderer }      from './render.js';    // <- exakt "render.js"
import { createWorld }         from './world.js';

const state = {
  canvas: null,
  ctx: null,
  renderer: null,
  cam: null,
  world: null,
  hudCb: ()=>{},
  tool: 'pointer',
  running: false,
  last: 0,
  ui: { toast: null, info: null }
};

// ---------- UI helpers ----------
function ensureUI() {
  if (state.ui.toast) return;

  // Error/Info Toast
  const box = document.createElement('div');
  box.id = 'toast';
  Object.assign(box.style, {
    position:'fixed', right:'8px', top:'8px', maxWidth:'min(540px, 92vw)',
    zIndex: 9999, display:'none'
  });
  document.body.appendChild(box);
  state.ui.toast = box;

  // Debug-Info (kleiner Status rechts oben unterhalb Toast)
  const info = document.createElement('div');
  Object.assign(info.style, {
    position:'fixed', right:'8px', top:'70px', zIndex: 9998,
    padding:'8px 10px', borderRadius:'10px',
    background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
    color:'#d7e1f8', font:'12px/1.35 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif',
    display:'none', whiteSpace:'pre'
  });
  document.body.appendChild(info);
  state.ui.info = info;
}

function showToast(html, kind='err', ms=5000) {
  ensureUI();
  const el = state.ui.toast;
  el.innerHTML = `
    <div style="
      background:${kind==='err' ? '#2a1114' : '#10231a'};
      border:1px solid ${kind==='err' ? '#a34b57' : '#3a8f68'};
      color:#f3f6ff; padding:10px 12px; border-radius:12px;
      box-shadow: 0 12px 30px rgba(0,0,0,.35);
      font: 14px/1.4 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
      ${html}
    </div>`;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.style.display = 'none', ms);
}
function showError(msg){ showToast(`⚠️ <b>Fehler:</b> ${msg}`, 'err', 7000); }
function showInfo(msg){  ensureUI(); state.ui.info.textContent = msg; state.ui.info.style.display='block'; }

// ---------- API für index.html ----------
export function onHud(fn){ state.hudCb = fn || (()=>{}); }
export function setTool(t){ state.tool = t; }
export function toggleFullscreen(){
  const el = document.documentElement;
  if (!document.fullscreenElement) { el.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}
export function centerOnHQ(){
  if (!state.world) return;
  const hq = state.world.getHQ();
  if (!hq) return;
  const center = state.renderer.worldToScreen(hq.x, hq.y, state.cam);
  const cx = state.canvas.width  * 0.5;
  const cy = state.canvas.height * 0.5;
  state.cam.x += (cx - center.x);
  state.cam.y += (cy - center.y);
}

export async function start(){
  if (state.running) return;
  try{
    // Canvas
    state.canvas = document.getElementById('canvas');
    state.ctx = state.canvas.getContext('2d', { alpha:true, desynchronized:true });
    resize(); addEventListener('resize', resize);

    // Assets laden (mit Fehlerliste)
    const res = await loadAllAssets();
    if (res.errors.length){
      const list = res.errors.map(e=>`• ${e.key} (${e.src})`).join('<br>');
      showError(`Einige Texturen konnten nicht geladen werden:<br>${list}<br>Es werden Platzhalter verwendet.`);
    } else {
      showToast('✅ Assets geladen', 'ok', 2000);
    }

    // Kamera
    state.cam = createCamera({ x:0, y:0, zoom:1, minZoom:0.35, maxZoom:2.2 });

    // Welt + Renderer
    try{
      state.world = createWorld({ width: 120, height: 120 });
    }catch(e){
      showError('World-Initialisierung fehlgeschlagen. Prüfe world.js');
      throw e;
    }
    try{
      state.renderer = createRenderer(state.canvas, IM);
    }catch(e){
      showError('Renderer-Initialisierung fehlgeschlagen. Prüfe render.js');
      throw e;
    }

    // Erstes HQ mittig (Stein)
    const midX = Math.floor(state.world.width/2);
    const midY = Math.floor(state.world.height/2);
    state.world.placeHQ(midX, midY, 'stone');

    // Kamera aufs HQ
    centerOnHQ();

    // Eingaben
    attachInput(state.canvas, {
      getTool: () => state.tool,
      getCam:  () => state.cam,
      onTap: (sx,sy)=>{
        if (state.tool==='pointer') return;
        const {x, y} = state.renderer.screenToWorld(sx, sy, state.cam);
        const gx = Math.round(x), gy = Math.round(y);
        if (state.tool==='road')     state.world.placeRoad(gx, gy);
        else if (state.tool==='hq')  state.world.placeHQ(gx, gy, 'wood');
        else if (state.tool==='lumber') state.world.placeLumberjack(gx, gy);
        else if (state.tool==='depot')  state.world.placeDepot(gx, gy);
        else if (state.tool==='bulldoze') state.world.removeAt(gx, gy);
      },
      canPan: ()=> state.tool==='pointer',
      onZoom: (factor, cx, cy)=>{
        const before = state.renderer.screenToWorld(cx, cy, state.cam);
        state.cam.zoom = Math.max(state.cam.minZoom, Math.min(state.cam.maxZoom, state.cam.zoom * factor));
        const after  = state.renderer.screenToWorld(cx, cy, state.cam);
        state.cam.x += ( (after.x - before.x) * state.renderer.tileW );
        state.cam.y += ( (after.y - before.y) * state.renderer.tileH );
      },
      onPan: (dx,dy)=>{ state.cam.x += dx; state.cam.y += dy; }
    });

    // Loop
    state.running = true;
    state.last = performance.now();
    requestAnimationFrame(loop);

    // kleine Debug-Info oben rechts
    setInterval(()=>{
      if (!state.renderer || !state.world) return;
      const hq = state.world.getHQ();
      const cam = state.cam;
      showInfo(
        `Zoom: ${cam.zoom.toFixed(2)}x\n`+
        `Cam: (${cam.x|0}, ${cam.y|0})\n`+
        `HQ: ${hq? `${hq.x},${hq.y}` : '—'}\n`+
        `Canvas: ${state.canvas.width}×${state.canvas.height}\n`+
        `Tiles: ${state.world.width}×${state.world.height}`
      );
    }, 1000);

  }catch(err){
    // Fallback-Fehler
    console.error(err);
    showError(`${err?.message || err}`);
  }
}

function loop(ts){
  if (!state.running) return;
  const dt = Math.min(0.05, (ts - state.last)/1000);
  state.last = ts;

  // Update
  try { state.world.update(dt); }
  catch(e){ showError('Update-Fehler in world.update()'); throw e; }

  // Render
  try {
    state.renderer.clear();
    state.renderer.drawTerrain(state.world, state.cam);
    state.renderer.drawRoads(state.world, state.cam);
    state.renderer.drawBuildings(state.world, state.cam);
    state.renderer.drawUnits(state.world, state.cam);
  } catch(e){
    showError('Zeichenfehler im Renderer. Prüfe render.js');
    throw e;
  }

  // HUD
  state.hudCb({
    wood: state.world.res.wood|0,
    stone: state.world.res.stone|0,
    food: state.world.res.food|0,
    gold: state.world.res.gold|0,
    carriers: state.world.units.length|0,
    zoom: state.cam.zoom
  });

  requestAnimationFrame(loop);
}

function resize(){
  if (!state.canvas) return;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = Math.floor(innerWidth  * dpr);
  const h = Math.floor(innerHeight * dpr);
  state.canvas.width  = w;
  state.canvas.height = h;
  state.canvas.style.width  = '100vw';
  state.canvas.style.height = '100vh';
}
