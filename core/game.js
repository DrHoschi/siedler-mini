// ============================================================================
// Datei : core/game.js
// Zweck : Gekapselte Spiel-Engine (Raster, Map-Load, Platzierung, Loop)
// API   : Game.init(canvas), Game.start(mapId), Game.getState()
// Events: cb:game-start  { mapId }
//         cb:map:loaded  { mapId, tile, size:{w,h} }
// Hinweise:
//   • Keine globale STATE-Variable – interner _state ist gekapselt
//   • Reagiert auf cb:build:select (aus ui/ui-build.js)
//   • Platzierung per Linksklick auf den Canvas (Rasterausrichtung)
// ============================================================================

(() => {
  // ------------------------ interner Zustand ------------------------
  const _state = {
    started: false,
    mapId: null,
    canvas: null,
    ctx: null,
    w: 0,
    h: 0,
    tile: 40,                   // Default, wird ggf. durch Map überschrieben
    gridW: 32,                  // Default in Tiles
    gridH: 18,                  // Default in Tiles
    placements: [],             // { x, y, id }
    hover: { x: -1, y: -1 },    // Rasterzelle unter Maus
    selectedBuilding: null,     // aus cb:build:select
    rafId: 0
  };

// Beispiel: Anfangsstände – nimm deine echten Werte/Save
const res = state?.resources || { wood: 0, stone: 0, food: 0, gold: 0, pop: 0 };
window.dispatchEvent(new CustomEvent('cb:res:change', { detail: res }));
  
  // ------------------------ kleine Helpers -------------------------
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[game]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[game]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[game]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  function gridSnap(px, size) { return Math.floor(px / size); }

  // ------------------------ Rendering --------------------------------
  function drawBackground(ctx, w, h) {
    ctx.fillStyle = '#1a1d21';
    ctx.fillRect(0, 0, w, h);
  }

  function drawGrid(ctx, w, h, size) {
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += size) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += size) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  }

  function drawPlacements(ctx, size) {
    for (const p of _state.placements) {
      const x = p.x * size, y = p.y * size;
      ctx.fillStyle = 'rgba(192,161,107,.35)';   // Holz-/Papier-Ton
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = 'rgba(192,161,107,.9)';
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    }
  }

  function drawHover(ctx, size) {
    if (_state.hover.x < 0 || _state.hover.y < 0) return;
    const x = _state.hover.x * size, y = _state.hover.y * size;
    ctx.strokeStyle = 'rgba(77,163,255,.9)'; // Akzent-Farbe
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
  }

  function frame(ts) {
    if (!_state.started) return;
    const ctx = _state.ctx; if (!ctx) return;
    const { w, h, tile } = _state;

    drawBackground(ctx, w, h);
    drawGrid(ctx, w, h, tile);
    drawPlacements(ctx, tile);
    drawHover(ctx, tile);

    _state.rafId = requestAnimationFrame(frame);
  }

  // ------------------------ Map laden --------------------------------
  async function loadMap(mapId) {
    // Erwartetes Format (optional, wenn vorhanden):
    // { "id":"...", "name":"...", "tile": 40, "size": [widthTiles, heightTiles] }
    try {
      if (typeof mapId === 'string' && /\.json($|\?)/i.test(mapId)) {
        const res = await fetch(mapId, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const tile = Number(json.tile) || _state.tile;
        const size = Array.isArray(json.size) ? json.size : [_state.gridW, _state.gridH];
        _state.tile  = tile;
        _state.gridW = Number(size[0]) || _state.gridW;
        _state.gridH = Number(size[1]) || _state.gridH;

        log('map geladen aus JSON', { mapId, tile: _state.tile, grid: [_state.gridW, _state.gridH] });
      } else {
        log('map: kein JSON-Header → Default', { mapId });
      }
    } catch (e) {
      warn('map laden fehlgeschlagen – nutze Default', e);
    }

    // Canvas an Gridgröße anpassen (optional – wir skalieren auf Clientgröße)
    // Wichtig ist nur der "tile"-Wert fürs Raster.

    EVT('cb:map:loaded', { mapId, tile: _state.tile, size: { w: _state.gridW, h: _state.gridH } });
  }

  // ------------------------ Event-Handler ----------------------------
  function onResize() {
    if (!_state.canvas) return;
    const c = _state.canvas;
    // Pixelgröße an Client-Size koppeln (responsive)
    _state.w = c.width  = c.clientWidth  || c.width;
    _state.h = c.height = c.clientHeight || c.height;
  }

  function onMouseMove(ev) {
    if (!_state.canvas) return;
    const rect = _state.canvas.getBoundingClientRect();
    const gx = gridSnap(ev.clientX - rect.left, _state.tile);
    const gy = gridSnap(ev.clientY - rect.top,  _state.tile);
    _state.hover.x = gx;
    _state.hover.y = gy;
  }

  function onClick(ev) {
    if (!_state.canvas || !_state.selectedBuilding) return;

    const rect = _state.canvas.getBoundingClientRect();
    const gx = gridSnap(ev.clientX - rect.left, _state.tile);
    const gy = gridSnap(ev.clientY - rect.top,  _state.tile);

    // Simple bounds-check (optional)
    if (gx < 0 || gy < 0) return;

    _state.placements.push({ x: gx, y: gy, id: _state.selectedBuilding });
    log('placed', { id: _state.selectedBuilding, x: gx, y: gy });
  }

  // ------------------------ Public API --------------------------------
  function init(canvas) {
    if (!canvas) { err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx = canvas.getContext('2d');

    // Event-Wiring
    onResize();
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    // Auswahl aus Baumenü
    window.addEventListener('cb:build:select', (e) => {
      _state.selectedBuilding = e?.detail?.id || null;
      log('select building', _state.selectedBuilding);
    });

    log('init ✓');
  }

  async function start(mapId) {
    _state.mapId = mapId || _state.mapId || 'data/maps/map-mini.json';
    _state.started = true;

    EVT('cb:game-start', { mapId: _state.mapId });
    await loadMap(_state.mapId);

    cancelAnimationFrame(_state.rafId);
    _state.rafId = requestAnimationFrame(frame);
  }

  function getState() {
    // nur Lese-Snapshot
    const { started, mapId, tile, gridW, gridH, placements, selectedBuilding } = _state;
    return { started, mapId, tile, gridW, gridH, placements: placements.slice(), selectedBuilding };
  }

  // Export
  window.Game = { init, start, getState };
})();
