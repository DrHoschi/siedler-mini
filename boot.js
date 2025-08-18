// Siedler‑Mini V14.7 (Mobil) — Boot/Glue
// Verdrahtet DOM ↔ game.js, Debug/Diag, Fullscreen & Start-Overlay.

import { game } from './game.js'; // deine aktuelle game.js (V14.7‑hf Linie)

(function boot(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // DOM refs
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
  const btnFsSide    = $('#btnFsSide');
  const btnDebug     = $('#btnDebug');
  const btnCenter    = $('#btnCenter');
  const btnCenter2   = $('#btnCenter2');

  const toolButtons  = $$('#tools .btn');

  // --- Diagnose/Debug helpers ---
  const state = {
    debugVisible: false,
    clickEcho: null,
  };

  function logDiag(lines){
    if (!state.debugVisible) return;
    diag.textContent = lines.join('\n');
  }
  function showToast(msg){
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toast.style.display='none', 4500);
  }

  // globale Fehler → Toast + Diag
  window.addEventListener('error', (e)=>{
    showToast('JS-Fehler: ' + (e.message || e.error || e));
  });
  window.addEventListener('unhandledrejection', (e)=>{
    showToast('Promise-Fehler: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  // --- Fullscreen (inkl. iOS Fallback) ---
  async function requestFullscreen(el){
    try{
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else showToast('Vollbild wird von diesem Gerät/Browser nicht unterstützt.');
    }catch(err){
      showToast('Vollbild verweigert: ' + err.message);
    }
  }
  async function exitFullscreen(){
    try{
      if (document.exitFullscreen)      await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }catch{}
  }

  // Mini-Overlay-Klickschutz entfernen
  function hideStart(){
    startOverlay.style.display = 'none';
  }
  function showStart(){
    startOverlay.style.display = 'flex';
  }

  // --- Buttons wiring ---
  btnDebug.addEventListener('click', ()=>{
    state.debugVisible = !state.debugVisible;
    diag.style.display = state.debugVisible ? 'block' : 'none';
  });

  btnCenter.addEventListener('click', ()=> game.center());
  btnCenter2.addEventListener('click', ()=> game.center());

  btnFs.addEventListener('click', ()=> requestFullscreen(document.documentElement));
  btnFsTop.addEventListener('click', ()=> requestFullscreen(document.documentElement));
  btnFsSide.addEventListener('click', ()=> requestFullscreen(document.documentElement));

  btnReset.addEventListener('click', ()=>{
    // hier könnte später Persistenz gelöscht werden
    showToast('Zurückgesetzt – starte neu.');
    // einfache „Soft‑Reset“: wieder Startkarte anzeigen
    showStart();
  });

  btnStart.addEventListener('click', ()=>{
    try{
      hideStart();
      startGameNow();
    }catch(err){
      showToast('Start fehlgeschlagen: ' + err.message);
      showStart();
    }
  });

  // Tools (links)
  toolButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      toolButtons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const tool = b.getAttribute('data-tool');
      game.setTool(tool);
      hudTool.textContent = tool==='pointer' ? 'Zeiger' :
                            tool==='road' ? 'Straße' :
                            tool==='hq' ? 'HQ' :
                            tool==='woodcutter' ? 'Holzfäller' :
                            tool==='depot' ? 'Depot' : 'Abriss';
    });
  });

  // Doppeltipp auf die Zeichenfläche → Vollbild (wenn erlaubt)
  let lastTap = 0;
  canvas.addEventListener('pointerdown', (e)=>{
    const now = performance.now();
    if (now - lastTap < 300){
      requestFullscreen(document.documentElement);
      lastTap = 0;
    }else{
      lastTap = now;
    }
  }, {passive:true});

  // Klick‑Echo (unten links als rote Koordinatenzeile) für Fehleranalyse
  document.addEventListener('pointerdown', (e)=>{
    if (!state.debugVisible) return;
    const s = `click: ${e.clientX.toFixed(0)}×${e.clientY.toFixed(0)}  type=${e.pointerType}`;
    const lines = diag.textContent.split('\n').filter(Boolean);
    lines.push(s);
    logDiag(lines.slice(-10));
  }, {passive:true});

  // --- Start Game glue ---
  function startGameNow(){
    game.startGame({
      canvas,
      onHUD: (k,v)=>{
        // HUD-Schreiblogik (nur Keys, die in game.js gemeldet werden)
        if (k === 'Zoom') hudZoom.textContent = v;
        if (k === 'Tool') hudTool.textContent = v;
        if (k === 'Wood') hudWood.textContent = v;
        if (k === 'Stone') hudStone.textContent = v;
        if (k === 'Food') hudFood.textContent = v;
        if (k === 'Gold') hudGold.textContent = v;
        if (k === 'Carriers') hudCar.textContent = v;
      }
    });

    // Start‑Tool standardmäßig: Zeiger
    const btnPointer = document.querySelector('[data-tool="pointer"]');
    if (btnPointer){
      toolButtons.forEach(x=>x.classList.remove('active'));
      btnPointer.classList.add('active');
    }

    // Erstdiagnose anzeigen
    if (state.debugVisible) {
      logDiag([
        'V14.7 boot ✓',
        'HUD/Buttons ✓',
        'Start() → running',
        'Tippe „Debug“ erneut zum Verstecken.'
      ]);
    }
  }

  // Optional: gleich Debug sichtbar starten (zum Testen aus/ein)
  // state.debugVisible = true; diag.style.display = 'block';

  // Beim Laden: Startkarte zeigen
  showStart();

  // Resize/Fullscreen Events → Canvas neu messen
  function onResize(){ 
    // game.js handled intern resize; hier keine Logik nötig,
    // aber wir können die HUD/Diag stabil halten.
  }
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);

  // iOS: Back/Forward Cache „bfcache“ → harte Reinit
  window.addEventListener('pageshow', (e)=>{
    if (e.persisted){
      location.reload();
    }
  });
})();
