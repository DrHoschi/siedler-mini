// core/overlay-hooks.js
// v1.0.0 – Add-on, das PathOverlay einbindet (Init + Update/Render), ohne deinen Code anzurühren.
import { PathOverlay } from './path-overlay.js';

const VER = 'v16.1.1';
const log = (k, m) => (window.__UILog ? window.__UILog(k, m) : console.log(`[${k}] ${m}`));

let hooked = false;
let inited = false;

/** versucht, World-Infos vom Spiel herauszufinden */
function readWorldInfo(){
  // Versuchsreihenfolge – je nach deinem bestehenden Code:
  const world = window.GameWorld || window.world || {};
  const tileSize = world.tileSize || window.TILE_SIZE || 64;

  // Breite/Höhe in Pixeln (nicht Tiles) – wir nehmen Canvas-Größe als Fallback:
  const viewCanvas = document.getElementById('game');
  const worldWidthPx  = world.widthPx  || world.width  * tileSize || viewCanvas?.width  || 1024;
  const worldHeightPx = world.heightPx || world.height * tileSize || viewCanvas?.height || 768;
  return { tileSize, worldWidthPx, worldHeightPx };
}

/** Initialisiert PathOverlay genau einmal */
async function initOnce(){
  if (inited) return;
  const { tileSize, worldWidthPx, worldHeightPx } = readWorldInfo();
  await PathOverlay.init({
    tileSize,
    worldWidthPx,
    worldHeightPx,
    brushes: [] // (optional – wir nutzen in path-overlay.js einen Radial-Brush)
  });
  inited = true;
  log('ok', `PathOverlay initialisiert (${VER})`);
}

/** Hängt Update/Render in deinen Game-Loop */
function hookLoop(){
  if (hooked) return;

  const loop = window.GameLoop || {};
  // 1) Update hook
  const origUpdate = loop.update || window.gameUpdate;
  window.GameLoop = window.GameLoop || {};
  window.GameLoop.update = function(dt){
    // dein Update zuerst
    if (typeof origUpdate === 'function') origUpdate(dt);
    // dann Overlay
    PathOverlay.update(dt);
  };
  if (!origUpdate) {
    // falls wir nichts gefunden haben, legen wir ein kleines Ticker-Fallback an
    let last = performance.now();
    function fallbackTick(){
      const now = performance.now();
      const dt = (now - last)/1000;
      last = now;
      PathOverlay.update(dt);
      requestAnimationFrame(fallbackTick);
    }
    requestAnimationFrame(fallbackTick);
  }

  // 2) Render hook
  const origRender = loop.render || window.gameRender;
  window.GameLoop.render = function(ctx, camera){
    // Welt zeichnen:
    if (typeof origRender === 'function') {
      // Wir gehen davon aus, dass dein origRender erst die Welt/Boden zeichnet
      // und ggf. Einheiten/UI danach. Um sicher zu gehen, rufen wir ihn auf,
      // und zeichnen unser Overlay DIREKT DANACH:
      origRender(ctx, camera);
      PathOverlay.render(ctx, camera);
    } else {
      // Notfall: wir zeichnen zumindest Overlay aufs Canvas
      const canvas = document.getElementById('game');
      const c = canvas?.getContext('2d');
      if (c) PathOverlay.render(c, { x:0, y:0, w:canvas.width, h:canvas.height });
    }
  };

  hooked = true;
  log('ok', `PathOverlay Hooks aktiv (${VER})`);
}

/** Wir hängen uns an deine Start-Buttons/Loader-Logs an */
(function autoWire(){
  // Wenn dein UI bei Start drückt, wurde bisher ins Log geschrieben.
  // Wir patchen window.GameLoader.start, falls vorhanden:
  if (window.GameLoader?.start && !window.___patchedGL){
    const orig = window.GameLoader.start.bind(window.GameLoader);
    window.GameLoader.start = async function(url){
      log('ok', `GameLoader.start ${url}`);
      const r = await orig(url);
      try { await initOnce(); hookLoop(); } catch(e) { console.error(e); }
      return r;
    };
    window.___patchedGL = true;
  }

  // Sicherheitsnetz: lausche auf „Game started“
  const origLog = window.__UILog;
  if (origLog && !window.___patchedUILog){
    window.__UILog = function(kind, msg){
      try {
        if (/Game started/i.test(msg) || /Map OK/i.test(msg)) {
          initOnce().then(hookLoop).catch(console.error);
        }
      } catch {}
      return origLog(kind, msg);
    };
    window.___patchedUILog = true;
  }

  // Sollte bereits eine Map laufen (Reload mitten im Spiel), sofort versuchen:
  setTimeout(()=>{ initOnce().then(hookLoop).catch(()=>{}); }, 1000);
})();
