// main.js – Einstieg ins eigentliche Spiel (lazy import)

export async function run(canvas, opts = {}) {
  // opts: { DPR, onHud }
  if (!canvas) throw new Error('Canvas fehlt');

  // Import mit Cache‑Buster passend zur Version
  const gameMod = await import('./game.js?v=14.3').catch(err => {
    console.error('game.js Importfehler', err);
    throw err;
  });

  if (!gameMod || typeof gameMod.startGame !== 'function') {
    throw new Error('game.startGame(opts) fehlt oder ist keine Funktion');
  }

  // Optionen weiterreichen – game.js kann wiederum render.js & core/* importieren
  await gameMod.startGame({
    canvas,
    DPR: opts.DPR || Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
    onHud: opts.onHud || (()=>{}),
    $: (s)=>document.querySelector(s)
  });
}

// Optional: von game.js überschrieben, hier nur Fallback.
export function centerMap(){ /* noop */ }
