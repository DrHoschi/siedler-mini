import { game } from './game.js?v=151a';

const qs = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const ui = {
  canvas: qs('#canvas'),
  startCard: qs('#startCard'),
  btnStart: qs('#btnStart'),
  btnFs: qs('#btnFs'),
  btnReset: qs('#btnReset'),
  btnCenter: qs('#btnCenter'),
  btnDebug: qs('#btnDebug'),
  btnFullTop: qs('#btnFull'),
  dbg: qs('#dbg'),
  hudTool: qs('#hudTool'),
  hudZoom: qs('#hudZoom'),
  // Build
  btnBuild: qs('#btnBuild'),
  btnErase: qs('#btnErase'),
  sheet: qs('#buildSheet'),
  tabs: $$('#buildTabs .tab'),
  grid: qs('#buildGrid'),
  closeBuild: qs('#btnCloseBuild'),
};

const BUILD_ITEMS = {
  core: [
    {id:'hq', icon:'🏰', label:'HQ'},
    {id:'depot', icon:'📦', label:'Depot'},
  ],
  infra: [
    {id:'road', icon:'🛣️', label:'Straße'},
  ],
  prod: [
    {id:'woodcutter', icon:'🪓', label:'Holzfäller'},
  ],
};

function renderGrid(cat='core'){
  ui.grid.innerHTML = '';
  for (const it of BUILD_ITEMS[cat]){
    const b = document.createElement('button');
    b.className = 'tileBtn';
    b.innerHTML = `<div class="tileIcon">${it.icon}</div><span>${it.label}</span>`;
    b.addEventListener('click', ()=>{
      // 1) Tool setzen
      game.setTool(it.id);
      setHudTool(it.id);
      // 2) Sheet schließen, ABER Tool behalten!
      hideSheet(/*keepTool=*/true);
    });
    ui.grid.appendChild(b);
  }
}

function setHudTool(name){
  ui.hudTool.textContent =
    name==='road' ? 'Straße' :
    name==='hq' ? 'HQ' :
    name==='woodcutter' ? 'Holzfäller' :
    name==='depot' ? 'Depot' :
    name==='erase' ? 'Abriss' : 'Zeiger';
}

function fullscreen() {
  const el = document.documentElement;
  const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (fs) fs.call(el).catch(()=>{});
}

/* ===== Start / Reset / FS ===== */
function bindStart(){
  ui.btnStart.addEventListener('click', ()=>{
    ui.startCard.remove();
    game.startGame({
      canvas: ui.canvas,
      onHUD: (k,v)=>{
        if (k==='Zoom') ui.hudZoom.textContent = v;
        if (k==='Tool') ui.hudTool.textContent = v;
      },
      onDebug: (s)=>{ ui.dbg.hidden=false; ui.dbg.textContent=s; }
    });
  });
  ui.btnReset.addEventListener('click', ()=>location.reload());
  ui.btnFs.addEventListener('click', fullscreen);
  ui.btnFullTop.addEventListener('click', fullscreen);

  // Doppeltipp Vollbild
  let lastTap=0;
  ui.canvas.addEventListener('touchend',(e)=>{
    const now=Date.now();
    if (now-lastTap<300) fullscreen();
    lastTap=now;
  },{passive:true});
}

/* ===== HUD ===== */
function bindHud(){
  ui.btnCenter.addEventListener('click', ()=>game.center());
  ui.btnDebug.addEventListener('click', ()=>{
    game.toggleDebug?.();
    // Panel anzeigen
    ui.dbg.hidden = !ui.dbg.hidden;
  });
}

/* ===== Bau-Menü (Bottom Sheet) ===== */
function openSheet(){
  ui.sheet.classList.add('open');
  ui.sheet.setAttribute('aria-hidden','false');
}
function hideSheet(keepTool=false){
  ui.sheet.classList.remove('open');
  ui.sheet.setAttribute('aria-hidden','true');
  // Nur wenn explizit geschlossen (Button), zurück zum Zeiger
  if (!keepTool){
    game.setTool('pointer');
    setHudTool('pointer');
  }
}

function bindBuild(){
  // FAB: Bauen → Sheet auf
  ui.btnBuild.addEventListener('click', ()=>{
    renderGrid(getActiveCat());
    openSheet();
  });
  // FAB: Abriss
  ui.btnErase.addEventListener('click', ()=>{
    game.setTool('erase');
    setHudTool('erase');
  });

  // Tabs
  ui.tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      ui.tabs.forEach(x=>x.classList.toggle('active', x===t));
      renderGrid(t.dataset.cat);
    });
  });

  ui.closeBuild.addEventListener('click', ()=>hideSheet(false));

  // Sheet-Swipe: runter zum Schließen
  let y0=null;
  ui.sheet.addEventListener('touchstart',(e)=>{ y0 = e.touches[0].clientY; },{passive:true});
  ui.sheet.addEventListener('touchmove',(e)=>{
    if (y0==null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy>80) { y0=null; hideSheet(false); }
  },{passive:true});
  ui.sheet.addEventListener('touchend',()=>{ y0=null; });
}

function getActiveCat(){
  const active = ui.tabs.find(t=>t.classList.contains('active'));
  return active ? active.dataset.cat : 'core';
}

/* ===== Debug-Panel: dragbar + verschiebbar ===== */
(function makeDebugDraggable(){
  const el = ui.dbg;
  // Startposition rechts unten
  el.style.position = 'fixed';
  el.style.right = '8px';
  el.style.bottom = '8px';
  el.style.maxWidth = '60vw';
  el.style.maxHeight = '40vh';
  el.style.overflow = 'auto';
  el.style.touchAction = 'none';

  let dragging=false, sx=0, sy=0, startLeft=0, startTop=0;
  const onDown = (e)=>{
    dragging=true;
    // absolute Koords setzen, von right/bottom auf left/top umstellen
    const r = el.getBoundingClientRect();
    el.style.right = ''; el.style.bottom = '';
    el.style.left = `${r.left}px`; el.style.top = `${r.top}px`;
    sx = ('touches' in e)? e.touches[0].clientX : e.clientX;
    sy = ('touches' in e)? e.touches[0].clientY : e.clientY;
    startLeft = r.left; startTop = r.top;
    e.preventDefault();
  };
  const onMove = (e)=>{
    if (!dragging) return;
    const cx = ('touches' in e)? e.touches[0].clientX : e.clientX;
    const cy = ('touches' in e)? e.touches[0].clientY : e.clientY;
    const dx = cx - sx, dy = cy - sy;
    el.style.left = `${startLeft + dx}px`;
    el.style.top  = `${startTop + dy}px`;
  };
  const onUp = ()=>{ dragging=false; };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  // auch Touch (Fallback auf älteren iOS)
  el.addEventListener('touchstart', onDown, {passive:false});
  el.addEventListener('touchmove', onMove, {passive:false});
  el.addEventListener('touchend', onUp);
})();

bindStart();
bindHud();
bindBuild();
