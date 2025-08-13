// main.js – EIN Einstieg: run() startet das Spiel
import { startGame } from './game.js?v=14.3';

function $(s){ return document.querySelector(s); }

function setActiveTool(name){
  const ids = ['Pointer','Road','HQ','Lumber','Depot','Erase'];
  ids.forEach(id => $('#tool'+id)?.classList.toggle('active', id.toLowerCase()===name));
  const map = {pointer:'Zeiger', road:'Straße', hq:'HQ', lumber:'Holzfäller', depot:'Depot', erase:'Abriss'};
  $('#hudTool').textContent = map[name] || 'Zeiger';
}

export async function run(){
  const canvas = $('#game');
  const DPR = window.devicePixelRatio || 1;

  // iOS Gesten (Seitenzoom) killen
  const stopGesture = e => { e.preventDefault(); };
  document.addEventListener('gesturestart', stopGesture, {passive:false});
  document.addEventListener('gesturechange', stopGesture, {passive:false});
  document.addEventListener('gestureend', stopGesture, {passive:false});
  window.addEventListener('touchmove', e => {
    if (e.target===canvas) e.preventDefault();
  }, {passive:false});

  // HUD Update Helper
  const onHUD = (key,val) => {
    const el = document.querySelector('#hud'+key);
    if (el) el.textContent = String(val);
  };

  // Toolbuttons (nur Anzeige/State – Logik im game.js)
  $('#toolPointer')?.addEventListener('click', () => window.__setTool?.('pointer'));
  $('#toolRoad')?.addEventListener('click', () => window.__setTool?.('road'));
  $('#toolHQ')?.addEventListener('click', () => window.__setTool?.('hq'));
  $('#toolLumber')?.addEventListener('click', () => window.__setTool?.('lumber'));
  $('#toolDepot')?.addEventListener('click', () => window.__setTool?.('depot'));
  $('#toolErase')?.addEventListener('click', () => window.__setTool?.('erase'));
  $('#centerBtn')?.addEventListener('click', () => window.__centerMap?.());

  // Start Game (liefert Steuerfunktionen zurück)
  const api = await startGame({ canvas, DPR, onHUD, onTool:setActiveTool, onZoom:z=>($('#hudZoom').textContent = z.toFixed(2)+'x') });

  // API an window hängen, damit Buttons sie finden
  window.__setTool = api.setTool;
  window.__centerMap = api.center;
  // initiale UI
  setActiveTool('pointer');
  $('#uiBar').style.opacity = '0.95';
}

// Export für boot.js
window.main = { run };
