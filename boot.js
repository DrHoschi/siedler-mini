// V14.7 boot.js – Mobile-stabil

import * as game from './game.js';

// ---------- DOM ----------
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

const elCanvas = qs('#canvas');
const elStart  = qs('#btnStart');
const elReset  = qs('#btnReset');
const elFsTop  = qs('#btnFull');
const elFsCard = qs('#btnFs');
const elCard   = qs('#startCard');

const pillTool = qs('#hudTool');
const pillZoom = qs('#hudZoom');

// Tool-Buttons (links)
const toolBtns = qsa('#tools .btn');

// Aktion rechts
qs('#btnCenter').addEventListener('click', () => api?.center());
qs('#btnDebug').addEventListener('click', () => console.log('DEBUG state:', game.exportState()));
[elFsTop, elFsCard].forEach(b => b?.addEventListener('click', tryFullscreen));

// Start/Reset
elStart.addEventListener('click', onStart);
elReset.addEventListener('click', () => location.reload());

// Tool-Wechsel
toolBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    api?.setTool(tool);
    pillTool.textContent = toolLabel(tool);
    toolBtns.forEach(b => b.classList.toggle('ok', b === btn));
  });
});

// ---------- Vollbild ----------
function tryFullscreen() {
  const root = document.documentElement;
  const go = () => {
    const any = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
    if (any) any.call(root).catch(()=>{});
    else alert('Vollbild wird von diesem Browser/Modus nicht unterstützt.\n\nTipp: iOS Safari ab iOS 16 oder Seite zum Homescreen hinzufügen.');
  };
  go();
}
document.addEventListener('dblclick', e => {
  // Doppeltipp auf die Karte -> Vollbildversuch
  if (e.target === elCanvas || e.target.closest('#game')) tryFullscreen();
}, {passive:true});

// ---------- Game-Start ----------
let api = null;

function onStart() {
  elCard.style.display = 'none';
  // Start des Spiels
  api = game.startGame({
    canvas: elCanvas,
    DPR: window.devicePixelRatio || 1,
    onHUD: (key, val) => {
      if (key === 'zoom') pillZoom.textContent = `${val.toFixed(2)}x`;
      if (key === 'tool') pillTool.textContent = toolLabel(val);
      const el = qs('#hud' + ({
        Hol z:'Holz', Stein:'Stein', Nahrung:'Nahrung', Gold:'Gold', Traeger:'Traeger'
      }[key] || ''));
      if (el) el.textContent = String(val);
    }
  });
  // Standard-Tool: Zeiger hervorheben
  toolBtns.forEach(b => b.classList.toggle('ok', b.dataset.tool === 'pointer'));
  pillTool.textContent = toolLabel('pointer');
  pillZoom.textContent = '1.00x';
}

// Auf/Ab der Größe -> Canvas neu
window.addEventListener('resize', () => api?.resize(), {passive:true});

// Labels hübsch
function toolLabel(t) {
  // kleine Icons
  const map = {
    pointer: '☝️ Zeiger',
    road:    '🛣️ Straße',
    hq:      '🏠 HQ',
    woodcutter: '🪓 Holzfäller',
    depot:   '📦 Depot',
    erase:   '🗑️ Abriss'
  };
  return map[t] || t;
}
