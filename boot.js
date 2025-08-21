/*
  Siedler‑Mini – boot.js (MAX)
  - Debug-Overlay (F2 + Klick auf „Debug“ unten rechts)
  - Query-Params: ?map=…, ?v=…, ?overlay=0
  - Sicherer Import von ./tools/map-runtime.js
  - Start-Button blendet Panel aus und lädt Map, wenn noch nicht geladen
  - Fallback bleibt aktiv, Spiel bricht nie hart ab
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

(function overlay(){
  const url = new URL(location.href);
  if (url.searchParams.get('overlay') === '0') overlayOn = false;

  let frames=0, last=performance.now(), dt=16.7;
  function loop(now){
    frames++; dt=now-last; last=now; requestAnimationFrame(loop);
    if (!overlayOn) return;
    ctx.save(); ctx.scale(devicePixelRatio,devicePixelRatio);
    ctx.clearRect(0,0,360,90);
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(6,6,350,78);
    ctx.fillStyle='#cfe6ff'; ctx.font='12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const cam=window.__CAMERA||{x:0,y:0,zoom:1};
    const map=(window.__MAP_STATE||{}).loaded?'aktiv':'—';
    const assets=(window.__ASSETS_OK)?'aktiv':'—';
    const lines=[
      `Frames: ${String(frames).padStart(4)}   dt=${dt.toFixed(2)}ms`,
      `Cam: x=${cam.x.toFixed(1)}   y=${cam.y.toFixed(1)}   zoom=${cam.zoom.toFixed(2)}`,
      `Map: ${map}   /   Assets: ${assets}`,
      `DPR=${devicePixelRatio.toFixed(2)}   Size=${innerWidth}x${innerHeight}`
    ];
    lines.forEach((t,i)=>ctx.fillText(t,12,22+i*16));
    ctx.restore();
  }
  requestAnimationFrame(loop);

  addEventListener('keydown', ev=>{
    if (ev.key==='F2'){ overlayOn=!overlayOn; lBoot('Debug‑Overlay toggled →', overlayOn?'ON':'OFF'); }
  });
  // Klick auf „Debug“-Badge
  document.getElementById('btnDebug')?.addEventListener('click', ()=>{
    overlayOn=!overlayOn; lBoot('Debug‑Overlay toggled →', overlayOn?'ON':'OFF');
  });

  lBoot('Debug‑Overlay aktiv (non‑blocking). F2 toggelt Overlay.');
})();

// Diagnose
(function(){
  const url=new URL(location.href);
  const bust=url.searchParams.get('v') ?? Date.now().toString();
  lDiag('page='+location.href);
  lDiag('bust=?v='+bust);
  lDiag('fetchPatched='+true);
  window.__MAP_STATE={loaded:false,url:null,error:null,bust};
})();

// Buttons
document.getElementById('btnReload').addEventListener('click', ()=>{
  const url=new URL(location.href);
  const v=parseInt(url.searchParams.get('v')||'0',10);
  url.searchParams.set('v', String(isFinite(v)?(v+1):Date.now()));
  location.href=url.toString();
});
document.getElementById('btnStart').addEventListener('click', async ()=>{
  // Panel weg – sichtbares Feedback
  document.getElementById('startPanel').style.display='none';
  // Falls Map noch nicht geladen wurde, jetzt laden
  if (!window.__MAP_STATE.loaded && !window.__MAP_STATE.loading) {
    try { await loadMapNow(); } catch(e) { /* Fehler sind bereits geloggt */ }
  }
});

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

  // Map‑Runtime importieren (relativ!)
  let mapRuntime;
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

    window.__MAP_STATE.loaded = true;
    window.__MAP_STATE.url = mapUrl;
    window.__ASSETS_OK = !!(result.frames && result.atlasImage); // für HUD

    lGame('Karte geladen:', result.mapUrl);

    if (typeof mapRuntime.demoRenderToCanvas === 'function') {
      await mapRuntime.demoRenderToCanvas(cv, result);
    }

    lGame('Game gestartet.');
  }catch(err){
    window.__MAP_STATE.error = String(err && err.message || err);
    lGame('Karte konnte nicht geladen werden:', mapUrl);
    if (err && err.stack) console.error(err);
  }finally{
    window.__MAP_STATE.loading = false;
  }
}

// Automatisch laden, damit es wie zuvor sofort startet.
// Wenn du „nur auf Start“ möchtest, lösche die folgende Zeile.
loadMapNow().catch(()=>{ /* Fehler schon geloggt */ });
