/* ============================================================================
 * Neue Siedler – Entities (Diagnose)
 * Datei: assets/core/core.entities.js
 * Version: v17.6.2-diag
 *
 * Zweck:
 *  - Entities-State + Platzieren
 *  - Sprite-Lookup via Registry (falls vorhanden)
 *  - Platzhalter-Render in Kategoriefarben (fallback)
 *  - Explizite Bindung: window.drawEntities(ctx) → garantiert vorhanden
 *  - Auto-Spawn "rathaus" in Kartenmitte beim Spielstart
 *  - Sichtbares Debug (Fadenkreuz + Koordinaten auf erstem Gebäude)
 * ========================================================================== */

(function(){
  'use strict';

  const LOG  = (...a)=> (window.CBLog?.info  || console.log)('[entities]', ...a);
  const OK   = (...a)=> (window.CBLog?.ok    || console.log)('[entities]', ...a);
  const WARN = (...a)=> (window.CBLog?.warn  || console.warn)('[entities]', ...a);
  const ERR  = (...a)=> (window.CBLog?.error || console.error)('[entities]', ...a);

  // ------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------
  const Entities = (window.Entities = window.Entities || {});
  const state = (Entities.state = Entities.state || {
    list: [],          // {id, kind, x, y, w, h, cat?, sprite?}
    _id: 0,
    tile: 64
  });

  // Registry (falls vorhanden)
  const Reg = window.EntitiesRegistry || null;

  // Kategoriefarben (Fallback, falls Registry keine liefert)
  const CAT_COLORS = {
    'verwaltung' : '#A77EF1', // lila
    'nahrung'    : '#F6B74E', // amber
    'rohstoff'   : '#4EC1B3', // türkis
    'wohnen'     : '#3FA0F7', // blau
    'infrastruktur':'#7D8B99',// grau
    'landschaft' : '#6BBF59', // grün (ok, spätere Platzier-Logik nutzt eigene rot/grün)
    'militaer'   : '#E96A6A', // rot (nur Kategoriefarbe, Platzierbarkeit separat)
    'default'    : '#FFCC66'
  };

  // Sprite-Cache
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error'

  // Hilfen
  function clampNum(v, d){ return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function snap(v, tile){ return Math.round(v / tile) * tile; }

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('map')  ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function getMapTileSize() {
    // Versuche aus GameCore.state.map.tile, sonst fallback 64
    const t = window.GameCore?.state?.map?.tile;
    return clampNum(t, state.tile);
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera || {};
    const cvs = getCanvas();
    if (!cvs) return { x: 0, y: 0 };

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const scale = clampNum(cam.zoom ?? cam.scale, 1);
    const w = (cvs.width  / dpr) / scale;
    const h = (cvs.height / dpr) / scale;
    return { x: clampNum(cam.x,0) + w/2, y: clampNum(cam.y,0) + h/2 };
  }

  // ------------------------------------------------------------------------
  // Registry-Lookups
  // ------------------------------------------------------------------------
  function resolveKindMeta(kind) {
    // Liefert { kind, cat, sprite, w, h } – so gut wie möglich
    let meta = { kind, cat: 'default', sprite: null, w: state.tile, h: state.tile };

    if (Reg?.getBuilding) {
      const r = Reg.getBuilding(kind); // kann null sein
      if (r) {
        meta.cat = r.category || meta.cat;
        meta.sprite = r.sprite || null;
        meta.w = clampNum(r.size?.w, meta.w);
        meta.h = clampNum(r.size?.h, meta.h);
      }
    }

    if (!meta.sprite && Reg?.getSpritePath) {
      meta.sprite = Reg.getSpritePath(kind) || null;
    }

    return meta;
  }

  function loadSprite(kind, spritePath) {
    if (!kind) return null;
    if (SPRITES.has(kind)) return SPRITES.get(kind);

    if (!spritePath) {
      // kein Pfad → hard fail cache, damit wir nicht spammen
      SPRITES.set(kind, 'error');
      return 'error';
    }

    const img = new Image();
    img.onload  = () => OK('Sprite geladen:', kind, '←', spritePath);
    img.onerror = () => { SPRITES.set(kind, 'error'); WARN('Sprite fehlt:', kind, 'pfad:', spritePath); };
    img.src = spritePath;
    SPRITES.set(kind, img);
    return img;
  }

  // ------------------------------------------------------------------------
  // Platzieren
  // ------------------------------------------------------------------------
  function place(kind, x, y, opts) {
    if (!kind) return null;

    const tile = getMapTileSize();
    const meta = resolveKindMeta(kind);

    // Koordinaten: default Kameramitte
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const b = {
      id: ++state._id,
      kind,
      cat: meta.cat || 'default',
      x: snap(x, tile),
      y: snap(y, tile),
      w: clampNum(meta.w, tile),
      h: clampNum(meta.h, tile)
    };

    // Sprite (optional)
    if (meta.sprite) loadSprite(kind, meta.sprite);

    state.list.push(b);
    OK('platziert:', kind, '→', b.x, b.y, '(gesamt:', state.list.length, ')');
    return b;
  }

  // Auto-Spawn Rathaus (einmalig) nach Spielstart
  let _autoRathausDone = false;
  function autoSpawnRathaus() {
    if (_autoRathausDone) return;
    _autoRathausDone = true;

    const tile = getMapTileSize();
    // Kartenmitte per Kameramitte approximieren (Mapgröße kennen wir nicht sicher)
    const c = cameraCenterWorld();
    const b = place('rathaus', c.x, c.y);
    OK('Rathaus automatisch platziert (Kartenmitte):', b.x, b.y);
  }

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  function pickPlaceholderColor(cat) {
    // aus Registry, falls vorhanden
    if (Reg?.getCategoryColor) {
      const col = Reg.getCategoryColor(cat);
      if (col) return col;
    }
    return CAT_COLORS[cat] || CAT_COLORS.default;
  }

  function drawPlaceholder(ctx, b) {
    const col = pickPlaceholderColor(b.cat);
    ctx.save();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.fillStyle = '#111';
    ctx.globalAlpha = 1;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(b.kind, b.x + 6, b.y + Math.max(14, Math.floor(b.h/2)));
    ctx.restore();
  }

  function drawDebugMarker(ctx, b) {
    // kleines Fadenkreuz & Koordinaten (nur auf dem ersten Gebäude im Listendurchlauf)
    ctx.save();
    ctx.strokeStyle = 'magenta';
    ctx.lineWidth = 2;
    const cx = b.x + Math.floor(b.w/2);
    const cy = b.y + Math.floor(b.h/2);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();
    ctx.fillStyle = 'magenta';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`(${b.x},${b.y})`, b.x + 4, b.y - 6);
    ctx.restore();
  }

  function draw(ctx) {
    const list = state.list;
    if (!list || list.length === 0) return;

    let first = true;

    for (const b of list) {
      const img = SPRITES.get(b.kind);
      if (img && img !== 'error' && img.complete) {
        ctx.drawImage(img, b.x, b.y, b.w, b.h);
      } else {
        drawPlaceholder(ctx, b);
      }

      if (first) {
        drawDebugMarker(ctx, b);
        first = false;
      }
    }
  }

  // ------------------------------------------------------------------------
  // Exports & Bindings
  // ------------------------------------------------------------------------
  Entities.place = place;
  Entities.draw  = draw;

  // **WICHTIG**: Globaler Bindepunkt, den core.render.js aufruft
  if (typeof window.drawEntities !== 'function') {
    window.drawEntities = (ctx) => Entities.draw(ctx);
    OK('drawEntities global gebunden → Renderer kann Entities zeichnen.');
  }

  // Auto-Spawn Rathaus beim Spielstart
  window.addEventListener('cb:game-start', () => {
    // Tilegröße ggf. aus Map übernehmen
    const t = window.GameCore?.state?.map?.tile;
    if (t) state.tile = clampNum(t, state.tile);
    autoSpawnRathaus();
  });

  OK('Modul geladen (v17.6.2-diag).');
})();
