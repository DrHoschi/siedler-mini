// Mobile Pointer-Input: 1 Finger Pan, 2 Finger Pinch, Tap = bauen
import { cam, ZMIN, ZMAX } from './camera.js';

export function setupInput(canvas, camRef, { onTap, onChange }){
  canvas.style.touchAction = 'none';

  let panning=false, panStart={x:0,y:0}, camStart={x:0,y:0};
  const pts = new Map(); // id -> {x,y}
  let tapInfo=null; // {x,y,t}

  function rect(){ return canvas.getBoundingClientRect(); }
  function sx(evt){ return evt.clientX - rect().left; }
  function sy(evt){ return evt.clientY - rect().top; }

  canvas.addEventListener('pointerdown', e=>{
    canvas.setPointerCapture(e.pointerId);
    const p={x:sx(e),y:sy(e)}; pts.set(e.pointerId,p);
    if(pts.size===1){
      tapInfo={x:p.x,y:p.y,t:performance.now()};
      panning=true; panStart={x:e.clientX,y:e.clientY}; camStart={...camRef};
    }
    onChange?.();
  });

  canvas.addEventListener('pointermove', e=>{
    const p={x:sx(e),y:sy(e)}; pts.set(e.pointerId,p);

    if(pts.size===1 && panning){
      const dx=(e.clientX-panStart.x)/camRef.z, dy=(e.clientY-panStart.y)/camRef.z;
      camRef.x = camStart.x - dx; camRef.y = camStart.y - dy;
      onChange?.();
    }else if(pts.size===2){
      const [a,b]=[...pts.values()];
      if(!canvas._pinch){
        canvas._pinch={ d:Math.hypot(a.x-b.x,a.y-b.y), z:camRef.z, mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2} };
      }else{
        const d=Math.hypot(a.x-b.x,a.y-b.y);
        const factor=d/canvas._pinch.d;
        const mid=canvas._pinch.mid;
        const wx = mid.x/camRef.z + camRef.x;
        const wy = mid.y/camRef.z + camRef.y;
        camRef.z=Math.max(ZMIN,Math.min(ZMAX, canvas._pinch.z*factor));
        camRef.x=wx - mid.x/camRef.z; camRef.y=wy - mid.y/camRef.z;
        onChange?.();
      }
    }
  });

  function end(e){
    pts.delete(e.pointerId);
    if(pts.size<2) canvas._pinch=null;
    if(pts.size===0){
      // Tap?
      if(tapInfo){
        const dt=performance.now()-tapInfo.t;
        const dx=e.clientX - (tapInfo.clientX??0), dy=e.clientY - (tapInfo.clientY??0);
        const moved = Math.hypot((sx(e)-tapInfo.x),(sy(e)-tapInfo.y));
        if(dt<300 && moved<10){ onTap?.(tapInfo.x, tapInfo.y); }
      }
      tapInfo=null; panning=false;
    }
    onChange?.();
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);

  // Kein Kontextmenü
  canvas.addEventListener('contextmenu', e=>e.preventDefault(), {passive:false});
}
