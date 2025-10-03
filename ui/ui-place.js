/* ============================================================================
 * Datei   : ui/ui-place.js
 * Zweck   : UI-Overlay für Platzieren (großes Vorschaubild + ✓ / ✗ Buttons)
 * Version : v3.2.0
 * Kernpunkte:
 *   - Positionsdaten (sx,sy,size) kommen in CANVAS-Pixeln → in CSS-Pixel umrechnen
 *   - Overlay ist absolut über dem Canvas positioniert; keine zusätzlichen Transforms
 *   - Buttons sitzen innerhalb der grünen Fläche: ✓ links-oben, ✗ rechts-oben
 * ============================================================================ */

(() => {
  'use strict';

  const TAG  = '[ui-place]';
  const LOG  = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);

  // Root-Overlay über dem Canvas
  let root, img, okBtn, cancelBtn;

  // Letzte Preview-Daten (für Reposition bei Resize)
  let last = null;

  function ensureDOM() {
    if (root) return;

    // Root: sitzt direkt über dem Canvas (siehe CSS)
    root = document.createElement('div');
    root.className = 'place-overlay';
    root.style.display = 'none';

    // Großes Vorschaubild (Sprite)
    img = document.createElement('img');
    img.className = 'place-sprite';
    img.alt = '';
    root.appendChild(img);

    // Buttons
    okBtn = document.createElement('button');
    okBtn.className = 'place-btn ok';
    okBtn.textContent = '✓';
    okBtn.addEventListener('click', () => {
      if (!last || last.invalid) return;
      // Falls UI keine gx/gy mitsendet, nimmt Engine _state.preview
      window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail: { gx: last.gx, gy: last.gy } }));
    });
    root.appendChild(okBtn);

    cancelBtn = document.createElement('button');
    cancelBtn.className = 'place-btn cancel';
    cancelBtn.textContent = '✕';
    cancelBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cb:place:cancel'));
      hide();
    });
    root.appendChild(cancelBtn);

    // Root ins DOM – direkt neben dem Canvas:
    // Wir hängen es an den gleichen Container wie das Canvas (body geht auch),
    // CSS kümmert sich darum, dass es deckungsgleich über #game liegt.
    (document.body || document.documentElement).appendChild(root);

    // Resize → Position/Größe neu berechnen
    window.addEventListener('resize', () => { if (last) apply(last); });
  }

  function hide() {
    if (root) root.style.display = 'none';
    last = null;
  }

  // w,h sind in Tiles; size ist eine Kachelkante in CANVAS-Pixeln.
  // sx,sy kommen in CANVAS-Pixeln (Top-Left der grünen Fläche)
  function apply(p) {
    ensureDOM();
    last = p;

    // Ungültig → Overlay aus
    if (!p || p.invalid) { hide(); return; }

    // Schutz
    const cssScale = p.cssScale || { x: 1, y: 1 };
    const k       = p.size || 64;     // Kachelkante (Canvas-Pixel)
    const wTiles  = p.w || 1;
    const hTiles  = p.h || 1;

    // CANVAS → CSS umrechnen
    const leftCSS = (p.sx || 0) / cssScale.x;
    const topCSS  = (p.sy || 0) / cssScale.y;
    const widthCSS  = (k * wTiles) / cssScale.x;
    const heightCSS = (k * hTiles) / cssScale.y;

    // Root sichtbar
    root.style.display = 'block';

    // Root exakt auf das Footprint-Rechteck legen
    root.style.left = `${leftCSS}px`;
    root.style.top  = `${topCSS}px`;
    root.style.width  = `${widthCSS}px`;
    root.style.height = `${heightCSS}px`;

    // Sprite-Bildquelle aus Registry/Engine: wir nutzen die gleiche URL-Logik
    // Die Engine rendert die platzierten Sprites; für die Vorschau nehmen wir
    // denselben Sprite-URL wie die Engine (Icon als Fallback).
    const spriteURL = (window.Game?.__spriteUrlById && window.Game.__spriteUrlById(p.id))
                   || (window.Registry?.byId?.(p.id)?.spriteUrl)
                   || (window.Registry?.byId?.(p.id)?.sprite)
                   || (window.Registry?.byId?.(p.id)?.iconUrl)
                   || (window.Registry?.byId?.(p.id)?.icon)
                   || '';

    if (spriteURL) {
      img.src = spriteURL;
      img.style.display = 'block';
      img.style.width  = `${widthCSS}px`;
      img.style.height = `${heightCSS}px`;
    } else {
      img.style.display = 'none';
    }

    // Buttons (jeweils INNEN an die Ecken)
    const pad = Math.max(6, Math.round(Math.min(widthCSS, heightCSS) * 0.06));
    positionButton(okBtn,     pad,          pad);                      // links oben (✓)
    positionButton(cancelBtn, widthCSS-pad, pad, true /*anchorRight*/);// rechts oben (✕)
  }

  function positionButton(btn, x, y, anchorRight=false) {
    btn.style.left = anchorRight ? '' : `${x}px`;
    btn.style.right = anchorRight ? `${Math.max(0, x)}px` : '';
    btn.style.top  = `${y}px`;
  }

  // Events von der Engine (siehe Game.emitPreviewEvent)
  window.addEventListener('cb:place:preview', (e) => {
    const d = e.detail || {};
    if (!d || d.invalid) { hide(); return; }
    apply(d);
  });

  // Nach Confirm/Cancel muss Overlay verschwinden (falls Engine schneller ist)
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);

  LOG('ready');
})();
