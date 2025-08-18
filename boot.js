// Siedler‑Mini V14.7 (Mobil) — Boot/Glue
// -------------------------------------------------------------
// Verdrahtet DOM ↔ game.js, Start‑Overlay, Fullscreen, Debug/Diag,
// Tool‑Buttons, HUD‑Writer. Canvas‑Größe wird in game.js korrekt
// gesetzt (DPR, Resize/FS). Diese Datei fasst nur die "App‑Shell".
// -------------------------------------------------------------

import { game } from './game.js';

// --- Optional vorgesehene Module (später aktivierbar) --------
// import { spriteSystem } from './sprites.js';   // Träger mit PNG+JSON
// import { audio } from './audio.js';            // SFX/BGM
// import { save } from './save.js';              // Persistenz (localStorage)
// -------------------------------------------------------------

(function boot(){
  // Mini‑Query‑Helpers
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ==== DOM‑Refs ====
  // WICHTIG: #game muss ein echtes <canvas> sein (siehe index.html)
  const canvas    = $('#game');

  const hudZoom   = $('#hudZoom');
  const hudTool   = $('#hudTool');
  const hudWood   = $('#hudWood');
  const hudStone  = $('#hudStone');
  const hudFood   = $('#hudFood');
  const hudGold   = $('#hudGold');
  const hudCar    = $('#hudCar');

  const startOverlay = $('#startOverlay');
  const btnStart     = $('#btnStart');
  const btnReset     = $('#btnReset');
  const btnFs        = $('#btnFs');
  const btnFsTop     = $('#btnFsTop');
  const btnCenter    = $('#btnCenter');
  const btnCenter2   = $('#btnCenter2');

  const btnDebug     = $('#btnDebug');
  const diag         = $('#diag');
  const toast        = $('#toast');

  const toolButtons  = $$('#tools .btn');

  // ==== Debug/Diag/Toast ====
  const ui = {
    debugVisible: false,
    showToast(msg, ms=4200){
      toast.textContent = msg;
      toast.style.display = 'block';
      clearTimeout(ui._t); ui._t = setTimeout(()=> toast.style.display='none', ms);
    },
    log(lines){
      if (!ui.debugVisible) return;
      diag.textContent = lines.join('\n');
    }
  };

  // Globale Fehler abfangen → Toast (und ggf. Diag)
  window.addEventListener('error', (e)=>{
    ui.showToast('JS‑Fehler: ' + (e.message || e.error || e));
  });
  window.addEventListener('unhandledrejection', (e)=>{
    ui.showToast('Promise‑Fehler: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  // ==== Fullscreen (mit iOS WebKit Fallback) ====
  async function requestFullscreen(el){
    try{
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else ui.showToast('Vollbild wird von diesem Gerät/Browser nicht unterstützt.');
    }catch(err){
      ui.showToast('Vollbild verweigert: ' + err.message);
    }
  }

  // Start‑Overlay Sichtbarkeit
  const hideStart = ()=> startOverlay.style.display = 'none';
  const showStart = ()=> startOverlay.style.display = 'flex';

  // ==== Buttons ====
  btnDebug.addEventListener('click', ()=>{
    ui.debugVisible = !ui.debugVisible;
    diag.style.display = ui.debugVisible ? 'block' : 'none';
  });

  btnCenter.addEventListener('click', ()=> game.center());
  btnCenter2.addEventListener('click', ()=> game.center());

  btnFs.addEventListener('click',    ()=> requestFullscreen(document.documentElement));
  btnFsTop.addEventListener('click', ()=> requestFullscreen(document.documentElement));

  btnReset.addEventListener('click', ()=>{
    // Placeholder: später Persistenz löschen (save.clear() o.ä.)
    ui.showToast('Zurückgesetzt – starte neu.');
    showStart();
  });

  btnStart.addEventListener('click', ()=>{
    try{
      hideStart();
      startGameNow();
    }catch(err){
      ui.showToast('Start fehlgeschlagen: ' + err.message);
      showStart();
    }
  });

  // Tool‑Buttons (linke Leiste)
  toolButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      toolButtons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');

      const t = b.getAttribute('data-tool');
      game.setTool(t);

      // HUD sauber benennen (Deutsch)
      hudTool.textContent =
          t==='pointer'     ? 'Zeiger'     :
          t==='road'        ? 'Straße'     :
          t==='hq'          ? 'HQ'         :
          t==='woodcutter'  ? 'Holzfäller' :
          t==='depot'       ? 'Depot'      : 'Abriss';
    });
  });

  // Doppeltipp direkt auf die Zeichenfläche → Vollbild
  let lastTap = 0;
  canvas.addEventListener('pointerdown', ()=>{
    const now = performance.now();
    if (now - lastTap < 300){
      requestFullscreen(document.documentElement);
      lastTap = 0;
    } else lastTap = now;
  }, {passive:true});

  // ==== Game‑Start Glue ====
  function startGameNow(){
    // Sicherheitsnetz: Canvas wirklich <canvas>?
    if (!(canvas instanceof HTMLCanvasElement)){
      ui.showToast('Fehler: #game ist kein <canvas>. Prüfe index.html.');
      return;
    }

    // Start game – HUD‑Writer gibt alle von game.js gemeldeten Werte durch
    game.startGame({
      canvas,
      onHUD: (k,v)=>{
        if (k === 'Zoom')      hudZoom.textContent = v;
        if (k === 'Tool')      hudTool.textContent = v;
        if (k === 'wood')      hudWood.textContent = v;
        if (k === 'stone')     hudStone.textContent = v;
        if (k === 'food')      hudFood.textContent = v;
        if (k === 'gold')      hudGold.textContent = v;
        if (k === 'carriers')  hudCar.textContent = v;
      }
    });

    // Start‑Tool optisch auf „Zeiger“
    const btnPointer = document.querySelector('[data-tool="pointer"]');
    if (btnPointer){
      toolButtons.forEach(x=>x.classList.remove('active'));
      btnPointer.classList.add('active');
    }

    // Optional: Sprite/Audiosystem initialisieren (später aktivieren)
    // spriteSystem.init({ assetsBase: 'assets/' });
    // audio.init();

    if (ui.debugVisible){
      ui.log([
        'Boot V14.7 ✓',
        'Canvas ok ✓',
        'Game gestartet ✓',
        'Tippe „Debug“ erneut zum Verstecken.'
      ]);
    }
  }

  // Beim Laden: Startkarte anzeigen
  showStart();

  // iOS Back/Forward‑Cache → immer frisch initialisieren
  window.addEventListener('pageshow', (e)=>{ if (e.persisted) location.reload(); });

  // Resize/FS‑Events: game.js handled Canvas‑Resize intern;
  // wir halten hier nur Platz falls wir später UI anpassen wollen.
  const onResize = ()=>{};
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);
})();
