// game.js (V14.3-safe4)
// Minimal‑Spielzustand: Raster + HQ-Platzhalter, Pan/Zoom, Tool-Umschalter, Zentrieren.
// KEINE weiteren Imports -> kann standalone laufen.

export async function startGame({ canvas, DPR = 1, onHUD = () => {} }) {
  const ctx = canvas.getContext('2d');

  // ---------- State ----------
  const st = {
    tool: 'Zeiger',   // "Zeiger" | "Straße" | "HQ" | "Holzfäller" | "Depot" | "Abriss"
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2.0,
    overscroll: 160,  // weicher Rand
    world: { w: 2000, h: 2000 }, // Dummy-Welt
    cam: { x: 0, y: 0 },         // Welt-Offset (px)
    pinch: null,                  // für 2‑Finger‑Zoom
  };

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function setCanvasSize() {
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function clampCam() {
    // weiche Begrenzung mit Puffer (overscroll)
    const maxX = st.world.w * st.zoom + st.overscroll;
    const maxY = st.world.h * st.zoom + st.overscroll;
    const minX = -st.overscroll;
    const minY = -st.overscroll;
    st.cam.x = Math.max(minX, Math.min(st.cam.x, maxX - canvas.width));
    st.cam.y = Math.max(minY, Math.min(st.cam.y, maxY - canvas.height));
  }

  function setZoom(nz, cx = canvas.width / 2, cy = canvas.height / 2) {
    const old = st.zoom;
    const z = Math.max(st.minZoom, Math.min(nz, st.maxZoom));
    if (z === old) return;

    // Zoomen um einen Fixpunkt (cx,cy) im Canvas -> Weltpunkt stabil halten
    const wx = (cx + st.cam.x) / old;
    const wy = (cy + st.cam.y) / old;
    st.zoom = z;
    st.cam.x = wx * z - cx;
    st.cam.y = wy * z - cy;
    clampCam();
    onHUD('Zoom', st.zoom.toFixed(2) + 'x');
  }

  function worldToScreen(x, y) {
    return { x: Math.round(x * st.zoom - st.cam.x), y: Math.round(y * st.zoom - st.cam.y) };
  }

  // ---------- Zeichnen ----------
  function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const step = 128 * st.zoom; // grobes Raster
    const ox = - (st.cam.x % step);
    const oy = - (st.cam.y % step);
    for (let x = ox; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = oy; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHQPlaceholder() {
    // HQ zentriert in der "Welt"
    const HQ = { x: st.world.w / 2 - 200, y: st.world.h / 2 - 120, w: 400, h: 240 };
    const p = worldToScreen(HQ.x, HQ.y);
    ctx.fillStyle = '#2da24a';
    ctx.fillRect(p.x, p.y, Math.round(HQ.w * st.zoom), Math.round(HQ.h * st.zoom));

    // Titel
    ctx.fillStyle = '#e7f3ff';
    ctx.font = Math.round(64 * st.zoom) + 'px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('HQ (Platzhalter)', p.x - Math.round(160 * st.zoom), p.y - Math.round(28 * st.zoom));
  }

  function drawHUDDbg() {
    // kleines Zoom‑Badge im HUD rechts (optional)
    const el = $('#hudZoom');
    if (el) el.textContent = st.zoom.toFixed(2) + 'x';
  }

  function render() {
    clear();
    drawGrid();
    drawHQPlaceholder();
    drawHUDDbg();
  }

  // ---------- Input ----------
  let dragging = false;
  let last = { x: 0, y: 0 };

  function onPointerDown(ev) {
    if (st.tool !== 'Zeiger') return; // Pan nur im Zeiger-Tool
    dragging = true;
    last = { x: ev.clientX, y: ev.clientY };
  }
  function onPointerMove(ev) {
    if (!dragging) return;
    const dx = ev.clientX - last.x;
    const dy = ev.clientY - last.y;
    last = { x: ev.clientX, y: ev.clientY };
    st.cam.x -= dx;
    st.cam.y -= dy;
    clampCam();
  }
  function onPointerUp() {
    dragging = false;
  }

  function onWheel(ev) {
    ev.preventDefault();
    const delta = Math.sign(ev.deltaY);
    const factor = delta > 0 ? 0.9 : 1.111; // feinfühlig
    setZoom(st.zoom * factor, ev.clientX * DPR, ev.clientY * DPR);
  }

  function dist(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  function onTouchStart(ev) {
    if (ev.touches.length === 2) {
      st.pinch = {
        d0: dist(ev.touches[0], ev.touches[1]),
        z0: st.zoom,
        cx: (ev.touches[0].clientX + ev.touches[1].clientX) / 2 * DPR,
        cy: (ev.touches[0].clientY + ev.touches[1].clientY) / 2 * DPR,
      };
    } else if (ev.touches.length === 1 && st.tool === 'Zeiger') {
      dragging = true;
      last = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    }
  }

  function onTouchMove(ev) {
    if (st.pinch && ev.touches.length === 2) {
      const d = dist(ev.touches[0], ev.touches[1]);
      const k = d / Math.max(1, st.pinch.d0);
      setZoom(st.pinch.z0 * k, st.pinch.cx, st.pinch.cy);
    } else if (dragging && ev.touches.length === 1) {
      const t = ev.touches[0];
      const dx = t.clientX - last.x;
      const dy = t.clientY - last.y;
      last = { x: t.clientX, y: t.clientY };
      st.cam.x -= dx;
      st.cam.y -= dy;
      clampCam();
    }
  }

  function onTouchEnd() {
    st.pinch = null;
    dragging = false;
  }

  // Tool‑Buttons
  const toolIds = ['Zeiger','Straße','HQ','Holzfäller','Depot','Abriss'];
  function setTool(name) {
    st.tool = name;
    toolIds.forEach(id => {
      const b = document.getElementById('tool' + id.replace('ß','ss'));
      if (b) b.classList.toggle('active', id === name);
    });
    onHUD('Tool', name);
  }

  // Zentrieren‑Button Bridge
  window.centerMap = () => {
    st.zoom = 1;
    // auf HQ zentrieren:
    const cx = st.world.w / 2 * st.zoom;
    const cy = st.world.h / 2 * st.zoom;
    st.cam.x = cx - canvas.width / 2;
    st.cam.y = cy - canvas.height / 2;
    clampCam();
  };

  // ---------- Lifecycle ----------
  function attachUI() {
    // Buttons (falls vorhanden)
    const map = {
      Zeiger: '#toolPointer',
      Straße: '#toolRoad',
      HQ: '#toolHQ',
      Holzfäller: '#toolLumber',
      Depot: '#toolDepot',
      Abriss: '#toolErase',
    };
    Object.entries(map).forEach(([name, sel]) => {
      const el = $(sel);
      if (el) el.addEventListener('click', () => setTool(name));
    });
    const centerBtn = document.getElementById('centerBtn');
    if (centerBtn) centerBtn.addEventListener('click', () => window.centerMap());

    // Anfangszustand
    setTool('Zeiger');
    onHUD('Zoom', st.zoom.toFixed(2) + 'x');
  }

  function attachInput() {
    canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    canvas.addEventListener('wheel', onWheel, { passive: false });

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  function onResize() {
    setCanvasSize();
    clampCam();
  }

  // Init
  onResize();
  window.addEventListener('resize', onResize);
  attachUI();
  attachInput();
  window.centerMap();

  // Render‑Loop
  function loop() {
    render();
    requestAnimationFrame(loop);
  }
  loop();
}
