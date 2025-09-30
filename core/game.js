/* ============================================================================
 * Datei   : core/game.js
 * Version : v19.0.0
 * Zweck   : Game-Loop, Kamera, Platziermodus (Ghost + ✅/❌), Render
 * Events  : listen  -> cb:game-start, cb:build:select, cb:build:cancel, cb:build:place
 *           emit    -> cb:res:change (später), cb:build:place (ok/err)
 * Hinweis : Welt-Koordinaten + Kamera-Transform; HUD/Build bleiben fix (CSS)
 * Lastenheft-Flow: BuildDock → Platziermodus → place/cancel.  [oai_citation:0‡Lastenheft_NeueSiedler_Vollversion v1.0.pdf](file-service://file-3LhVFNfaWzhV5CMo8PkBF7)
 * ========================================================================== */

(() => {
  const MOD = 'game';
  const log  = (...a) => (window.CBLog?.ok   || console.log)(`[${MOD}]`, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(`[${MOD}]`, ...a);
  const error= (...a) => (window.CBLog?.error|| console.error)(`[${MOD}]`, ...a);
  const EVT  = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // ---- DOM -----------------------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx    = canvas.getContext('2d');

  // ---- Kamera/Viewport -----------------------------------------------------
  const Camera = {
    x: 0, y: 0, zoom: 1,
    minZoom: 0.5, maxZoom: 3,
    screenToWorld(px, py){
      const rect = canvas.getBoundingClientRect();
      const sx = (px - rect.left) * (canvas.width / rect.width);
      const sy = (py - rect.top)  * (canvas.height / rect.height);
      return {
        x: (sx / this.zoom) + this.x,
        y: (sy / this.zoom) + this.y
      };
    },
    worldToScreen(wx, wy){
      return {
        x: (wx - this.x) * this.zoom,
        y: (wy - this.y) * this.zoom
      };
    }
  };

  // ---- Welt/Map/Buildings --------------------------------------------------
  const TILE = 32; // einfache Annahme; kann aus Map gelesen werden
  const world = {
    map: { w: 64, h: 64, tiles: null },   // Dummy, bis echte Map geladen ist
    buildings: [] // {id, x, y, w, h, icon}
  };

  function loadMap(meta){
    // Hier könntest du echte Tiles laden; wir füllen Platzhalter
    world.map.w = meta?.w ?? 64;
    world.map.h = meta?.h ?? 64;
    world.map.tiles = world.map.tiles || new Uint8Array(world.map.w * world.map.h);
    // Kamera zur Kartenmitte
    Camera.x = (world.map.w * TILE)/2 - canvas.width/2;
    Camera.y = (world.map.h * TILE)/2 - canvas.height/2;
  }

  // ---- Platziermodus -------------------------------------------------------
  const place = {
    active: false,
    buildingId: null,
    w: 1, h: 1,                     // Größe in Tiles (MVP = 1x1)
    icon: null,
    wx: 0, wy: 0,                   // Ghost-Position in Weltkoordinaten (Pixel)
    valid: true
  };

  function enterPlaceMode(bid, icon){
    place.active = true;
    place.buildingId = bid;
    place.icon = icon || null;
    place.valid = true;
    updatePlaceUi(); // Buttons einblenden/positionieren
  }

  function leavePlaceMode(reason='cancel'){
    place.active = false;
    place.buildingId = null;
    place.icon = null;
    hidePlaceUi();
    EVT('cb:build:close', { reason }); // Info an UI (Dock kann reagieren)
  }

  function canPlaceAt(tx, ty){
    // Kollisionstest sehr simpel (keine Fremdgebäude auf gleichem Tile)
    const inMap = (tx >= 0 && ty >= 0 && tx < world.map.w && ty < world.map.h);
    if (!inMap) return { ok:false, reason:'außerhalb' };
    const coll = world.buildings.some(b => b.x === tx && b.y === ty);
    if (coll) return { ok:false, reason:'blockiert: Gebäude' };
    return { ok:true };
  }

  function commitPlacement(){
    const tx = Math.floor(place.wx / TILE);
    const ty = Math.floor(place.wy / TILE);
    const chk = canPlaceAt(tx, ty);
    if (!chk.ok){
      warn('Platzierung verhindert:', chk.reason);
      EVT('cb:build:place', { ok:false, id: place.buildingId, reason: chk.reason });
      return;
    }
    world.buildings.push({ id: place.buildingId, x: tx, y: ty, w: place.w, h: place.h, icon: place.icon });
    EVT('cb:build:place', { ok:true, id: place.buildingId, x: tx, y: ty });
    leavePlaceMode('place');
  }

  // ---- Eingaben: Pan/Zoom/Move --------------------------------------------
  let isPanning = false;
  let panStart = { x:0, y:0, cx:0, cy:0 };

  canvas.addEventListener('pointerdown', (e) => {
    if (place.active){
      // Ghost setzen verschieben: Mausbewegung handled pointermove
      // Kein sofortiges Setzen, dafür ✅/❌ nutzen
    } else {
      isPanning = true;
      panStart.x = e.clientX; panStart.y = e.clientY;
      panStart.cx = Camera.x; panStart.cy = Camera.y;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (place.active){
      const w = Camera.screenToWorld(e.clientX, e.clientY);
      // Ghost mittig am Tile ausrichten
      place.wx = Math.floor(w.x / TILE) * TILE;
      place.wy = Math.floor(w.y / TILE) * TILE;
      // Validitätsfarbe
      const tx = Math.floor(place.wx / TILE);
      const ty = Math.floor(place.wy / TILE);
      place.valid = canPlaceAt(tx, ty).ok;
      updatePlaceUi();
    } else if (isPanning){
      const dx = (e.clientX - panStart.x);
      const dy = (e.clientY - panStart.y);
      Camera.x = Math.max(0, panStart.cx - dx / Camera.zoom);
      Camera.y = Math.max(0, panStart.cy - dy / Camera.zoom);
    }
  });

  window.addEventListener('pointerup', () => { isPanning = false; });

  // Wheel-Zoom (Canvas-zoom, nicht Seitenzoom)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const z0 = Camera.zoom;
    const step = (e.deltaY < 0) ? 1.1 : 0.9;
    Camera.zoom = Math.min(Camera.maxZoom, Math.max(Camera.minZoom, Camera.zoom * step));
    // Optional: Zoom-Zentrum beibehalten (hier einfach)
  }, { passive:false });

  // ESC/Back = Abbruch im Platziermodus
  window.addEventListener('keydown', (e) => {
    if (place.active && (e.key === 'Escape' || e.key === 'Backspace')){
      EVT('cb:build:cancel', { id: place.buildingId });
      leavePlaceMode('cancel');
    }
  });

  // ---- Platzier-UI (✅/❌) --------------------------------------------------
  const placeUi = (() => {
    const el = document.createElement('div');
    el.id = 'place-ui';
    el.innerHTML = `
      <button class="btn ok"    aria-label="Platzieren">✅</button>
      <button class="btn cancel" aria-label="Abbrechen">❌</button>
    `;
    document.body.appendChild(el);
    el.querySelector('.ok').addEventListener('click', commitPlacement);
    el.querySelector('.cancel').addEventListener('click', () => {
      EVT('cb:build:cancel', { id: place.buildingId }); leavePlaceMode('cancel');
    });
    el.style.display = 'none';
    return el;
  })();

  function updatePlaceUi(){
    if (!place.active) return;
    // Buttons links-oben an der Ghost-Kachel positionieren
    const p = Camera.worldToScreen(place.wx, place.wy);
    placeUi.style.display = 'block';
    placeUi.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y - 40)}px)`;
    placeUi.classList.toggle('invalid', !place.valid);
  }
  function hidePlaceUi(){ placeUi.style.display = 'none'; }

  // ---- Render --------------------------------------------------------------
  function render(){
    // Leinwand bereinigen
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Kamera-Transform
    ctx.setTransform(Camera.zoom, 0, 0, Camera.zoom, -Camera.x * Camera.zoom, -Camera.y * Camera.zoom);

    // Map (Dummy-Gitter)
    ctx.fillStyle = '#0e141d';
    ctx.fillRect(0,0,world.map.w*TILE, world.map.h*TILE);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for(let x=0; x<=world.map.w; x++){
      ctx.beginPath();
      ctx.moveTo(x*TILE, 0); ctx.lineTo(x*TILE, world.map.h*TILE); ctx.stroke();
    }
    for(let y=0; y<=world.map.h; y++){
      ctx.beginPath();
      ctx.moveTo(0, y*TILE); ctx.lineTo(world.map.w*TILE, y*TILE); ctx.stroke();
    }

    // Gebäude (als Icons oder einfache Kacheln)
    world.buildings.forEach(b => {
      const px = b.x * TILE, py = b.y * TILE;
      if (b.icon){
        const img = getIcon(b.icon);
        if (img?.complete) ctx.drawImage(img, px, py, TILE, TILE);
        else {
          // Fallback: Kachel
          ctx.fillStyle = '#3b6f2a';
          ctx.fillRect(px, py, TILE, TILE);
        }
      } else {
        ctx.fillStyle = '#3b6f2a';
        ctx.fillRect(px, py, TILE, TILE);
      }
    });

    // Ghost
    if (place.active){
      const gx = Math.floor(place.wx / TILE) * TILE;
      const gy = Math.floor(place.wy / TILE) * TILE;
      // Rot/Grün Overlay
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = place.valid ? '#22c55e' : '#ef4444';
      ctx.fillRect(gx, gy, place.w*TILE, place.h*TILE);
      ctx.globalAlpha = 1.0;
      // Icon-Vorschau
      if (place.icon){
        const img = getIcon(place.icon);
        if (img?.complete) ctx.drawImage(img, gx, gy, TILE, TILE);
      }
    }
  }

  // Icon-Cache (nutzt die gleichen Icons wie im Baumenü)
  const _iconCache = {};
  function getIcon(src){
    if (!src) return null;
    if (_iconCache[src]) return _iconCache[src];
    const img = new Image(); img.src = src; _iconCache[src] = img; return img;
  }

  function loop(){
    render();
    requestAnimationFrame(loop);
  }

  // ---- Events aus UI -------------------------------------------------------
  // Start (Map laden) – HQ mittig anlegen
  window.addEventListener('cb:game-start', (e) => {
    const mapMeta = e.detail?.map || { w:64, h:64 };
    loadMap(mapMeta);

    // HQ initial in Kartenmitte (z. B. "b.hq")
    const hqId = 'b.hq';
    const cx = Math.floor(world.map.w/2), cy = Math.floor(world.map.h/2);
    // Einmalig anlegen, wenn noch nicht vorhanden
    if (!world.buildings.some(b => b.id === hqId)){
      world.buildings.push({ id:hqId, x:cx, y:cy, w:1, h:1, icon:getDefaultIcon(hqId) });
    }
    log('game-start auf Map', mapMeta);
  });

  // Auswahl aus Baumenü → Platziermodus
  window.addEventListener('cb:build:select', (e) => {
    const id = e.detail?.id;
    // Icon aus Registry (oder Fallback)
    let icon = null;
    try {
      const meta = window.Registry?.get('building', id);
      icon = meta?.icon || null;
    } catch {}
    icon = icon || getDefaultIcon(id);
    enterPlaceMode(id, icon);
  });

  // Abbruch von außen
  window.addEventListener('cb:build:cancel', () => leavePlaceMode('cancel'));

  // Helper: Fallback-Icon aus id ableiten (z. B. assets/icons/b.hq.png)
  function getDefaultIcon(id){
    return `assets/icons/${id}.png`;
  }

  // ---- Init ----------------------------------------------------------------
  function init(){
    // Canvas auf Gerätepixel-Dichte anpassen
    function resize(){
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      canvas.width  = Math.floor(canvas.clientWidth  * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Touch-Wheel-Seitenzoom vermeiden
    canvas.style.touchAction = 'none';

    log('Modul geladen (v19.0.0)');
    requestAnimationFrame(loop);
  }

  init();
})();
