// =============================================
// Bootloader für Siedler-Mini V14.7 (Mobile)
// =============================================
// Aufgaben:
// - Verdrahtet DOM <-> game.js
// - Overlay / HUD / Tools
// - Debug- & Diagnose-Funktionen
// - Fullscreen & iOS Workarounds
// =============================================

import { game } from './game.js';

(function boot(){
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // --- DOM Referenzen ---
  const canvas    = $('#game');
  const hudZoom   = $('#hudZoom');
  const hudTool   = $('#hudTool');
  const hudWood   = $('#hudWood');
  const hudStone  = $('#hudStone');
  const hudFood   = $('#hudFood');
  const hudGold   = $('#hudGold');
  const hudCar    = $('#hudCar');
  const diag      = $('#diag');
  const toast     = $('#toast');

  const startOverlay = $('#startOverlay');
  const btnStart     = $('#btnStart');
  const btnReset     = $('#btnReset');
  const btnFs        = $('#btnFs');
  const btnFsTop     = $('#btnFsTop');
  const btnCenter    = $('#btnCenter');
  const btnCenter2   = $('#btnCenter2');
  const btnDebug     = $('#btnDebug');

  const toolButtons  = $$('#tools .btn');

  // --- interner Status ---
  const state = { debugVisible:false };

  // === Helper: Toast (oben mittig) ===
  function showToast(msg){
    if (!toast) return;
    toast.textContent = String(msg);
    toast.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toast.style.display='none', 4500);
  }

  // === Helper: Diagnosefenster (unten) ===
  function logDiag(lines){
    if (!diag) return;
    if (!state.debugVisible){ diag.style.display='none'; return; }
    diag.style.display='block';
    diag.textContent = lines.join('\n');
  }

  // --- Fehler abfangen ---
  window.addEventListener('error', (e)=>{
    showToast('JS-Fehler: ' + (e.message || e.error || e));
  });
  window.addEventListener('unhandledrejection', (e)=>{
    showToast('Promise-Fehler: ' + (e.reason?.message || e.reason));
  });

  // === Vollbild ===
  async function requestFullscreen(el){
    try{
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else showToast('Vollbild nicht unterstützt.');
    }catch(err){
      showToast('Vollbild verweigert: ' + err.message);
    }
  }

  // === Overlay Steuerung ===
  function hideStart(){ if (startOverlay) startOverlay.style.display='none'; }
  function showStart(){ if (startOverlay) startOverlay.style.display='flex'; }

  // === Button Wiring ===
  if (btnDebug) btnDebug.addEventListener('click', ()=>{
    state.debugVisible = !state.debugVisible;
    logDiag(state.debugVisible ? ['Debug an.'] : []);
  });

  if (btnCenter)  btnCenter.addEventListener('click', ()=> game.center());
  if (btnCenter2) btnCenter2.addEventListener('click', ()=> game.center());

  if (btnFsTop) btnFsTop.addEventListener('click', ()=> requestFullscreen(document.documentElement));
  if (btnFs)    btnFs.addEventListener('click',    ()=> requestFullscreen(document.documentElement));

  if (btnReset) btnReset.addEventListener('click', ()=>{
    showToast('Zurückgesetzt – starte neu.');
    showStart();
  });

  if (btnStart) btnStart.addEventListener('click', ()=>{
    try{ hideStart(); startGameNow(); }
    catch(err){ showToast('Start fehlgeschlagen: ' + err.message); showStart(); }
  });

  // === Tool Buttons (links) ===
  toolButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      toolButtons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const tool = b.getAttribute('data-tool');
      game.setTool(tool);

      // HUD Text anpassen
      if (hudTool){
        hudTool.textContent = tool==='pointer' ? 'Zeiger' :
                              tool==='road' ? 'Straße' :
                              tool==='hq' ? 'HQ' :
                              tool==='woodcutter' ? 'Holzfäller' :
                              tool==='depot' ? 'Depot' : 'Abriss';
      }
    });
  });

  // === Sonderblock: Doppeltipp auf Canvas → Vollbild ===
  let lastTap = 0;
  if (canvas) {
    canvas.addEventListener('pointerdown', (e)=>{
      const now = performance.now();
      if (now - lastTap < 300){
        requestFullscreen(document.documentElement);
        lastTap = 0;
      } else lastTap = now;
    }, {passive:true});
  }

  // === Start Game ===
  function startGameNow(){
    if (!canvas) throw new Error('#game (canvas) fehlt');

    game.startGame({
      canvas,
      onHUD: (k,v)=>{
        if (k==='Zoom' && hudZoom)   hudZoom.textContent = v;
        if (k==='Tool' && hudTool)   hudTool.textContent = v;
        if (k==='wood' && hudWood)   hudWood.textContent = v;
        if (k==='stone'&& hudStone)  hudStone.textContent = v;
        if (k==='food' && hudFood)   hudFood.textContent = v;
        if (k==='gold' && hudGold)   hudGold.textContent = v;
        if (k==='carriers' && hudCar)hudCar.textContent = v;
      }
    });

    // Tool-Default (Zeiger) aktivieren
    const btnPointer = document.querySelector('[data-tool="pointer"]');
    if (btnPointer){
      toolButtons.forEach(x=>x.classList.remove('active'));
      btnPointer.classList.add('active');
    }

    if (state.debugVisible) logDiag(['Boot OK', 'Start() → running']);
  }

  // === Initialisierung ===
  showStart(); // beim Laden Overlay zeigen

  // Safari/iOS bfcache Workaround → harte Reinit
  window.addEventListener('pageshow', (e)=>{ if (e.persisted) location.reload(); });

})();
