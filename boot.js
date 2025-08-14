// V14.7b boot.js – Fix: Modul lädt wieder, Events aktiv

import * as game from './game.js';

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const elCanvas = $('#canvas');
const elStart  = $('#btnStart');
const elReset  = $('#btnReset');
const elFsTop  = $('#btnFull');
const elFsCard = $('#btnFs');
const elCard   = $('#startCard');

const pillTool = $('#hudTool');
const pillZoom = $('#hudZoom');

const toolBtns = $$('#tools .btn');

$('#btnCenter').addEventListener('click', () => api?.center());
$('#btnDebug').addEventListener('click', () => console.log('DEBUG state:', game.exportState()));
[elFsTop, elFsCard].forEach((b) => b?.addEventListener('click', tryFullscreen));

elStart.addEventListener('click', onStart);
elReset.addEventListener('click', () => location.reload());

toolBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.tool;
    api?.setTool(t);
    pillTool.textContent = toolLabel(t);
    toolBtns.forEach((b) => b.classList.toggle('ok', b === btn));
  });
});

function tryFullscreen() {
  const root = document.documentElement;
  const any =
    root.requestFullscreen ||
    root.webkitRequestFullscreen ||
    root.msRequestFullscreen;
  if (any) {
    any.call(root).catch(() => {});
  } else {
    alert(
      'Vollbild wird von diesem Browser/Modus nicht unterstützt.\n\nTipp: iOS Safari ab iOS 16 oder Seite zum Homescreen hinzufügen.'
    );
  }
}

document.addEventListener(
  'dblclick',
  (e) => {
    if (e.target === elCanvas || e.target.closest('#game')) tryFullscreen();
  },
  { passive: true }
);

let api = null;

function onStart() {
  elCard.style.display = 'none';
  api = game.startGame({
    canvas: elCanvas,
    DPR: window.devicePixelRatio || 1,
    onHUD: (key, val) => {
      if (key === 'zoom') pillZoom.textContent = `${val.toFixed(2)}x`;
      if (key === 'tool') pillTool.textContent = toolLabel(val);
      // Ressourcen-Mapping lassen wir vorerst weg; kommt mit Wirtschaft.
    },
  });

  toolBtns.forEach((b) => b.classList.toggle('ok', b.dataset.tool === 'pointer'));
  pillTool.textContent = toolLabel('pointer');
  pillZoom.textContent = '1.00x';
}

window.addEventListener('resize', () => api?.resize(), { passive: true });

function toolLabel(t) {
  const map = {
    pointer: '☝️ Zeiger',
    road: '🛣️ Straße',
    hq: '🏠 HQ',
    woodcutter: '🪓 Holzfäller',
    depot: '📦 Depot',
    erase: '🗑️ Abriss',
  };
  return map[t] || t;
}
