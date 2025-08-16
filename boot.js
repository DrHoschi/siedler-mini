import { game } from './game.js?v=150';

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
  tools: $$('#tools .btn'),
  hudTool: qs('#hudTool'),
  hudZoom: qs('#hudZoom'),
  dbg: qs('#dbg'),
};

function setToolActive(name){
  ui.tools.forEach(b=>{
    const active = b.dataset.tool === name;
    b.classList.toggle('active', active);
  });
  ui.hudTool.textContent = name==='pointer'?'Zeiger':
                           name==='road'?'Straße':
                           name==='hq'?'HQ':
                           name==='woodcutter'?'Holzfäller':
                           name==='depot'?'Depot':'Abriss';
}

function fullscreen() {
  const el = document.documentElement;
  const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (fs) fs.call(el).catch(()=>{});
}

function exitFS(){
  const ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (ex) ex.call(document).catch(()=>{});
}

function bindStartButtons(){
  ui.btnStart.addEventListener('click', ()=>{
    ui.startCard.remove();
    game.startGame({
      canvas: ui.canvas,
      onHUD: (k,v)=>{
        if (k==='Zoom' && ui.hudZoom) ui.hudZoom.textContent = v;
        if (k==='Tool' && ui.hudTool) ui.hudTool.textContent = v;
      },
      onDebug: (s)=>{ if (ui.dbg) { ui.dbg.hidden=false; ui.dbg.textContent=s; } }
    });
    setToolActive('pointer');
  });

  ui.btnReset.addEventListener('click', ()=>{
    location.reload();
  });

  const askFS = ()=>fullscreen();
  ui.btnFs.addEventListener('click', askFS);
  ui.btnFullTop.addEventListener('click', askFS);

  // Doppeltipp auf Canvas → Vollbild
  let lastTap=0;
  ui.canvas.addEventListener('touchend', (e)=>{
    const now = Date.now();
    if (now - lastTap < 300) { fullscreen(); }
    lastTap = now;
  }, {passive:true});
}

function bindTools(){
  ui.tools.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tool = btn.dataset.tool;
      game.setTool(tool);
      setToolActive(tool);
    });
  });

  ui.btnCenter.addEventListener('click', ()=>game.center());
  ui.btnDebug.addEventListener('click', ()=>game.toggleDebug?.());
}

bindStartButtons();
bindTools();
