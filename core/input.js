/* ============================================================================
 * Datei   : core/input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-ghost-fix
 * Zweck   : Platzier-Ghost folgt Cursor (Mouse/Touch, iPad-Safari-fest)
 * Lauscht : cb:game:start, cb:build:select, cb:build:cancel
 * Sendet  : req:place:cursor, req:place:confirm, req:place:cancel
 * Hinweis : „ghost-anchored“ Default (0/0) wird nur benutzt bis zum ersten Move
 * ========================================================================== */
/* ============================================================================
 * Datei   : core/input.js
 * Projekt : Neue Siedler
 * Version : v25.11.14-ghost-fix + tap-snap (final)
 * Zweck   : Platzier-Ghost folgt dem Finger/Pointer (Mouse/Touch, iPad-Safari)
 *
 * Kurzüberblick
 * - Ghost springt BEIM ANTIPPEN sofort unter den Finger (tap-snap).
 * - Bestätigen funktioniert auch ohne vorheriges Move-Event (Tap-Ende).
 * - Touch auf iOS: touchmove/touchstart/touchend mit {passive:false}.
 * - Zusätzlicher pointermove-Fallback auf document (falls Layer kurz drüberliegt).
 *
 * Ereignisse (unser Standard gemäß Lastenheft):
 * - Lauscht : cb:game:start, cb:build:select, cb:build:cancel, cb:camera:update
 * - Sendet  : req:place:cursor ( {tx,ty} ), req:place:confirm ( {tx,ty} )
 *
 * Hinweis zu CSS/Layer:
 * - Stelle sicher, dass UI-Container wie #ui-root/#hud-root mit pointer-events:none
 *   arbeiten und nur interaktive Inseln (Buttons, Dock, Inspector) pointer-events:auto
 *   nutzen, damit Canvas (#game) seine Events sicher erhält.
 * ========================================================================== */

/* ------------------------------- Imports ---------------------------------- */
// (keine externen – reines Browser-/DOM-Modul)

/* -------------------------- Konstanten & Meta ----------------------------- */
const VERSION  = 'v25.11.14-ghost-fix+tap-snap';
const TILE     = window.__cb?.tileSize || 64; // Kachelgröße aus Core-Kontext
const TAP_SLOP = 8;                            // px: Bewegung < 8px zählt als Tap

/* ---------------------------- Modul-Status -------------------------------- */
const state = {
  // Platziermodus
  placing : false,     // true, wenn ein Gebäude ausgewählt ist
  hoverOn : false,     // true, sobald wir eine gültige Position haben

  // Letztbekannte Hover-Position (Tile)
  lastTx  : 0,
  lastTy  : 0,

  // Tap-/Drag-Tracking
  downTx  : null,      // Start-Tile beim Antippen
  downTy  : null,
  downX   : 0,         // Client-Koordinaten beim Down
  downY   : 0,
  moved   : false,     // Bewegung über TAP_SLOP hinaus?

  // Kamera-Offset (World-Space)
  camera  : { x: 0, y: 0 }, // wird über cb:camera:update synchronisiert

  // DOM
  canvas  : null
};

/* --------------------------- Hilfsfunktionen ------------------------------ */
/**
 * screenToTile(ev)
 * Wandelt Maus-/Touch-Koordinaten (clientX/Y) → Canvas → World → Tile um.
 * Gibt null zurück, wenn der Pointer außerhalb des Canvas liegt.
 */
function screenToTile(ev) {
  const c = state.canvas;
  if (!c) return null;

  const rect = c.getBoundingClientRect();
  const p = (ev.touches && ev.touches[0]) ? ev.touches[0] : ev;
  const x = p.clientX;
  const y = p.clientY;

  // Außerhalb des Canvas? → ignorieren
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;

  // Screen → Canvas
  const cx = x - rect.left;
  const cy = y - rect.top;

  // Canvas → World (Kamera berücksichtigen)
  const wx = cx + state.camera.x;
  const wy = cy + state.camera.y;

  // World → Tile
  const tx = (wx / TILE) | 0;
  const ty = (wy / TILE) | 0;

  return { tx, ty, clientX: x, clientY: y };
}

/**
 * emitCursor(tx, ty)
 * Standardisiertes Cursor-Event an das Platzier-Subsystem schicken.
 */
function emitCursor(tx, ty) {
  state.lastTx = tx;
  state.lastTy = ty;
  state.hoverOn = true;

  window.dispatchEvent(new CustomEvent('req:place:cursor', {
    detail: { tx, ty }
  }));
}

/* ------------------------------- Event-Handler ---------------------------- */
/**
 * onDown(ev)
 * – Sofortiges Springen des Ghost unter den Finger (tap-snap).
 * – Down-Position merken, damit Confirm auch ohne Move möglich ist.
 */
function onDown(ev) {
  if (!state.placing) return;

  const tile = screenToTile(ev);
  if (!tile) { state.hoverOn = false; return; }

  // Tap-Snap: Ghost sofort positionieren
  emitCursor(tile.tx, tile.ty);

  // Down-Daten für Tap-Auswertung merken
  state.downTx = tile.tx;
  state.downTy = tile.ty;
  state.downX  = tile.clientX;
  state.downY  = tile.clientY;
  state.moved  = false;
}

/**
 * onMove(ev)
 * – Normales Nachführen des Ghost.
 * – Tap-Slop erkennen (ab welcher Distanz es ein „Drag“ ist).
 */
function onMove(ev) {
  if (!state.placing) return;

  const tile = screenToTile(ev);
  if (!tile) { state.hoverOn = false; return; }

  // Tap-Slop prüfen (nur solange noch nicht als „moved“ markiert)
  if (!state.moved) {
    const dx = Math.abs(tile.clientX - state.downX);
    const dy = Math.abs(tile.clientY - state.downY);
    if (dx > TAP_SLOP || dy > TAP_SLOP) state.moved = true;
  }

  emitCursor(tile.tx, tile.ty);
}

/**
 * onUp(ev)
 * – Bestätigt die Platzierung.
 * – Wenn es keinen gültigen Hover gab (z. B. keine Moves), wird die Down-Tile genutzt.
 */
function onUp(ev) {
  if (!state.placing) return;

  // Falls kein Hover (z. B. Layer-Capture oder kein Move), DownTile benutzen
  const tx = state.hoverOn ? state.lastTx : state.downTx;
  const ty = state.hoverOn ? state.lastTy : state.downTy;

  if (tx == null || ty == null) {
    (window.CBLog?.warn || console.warn)('⚠️ [input] Bestätigen ignoriert (keine gültige Position)');
    return;
  }

  // iOS/Safari: Default verhindern, damit touchend nicht verschluckt wird
  ev?.preventDefault?.();

  window.dispatchEvent(new CustomEvent('req:place:confirm', {
    detail: { tx, ty }
  }));
}

/**
 * onCancel()
 * – interner Helfer zum Aufräumen beim Abbruch des Platziermodus.
 */
function onCancel() {
  state.placing = false;
  state.hoverOn = false;
  state.downTx = state.downTy = null;
}

/* ------------------------------- Hauptlogik ------------------------------- */
function mount() {
  state.canvas = document.getElementById('game');

  // Pointer: Down/Move/Up direkt auf dem Canvas (schnellster Pfad zum Ghost)
  state.canvas.addEventListener('pointerdown', onDown,  { passive: true  });
  state.canvas.addEventListener('pointermove', onMove,  { passive: true  });
  state.canvas.addEventListener('pointerup',   onUp,    { passive: false });
  state.canvas.addEventListener('pointercancel', onUp,  { passive: false });

  // Touch (Mobile/Safari): non-passive nötig, sonst werden Moves/Ends gedrosselt
  state.canvas.addEventListener('touchstart', onDown,   { passive: false });
  state.canvas.addEventListener('touchmove',  onMove,   { passive: false });
  state.canvas.addEventListener('touchend',   onUp,     { passive: false });
  state.canvas.addEventListener('touchcancel',onUp,     { passive: false });

  // Fallback: globales pointermove, falls kurzzeitig ein Overlay drüber liegt
  document.addEventListener('pointermove', onMove, { passive: true });

  // Build-Flow (aus UI-Dock)
  window.addEventListener('cb:build:select', () => { state.placing = true; });
  window.addEventListener('cb:build:cancel', onCancel);

  // Kamera-Sync (vom Camera-Modul)
  window.addEventListener('cb:camera:update', (e) => { state.camera = e.detail; });

  (window.CBLog?.ok || console.log)(`✅ [input] ${VERSION} mounted`);
}

// Erst nach fertiger Szene montieren
window.addEventListener('cb:game:start', mount);

/* ------------------------------- Exports ---------------------------------- */
// keine (IIFE-Modul im Browser-Kontext)
