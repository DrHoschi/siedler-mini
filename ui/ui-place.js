/* ============================================================================
 * Datei   : ui/ui-place.js
 * Zweck   : UI-Overlay für Platzieren (Vorschau + ✓/✕ Buttons)
 * Version : v3.4.0 (Single-bind, kein Doppel-Place)
 * Events  : hört auf 'cb:place:preview' / 'cb:place:confirm' / 'cb:place:cancel'
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[ui-place]';
  const LOG  = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);

  let root, spriteImg, okBtn, cancelBtn;
  let last = null;

  function ensureDOM() {
    if (root) return;

    root = document.createElement('div');
    root.className = 'place-overlay';
    root.style.display = 'none';
    root.style.position = 'absolute';
    root.style.left = '0';
    root.style.top  = '0';
    root.style.zIndex = '2000';
    root.style.pointerEvents = 'none';

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

    okBtn = document.createElement('button');
    okBtn.className = 'place-btn ok';
    okBtn.type = 'button';
    okBtn.textContent = '✓';
    baseBtnStyles(okBtn);
    okBtn.style.left = '8px';
    okBtn.style.top  = '8px';
    okBtn.addEventListener('click', () => {
      if (!last || last.invalid) return; // keine invaliden Confirms
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

    (document.getElementById('game')?.parentElement || document.body).appendChild(root);
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
    btn.style.pointerEvents = 'auto';
    btn.style.boxShadow  = '0 2px 6px rgba(0,0,0,.25)';
    btn.style.color      = '#fff';
    btn.style.background = btn.classList.contains('ok')
      ? 'linear-gradient(#1fb070,#15915a)'
      : 'linear-gradient(#d85d5d,#b44a4a)';
  }

  function hide(){ if (root) root.style.display = 'none'; last = null; }

  // Vorschau exakt legen (p.sx/sy,size sind CANVAS-Pixel)
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

    root.style.display = 'block';
    root.style.left    = `${leftCSS}px`;
    root.style.top     = `${topCSS}px`;
    root.style.width   = `${widthCSS}px`;
    root.style.height  = `${heightCSS}px`;

    // Sprite-Quelle ermitteln
    let spriteURL = null;
    try { spriteURL = window.Game?.__spriteUrlById?.(p.id) || null; } catch {}
    if (!spriteURL){
      const b = window.Registry?.byId?.(p.id);
      spriteURL = b?.spriteUrl || b?.sprite || b?.iconUrl || b?.icon || null;
    }
    if (spriteURL){ spriteImg.src = spriteURL; spriteImg.style.display = 'block'; }
    else { spriteImg.style.display = 'none'; }
  }

  // Event-Wireup
  window.addEventListener('cb:place:preview', (e) => { const d=e?.detail||{}; if (!d||d.invalid){ hide(); return; } apply(d); });
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);

/* ============================================================================
 * Glue: Ghost → Place (nur einmal binden, keine Doppel-Platzierung)
 *  - Merkt tx,ty aus dem Preview (Engine-Quelle).
 *  - Beim OK feuert es cb:place:confirm:tile mit GENAU diesen tx,ty.
 * ========================================================================== */
(function(){
  'use strict';
  if (window.__uiPlaceGlueMounted) return;
  window.__uiPlaceGlueMounted = true;

  const LOG = (window.CBLog?.ok || console.log).bind(console,'[ui-place-glue]');

  // letzter Preview-Stand (von der Engine)
  let last = { id:null, tx:null, ty:null, w:1, h:1, valid:false };

  // Preview → Merken, NICHT umrechnen!
  window.addEventListener('cb:place:preview', (ev)=>{
    const d = ev?.detail||{};
    last.id = d.id || last.id;
    last.tx = (typeof d.tx === 'number') ? d.tx : last.tx;
    last.ty = (typeof d.ty === 'number') ? d.ty : last.ty;
    last.w  = d.w|0 || last.w;
    last.h  = d.h|0 || last.h;
    last.valid = !d.invalid;
  });

  // OK vom Overlay → wenn wir echte Tiles haben, direkt weitergeben
  window.addEventListener('cb:place:confirm', ()=>{
    if (!last.valid || typeof last.tx !== 'number' || typeof last.ty !== 'number'){
      LOG('confirm: missing tiles/invalid → skip', last);
      return;
    }
    const payload = { id:last.id, tx:last.tx, ty:last.ty };
    window.dispatchEvent(new CustomEvent('cb:place:confirm:tile', { detail: payload }));
    LOG('confirm (tile) →', payload);
  });
})();
