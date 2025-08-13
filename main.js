// main.js — lädt game.js & startet das eigentliche Spiel
// Wichtig: Am Ende setzen wir window.main = { run, centerMap } !

function $(sel){ return document.querySelector(sel); }

let __started = false;
let __game = null;

function updateHUD(values={}){
  if ('wood'  in values) $('#hudWood').textContent  = values.wood;
  if ('stone' in values) $('#hudStone').textContent = values.stone;
  if ('food'  in values) $('#hudFood').textContent  = values.food;
  if ('gold'  in values) $('#hudGold').textContent  = values.gold;
  if ('car'   in values) $('#hudCar').textContent   = values.car;
  if ('tool'  in values) $('#hudTool').textContent  = values.tool;
  if ('zoom'  in values) $('#hudZoom').textContent  = values.zoom.toFixed(2)+'x';
}

export async function run(){
  if (__started) return; // Doppelstart verhindern
  __started = true;

  const canvas = $('#game');
  if (!canvas) throw new Error('#game Canvas fehlt');

  // Spielmodul laden (dein vorhandenes game.js)
  // -> game.startGame(opts) muss exportiert sein.
  const game = await import('./game.js?v=14.3');
  if (!game || typeof game.startGame !== 'function') {
    throw new Error('game.startGame(...) nicht gefunden');
  }

  // Hooks ins Spiel geben
  __game = await game.startGame({
    canvas,
    DPR: Math.max(1, Math.min(3, window.devicePixelRatio||1)),
    onHUD: updateHUD,
    onError: (msg)=> alert('Spiel-Fehler: '+msg),
  });

  // Optional: Buttons (Debug etc.) an dein Spiel durchreichen
  $('#dbgBtn')?.addEventListener('click', ()=> __game?.toggleDebug?.());
}

export function centerMap(){
  // wird vom "Zentrieren"-Button genutzt
  __game?.centerMap?.();
}

// Damit boot.js den Einstieg findet:
window.main = { run, centerMap };
