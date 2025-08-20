/* Siedler‑Mini V14.7‑hf2 — boot.js
 * -------------------------------------------------------------------------------------------------
 * Rolle: Kleber zwischen index.html (Boot-UI) und Spielmodulen.
 * WICHTIG: Dieses Modul hat KEINE Side‑Effects beim Import!
 *          Alles passiert erst in den exportierten Funktionen.
 *
 * Exports:
 *   - preGameInit({ canvas, ctx }):   früher Hook vor dem eigentlichen Start
 *   - start({ canvas, ctx, assets, tools }): optionaler Start (falls game.js nicht genutzt wird)
 *
 * Abhängigkeiten:
 *   - ./core/asset.js (liefert u. a. imageRenderingCrisp/Smooth, ensure2DContext)
 */

// =================================================================================================
// Imports
// =================================================================================================

import Assets, {
  imageRenderingCrisp,
  imageRenderingSmooth,
  ensure2DContext,
} from './core/asset.js';

// =================================================================================================
// Konstanten
// =================================================================================================

const VERSION = 'V14.7-hf2';

// =================================================================================================
// Helpers
// =================================================================================================

/** Logge ins (optionale) Debug-Overlay, ohne je zu crashen. */
function dbg(kind, msg, extra){
  try{
    const box = document.getElementById('dbgOverlay');
    const panel = document.getElementById('dbgPanel') || box;
    if(!panel) return;
    box.style.display = 'block';
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.innerHTML = `<b>[${time}] ${kind}:</b> ${msg}${extra?`<pre>${extra}</pre>`:''}`;
    panel.appendChild(line);
  }catch{/* nie werfen */}
}

/** Canvas auf „crispe“ Pixel stellen (sicher). */
function setCrisp(target){
  try{
    // Bevorzugt: named export
    if (typeof imageRenderingCrisp === 'function') {
      imageRenderingCrisp(target);
      return;
    }
    // Fallback: Default-Namespace
    if (Assets && typeof Assets.imageRenderingCrisp === 'function') {
      Assets.imageRenderingCrisp(target);
      return;
    }
  }catch(e){
    console.error('imageRenderingCrisp() schlug fehl', e);
  }
  // Soft-Hinweis, falls Funktion fehlt
  console.warn('imageRenderingCrisp() nicht verfügbar – ggf. core/asset.js noch nicht aktualisiert.');
}

// =================================================================================================
// Klassen (derzeit nicht benötigt)
// =================================================================================================
// (leer)

// =================================================================================================
// Hauptlogik
// =================================================================================================

/**
 * Früher Hook: wird von index.html *vor* dem eigentlichen Spielstart aufgerufen.
 * Hier KEINE DOM-Abfragen außer Canvas/Context; nichts, was den Import sprengt.
 */
export function preGameInit({ canvas, ctx } = {}){
  try{
    // Canvas sicher auf crisp schalten (Pixel-Art freundlich).
    if (canvas) setCrisp(canvas);

    // Context optional „desynchronized“ etc. (nur wenn kein ctx übergeben wurde)
    if (!ctx && canvas) {
      ensure2DContext(canvas);
    }

    dbg('boot', `preGameInit OK • ${VERSION}`);
  }catch(e){
    console.error('preGameInit Fehler', e);
    dbg('boot', 'preGameInit Fehler', e?.stack || String(e));
  }
}

/**
 * Optionaler Startweg (falls game.js::startGame nicht genutzt wird).
 * In deinem Setup übernimmt index.html bevorzugt game.js – dieser Hook ist ein Fallback.
 */
export async function start({ canvas, ctx } = {}){
  try{
    if (!canvas) throw new Error('boot.start: Canvas fehlt');
    if (!ctx) ctx = ensure2DContext(canvas) || canvas.getContext('2d');

    // Sicherstellen, dass Rendering weiterhin crisp bleibt
    setCrisp(canvas);

    // Minimaler Lauf (nur als Fallback gedacht)
    let t0 = performance.now(), frames = 0;
    (function loop(now){
      const dt = now - t0; t0 = now; frames++;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.globalAlpha=.85; ctx.fillStyle='#0f1b29';
      ctx.fillRect(20,20,460,120); ctx.restore();
      ctx.font = `${Math.max(12, Math.floor(14 * (window.devicePixelRatio||1)))}px ui-monospace,monospace`;
      ctx.fillStyle='#cfe3ff';
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

// =================================================================================================
// Exports (Default optional, aber praktisch)
// =================================================================================================

export default { preGameInit, start };
// EOF
