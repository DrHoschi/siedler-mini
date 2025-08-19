// Siedler-Mini V14.7-hf2 (Mobil) — BOOT/GLUE
// Verdrahtet DOM ↔ game.js, Debug/Diag, Fullscreen, Start-Overlay, Pfad-Checker-Toggle.

import { game } from './game.js';

(function boot(){
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // DOM refs (vorhandene IDs aus deiner index.html)
  const canvas      = $('#game');
  const hudZoom     = $('#hudZoom');
  const hudTool     = $('#hudTool');
  const hudWood     = $('#hudWood');
  const hudStone    = $('#hudStone');
  const hudFood     = $('#hudFood');
  const hudGold     = $('#hudGold');
  const hudCar      = $('#hudCar');
  const diag        = $('#diag') || (()=>{ const d=document.createElement('pre'); d.id='diag'; d.style.display='none'; d.style.position='fixed'; d.style.left='8px'; d.style.bottom='8px'; d.style.maxWidth='70vw'; d.style.maxHeight='40vh'; d.style.overflow='auto'; d.style.background='rgba(0,0,0,.55)'; d.style.color='#cfe3ff'; d.style.padding='8px 10px'; d.style.border='1px solid #1e2d42'; d.style.borderRadius='8px'; d.style.zIndex='9999'; document.body.appendChild(d); return d; })();

  // Start-Overlay & Buttons
  const startOverlay = $('#startOverlay');
  const btnStart     = $('#btnStart');
  const btnReset     = $('#btnReset');
  const btnFs        = $('#btnFs');
  const btnFsTop     = $('#btnFsTop');
  const btnFsSide    = $('#btnFsSide');
  const btnDebug     = $('#btnDebug') || addTopBtn('btnDebug', 'Debug');
  const btnCenter    = $('#btnCenter') || addTopBtn('btnCenter', 'Zentrieren');
  const btnCenter2   = $('#btnCenter2'); // optional vorhanden

  // ► Neuer Pfad-Checker Button (falls nicht vorhanden, wird er erzeugt)
  let btnPath = $('#btnPath');
  if (!btnPath) btnPath = addTopBtn('btnPath', 'Pfad');

  // simple Toast
  const toast = $('#toast') || (()=>{ const t=document.createElement('div'); t.id='toast'; t.style.position='fixed'; t.style.left='50%'; t.style.bottom='14px'; t.style.transform='translateX(-50%)'; t.style.background='#122131'; t.style.border='1px solid #1e2d42'; t.style.borderRadius='10px'; t.style.color='#cfe3ff'; t.style.padding='8px 12px'; t.style.boxShadow='0 10px 40px rgba(0,0,0,.35)'; t.style.display='none'; t.style.zIndex='9999'; document.body.appendChild(t); return t; })();

  function addTopBtn(id, label){
    // rechts oben Sammelleiste suchen/erstellen
    let bar = document.querySelector('#hudRight');
    if (!bar){
      bar = document.createElement('div');
      bar.id = 'hudRight';
      bar.style.position='fixed';
      bar.style.top='64px';
      bar.style.right='8px';
      bar.style.display='flex';
      bar.style.gap='8px';
      bar.style.zIndex='3';
      document.body.appendChild(bar);
    }
    const b = document.createElement('button');
    b.id = id;
    b.className = 'btn';
    b.textContent = label;
    bar.appendChild(b);
    return b;
  }

  // --- Diagnose/Debug helpers ---
  const state = {
    debugVisible: false
  };

  function logDiag(lines){
    if (!state.debugVisible) return;
    diag.textContent = lines.join('\n');
  }
  function showToast(msg){
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toast.style.display='none', 4200);
  }

  // Globale JS-Fehler → Toast
  window.addEventListener('error', (e)=>{
    showToast('JS-Fehler: ' + (e.message || e.error || e));
  });
  window.addEventListener('unhandledrejection', (e)=>{
    showToast('Promise-Fehler: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  // Debug-Event von game.js (siedler:log) → Diag
  const recent = [];
  window.addEventListener('siedler:log', e=>{
    const d = e.detail||{};
    recent.push(`[${d.tag||'log'}] ${d.msg||''} ${d.err?('('+d.err+')'):''}`);
    while(recent.length>12) recent.shift();
    logDiag(recent);
  });

  // --- Fullscreen (inkl. iOS-Fallback) ---
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

  function hideStart(){ if (startOverlay) startOverlay.style.display='none'; }
  function showStart(){ if (startOverlay) startOverlay.style.display='flex'; }

  // --- Buttons wiring ---
  if (btnDebug) btnDebug.addEventListener('click', ()=>{
    state.debugVisible = !state.debugVisible;
    diag.style.display = state.debugVisible ? 'block' : 'none';
    if (state.debugVisible) logDiag(['Debug an ✓']);
  });

  if (btnCenter) btnCenter.addEventListener('click', ()=> game.center());
  if (btnCenter2) btnCenter2.addEventListener('click', ()=> game.center());

  if (btnFs)     btnFs.addEventListener('click', ()=> requestFullscreen(document.documentElement));
  if (btnFsTop)  btnFsTop.addEventListener('click', ()=> requestFullscreen(document.documentElement));
  if (btnFsSide) btnFsSide.addEventListener('click', ()=> requestFullscreen(document.documentElement));

  if (btnReset) btnReset.addEventListener('click', ()=>{
    showToast('Zurückgesetzt – starte neu.');
    showStart();
  });

  if (btnStart) btnStart.addEventListener('click', ()=>{
    try{ hideStart(); startGameNow(); }
    catch(err){ showToast('Start fehlgeschlagen: ' + err.message); showStart(); }
  });

  // ► Pfad-Checker Toggle
  if (btnPath) {
    btnPath.addEventListener('click', ()=>{
      const enabled = game.togglePathOverlay();
      btnPath.classList.toggle('active', enabled);
      showToast('Pfad-Overlay: ' + (enabled?'AN':'AUS'));
    });
  }

  // -------------------------------------------------------------------
  // NEU: Baumenü-Integration (#buildDock / #buildList) statt #tools
  // -------------------------------------------------------------------
  const buildToggle = $('#buildToggle');         // Button "Baumenü"
  const buildList   = $('#buildList');           // Container mit Tool-Buttons
  if (buildToggle && buildList){
    // Ein-/Ausklappen
    buildToggle.addEventListener('click', () => {
      const show = buildList.hasAttribute('hidden');
      if (show) buildList.removeAttribute('hidden'); else buildList.setAttribute('hidden','');
    });
  }

  // ALT (entfernt): const toolButtons  = $$('#tools .btn');
  // NEU: Tool-Buttons kommen aus #buildList
  const toolButtons = buildList ? Array.from(buildList.querySelectorAll('.btn')) : [];

  // Tools (Baumenü)
  toolButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      toolButtons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const tool = b.getAttribute('data-tool');
      game.setTool(tool);
      if (hudTool){
        hudTool.textContent = tool==='pointer' ? 'Zeiger' :
                              tool==='road' ? 'Straße' :
                              tool==='hq' ? 'HQ' :
                              tool==='woodcutter' ? 'Holzfäller' :
                              tool==='depot' ? 'Depot' : 'Abriss';
      }
    });
  });

  // Doppeltipp auf Zeichenfläche → Vollbild
  let lastTap = 0;
  if (canvas) canvas.addEventListener('pointerdown', (e)=>{
    const now = performance.now();
    if (now - lastTap < 300){
      requestFullscreen(document.documentElement);
      lastTap = 0;
    }else lastTap = now;
  }, {passive:true});

  // Klick-Echo in Diag
  document.addEventListener('pointerdown', (e)=>{
    if (!state.debugVisible) return;
    const s = `click: ${e.clientX|0}×${e.clientY|0}  type=${e.pointerType}`;
    const lines = diag.textContent.split('\n').filter(Boolean);
    lines.push(s);
    logDiag(lines.slice(-12));
  }, {passive:true});

  // Start Game glue
  function startGameNow(){
    game.startGame({
      canvas,
      onHUD: (k,v)=>{
        if (k === 'Zoom' && hudZoom) hudZoom.textContent = v;
        if (k === 'Tool' && hudTool) hudTool.textContent = v;
        if (k === 'Wood' && hudWood) hudWood.textContent = v;
        if (k === 'Stone' && hudStone) hudStone.textContent = v;
        if (k === 'Food' && hudFood) hudFood.textContent = v;
        if (k === 'Gold' && hudGold) hudGold.textContent = v;
        if (k === 'Carriers' && hudCar) hudCar.textContent = v;
      }
    });

    // Start-Tool = Zeiger markieren (im Baumenü)
    const btnPointer = document.querySelector('#buildList [data-tool="pointer"]');
    if (btnPointer){
      toolButtons.forEach(x=>x.classList.remove('active'));
      btnPointer.classList.add('active');
    }

    logDiag(['V14.7 boot ✓','HUD/Buttons ✓','Start() → running','Tippe „Debug“ erneut zum Verstecken.']);
  }

  // Resize Hooks
  function onResize(){ /* game.js handled intern resize */ }
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);

  // iOS bfcache → hard reload
  window.addEventListener('pageshow', (e)=>{ if (e.persisted) location.reload(); });

  // Startkarte initial
  showStart();

  // Optional: Body-Klassen je nach Orientierung (falls du sie brauchst)
  // (CSS funktioniert bereits über @media, das hier ist nur als Hook)
  function updateOrientationClass(){
    document.body.classList.toggle('is-portrait',  matchMedia('(orientation: portrait)').matches);
    document.body.classList.toggle('is-landscape', matchMedia('(orientation: landscape)').matches);
  }
  updateOrientationClass();
  window.addEventListener('resize', updateOrientationClass, {passive:true});
  window.addEventListener('orientationchange', updateOrientationClass);

})();
