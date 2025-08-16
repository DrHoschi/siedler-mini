// V15 boot.js – UI verdrahten, Canvas-Resize, Fullscreen
import { game } from './game.js';

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

const canvas = $('#gameCanvas');
const debugBox = $('#debug');
const hudZoom = $('#hudZoom');
const hudTool = $('#hudTool');
const startOverlay = $('#start');

function logDbg(msg){
  debugBox.style.display = 'block';
  debugBox.textContent = String(msg);
}

// Canvas korrekt auf Viewportgröße + DPR anpassen
function resizeCanvas(){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
  }
  // Renderer informieren
  game.resize(w, h, dpr);
}

// Vollbild (mit iOS-Fallback: kein echter Fullscreen, aber ok)
async function enterFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req) { try { await req.call(el); } catch(e) { logDbg('Fullscreen nicht erlaubt'); } }
}
function exitFullscreen() {
  const ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (ex) try { ex.call(document); } catch(e){}
}

function wireUI(){
  // Start
  $('#btnStart').addEventListener('click', ()=>{
    startOverlay.style.display = 'none';
    game.start(canvas, {
      onHUD: (k,v)=>{
        if (k==='Zoom') hudZoom.textContent = v;
        if (k==='Tool') hudTool.textContent = v;
      }
    });
    game.center();
  });

  $('#btnFs').addEventListener('click', ()=>enterFullscreen());
  $('#btnReset').addEventListener('click', ()=>{
    location.reload();
  });

  // HUD
  $('#btnCenter').addEventListener('click', ()=>game.center());
  $('#btnDebug').addEventListener('click', ()=>{
    debugBox.style.display = (debugBox.style.display==='block'?'none':'block');
  });
  $('#btnFsTop').addEventListener('click', ()=>enterFullscreen());

  // Tools
  $$('#tools .btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('#tools .btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      game.setTool(btn.dataset.tool);
    });
  });

  // Resize Events
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', ()=>setTimeout(resizeCanvas, 250));
  document.addEventListener('fullscreenchange', resizeCanvas);
  document.addEventListener('webkitfullscreenchange', resizeCanvas);
}

function init(){
  wireUI();
  // Canvas initial fitten (auch vor Start schon wichtig, damit Koordinaten stimmen)
  resizeCanvas();
  // „Zeiger“ initial anzeigen
  hudTool.textContent = 'Zeiger';
  hudZoom.textContent = '1.00x';
}

init();
