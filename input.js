// V15 input – Pointer, Pan/Zoom, Bauen, Abriss, Straßen
export function createInput({
  canvas, world, getTool, setZoom, getZoom,
  moveCamera, screenToWorld, onPlaceRoad, onPlaceBuilding, onEraseAt, onLog
}){
  const state = {
    panning:false, panStart:{x:0,y:0}, camStart:{x:0,y:0},
    roadStart:null,
  };

  // Zoom (Mausrad)
  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    if (getTool()!=='pointer') return;
    const delta = -Math.sign(e.deltaY)*0.12;
    const z = clamp(getZoom()+delta, 0.5, 2.5);
    setZoom(z);
  }, {passive:false});

  // Touch‑Gesten: 1 Finger = Pan (nur Zeiger)
  canvas.addEventListener('pointerdown', (e)=>{
    if (!isPrimary(e)) return;
    canvas.setPointerCapture?.(e.pointerId);
    const tool = getTool();
    const wPos = screenToWorld(e.clientX, e.clientY);

    if (tool==='pointer'){
      state.panning = true;
      state.panStart = {x:e.clientX, y:e.clientY};
      state.camStart = {x:0,y:0}; // in main/render gemanagt → wir schicken nur Delta via moveCamera
    } else if (tool==='road'){
      if (!state.roadStart) state.roadStart = wPos;
      else {
        onPlaceRoad({ x1: state.roadStart.x, y1: state.roadStart.y, x2: wPos.x, y2: wPos.y });
        state.roadStart = null;
      }
    } else if (tool==='erase'){
      onEraseAt(wPos);
    } else {
      // Gebäude
      onPlaceBuilding(tool, wPos);
    }
  }, {passive:false});

  canvas.addEventListener('pointermove', (e)=>{
    if (!state.panning || getTool()!=='pointer') return;
    e.preventDefault();
    moveCamera(e.clientX - state.panStart.x, e.clientY - state.panStart.y);
  }, {passive:false});

  canvas.addEventListener('pointerup', (e)=>{
    state.panning = false;
    try{ canvas.releasePointerCapture?.(e.pointerId); }catch{}
  });

  // Helper
  function isPrimary(e){ return (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==='touch'); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
}
