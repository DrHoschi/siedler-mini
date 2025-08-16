// Siedler‑Mini V15 – Eingabe/Interaktion (Pan, Zoom, Bauen)
export const input = (() => {
  let world = null;
  let canvas = null;

  // Panning
  const PAN_SPEED = 0.25; // Dämpfung (langsameres Verschieben)
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let camStartX = 0, camStartY = 0;

  // Multi‑Pointer für (eventuell) Pinch (hier vorerst nur Count)
  const activePointers = new Map();

  function attach(_canvas, _world) {
    canvas = _canvas;
    world  = _world;

    // Safety: alle Listener neu setzen
    detach();
    canvas.addEventListener('pointerdown', onPointerDown, {passive:false});
    canvas.addEventListener('pointermove', onPointerMove, {passive:false});
    canvas.addEventListener('pointerup',   onPointerUp,   {passive:false});
    canvas.addEventListener('pointercancel', onPointerUp, {passive:false});
    canvas.addEventListener('wheel', onWheel, {passive:false});

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrient);
    document.addEventListener('fullscreenchange', onResize);
    document.addEventListener('webkitfullscreenchange', onResize);
  }

  function detach() {
    if (!canvas) return;
    canvas.onpointerdown = null;
    canvas.onpointermove = null;
    canvas.onpointerup   = null;
    canvas.onwheel       = null;
  }

  function onResize(){ world?.resizeCanvas(); }
  function onOrient(){ setTimeout(()=>world?.resizeCanvas(), 250); }

  function primary(e){ return (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==='touch'); }

  function onPointerDown(e){
    if (!primary(e)) return;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    const s = world.state();

    // Nur im Zeiger-Tool wird gepannt
    if (s.tool === 'pointer' && activePointers.size === 1){
      isPanning = true;
      panStartX = e.clientX; panStartY = e.clientY;
      camStartX = s.camX;    camStartY = s.camY;
      return;
    }

    // Tap → bauen/straßen/abriss
    const wx = world.clientToWorldX(e.clientX);
    const wy = world.clientToWorldY(e.clientY);
    world.tap(wx, wy);
  }

  function onPointerMove(e){
    if (!primary(e)) return;
    const s = world.state();

    // Pan nur im Zeiger-Tool
    if (isPanning && s.tool === 'pointer'){
      e.preventDefault();
      const dx = (e.clientX - panStartX) * (1/s.zoom) * PAN_SPEED;
      const dy = (e.clientY - panStartY) * (1/s.zoom) * PAN_SPEED;
      world.setCamera(camStartX - dx, camStartY - dy);
      return;
    }
  }

  function onPointerUp(e){
    activePointers.delete(e.pointerId);
    isPanning = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  }

  function onWheel(e){
    e.preventDefault();
    const s = world.state();
    const delta = -Math.sign(e.deltaY) * 0.1;
    world.setZoom(s.zoom + delta, e.clientX, e.clientY);
  }

  return { attach, detach };
})();
