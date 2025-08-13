// game.js – Minimalspielplatz (Platzhalter), liefert startGame(opts)

export async function startGame(opts){
  const { canvas, DPR, onHUD, onTool, onZoom } = opts;
  const ctx = canvas.getContext('2d');

  // State
  const state = {
    tool: 'pointer',
    zoom: 1,
    camX: 0,
    camY: 0,
  };

  // Resize
  function resize(){
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (w!==canvas.width || h!==canvas.height){
      canvas.width = w; canvas.height = h;
    }
    draw();
  }
  resize();
  window.addEventListener('resize', resize);

  // Zeichnen
  function drawGrid(){
    ctx.save();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // Hintergrund
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // Grid
    const step = Math.round(128 * DPR * state.zoom);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    for (let y=((state.camY%step)+step)%step; y<canvas.height; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
    for (let x=((state.camX%step)+step)%step; x<canvas.width; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    ctx.restore();
  }
  function drawHQ(){
    ctx.save();
    ctx.translate(-state.camX, -state.camY);
    ctx.scale(state.zoom, state.zoom);
    const rw = 420*DPR, rh = 180*DPR;
    ctx.fillStyle = '#2aa149';
    ctx.fillRect(240*DPR, 220*DPR, rw, rh);
    ctx.fillStyle = '#e5f0ff';
    ctx.font = `${64*DPR}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText('HQ (Platzhalter)', 140*DPR, 180*DPR);
    ctx.restore();
  }
  function draw(){
    drawGrid();
    drawHQ();
  }

  // Pan / Zoom (1 Finger Pan im Zeiger-Tool, 2 Finger Zoom überall)
  let lastTouches = [];
  function dist(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }
  canvas.addEventListener('touchstart', (e)=>{ lastTouches = [...e.touches]; }, {passive:false});
  canvas.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    const t = [...e.touches];
    if (t.length===1 && state.tool==='pointer'){
      // Pan
      const dx = t[0].clientX - lastTouches[0].clientX;
      const dy = t[0].clientY - lastTouches[0].clientY;
      state.camX -= dx * DPR;
      state.camY -= dy * DPR;
      lastTouches = t;
      draw();
    } else if (t.length===2){
      // Pinch Zoom (relativ)
      const dNow = dist(t[0], t[1]);
      const dPrev = dist(lastTouches[0] ?? t[0], lastTouches[1] ?? t[1]);
      const factor = Math.max(0.5, Math.min(2.0, dNow / (dPrev || dNow)));
      state.zoom = Math.max(0.4, Math.min(2.0, state.zoom * factor));
      onZoom?.(state.zoom);
      lastTouches = t;
      draw();
    }
  }, {passive:false});

  // Maus (zum Testen am Desktop)
  let dragging = false, lx=0, ly=0;
  canvas.addEventListener('mousedown', (e)=>{ dragging=true; lx=e.clientX; ly=e.clientY; });
  window.addEventListener('mouseup', ()=> dragging=false);
  window.addEventListener('mousemove', (e)=>{
    if (!dragging || state.tool!=='pointer') return;
    state.camX -= (e.clientX-lx) * DPR; state.camY -= (e.clientY-ly) * DPR;
    lx=e.clientX; ly=e.clientY; draw();
  });
  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const f = e.deltaY<0 ? 1.1 : 0.9;
    state.zoom = Math.max(0.4, Math.min(2.0, state.zoom * f));
    onZoom?.(state.zoom);
    draw();
  }, {passive:false});

  // Tools setzen (UI spiegelt main.js)
  function setTool(name){
    state.tool = name || 'pointer';
    onTool?.(state.tool);
  }

  // HUD Demo-Werte initial
  onHUD?.('Wood', 0); onHUD?.('Stone',0); onHUD?.('Food',0); onHUD?.('Gold',0); onHUD?.('Car',0);
  onZoom?.(state.zoom);
  setTool('pointer');
  draw();

  // Center-Button Logik
  function center(){
    state.camX = state.camY = 0;
    state.zoom = 1;
    onZoom?.(state.zoom);
    draw();
  }

  return { setTool, center };
}
