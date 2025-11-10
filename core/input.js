/* ============================================================================
 * Datei   : core/input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-ghost-fix
 * Zweck   : Platzier-Ghost folgt Cursor (Mouse/Touch, iPad-Safari-fest)
 * Lauscht : cb:game:start, cb:build:select, cb:build:cancel
 * Sendet  : req:place:cursor, req:place:confirm, req:place:cancel
 * Hinweis : „ghost-anchored“ Default (0/0) wird nur benutzt bis zum ersten Move
 * ========================================================================== */

/* ------------------------------- Imports ---------------------------------- */
// (keine externen)

/* -------------------------- Konstanten & Meta ----------------------------- */
const TILE = window.__cb?.tileSize || 64;

/* ---------------------------- Modul-Status -------------------------------- */
const state = {
  placing: false,
  hoverOn: false,
  lastTx: 0,
  lastTy: 0,
  camera: { x: 0, y: 0 }, // von deinem Camera-Modul befüllt
  canvas: null,
  unsub: [],
};

/* --------------------------- Hilfsfunktionen ------------------------------ */
function screenToTile(ev) {
  const c = state.canvas;
  if (!c) return null;
  const rect = c.getBoundingClientRect();

  // PointerKoordinaten (Mouse / Touch)
  const pX = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
  const pY = (ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY);

  // innerhalb des Canvas?
  const inX = pX >= rect.left && pX <= rect.right;
  const inY = pY >= rect.top  && pY <= rect.bottom;
  if (!inX || !inY) return null;

  // Screen -> Canvas -> World -> Tile
  const cx = pX - rect.left;
  const cy = pY - rect.top;
  const wx = cx + state.camera.x;
  const wy = cy + state.camera.y;
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  return { tx, ty };
}

function handleMove(ev) {
  if (!state.placing) return;
  const tile = screenToTile(ev);
  if (!tile) { state.hoverOn = false; return; }

  state.lastTx = tile.tx;
  state.lastTy = tile.ty;
  state.hoverOn = true;

  // Unser standardisiertes Cursor-Event (Req-Namespace siehe Lastenheft)
  window.dispatchEvent(new CustomEvent('req:place:cursor', {
    detail: { tx: tile.tx, ty: tile.ty }
  }));
}

function handleConfirm(ev) {
  if (!state.placing) return;
  // iPad: Tap-Ende als Bestätigen erlauben
  ev?.preventDefault?.();

  if (!state.hoverOn) {
    (window.CBLog?.warn || console.warn)('⚠️ [input] Bestätigen ignoriert (kein Hover)');
    return;
  }
  window.dispatchEvent(new CustomEvent('req:place:confirm', {
    detail: { tx: state.lastTx, ty: state.lastTy }
  }));
}

/* ------------------------------- Hauptlogik ------------------------------- */
function mount() {
  state.canvas = document.getElementById('game');

  // Pointer-Listener direkt am Canvas
  state.canvas.addEventListener('pointermove', handleMove, { passive: true });
  state.canvas.addEventListener('pointerdown', handleMove, { passive: true });

  // Touch-Fallback (Safari): move muss non-passive sein, sonst kein Stream
  state.canvas.addEventListener('touchmove', handleMove, { passive: false });
  state.canvas.addEventListener('touchstart', handleMove, { passive: false });
  state.canvas.addEventListener('touchend', handleConfirm, { passive: false });

  // Zusätzlicher Fallback: gesamtes Dokument (falls ein UI-Child doch drüber liegt)
  document.addEventListener('pointermove', handleMove, { passive: true });

  // Build-Flow
  window.addEventListener('cb:build:select', () => { state.placing = true; });
  window.addEventListener('cb:build:cancel', () => { state.placing = false; state.hoverOn = false; });

  // Kamera-Sync (falls vorhanden)
  window.addEventListener('cb:camera:update', (e) => { state.camera = e.detail; });

  (window.CBLog?.ok || console.log)('✅ [input] ghost-fix mounted');
}

window.addEventListener('cb:game:start', mount);

/* ------------------------------- Exports ---------------------------------- */
// keine
