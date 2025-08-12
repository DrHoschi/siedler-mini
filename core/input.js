// Mobile-optimierte Pointer-Events: 1 Finger Pan, 2 Finger Pinch-Zoom
import { zoomAt } from './render.js';

export function setupInput(canvas, cam, redraw){
  canvas.style.touchAction = 'none';

  let panning=false, panStart={x:0,y:0}, camStart={x:0,y:0};
  const pointers = new Map(); // id -> {x,y}

  function pos(e){
    const r=canvas.getBoundingClientRect();
    return { x:e.clientX - r.left, y:e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', (e)=>{
    canvas.setPointerCapture(e.pointerId);
    const p=pos(e);
    pointers.set(e.pointerId, p);

    if (pointers.size===1){
      // Start Pan
      panning=true; panStart={x:e.clientX,y:e.clientY}; camStart={...cam};
    }
  });

  canvas.addEventListener('pointermove', (e)=>{
    const p=pos(e);
    pointers.set(e.pointerId, p);

    if (pointers.size===1 && panning){
      const dx=(e.clientX-panStart.x)/cam.z;
      const dy=(e.clientY-panStart.y)/cam.z;
      cam.x = camStart.x - dx;
      cam.y = camStart.y - dy;
      redraw();
    }
    else if (pointers.size===2){
      // Pinch-Zoom
      const [a,b] = [...pointers.values()];
      if(!a||!b) return;
      if(!canvas._pinch){
        canvas._pinch = {
          d: Math.hypot(a.x-b.x, a.y-b.y),
          z: cam.z,
          mid:{ x:(a.x+b.x)/2, y:(a.y+b.y)/2 }
        };
      }else{
        const d = Math.hypot(a.x-b.x, a.y-b.y);
        const factor = d / canvas._pinch.d;
        zoomAt(canvas._pinch.mid.x, canvas._pinch.mid.y, factor * 1.0);
        redraw();
      }
    }
  });

  function endPointer(e){
    pointers.delete(e.pointerId);
    if (pointers.size<2) canvas._pinch=null;
    if (pointers.size===0){ panning=false; }
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', endPointer);

  // Doppeltipp-Zoom optional (sanft rein)
  canvas.addEventListener('dblclick', (e)=>{
    const r=canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, 1.25);
    redraw();
  });

  // Kontextmenü aus
  canvas.addEventListener('contextmenu', e=>e.preventDefault(), {passive:false});
}
