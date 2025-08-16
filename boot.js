import { game } from './game.js?v=151';

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
      // Tool setzen, Sheet schließen
      game.setTool(it.id);
      setHudTool(it.id);
      closeSheet();
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

function openSheet(){
  ui.sheet.classList.add('open');
  ui.sheet.setAttribute('aria-hidden','false');
}
function closeSheet(){
  ui.sheet.classList.remove('open');
  ui.sheet.setAttribute('aria-hidden','true');
  // Beim Schließen automatisch zurück auf Zeiger
  game.setTool('pointer');
  setHudTool('pointer');
}

function fullscreen() {
  const el = document.documentElement;
  const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (fs) fs.call(el).catch(()=>{});
}

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

function bindHud(){
  ui.btnCenter.addEventListener('click', ()=>game.center());
  ui.btnDebug.addEventListener('click', ()=>game.toggleDebug?.());
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
    // Abriss bleibt aktiv bis Sheet geöffnet/geschlossen wird oder HQ/Build gewählt
  });

  // Tabs
  ui.tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      ui.tabs.forEach(x=>x.classList.toggle('active', x===t));
      renderGrid(t.dataset.cat);
    });
  });

  ui.closeBuild.addEventListener('click', closeSheet);

  // Sheet-Swipe runter zum Schließen (kleines UX-Plus)
  let y0=null;
  ui.sheet.addEventListener('touchstart',(e)=>{ y0 = e.touches[0].clientY; },{passive:true});
  ui.sheet.addEventListener('touchmove',(e)=>{
    if (y0==null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy>80) { y0=null; closeSheet(); }
  },{passive:true});
  ui.sheet.addEventListener('touchend',()=>{ y0=null; });
}

function getActiveCat(){
  const active = ui.tabs.find(t=>t.classList.contains('active'));
  return active ? active.dataset.cat : 'core';
}

bindStart();
bindHud();
bindBuild();
