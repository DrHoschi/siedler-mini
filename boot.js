/* boot.js – UI, Debug, Canvas, Zoom/Pan
 * - UI ist fixed (bleibt beim Zoomen unverändert)
 * - Zoom-Limits: 0.5 … 3.5
 * - F2 oder Button = Debug-Overlay toggeln
 */
(function () {
  const log = (...a) => console.log("%c[boot]", "color:#7bf", ...a);

  const q = sel => document.querySelector(sel);
  const canvas = q("#game");
  const overlay = q("#overlay");
  const btnStart = q("#btnStart");
  const btnReload = q("#btnReload");
  const btnDebug = q("#debugToggle");
  const mapSelect = q("#mapSelect");
  const ctx = canvas.getContext("2d");

  // ======= State =======
  const state = {
    width: 2048,
    height: 2048,
    tile: 64,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 3.5,
    camX: 0,
    camY: 0,
    panning: false,
    panStartX: 0,
    panStartY: 0,
    camStartX: 0,
    camStartY: 0,
    debug: false,
    mapUrl: null,
  };
  window.__SM_STATE__ = state; // für map-runtime.js (Overlay-Infos)

  // Canvas in Mitte ankern; transform nur hier
  function applyTransform() {
    // wir positionieren das Canvas so, dass (0,0) in der Bildschirmmitte liegt,
    // und verschieben relativ dazu mit camX/camY + skalieren
    const stage = document.getElementById("stage");
    const rect = stage.getBoundingClientRect();
    canvas.style.left = rect.width * 0.5 + "px";
    canvas.style.top = rect.height * 0.5 + "px";
    const t = `translate(${state.camX}px, ${state.camY}px) scale(${state.zoom}) translate(${-state.width/2}px, ${-state.height/2}px)`;
    canvas.style.transform = t;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ======= Drawing (Placeholder Grid) =======
  function drawGrid() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#122132";
    ctx.fillRect(0, 0, state.width, state.height);

    // simple grid, 64px
    for (let x = 0; x <= state.width; x += state.tile) {
      ctx.fillStyle = (x / state.tile) % 4 === 0 ? "#1e334a" : "#162a3f";
      ctx.fillRect(x, 0, 1, state.height);
    }
    for (let y = 0; y <= state.height; y += state.tile) {
      ctx.fillStyle = (y / state.tile) % 4 === 0 ? "#1e334a" : "#162a3f";
      ctx.fillRect(0, y, state.width, 1);
    }
  }

  // ======= Debug Overlay =======
  function updateOverlay() {
    if (!state.debug) return;
    const dpr = Math.round(window.devicePixelRatio * 100) / 100;
    const size = `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`;
    overlay.textContent =
      `Frames: —   dt=—ms
Cam: x=${state.camX.toFixed(1)}  y=${state.camY.toFixed(1)}  zoom=${state.zoom.toFixed(2)}
Map: ${state.mapUrl ? "aktiv" : "—"}   /   Assets: —
DPR=${dpr}   Size=${size}`;
  }

  function toggleDebug() {
    state.debug = !state.debug;
    overlay.classList.toggle("hidden", !state.debug);
    updateOverlay();
  }

  // ======= Input: Pan & Zoom (nur Canvas) =======
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    state.panning = true;
    state.panStartX = e.clientX;
    state.panStartY = e.clientY;
    state.camStartX = state.camX;
    state.camStartY = state.camY;
  });
  window.addEventListener("pointermove", (e) => {
    if (!state.panning) return;
    const dx = e.clientX - state.panStartX;
    const dy = e.clientY - state.panStartY;
    state.camX = state.camStartX + dx;
    state.camY = state.camStartY + dy;
    applyTransform();
    updateOverlay();
  });
  window.addEventListener("pointerup", () => { state.panning = false; });

  // Wheel-Zoom – Maus
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.08; // feiner
    let z = clamp(state.zoom * (1 + delta), state.minZoom, state.maxZoom);
    if (z === state.zoom) return;
    state.zoom = z;
    applyTransform();
    updateOverlay();
  }, { passive: false });

  // Pinch-Zoom – Touch
  let pinch = null;
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      pinch = { d: dist(e.touches[0], e.touches[1]), startZoom: state.zoom };
    }
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    if (pinch && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const scale = d / (pinch.d || d);
      const z = clamp(pinch.startZoom * scale, state.minZoom, state.maxZoom);
      if (z !== state.zoom) {
        state.zoom = z;
        applyTransform();
        updateOverlay();
      }
    }
  }, { passive: true });
  canvas.addEventListener("touchend", () => { pinch = null; }, { passive: true });
  function dist(a, b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

  // ======= UI Events =======
  btnDebug.addEventListener("click", toggleDebug);
  window.addEventListener("keydown", (e)=>{ if (e.code === "F2") toggleDebug(); });

  btnReload.addEventListener("click", () => {
    // erzwungener Bust-Parameter
    const url = new URL(location.href);
    url.searchParams.set("bust", Date.now().toString());
    location.href = url.toString();
  });

  btnStart.addEventListener("click", async () => {
    await window.MapRuntime.startSelected(mapSelect.value);
  });

  // ======= Map-Liste + Query =======
  const MAPS = [
    { value: "assets/maps/map-pro.json", label: "map-pro.json" },
    { value: "assets/maps/map-demo.json", label: "map-demo.json" },
    { value: "assets/maps/map-checker-16x16.json", label: "map-checker (16×16)" },
  ];
  function buildMapSelect() {
    mapSelect.innerHTML = "";
    MAPS.forEach(m=>{
      const opt = document.createElement("option");
      opt.value = m.value; opt.textContent = m.label;
      mapSelect.appendChild(opt);
    });
    const url = new URL(location.href);
    const q = url.searchParams.get("map");
    if (q) {
      // relative Pfade erlauben
      const match = MAPS.find(m=>m.value===q) ? q : q;
      state.mapUrl = match;
      mapSelect.value = match;
    } else {
      state.mapUrl = MAPS[0].value;
      mapSelect.value = MAPS[0].value;
    }
  }

  // ======= Boot =======
  function boot() {
    log("preGameInit OK • V14.7‑hf2");
    drawGrid();
    applyTransform();
    buildMapSelect();
    updateOverlay();
  }
  boot();
})();
