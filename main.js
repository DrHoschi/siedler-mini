// Minimal‑Spiel: Pan/Zoom + Grid + HQ‑Klotz (Platzhalter)

let state = null;

export async function run(opts){
  const { canvas, DPR=1, onHUD = ()=>{} } = opts;
  const ctx = canvas.getContext('2d');

  state = {
    ctx,
    DPR,
    zoom: 1,
    tx: 0,   // translation (screen space px @ DPR)
    ty: 0,
    dragging:false,
    dragX:0, dragY:0,
    showGrid:true
  };

  // Input
  canvas.addEventListener('pointerdown', onPointerDown, { passive:false });
  canvas.addEventListener('pointermove', onPointerMove, { passive:false });
  canvas.addEventListener('pointerup',   onPointerUp,   { passive:false });
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive:false });

  // Touch‑Pinch (einfach)
  canvas.addEventListener('touchstart', onTouchStart, { passive:false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive:false });
  canvas.addEventListener('touchend',   onTouchEnd,   { passive:false });

  // kleines Debug‑Toggle vom HUD
  document.getElementById('btnDebug')?.addEventListener('click', ()=>{
    state.showGrid = !state.showGrid;
  });

  // Startwerte
  centerMap();
  loop();

  function loop(){
    draw();
    requestAnimationFrame(loop);
  }

  function draw(){
    const { ctx } = state;
    const w = ctx.canvas.width, h = ctx.canvas.height;

    ctx.save();
    // Hintergrund
    ctx.fillStyle = '#0f1823'; ctx.fillRect(0,0,w,h);

    // Kamera
    ctx.translate(state.tx, state.ty);
    ctx.scale(state.zoom, state.zoom);

    // Grid
    if (state.showGrid){
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      const step = 96;
      for (let y=-2000; y<2000; y+=step){ ctx.beginPath(); ctx.moveTo(-3000,y); ctx.lineTo(3000,y); ctx.stroke(); }
      for (let x=-3000; x<3000; x+=step){ ctx.beginPath(); ctx.moveTo(x,-2000); ctx.lineTo(x,2000); ctx.stroke(); }
    }

    // HQ‑Block zentriert in Welt (0,0)
    const s = 320;
    ctx.fillStyle = '#2f924a';
    ctx.fillRect(-s*0.8, -s*0.3, s*1.6, s*0.6);
    ctx.fillStyle = '#e9f1ff';
    ctx.font = '48px system-ui, sans-serif';
    ctx.fillText('HQ (Platzhalter)', -260, -160);

    ctx.restore();

    onHUD('Zoom', state.zoom.toFixed(2)+'x');
  }

  function onPointerDown(e){
    if (e.pointerType === 'touch') return; // Touch handhaben wir separat
    state.dragging = true;
    state.dragX = e.clientX;
    state.dragY = e.clientY;
    e.preventDefault();
  }
  function onPointerMove(e){
    if (!state.dragging) return;
    const dx = e.clientX - state.dragX;
    const dy = e.clientY - state.dragY;
    state.dragX = e.clientX;
    state.dragY = e.clientY;
    state.tx += dx;
    state.ty += dy;
    e.preventDefault();
  }
  function onPointerUp(){ state.dragging = false }

  function onWheel(e){
    // Zoom um Cursor
    const delta = Math.sign(e.deltaY) * 0.1;
    zoomAt(e.clientX, e.clientY, Math.exp(-delta));
    e.preventDefault();
  }

  // Touch‑Pinch/Pan
  let pinch = null;
  function onTouchStart(e){
    if (e.touches.length === 1){
      pinch = null;
      state.dragging = true;
      state.dragX = e.touches[0].clientX;
      state.dragY = e.touches[0].clientY;
    } else if (e.touches.length === 2){
      state.dragging = false;
      pinch = {
        dist: dist2(e.touches[0], e.touches[1]),
        cx: (e.touches[0].clientX + e.touches[1].clientX)/2,
        cy: (e.touches[0].clientY + e.touches[1].clientY)/2
      };
    }
    e.preventDefault();
  }
  function onTouchMove(e){
    if (pinch && e.touches.length === 2){
      const nd = dist2(e.touches[0], e.touches[1]);
      const scale = nd / pinch.dist;
      pinch.dist = nd;
      // leicht gedämpft
      zoomAt(pinch.cx, pinch.cy, Math.pow(scale, 0.5));
      e.preventDefault();
      return;
    }
    if (state.dragging && e.touches.length === 1){
      const t = e.touches[0];
      const dx = t.clientX - state.dragX;
      const dy = t.clientY - state.dragY;
      state.dragX = t.clientX; state.dragY = t.clientY;
      state.tx += dx; state.ty += dy;
      e.preventDefault();
    }
  }
  function onTouchEnd(e){ state.dragging = false; pinch = null }

  function dist2(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy) }

  function zoomAt(cx, cy, factor){
    // Weltkoordinate vor dem Zoom bestimmen, damit unter dem Finger bleibt
    const preX = (cx - state.tx) / state.zoom;
    const preY = (cy - state.ty) / state.zoom;

    state.zoom = clamp(state.zoom * factor, 0.5, 2.5);

    // translation so anpassen, dass pre‑Punkt gleich bleibt
    state.tx = cx - preX * state.zoom;
    state.ty = cy - preY * state.zoom;
  }

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)) }
}

export function centerMap(){
  if (!state) return;
  const { ctx } = state;
  // Mitte der Canvas in Screenkoordinaten
  state.zoom = 1.05;
  state.tx = ctx.canvas.width * 0.5;
  state.ty = ctx.canvas.height* 0.45;
}
