/*
  boot.js – MAX
  - Debug-Overlay (F2 + Klick auf „Debug“)
  - Query-Params: ?map=…, ?v=…, ?overlay=0
  - Lädt tools/map-runtime.js und nutzt renderView(...) aus dem Modul
  - Start/Reload-Buttons, niemals harter Abbruch
  - Neu: Kamera + Eingaben (Drag/Touch/Pinch/Wheel) und Render-Loop
*/

const log = {
  time(){ const d=new Date(); return d.toTimeString().slice(0,8); },
  pfx(){ return (k,...m)=>console.log(`[${log.time()}] %c${k}`, 'color:#a7bed0', ...m); }
};
const lBoot = log.pfx(); const lGame = log.pfx(); const lNet  = log.pfx(); const lDiag = log.pfx(); const lAtlas= log.pfx();

let overlayOn = true;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

function resize(){
  cv.width  = Math.floor(innerWidth  * devicePixelRatio);
  cv.height = Math.floor(innerHeight * devicePixelRatio);
}
resize(); addEventListener('resize', resize);

// Kamera-Status (Pixel in Weltkoordinaten, zoom=Skalierung)
const CAMERA = window.__CAMERA = { x:0, y:0, zoom:1 };

// === Overlay ===
(function overlay(){
  const url = new URL(location.href);
  if (url.searchParams.get('overlay') === '0') overlayOn = false;

  let frames=0, last=performance.now(), dt=16.7;
  function hud(now){
    frames++; dt=now-last; last=now; requestAnimationFrame(hud);
    if (!overlayOn) return;
    ctx.save(); ctx.scale(devicePixelRatio,devicePixelRatio);
    ctx.clearRect(0,0,360,90);
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(6,6,350,78);
    ctx.fillStyle='#cfe6ff'; ctx.font='12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const map=(window.__MAP_STATE||{}).loaded?'aktiv':'—';
    const assets=(window.__ASSETS_OK)?'aktiv':'—';
    const lines=[
      `Frames: ${String(frames).padStart(4)}   dt=${dt.toFixed(2)}ms`,
      `Cam: x=${CAMERA.x.toFixed(1)}   y=${CAMERA.y.toFixed(1)}   zoom=${CAMERA.zoom.toFixed(2)}`,
      `Map: ${map}   /   Assets: ${assets}`,
      `DPR=${devicePixelRatio.toFixed(2)}   Size=${innerWidth}x${innerHeight}`
    ];
    lines.forEach((t,i)=>ctx.fillText(t,12,22+i*16));
    ctx.restore();
  }
  requestAnimationFrame(hud);

  addEventListener('keydown', ev=>{
    if (ev.key==='F2'){ overlayOn=!overlayOn; lBoot('Debug‑Overlay toggled →', overlayOn?'ON':'OFF'); }
  });
  document.getElementById('btnDebug')?.addEventListener('click', ()=>{
    overlayOn=!overlayOn; lBoot('Debug‑Overlay toggled →', overlayOn?'ON':'OFF');
  });

  lBoot('Debug‑Overlay aktiv (non‑blocking). F2 toggelt Overlay.');
})();

// === Diagnose ===
(function(){
  const url=new URL(location.href);
  const bust=url.searchParams.get('v') ?? Date.now().toString();
  lDiag('page='+location.href);
  lDiag('bust=?v='+bust);
  lDiag('fetchPatched='+true);
  window.__MAP_STATE={loaded:false,url:null,error:null,bust};
})();

// === Buttons ===
document.getElementById('btnReload').addEventListener('click', ()=>{
  const url=new URL(location.href);
  const v=parseInt(url.searchParams.get('v')||'0',10);
  url.searchParams.set('v', String(isFinite(v)?(v+1):Date.now()));
  location.href=url.toString();
});
document.getElementById('btnStart').addEventListener('click', async ()=>{
  document.getElementById('startPanel').style.display='none';
  if (!window.__MAP_STATE.loaded && !window.__MAP_STATE.loading) {
    try { await loadMapNow(); } catch(e) {}
  }
});

// === Laden + Rendern ===
let mapRuntime = null;
let VIEW = null; // { fullCanvas, width, height }
let RENDER = null; // function renderView(canvas, view, camera)

async function loadMapNow(){
  window.__MAP_STATE.loading = true;

  // Map-URL bestimmen
  const DEFAULT_MAP = './assets/maps/map-pro.json';
  const url=new URL(location.href);
  let mapUrl=url.searchParams.get('map')||DEFAULT_MAP;
  if (!/[?&]v=/.test(mapUrl)) {
    const sep = mapUrl.includes('?') ? '&' : '?';
    mapUrl += `${sep}v=${encodeURIComponent(window.__MAP_STATE.bust)}`;
  }

  try{
    mapRuntime = await import('./tools/map-runtime.js');
    lBoot('map-runtime.js: OK');
  }catch(e){
    lBoot('map-runtime.js: fehlt');
    lGame('Map‑Lader übersprungen: tools/map-runtime.js fehlt.');
    window.__MAP_STATE.loading = false;
    return;
  }

  try{
    lGame('Lade Karte:', mapUrl);
    const result = await mapRuntime.loadAndPrepareMap({
      mapUrl,
      onNet:(...m)=>lNet('[net]',...m),
      onAtlas:(...m)=>lAtlas('[atlas]',...m),
    });

    VIEW   = result.view;
    RENDER = mapRuntime.renderView;

    window.__MAP_STATE.loaded = true;
    window.__MAP_STATE.url = mapUrl;
    window.__ASSETS_OK = !!VIEW;

    lGame('Karte geladen:', result.mapUrl);

    // Kamera angenehm starten (zentriert)
    CAMERA.x = Math.max(0, (VIEW.width  - innerWidth /devicePixelRatio)/2);
    CAMERA.y = Math.max(0, (VIEW.height - innerHeight/devicePixelRatio)/2);
    CAMERA.zoom = 1;

    startRenderLoop();

    lGame('Game gestartet.');
  }catch(err){
    window.__MAP_STATE.error = String(err && err.message || err);
    lGame('Karte konnte nicht geladen werden:', mapUrl);
    if (err && err.stack) console.error(err);
  }finally{
    window.__MAP_STATE.loading = false;
  }
}

// === Render-Loop ===
let animId = 0;
function startRenderLoop(){
  cancelAnimationFrame(animId);
  const draw = ()=> {
    if (VIEW && RENDER) {
      RENDER(cv, VIEW, CAMERA);
    } else {
      // Clear
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,cv.width,cv.height);
    }
    animId = requestAnimationFrame(draw);
  };
  animId = requestAnimationFrame(draw);
}

// === Eingaben (Pan/Zoom) ===
(function input(){
  let dragging = false;
  let lastX=0, lastY=0;

  // Drag (Mouse)
  cv.addEventListener('mousedown', (e)=>{
    dragging = true; lastX=e.clientX; lastY=e.clientY;
  });
  addEventListener('mouseup', ()=> dragging=false);
  addEventListener('mousemove', (e)=>{
    if (!dragging) return;
    const dx = (e.clientX - lastX) / (CAMERA.zoom);
    const dy = (e.clientY - lastY) / (CAMERA.zoom);
    CAMERA.x -= dx / devicePixelRatio;
    CAMERA.y -= dy / devicePixelRatio;
    lastX = e.clientX; lastY = e.clientY;
    clampCamera();
  });

  // Wheel-Zoom (um Mauspunkt)
  cv.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    zoomAroundPoint(e.clientX, e.clientY, zoomFactor);
  }, { passive:false });

  // Touch: 1 Finger Pan, 2 Finger Pinch
  let touchMode = 0; // 0=none, 1=pan, 2=pinch
  let tLast = [];
  cv.addEventListener('touchstart', (e)=>{
    if (e.touches.length===1){ touchMode=1; tLast=[copyTouch(e.touches[0])]; }
    else if (e.touches.length>=2){ touchMode=2; tLast=[copyTouch(e.touches[0]), copyTouch(e.touches[1])]; }
  }, { passive:true });

  cv.addEventListener('touchmove', (e)=>{
    if (touchMode===1 && e.touches.length===1){
      const t=e.touches[0];
      const dx = (t.clientX - tLast[0].clientX) / (CAMERA.zoom*devicePixelRatio);
      const dy = (t.clientY - tLast[0].clientY) / (CAMERA.zoom*devicePixelRatio);
      CAMERA.x -= dx; CAMERA.y -= dy; tLast=[copyTouch(t)];
      clampCamera();
    } else if (touchMode===2 && e.touches.length>=2){
      const a=[copyTouch(e.touches[0]), copyTouch(e.touches[1])];
      const d0 = dist(tLast[0], tLast[1]);
      const d1 = dist(a[0], a[1]);
      if (d0>0){
        const zoomFactor = d1/d0;
        const cx=(a[0].clientX+a[1].clientX)*0.5;
        const cy=(a[0].clientY+a[1].clientY)*0.5;
        zoomAroundPoint(cx, cy, zoomFactor);
      }
      tLast=a;
    }
  }, { passive:false });

  addEventListener('touchend', ()=>{ touchMode=0; tLast=[]; }, { passive:true });

  function copyTouch(t){ return { clientX:t.clientX, clientY:t.clientY }; }
  function dist(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

  function zoomAroundPoint(clientX, clientY, factor){
    const prevZoom = CAMERA.zoom;
    let nextZoom = prevZoom * factor;
    // Grenzen
    nextZoom = Math.max(0.25, Math.min(4, nextZoom));

    // Weltkoordinate unter dem Cursor vor der Zoomänderung
    const rect = cv.getBoundingClientRect();
    const vx = (clientX - rect.left) * (1/devicePixelRatio) / prevZoom + CAMERA.x;
    const vy = (clientY - rect.top ) * (1/devicePixelRatio) / prevZoom + CAMERA.y;

    // neue Kamera so setzen, dass derselbe Weltpunkt unter dem Cursor bleibt
    CAMERA.zoom = nextZoom;
    CAMERA.x = vx - (clientX - rect.left) * (1/devicePixelRatio) / nextZoom;
    CAMERA.y = vy - (clientY - rect.top ) * (1/devicePixelRatio) / nextZoom;

    clampCamera();
  }

  function clampCamera(){
    if (!VIEW){ return; }
    const vw = innerWidth  / (devicePixelRatio * CAMERA.zoom);
    const vh = innerHeight / (devicePixelRatio * CAMERA.zoom);

    const maxX = Math.max(0, VIEW.width  - vw);
    const maxY = Math.max(0, VIEW.height - vh);

    CAMERA.x = Math.max(0, Math.min(maxX, CAMERA.x));
    CAMERA.y = Math.max(0, Math.min(maxY, CAMERA.y));
  }
})();

// auto-load wie zuvor; wenn du nur via „Start“ willst, entferne die Zeile
loadMapNow().catch(()=>{});
