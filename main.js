// main.js (V14.3-safe4)
// Einziger Job: game.js laden und startGame(...) aufrufen.

export async function run() {
  const canvas = document.getElementById('game');
  if (!canvas) throw new Error('#game Canvas fehlt');

  // Modul laden (Cache-Busting über Query)
  let game;
  try {
    game = await import('./game.js?v=14.3-safe4');
  } catch (e) {
    throw new Error('Modulimport fehlgeschlagen (game.js): ' + e.message);
  }

  if (!game || typeof game.startGame !== 'function') {
    throw new Error('game.startGame fehlt oder ist keine Funktion');
  }

  // HUD-Bridge: schreibt z.B. Tool/Zoom in deine Pills
  const onHUD = (key, val) => {
    const el = document.getElementById('hud' + key);
    if (el) el.textContent = String(val);
  };

  // Start
  await game.startGame({
    canvas,
    DPR: window.devicePixelRatio || 1,
    onHUD,
  });
}
