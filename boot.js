/*
  Siedler‑Mini – boot.js (MAX)
  ============================
  Aufgaben:
  - Debug-Overlay + Logging mit Prefixen [boot], [game], [net], [atlas], [diag]
  - Query-Params verarbeiten:
      ?map=assets/maps/map-demo.json   (Map‑URL)
      ?v=42                             (Cache‑Bust-Kanal, beliebig)
      ?overlay=0/1                      (Debug‑Overlay)
  - tools/map-runtime.js sicher importieren (relativer Import!)
  - Aufruf mapRuntime.loadAndPrepareMap(...)
  - Bei Fehlern: kein Abbruch – sauberer Fallback (Grid)
*/

const log = {
  time() {
    const d = new Date();
    return d.toTimeString().slice(0,8);
  },
  pfx(kind) {
    const colors = {
      boot: 'color:#9ae66e',
      game: 'color:#9ae6b4',
      net:  'color:#64c7ff',
      diag: 'color:#e6d36e',
      atlas:'color:#b3a7ff',
      error:'color:#ff8484'
    };
    return (k, msg, ...rest) => console.log(`[%c${log.time()}%c ${k}]`, 'color:#7f9bb8', 'color:#a7bed0', msg, ...rest);
  }
};
const lBoot  = log.pfx('boot');
const lGame  = log.pfx('game');
const lNet   = log.pfx('net');
const lDiag  = log.pfx('diag');
const lAtlas = log.pfx('atlas');
const lErr   = log.pfx('console.error');

/* ---------- Debug-Overlay (sehr leichtgewichtig) ---------- */
let overlayOn = true;
(function setupOverlay(){
  const url = new URL(location.href);
  const ov = url.searchParams.get('overlay');
  if (ov === '0') overlayOn = false;

  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');

  function resize() {
    cv.width  = Math.floor(window.innerWidth  * devicePixelRatio);
    cv.height = Math.floor(window.innerHeight * devicePixelRatio);
  }
  resize();
  addEventListener('resize', resize);

  let frames = 0, last = performance.now(), dt = 16.7;
  function loop(now){
    frames++;
    dt = now - last; last = now;
    requestAnimationFrame(loop);
    if (!overlayOn) return;
    // Mini-HUD oben links
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0,0,360,90);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6,6,350,78);
    ctx.fillStyle = '#cfe6ff';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const cam = window.__CAMERA || {x:0,y:0,zoom:1};
    const map = (window.__MAP_STATE || {}).loaded ? 'aktiv' : '—';
    const assets = (window.__ASSETS_OK) ? 'aktiv' : '—';
    const lines = [
      `Frames: ${String(frames).padStart(4)}   dt=${dt.toFixed(2)}ms`,
      `Cam: x=${cam.x.toFixed(1)}   y=${cam.y.toFixed(1)}   zoom=${cam.zoom.toFixed(2)}`,
      `Map: ${map}   /   Assets: ${assets}`,
      `DPR=${devicePixelRatio.toFixed(2)}   Size=${innerWidth}x${innerHeight}`
    ];
    lines.forEach((t,i)=>ctx.fillText(t, 12, 22 + i*16));
    ctx.restore();
  }
  requestAnimationFrame(loop);

  addEventListener('keydown', (ev)=>{
    if (ev.key === 'F2') {
      overlayOn = !overlayOn;
      lBoot('Debug‑Overlay toggled ->', overlayOn ? 'ON' : 'OFF');
    }
  });

  lBoot('Debug‑Overlay aktiv (non‑blocking). F2 toggelt Overlay.');
})();

/* ---------- Diagnose: Seite / Params ---------- */
(function diag(){
  const url = new URL(location.href);
  const bust = url.searchParams.get('v') ?? Date.now().toString();
  const mapParam = url.searchParams.get('map');
  lDiag('page=' + location.href);
  lDiag('bust=?v=' + bust);
  lDiag('fetchPatched=' + true);

  // Globaler Zustand für Overlay
  window.__MAP_STATE = { loaded:false, url: null, error:null, bust };
})();

/* ---------- Start-Panel Buttons ---------- */
document.getElementById('btnReload').addEventListener('click', ()=>{
  // Harte Bust-Strategie: erhöhe v
  const url = new URL(location.href);
  const v = parseInt(url.searchParams.get('v') || '0', 10);
  url.searchParams.set('v', String(isFinite(v)? (v+1) : Date.now()));
  location.href = url.toString();
});
document.getElementById('btnStart').addEventListener('click', ()=>{
  // Für deine Engine: trigger optionales Starten – hier kein Abbruch nötig
  lGame('Start‑Button gedrückt – (Spiel läuft ohnehin).');
});

/* ---------- Map laden (sicherer Import) ---------- */
(async function main(){
  // Default-Map, falls keine ?map=... übergeben wurde
  const DEFAULT_MAP = './assets/maps/map-pro.json';

  // Map‑URL bestimmen
  const url = new URL(location.href);
  let mapUrl = url.searchParams.get('map') || DEFAULT_MAP;

  // Cache-Bust an Map hängen (nur wenn nicht schon vorhanden)
  if (!/[?&]v=/.test(mapUrl)) {
    const sep = mapUrl.includes('?') ? '&' : '?';
    mapUrl += `${sep}v=${encodeURIComponent(window.__MAP_STATE.bust)}`;
  }

  // tools/map-runtime.js RELATIV importieren (kein leading slash!)
  let mapRuntime;
  try {
    mapRuntime = await import('./tools/map-runtime.js');
    lBoot('map-runtime.js: OK');
  } catch (e) {
    lBoot('map-runtime.js: fehlt');
    lGame('Map‑Lader übersprungen: tools/map-runtime.js fehlt.');
    // Kein harter Abbruch – Fallback-Raster lassen wir im Canvas.
    return;
  }

  // Map laden & vorbereiten
  try {
    lGame('Lade Karte:', mapUrl);
    const result = await mapRuntime.loadAndPrepareMap({
      mapUrl,
      onNet:(...m)=>lNet(...m),
      onAtlas:(...m)=>lAtlas(...m),
    });

    window.__MAP_STATE.loaded = true;
    window.__MAP_STATE.url = mapUrl;

    lGame('Karte geladen:', result.mapUrl);

    // Optionale Mini-Demo: Karten-Hintergrund füllen (wenn verfügbar)
    if (typeof mapRuntime.demoRenderToCanvas === 'function') {
      const cv = document.getElementById('game');
      await mapRuntime.demoRenderToCanvas(cv, result);
    }

    lGame('Game gestartet.');
  } catch (err) {
    window.__MAP_STATE.error = String(err && err.message || err);
    lGame('Karte konnte nicht geladen werden:', mapUrl);
    if (err && err.stack) console.error(err);
    // Fallback bleibt: unser Overlay läuft weiter, Canvas zeigt nur Grid.
  }
})();
