// main.js – richtet Canvas/HUD ein und startet das Spiel (game.js)

import * as game from './game.js?v=14.4';

const $ = (s)=>document.querySelector(s);

async function run(){
  const canvas = $('#game');
  const ctx = canvas.getContext('2d', { alpha:false });
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // HUD binding
  const setHUD = (key, val) => {
    const el = $('#hud'+key);
    if (el) el.textContent = String(val);
  };

  // Resize helper
  function resize(){
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
    if (api?.setSize) api.setSize(w, h);
    if (api?.draw) api.draw();
  }
  window.addEventListener('resize', resize, { passive:true });

  // Start game (oder Platzhalter wenn irgendwas fehlt)
  let api;
  try{
    if (typeof game.startGame !== 'function') throw new Error('game.startGame fehlt.');
    api = game.startGame({
      canvas, ctx, DPR,
      onHUD: (k,v)=>setHUD(k, v),
      onTool: (name)=>{ $('#hudTool').textContent = name; },
      onZoom: (z)=>{ $('#hudZoom').textContent = z.toFixed(2)+'x'; }
    });
  }catch(e){
    console.warn('Fallback auf Platzhalter‑Renderer:', e);
    api = fallbackRenderer({canvas, ctx, DPR});
  }

  // Tools (nur visuelles Umschalten + Callback ins Spiel)
  const toolButtons = [
    ['toolPointer','Zeiger'],
    ['toolRoad','Straße'],
    ['toolHQ','HQ'],
    ['toolLumber','Holzfäller'],
    ['toolDepot','Depot'],
    ['toolBulldoze','Abriss'],
  ];
  function setTool(id, label){
    toolButtons.forEach(([bid])=>{
      $('#'+bid).classList.toggle('active', bid===id);
    });
    api?.setTool?.(label);
  }
  toolButtons.forEach(([id,label])=>{
    $('#'+id).addEventListener('click', ()=>setTool(id,label));
  });
  setTool('toolPointer','Zeiger');

  $('#btnCenter').onclick = ()=> api?.center?.();
  $('#btnDebug').onclick  = ()=> api?.toggleDebug?.();

  resize();
  api?.draw?.();
  return api;
}

// Platzhalter‑Renderer falls dein echtes Spiel noch nicht da ist
function fallbackRenderer({canvas, ctx, DPR}){
  let W=0, H=0, zoom=1, cx=0, cy=0, debug=false, tool='Zeiger';

  function setSize(w,h){ W=w; H=h; }
  function center(){ cx=0; cy=0; zoom=1; draw(); }
  function setTool(name){ tool = name; }
  function toggleDebug(){ debug=!debug; draw(); }

  function worldToScreen(x,y){ return [x*zoom + W/2 + cx, y*zoom + H/2 + cy]; }
  function drawGrid(){
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    const step = 120*zoom;
    ctx.globalAlpha = .18;
    ctx.strokeStyle = '#2b3b53';
    for(let x=((W/2+cx)%step); x<W; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=((H/2+cy)%step); y<H; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawHQ(){
    const rw=360*zoom, rh=210*zoom;
    const [x,y] = worldToScreen(-rw/2, -rh/2 + 80*zoom);
    ctx.fillStyle='#2ba14a';
    ctx.fillRect(x,y,rw,rh);
    ctx.fillStyle='#cfe3ff';
    ctx.font = `${Math.max(26*zoom, 20)}px system-ui, -apple-system, Segoe UI`;
    ctx.fillText('HQ (Platzhalter)', x - 120*zoom, y - 14*zoom);
  }
  function draw(){
    drawGrid();
    drawHQ();
    if (debug){
      ctx.fillStyle='#cfe3ff'; ctx.globalAlpha=.8;
      ctx.fillText(`Zoom ${zoom.toFixed(2)}x`, 16, 24);
      ctx.globalAlpha=1;
    }
  }

  // Panning & Zoom (simple, reicht für Platzhalter)
  let panning=false, px=0, py=0;
  canvas.addEventListener('pointerdown', (e)=>{
    if (tool!=='Zeiger') return;
    panning=true; px=e.clientX; py=e.clientY; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e)=>{
    if (!panning) return;
    cx += (e.clientX - px);
    cy += (e.clientY - py);
    px = e.clientX; py = e.clientY;
    draw();
  });
  canvas.addEventListener('pointerup', ()=>{ panning=false; });

  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const dz = Math.exp(-e.deltaY * 0.0015);
    zoom = Math.min(2.5, Math.max(0.4, zoom*dz));
    draw();
  }, {passive:false});

  return { setSize, draw, center, setTool, toggleDebug };
}

export default { run };
