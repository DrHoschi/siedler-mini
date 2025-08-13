// main.js — Einstieg aus boot.js
// Exportiert run(opts), lädt game.js und startet das Spiel.

export async function run(opts) {
  try {
    const { default: startGame } = await import('./game.js'); // default export
    await startGame({
      canvas: opts.canvas,
      DPR: opts.DPR ?? (window.devicePixelRatio || 1),
      onHUD: opts.onHUD ?? (() => {}),
    });
  } catch (err) {
    // Fehler landet sichtbar im Start‑Overlay (boot.js fängt diesen throw ab)
    console.error('[main.run] error:', err);
    throw err;
  }
}
