/* ============================================================================
 * Datei   : ui/ui-place.js
 * Zweck   : UI-Overlay für Platzieren (Vorschau + ✓/✕ Buttons)
 * Version : v3.3.0 (robust, ohne offsetWidth, keine Race-Conditions)
 * Events  : hört auf 'cb:place:preview' / 'cb:place:confirm' / 'cb:place:cancel'
 * Daten   : preview.detail = { id,gx,gy,sx,sy,size,w,h,cssScale,{...} }
 * Hinweis : sx/sy/size sind CANVAS-Pixel → werden auf CSS-Pixel umgerechnet.
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[ui-place]';
  const LOG  = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);

  let root, spriteImg, okBtn, cancelBtn;
  let last = null; // letzte gültige Preview (für Reposition bei resize)

  function ensureDOM() {
    if (root) return;

    // Root-Overlay (liegt deckungsgleich über dem Canvas)
    root = document.createElement('div');
    root.className = 'place-overlay';
    root.style.display = 'none';       // unsichtbar bis erste gültige Preview kommt
    root.style.position = 'absolute';
    root.style.left = '0';
    root.style.top  = '0';
    root.style.zIndex = '2000';
    root.style.pointerEvents = 'none'; // Standard: durchklickbar – nur Buttons aktivieren wir

    // Großes Vorschaubild (Sprite/Icon)
    spriteImg = document.createElement('img');
    spriteImg.className = 'place-sprite';
    spriteImg.alt = '';
    spriteImg.style.position = 'absolute';
    spriteImg.style.left = '0';
    spriteImg.style.top  = '0';
    spriteImg.style.width = '100%';
    spriteImg.style.height= '100%';
    spriteImg.style.imageRendering = 'pixelated';
    spriteImg.style.pointerEvents = 'none';
    root.appendChild(spriteImg);

    // Buttons
    okBtn = document.createElement('button');
    okBtn.className = 'place-btn ok';
    okBtn.type = 'button';
    okBtn.textContent = '✓';
    baseBtnStyles(okBtn);
    okBtn.style.left = '8px';
    okBtn.style.top  = '8px';
    okBtn.addEventListener('click', () => {
      if (!last || last.invalid) return;
      window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail: { gx: last.gx, gy: last.gy } }));
    });
    root.appendChild(okBtn);

    cancelBtn = document.createElement('button');
    cancelBtn.className = 'place-btn cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✕';
    baseBtnStyles(cancelBtn);
    cancelBtn.style.right = '8px';
    cancelBtn.style.top   = '8px';
    cancelBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cb:place:cancel'));
      hide();
    });
    root.appendChild(cancelBtn);

    // Root an denselben Container wie das Canvas hängen (fallback: body)
    (document.getElementById('game')?.parentElement || document.body).appendChild(root);

    // Reposition bei resize
    window.addEventListener('resize', () => { if (last) apply(last); });

    LOG('ready');
  }

  function baseBtnStyles(btn){
    btn.style.position = 'absolute';
    btn.style.minWidth = '32px';
    btn.style.height   = '32px';
    btn.style.border   = '0';
    btn.style.borderRadius = '8px';
    btn.style.fontWeight = '700';
    btn.style.fontSize   = '18px';
    btn.style.lineHeight = '32px';
    btn.style.cursor     = 'pointer';
    btn.style.pointerEvents = 'auto';     // Buttons sollen klickbar sein
    btn.style.boxShadow  = '0 2px 6px rgba(0,0,0,.25)';
    btn.style.color      = '#fff';

    if (btn.classList.contains('ok')) {
      btn.style.background = 'linear-gradient(#1fb070,#15915a)';
    } else {
      btn.style.background = 'linear-gradient(#d85d5d,#b44a4a)';
    }
  }

  function hide() {
    if (root) root.style.display = 'none';
    last = null;
  }

  // sx,sy,size in CANVAS-Pixeln → auf CSS-Pixel umrechnen und Overlay exakt legen.
  function apply(p) {
    ensureDOM();
    if (!p || p.invalid) { hide(); return; }
    last = p;

    const cssScale = p.cssScale || { x: 1, y: 1 };
    const k       = p.size || 64;
    const wTiles  = p.w || 1;
    const hTiles  = p.h || 1;

    const leftCSS   = (p.sx || 0) / cssScale.x;
    const topCSS    = (p.sy || 0) / cssScale.y;
    const widthCSS  = (k * wTiles) / cssScale.x;
    const heightCSS = (k * hTiles) / cssScale.y;

    // Root auf das Footprint-Rechteck legen
    root.style.display = 'block';
    root.style.left    = `${leftCSS}px`;
    root.style.top     = `${topCSS}px`;
    root.style.width   = `${widthCSS}px`;
    root.style.height  = `${heightCSS}px`;

    // Sprite-Quelle (Engine-Helper, Registry-Fallbacks)
    let spriteURL = null;
    try { spriteURL = window.Game?.__spriteUrlById?.(p.id) || null; } catch {}
    if (!spriteURL){
      const b = window.Registry?.byId?.(p.id);
      spriteURL = b?.spriteUrl || b?.sprite || b?.iconUrl || b?.icon || null;
    }

    if (spriteURL){
      spriteImg.src = spriteURL;
      spriteImg.style.display = 'block';
    } else {
      spriteImg.style.display = 'none';
    }

    // Buttons liegen per CSS-Inset innerhalb (oben links / oben rechts)
    // Keine offsetWidth/Height-Messungen nötig → kein Fehler-Loop mehr.
  }

  // Event-Wireup
  window.addEventListener('cb:place:preview', (e) => {
    const d = e?.detail || {};
    if (!d || d.invalid) { hide(); return; }
    apply(d);
  });
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);
})();
