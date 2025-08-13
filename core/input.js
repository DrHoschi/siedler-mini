// /core/input.js
export function installMobileInput(canvas, {onTap,onPan,onPinch}){
  let lastTouches = [];
  let panning = false;

  const getDist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  canvas.addEventListener('touchstart', e=>{
    if(!e.touches.length) return;
    lastTouches = [...e.touches];
    if(e.touches.length===1) panning = true;
  }, {passive:false});

  canvas.addEventListener('touchmove', e=>{
    if(!e.touches.length) return;
    const ts = [...e.touches];
    if(ts.length===1 && panning){
      const dx = ts[0].clientX - lastTouches[0].clientX;
      const dy = ts[0].clientY - lastTouches[0].clientY;
      onPan?.(dx,dy);
    } else if(ts.length===2 && lastTouches.length===2){
      const dNow = getDist(ts);
      const dPrev = getDist(lastTouches);
      const cx = (ts[0].clientX + ts[1].clientX)/2;
      const cy = (ts[0].clientY + ts[1].clientY)/2;
      onPinch?.(cx,cy, dNow-dPrev);
    }
    lastTouches = ts;
    e.preventDefault();
  }, {passive:false});

  canvas.addEventListener('touchend', e=>{
    if(lastTouches.length===1 && e.changedTouches.length===1){
      const t = e.changedTouches[0];
      onTap?.(t.clientX, t.clientY);
    }
    lastTouches = [...e.touches];
    if(!e.touches.length) panning=false;
  });
}

export function installMouseInput(canvas, {onTap,onPan,onWheel}){
  let isDown=false, lastX=0, lastY=0;
  canvas.addEventListener('mousedown', e=>{ isDown=true; lastX=e.clientX; lastY=e.clientY; });
  canvas.addEventListener('mousemove', e=>{
    if(!isDown) return;
    onPan?.(e.clientX-lastX, e.clientY-lastY);
    lastX=e.clientX; lastY=e.clientY;
  });
  window.addEventListener('mouseup', ()=>{ isDown=false; });
  canvas.addEventListener('click', e=> onTap?.(e.clientX,e.clientY));
  canvas.addEventListener('wheel', e=>{
    onWheel?.(e.clientX,e.clientY, e.deltaY);
    e.preventDefault();
  }, {passive:false});
}
