import { game } from './game.js?v=152';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const ui = {
  canvas: $('#canvas'),
  hudZoom: $('#hudZoom'),
  hudTool: $('#hudTool'),
  btnCenter: $('#btnCenter'),
  btnDebug: $('#btnDebug'),
  btnFull: $('#btnFull'),
  startCard: $('#startCard'),
  btnStart: $('#btnStart'),
  btnFs: $('#btnFs'),
  btnReset: $('#btnReset'),
  btnErase: $('#btnErase'),
  btnBuild: $('#btnBuild'),
  sheet: $('#buildSheet'),
  tabs: $$('#buildTabs .tab'),
  grid: $('#buildGrid'),
  closeBuild: $('#btnCloseBuild'),
  dbg: $('#dbg'),
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
  ui.grid.innerHTML='';
  for (const it of BUILD_ITEMS[cat]){
    const b=document.createElement('button');
    b.className='tileBtn';
    b.innerHTML=`<div class="tileIcon">${it.icon}</div><span>${it.label}</span>`;
    b.addEventListener('click', ()=>{
      game.setTool(it.id);
      setHudTool(it.id);
      hideSheet(true); // Tool behalten
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
  if (fs) { fs.call(el).catch(()=>{}); }
}

function bindStart(){
  ui.btnStart.addEventListener('click', ()=>{
    ui.startCard.remove();
    game.startGame({
      canvas: ui.canvas,
      onHUD: (k,v)=>{ if (k==='Zoom') ui.hudZoom.textContent=v; if (k==='Tool') ui.hudTool.textContent=v; },
      onDebug: (s)=>{ ui.dbg.hidden=false; ui.dbg.textContent=s; },
    });
  });
  ui.btnReset.addEventListener('click', ()=>location.reload());
  ui.btnFs.addEventListener('click', fullscreen);
  ui.btnFull.addEventListener('click', fullscreen);

  // Doppeltipp Vollbild (Canvas)
  let lastTap=0;
  ui.canvas.addEventListener('touchend',(e)=>{
    const now=Date.now();
    if (now-lastTap<300) fullscreen();
    lastTap=now;
  },{passive:true});
}

function bindHud(){
  ui.btnCenter.addEventListener('click', ()=>game.center());
  ui.btnDebug.addEventListener('click', ()=>{
    game.toggleDebug?.();
    ui.dbg.hidden = !ui.dbg.hidden;
  });
}

function openSheet(){ ui.sheet.classList.add('open'); ui.sheet.setAttribute('aria-hidden','false'); }
function hideSheet(keepTool=false){
  ui.sheet.classList.remove('open'); ui.sheet.setAttribute('aria-hidden','true');
  if (!keepTool){ game.setTool('pointer'); setHudTool('pointer'); }
}

function bindBuild(){
  ui.btnBuild.addEventListener('click', ()=>{ renderGrid(getActiveCat()); openSheet(); });
  ui.btnErase.addEventListener('click', ()=>{ game.setTool('erase'); setHudTool('erase'); });

  ui.tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      ui.tabs.forEach(x=>x.classList.toggle('active', x===t));
      renderGrid(t.dataset.cat);
    });
  });
  ui.closeBuild.addEventListener('click', ()=>hideSheet(false));

  // Sheet-Swipe zum Schließen
  let y0=null;
  ui.sheet.addEventListener('touchstart', e=>{ y0=e.touches[0].clientY; }, {passive:true});
  ui.sheet.addEventListener('touchmove', e=>{
    if (y0==null) return;
    if ((e.touches[0].clientY - y0) > 80){ y0=null; hideSheet(false); }
  }, {passive:true});
  ui.sheet.addEventListener('touchend', ()=>{ y0=null; });
}
function getActiveCat(){ const a=ui.tabs.find(t=>t.classList.contains('active')); return a? a.dataset.cat : 'core'; }

/* Debug verschiebbar */
(function makeDebugDraggable(){
  const el=ui.dbg; el.style.touchAction='none';
  let drag=false,sx=0,sy=0,sl=0,st=0;
  const down=(e)=>{ drag=true;
    const r=el.getBoundingClientRect(); el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.right=''; el.style.bottom='';
    sx=('touches'in e?e.touches[0].clientX:e.clientX); sy=('touches'in e?e.touches[0].clientY:e.clientY); sl=r.left; st=r.top; e.preventDefault();
  };
  const move=(e)=>{ if(!drag) return; const cx=('touches'in e?e.touches[0].clientX:e.clientX); const cy=('touches'in e?e.touches[0].clientY:e.clientY);
    el.style.left=(sl+cx-sx)+'px'; el.style.top=(st+cy-sy)+'px'; };
  const up = ()=>{ drag=false; };
  el.addEventListener('pointerdown',down); el.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  el.addEventListener('touchstart',down,{passive:false}); el.addEventListener('touchmove',move,{passive:false}); el.addEventListener('touchend',up);
})();

bindStart();
bindHud();
bindBuild();
