// game.js – Minimal-Spielstart mit Pan/Zoom & Tool-Umschalter (keine weiteren Imports)

export async function startGame({ canvas, DPR = 1, onHUD = () => {} }) {

  // --- einfacher "Kamera"-State ---
  const cam = {
    x: 0, y: 0,
    zoom: 1,
    min: 0.5,
    max: 2.0
  };

  let running = true;
  let debug = false;
  let tool = 'Zeiger';

  const $  = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // HUD Initial
  onHUD('Zoom', cam.zoom.toFixed(2) + 'x');
  $('#hudTool').textContent = tool;

  // Toolbuttons klickbar machen
  const tools = [
    ['toolPointer','Zeiger'],
    ['toolRoad','Straße'],
    ['toolHQ','HQ'],
    ['toolLumber','Holzfäller'],
    ['toolDepot','Depot'],
    ['toolErase','Abriss'],
  ];
  for (const [id,name] of tools){
    $('#'+id).addEventListener('click', () => {
      tool = name;
      $('#hudTool').textContent = name;
      $$('.tools .btn').forEach(b => b.classList.remove('active'));
      $('#'+id).classList.add('active');
    });
  }
  // Top‑Buttons
  $('#centerBtn').onclick = () => { cam.x = 0; cam.y = 0; };
  $('#dbgBtn').onclick    = () => { debug = !debug; };

  // Canvas‑Größe
  function setSize(){
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (w !== canvas.width || h !== canvas.height){
      canvas.width = w; canvas.height = h;
    }
  }
  setSize();
  window.addEventListener('resize', setSize, {passive:true});

  // --- Interaktion: Pan (im Zeiger‑Tool) & Zoom ---
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    canvas.setPointerCapture(ev.pointerId);
    dragging = true;
    sx = ev.clientX; sy = ev.clientY;
    ox = cam.x;      oy = cam.y;
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    if (tool !== 'Zeiger') return; // Pan nur im Zeiger‑Tool
    cam.x = ox + (ev.clientX - sx) / cam.zoom;
    cam.y = oy + (ev.clientY - sy) / cam.zoom;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  // Wheel‑Zoom (Desktop) – iOS pinch handled vom Browser -> touch-action:none + transform
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const dz = Math.exp(-ev.deltaY * 0.0015);
    const nz = clamp(cam.zoom * dz, cam.min, cam.max);
    cam.zoom = nz;
    onHUD('Zoom', cam.zoom.toFixed(2) + 'x');
  }, {passive:false});

  canvas.addEventListener('contextmenu', ev => ev.preventDefault());

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // --- Zeichnen ---
  const ctx = canvas.getContext('2d');

  function worldToScreen(wx, wy){
    // einfache 2D‑Translation + Zoom
    const x = (wx - cam.x) * cam.zoom + canvas.width / 2;
    const y = (wy - cam.y) * cam.zoom + canvas.height / 2;
    return [x, y];
  }

  function drawGrid(step = 128){
    ctx.save();
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Hintergrund
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // horizontale Linien (dezentes Raster)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    const viewH = canvas.height/cam.zoom, viewW = canvas.width/cam.zoom;
    const left   = cam.x - viewW/2;
    const top    = cam.y - viewH/2;
    const right  = cam.x + viewW/2;
    const bottom = cam.y + viewH/2;

    for (let y = Math.floor(top/step)*step; y <= bottom; y += step){
      const [x1,yy] = worldToScreen(left, y);
      const [x2,yy2]= worldToScreen(right, y);
      ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHQ(){
    ctx.save();
    // Rechteck in Weltmitte
    const w=360, h=220;
    const [cx,cy] = worldToScreen(0,0);
    const x = cx - (w*cam.zoom)/2;
    const y = cy - (h*cam.zoom)/2;
    ctx.fillStyle = '#2ea043';
    ctx.fillRect(x, y, w*cam.zoom, h*cam.zoom);

    // Titel
    ctx.fillStyle = '#cfe3ff';
    ctx.font = `${Math.round(48*cam.zoom)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillText('HQ (Platzhalter)', x - 10*cam.zoom, y - 20*cam.zoom);

    // dezentes "Diamant" darunter (nur Deko)
    ctx.globalAlpha = .15;
    ctx.strokeStyle = '#cfe3ff';
    ctx.lineWidth = 2*cam.zoom;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 140*cam.zoom);
    ctx.lineTo(cx + 160*cam.zoom, cy);
    ctx.lineTo(cx, cy - 140*cam.zoom);
    ctx.lineTo(cx - 160*cam.zoom, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawDebug(){
    if (!debug) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height); 
    ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke();
    ctx.restore();
  }

  function frame(){
    if (!running) return;
    setSize();
    drawGrid();
    drawHQ();
    drawDebug();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // kleines Helferchen: HUD‑Werte aktualisieren (hier nur Zoom live)
  // (weiteres UI – Träger, Ressourcen etc. – kommt später)
}
