import { addZoom, pan, screenToWorld } from './camera.js';

let tool = 'pointer';
let canvasRef = null;
let buildTapCb = ()=>{};

export function initInput(canvas, onTapBuild){
  canvasRef = canvas;
  buildTapCb = onTapBuild;

  // Touch
  let last1=null, lastDist=null, mode='idle';
  canvas.addEventListener('touchstart', (e)=>{
    if(e.touches.length===1){
      last1 = {x:e.touches[0].clientX, y:e.touches[0].clientY};
      mode='one';
    }else if(e.touches.length===2){
      lastDist = dist(e.touches[0], e.touches[1]);
      mode='two';
    }
  },{passive:false});

  canvas.addEventListener('touchmove',(e)=>{
    if(mode==='one' && tool==='pointer'){
      const p = {x:e.touches[0].clientX, y:e.touches[0].clientY};
      const dx = (p.x-last1.x) / 64; // Pan-Sensitivität
      const dy = (p.y-last1.y) / 64;
      pan(-dx, -dy);
      last1 = p;
    }else if(mode==='two'){
      const d = dist(e.touches[0],e.touches[1]);
      if(lastDist){
        const factor = Math.pow(d/lastDist, 1.0);
        addZoom(factor);
      }
      lastDist = d;
    }
    e.preventDefault();
  },{passive:false});

  canvas.addEventListener('touchend',(e)=>{
    if(mode==='one' && e.touches.length===0){
      // kurzer Tap = bauen
      if (tool!=='pointer' && last1){
        buildTapCb(last1.x, last1.y);
      }
      mode='idle'; last1=null; lastDist=null;
    }else if(mode==='two' && e.touches.length<2){
      mode='idle'; last1=null; lastDist=null;
    }
  });

  // Maus
  let isDrag=false, mLast=null;
  canvas.addEventListener('mousedown', (e)=>{
    if (tool==='pointer'){ isDrag=true; mLast={x:e.clientX,y:e.clientY}; }
    else { buildTapCb(e.clientX,e.clientY); }
  });
  window.addEventListener('mousemove',(e)=>{
    if(isDrag && mLast){
      const dx = (e.clientX-mLast.x)/64;
      const dy = (e.clientY-mLast.y)/64;
      pan(-dx,-dy); mLast={x:e.clientX,y:e.clientY};
    }
  });
  window.addEventListener('mouseup', ()=>{ isDrag=false; mLast=null; });

  canvas.addEventListener('wheel',(e)=>{
    const factor = e.deltaY<0 ? 1.1 : 0.9;
    addZoom(factor);
  }, {passive:true});

  // Toolbar
  setToolButtonHandlers();
}

function dist(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

/* Tool control */
export function setToolButtonHandlers(onChange){
  document.querySelectorAll('#tools .tool').forEach(btn=>{
    btn.onclick = ()=>{ setTool(btn.dataset.tool); onChange && onChange(); };
  });
}
export function setTool(t){ tool=t; }
export function getTool(){ return tool; }
