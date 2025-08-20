/* ================================================================================================
   Siedler‑Mini V14.7‑hf2 — boot.js
   Rolle: Kleber/Hooks zwischen index.html und den Spielmodulen.
   WICHTIG: KEINE Side‑Effects beim Import! Alles passiert erst in den Export‑Funktionen.
   Exports:
     • preGameInit({ canvas, ctx }) – früher Hook (z. B. Canvas „crisp“ schalten)
     • start({ canvas, ctx, assets, tools }) – optionaler Fallback‑Start (wenn game.js fehlt)
   Abhängigkeiten:
     • ./core/asset.js  → liefert imageRenderingCrisp/Smooth, ensure2DContext, …
   ================================================================================================ */

import Assets, {
  imageRenderingCrisp,
  imageRenderingSmooth,
  ensure2DContext,
} from './core/asset.js';

const VERSION = 'V14.7-hf2';

/** Safes Logging ins Debug‑Overlay (nie werfen). */
function dbg(kind, msg, extra){
  try{
    const box = document.getElementById('dbgOverlay');
    const panel = document.getElementById('dbgPanel') || box;
    if(!panel) return;
    box.style.display = 'block';
    const t = new Date().toLocaleTimeString();
    panel.insertAdjacentHTML('beforeend', `<div><b>[${t}] ${kind}:</b> ${msg}${extra?`<pre>${extra}</pre>`:''}</div>`);
  }catch{}
}

/** Canvas auf „crispe“ Pixel stellen. Funktion ist robust gegen fehlende Exporte. */
function setCrisp(target){
  try{
    if (typeof imageRenderingCrisp === 'function') { imageRenderingCrisp(target); return; }
    if (Assets && typeof Assets.imageRenderingCrisp === 'function') { Assets.imageRenderingCrisp(target); return; }
  }catch(e){
    console.error('imageRenderingCrisp() schlug fehl', e);
  }
  console.warn('imageRenderingCrisp() nicht verfügbar – core/asset.js prüfen.');
}

/** Früher Hook: wird von index.html vor dem Spielstart aufgerufen. */
export function preGameInit({ canvas, ctx } = {}){
  try{
    if (canvas) setCrisp(canvas);      // Pixel‑Art freundlich rendern
    if (!ctx && canvas) ensure2DContext(canvas);  // optionaler Context‑Fetch
    dbg('boot', `preGameInit OK • ${VERSION}`);
  }catch(e){
    console.error('preGameInit Fehler', e);
    dbg('boot', 'preGameInit Fehler', e?.stack || String(e));
  }
}

/** Optionaler Fallback‑Start (falls game.js::startGame nicht genutzt wird). */
export async function start({ canvas, ctx } = {}){
  try{
    if (!canvas) throw new Error('boot.start: Canvas fehlt');
    if (!ctx) ctx = ensure2DContext(canvas) || canvas.getContext('2d');

    setCrisp(canvas);

    // Minimaler Demo‑Loop
    let t0 = performance.now(), frames = 0;
    (function loop(now){
      const dt = now - t0; t0 = now; frames++;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.globalAlpha=.85; ctx.fillStyle='#0f1b29'; ctx.fillRect(20,20,460,120); ctx.restore();
      ctx.font = `${Math.max(12, Math.floor(14 * (window.devicePixelRatio||1)))}px ui-monospace,monospace`;
      ctx.fillStyle = '#cfe3ff';
      ctx.fillText('boot.start – Fallback aktiv', 40, 60);
      ctx.fillText(`Frames=${frames}  dt=${dt.toFixed(2)}ms  ${VERSION}`, 40, 80);
      requestAnimationFrame(loop);
    })(t0);

    dbg('boot', 'start() Fallback läuft.');
  }catch(e){
    console.error('boot.start Fehler', e);
    dbg('boot', 'start() Fehler', e?.stack || String(e));
  }
}

export default { preGameInit, start };
