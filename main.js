// main.js – lädt game.js und ruft game.startGame({ ... }) auf
// Achtung: game.js muss "export async function startGame(opts) { ... }" bereitstellen.

export async function run() {
  const $ = sel => document.querySelector(sel);
  const canvas = $('#game');
  if (!canvas) throw new Error('canvas fehlt');

  const DPR = window.devicePixelRatio || 1;

  // HUD‑Updater
  function onHUD(api){
    $('#hudWood').textContent  = api.wood?.()  ?? '0';
    $('#hudStone').textContent = api.stone?.() ?? '0';
    $('#hudFood').textContent  = api.food?.()  ?? '0';
    $('#hudGold').textContent  = api.gold?.()  ?? '0';
    $('#hudCar').textContent   = api.car?.()   ?? '0';
    $('#hudTool').textContent  = api.tool?.()  ?? 'Zeiger';
    $('#hudZoom').textContent  = api.zoom?.()  ?? '1.00x';
  }

  // game.js laden
  const game = await import('./game.js?v=14.3-safe2');
  const startGame = game.startGame || game.default?.startGame;
  if (typeof startGame !== 'function') {
    throw new Error('game.startGame(opts) fehlt oder ist keine Funktion.');
  }

  // Start
  await startGame({ canvas, DPR, onHUD });

  // optional: damit „Zentrieren“ (HUD‑Button) sofort nutzbar ist,
  // kann game.js window.main.centerMap setzen – falls nicht, hier No‑op:
  if (!window.main) window.main = {};
  if (typeof window.main.centerMap !== 'function') {
    window.main.centerMap = () => {};
  }
}

// Fallback‑Export, falls boot.js window.main.run() erwartet
export default { run };
