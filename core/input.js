// Ein-Finger: Pan · Zwei-Finger: Pinch-Zoom · kurzer Tap: bauen (Callback)

export function setupInput(canvas, cam, {onTap,onChange}){
  let lastTouches=[];
  let lastDist=0;

  canvas.addEventListener('touchstart', e=>{
    lastTouches = [...e.touches].map(t=>({x:t.clientX,y:t.clientY}));
    if(e.touches.length===1) startTapTimer(e.touches[0]);
  }, {passive:true});

  canvas.addEventListener('touchmove', e=>{
    const t=[...e.touches].map(t=>({x:t.clientX,y:t.clientY}));
    if(t.length===1 && lastTouches.length===1){
      // Pan
      const dx = t[0].x - lastTouches[0].x;
      const dy = t[0].y - lastTouches[0].y;
      cam.x -= dx / cam.z;
      cam.y -= dy / cam.z;
      onChange&&onChange();
    }else if(t.length===2){
      // Pinch
      const d = Math.hypot(t[0].x-t[1].x, t[0].y-t[1].y);
      if(!lastDist) lastDist=d;
      const scale = d/lastDist;
      const prevZ=cam.z;
      cam.z = Math.max(.5, Math.min(2.5, cam.z*scale));
      lastDist=d;

      // Zoom zur Mitte der Finger
      const rect=canvas.getBoundingClientRect();
      const mx=(t[0].x+t[1].x)/2-rect.left, my=(t[0].y+t[1].y)/2-rect.top;
      const wx = cam.x + mx/prevZ;
      const wy = cam.y + my/prevZ;
      cam.x = wx - mx/cam.z;
      cam.y = wy - my/cam.z;

      onChange&&onChange();
    }
    lastTouches=t;
  }, {passive:true});

  canvas.addEventListener('touchend', e=>{
    if(e.touches.length<2){ lastDist=0; }
    lastTouches=[...e.touches].map(t=>({x:t.clientX,y:t.clientY}));
  }, {passive:true});

  // Tap‑Erkennung (kurzer schneller Tap)
  let tapTimer=null, tapPos=null;
  function startTapTimer(t){
    clearTimeout(tapTimer); tapPos={x:t.clientX,y:t.clientY};
    tapTimer=setTimeout(()=>{ tapPos=null; }, 220);
  }
  canvas.addEventListener('touchend', e=>{
    if(!tapPos) return;
    const dx = (e.changedTouches[0].clientX - tapPos.x);
    const dy = (e.changedTouches[0].clientY - tapPos.y);
    if(Math.hypot(dx,dy) < 10){
      const rect=canvas.getBoundingClientRect();
      onTap && onTap(e.changedTouches[0].clientX-rect.left, e.changedTouches[0].clientY-rect.top);
    }
    tapPos=null;
  }, {passive:true});
}
