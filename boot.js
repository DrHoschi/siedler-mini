// boot.js – sorgt dafür, dass das Canvas existiert, SW läuft und main.run()
// NUR nach DOMContentLoaded aufgerufen wird (fix für getContext=null)

import * as main from './main.js'; // dein bestehendes Spiel (NICHT ändern)

// kleine Hilfen
const $ = (sel, ctx=document) => ctx.querySelector(sel);

function fitCanvas(canvas){
  // Canvas-Pixelgröße an CSS-Größe koppeln (HiDPI‑scharf)
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = Math.floor(rect.width  * dpr);
  const h = Math.floor(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
  }
}

async function requestFullscreen(el){
  try{
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.());
  }catch(e){ console.warn('Fullscreen failed', e); }
}

function bindTools(){
  const tools = $('#tools');
  if (!tools) return;
  tools.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button[data-tool]');
    if (!btn) return;
    for (const b of tools.querySelectorAll('.btn')) b.classList.remove('active');
    btn.classList.add('active');
    // Leite ans Spiel weiter (optional – falls main a) so eine API anbietet)
    if (typeof main.setTool === 'function') main.setTool(btn.dataset.tool);
  });
}

function bindHUD(canvas){
  const pillZoom = $('#hudZoom');
  const pillCenter = $('#hudCenter');
  const pillFull = $('#hudFull');

  pillFull?.addEventListener('click', ()=>requestFullscreen(document.documentElement));
  pillCenter?.addEventListener('click', ()=> { if (typeof main.center === 'function') main.center(); });

  // Debug‑Zoomanzeige (optional – wenn main eine Callback‑API hat)
  if (pillZoom && typeof main.onZoomChange === 'function'){
    main.onZoomChange((z)=> pillZoom.textContent = `Zoom ${z.toFixed(2)}×`);
  }
  // Falls nicht, setzen wir initial wenigstens 1.00×
  pillZoom && (pillZoom.textContent = 'Zoom 1.00×');

  // Resizes
  const resize = ()=> { fitCanvas(canvas); main.onResize?.(); };
  window.addEventListener('resize', resize, {passive:true});
  // iOS‑Adressleiste etc.
  window.addEventListener('orientationchange', ()=> setTimeout(resize, 100));
}

async function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  try{
    await navigator.serviceWorker.register('./sw.js', {scope:'./'});
    // aktivieren ohne Reload sobald es installiert ist
    navigator.serviceWorker.addEventListener('controllerchange', ()=> {
      console.log('[sw] controller changed');
    });
  }catch(e){
    console.warn('[sw] registration failed', e);
  }
}

function ensureCanvas(){
  // Stelle sicher, dass es ein <canvas id="game"> gibt
  let canvas = document.getElementById('game');
  if (!canvas){
    // Fallback – sollte nicht mehr nötig sein, aber sicher ist sicher
    const stage = document.getElementById('stage') || document.body;
    canvas = document.createElement('canvas');
    canvas.id = 'game';
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;';
    stage.appendChild(canvas);
  }
  fitCanvas(canvas);
  // Test: getContext muss existieren, sonst sauberer Fehlerdialog
  const ctx = canvas.getContext('2d');
  if (!ctx){
    alert('Startfehler: canvas.getContext() ist nicht verfügbar (WebGL2D nicht unterstützt?).');
    throw new Error('Canvas 2D context missing');
  }
  return canvas;
}

function bindStart(canvas){
  const start = $('#start');
  const btnStart = $('#btnStart');
  const btnFull  = $('#btnFull');
  const btnReset = $('#btnReset');

  // Doppeltipp auf das Overlay -> Vollbild
  start?.addEventListener('dblclick', ()=>requestFullscreen(document.documentElement), {passive:true});

  btnFull?.addEventListener('click', ()=>requestFullscreen(document.documentElement));

  btnReset?.addEventListener('click', ()=>{
    try { localStorage.removeItem('siedler-mini-save'); } catch{}
    location.reload();
  });

  btnStart?.addEventListener('click', async ()=> {
    try{
      start.style.display = 'none';
      await main.run(); // <— dein Spiel startet (greift selbst per id="game" aufs Canvas zu)
    }catch(e){
      console.error('Startfehler in main.run()', e);
      alert(`Startfehler in main.run()\n\n${e?.message || e}`);
      start.style.display = ''; // Overlay wieder zeigen
    }
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // Service Worker zuerst registrieren (kann still im Hintergrund arbeiten)
  registerSW();

  const canvas = ensureCanvas();

  bindTools();
  bindHUD(canvas);
  bindStart(canvas);
});
