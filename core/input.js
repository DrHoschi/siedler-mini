// V14.1 – Touch/Maus Input (UI-Klicks nicht abfangen)
export function makeInput(canvas, onTap, onPan, onPinch, isPointerTool){
  let t1=null, t2=null, lastDist=0;
  const uiFilter = (ev)=> !!(ev.target.closest('.ui')); // UI‑Element?
  const opts = {passive:false};

  function onPointerDown(ev){
    if (uiFilter(ev)) return;         // UI klickbar lassen
    ev.preventDefault();
    const pt = getPoint(ev);
    if (!t1) t1={id:ev.pointerId, x:pt.x, y:pt.y};
    else if (!t2){ t2={id:ev.pointerId, x:pt.x, y:pt.y}; lastDist=dist(); }
  }
  function onPointerMove(ev){
    if (uiFilter(ev)) return;
    ev.preventDefault();
    const pt = getPoint(ev);
    if (t1 && t1.id===ev.pointerId) t1.x=pt.x, t1.y=pt.y;
    if (t2 && t2.id===ev.pointerId) t2.x=pt.x, t2.y=pt.y;

    if (t1 && t2){ // Pinch
      const d=dist();
      if (lastDist>0) onPinch(d/lastDist,(t1.x+t2.x)/2,(t1.y+t2.y)/2);
      lastDist=d;
    } else if (t1 && isPointerTool()){ // Pan nur im Zeiger‑Tool
      onPan(pt.dx, pt.dy);
    }
  }
  function onPointerUp(ev){
    if (uiFilter(ev)) return;
    ev.preventDefault();
    const pt=getPoint(ev);
    if (t1 && ev.pointerId===t1.id){
      // Tap?
      if (!t2 && Math.hypot(pt.totalDx,pt.totalDy)<10) onTap(pt.x,pt.y);
      t1=null;
    } else if (t2 && ev.pointerId===t2.id){ t2=null; lastDist=0; }
  }

  // Mauswheel Zoom
  function onWheel(ev){
    if (uiFilter(ev)) return;
    ev.preventDefault();
    const f = ev.deltaY>0 ? 0.9 : 1.1;
    onPinch(f, ev.clientX, ev.clientY);
  }

  // helpers
  let startX=0,startY=0,totalDx=0,totalDy=0,lastX=0,lastY=0;
  function getPoint(ev){
    const x=ev.clientX, y=ev.clientY;
    const dx = lastX? (x-lastX) : 0, dy = lastY? (y-lastY) : 0;
    lastX=x; lastY=y;
    if (!t1){ startX=x; startY=y; totalDx=0; totalDy=0; }
    else { totalDx += dx; totalDy += dy; }
    return {x,y,dx,dy,totalDx,totalDy};
  }
  function dist(){ return Math.hypot(t1.x-t2.x, t1.y-t2.y); }

  canvas.addEventListener('pointerdown',onPointerDown,opts);
  window.addEventListener('pointermove',onPointerMove,opts);
  window.addEventListener('pointerup',onPointerUp,opts);
  window.addEventListener('pointercancel',onPointerUp,opts);
  canvas.addEventListener('wheel',onWheel,opts);
}
