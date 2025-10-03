/* ============================================================================
 * Datei   : ui/ui-place.js
 * Version : v1.4.0 (2025-10-02)
 * Zweck   : Platzieren-UI (Ghost + ✅/❌), DPI-/iOS-sicher
 *
 * Hört  :
 *   - cb:build:select  { id }
 *   - cb:place:preview {
 *       id,gx,gy, sx,sy, size, invalid,
 *       w,h, door, entrances, entrancesAbs,
 *       cam:{x,y,z}, cssScale:{x,y}, canvas:{w,h}
 *     }
 * Sendet:
 *   - cb:place:confirm { id,gx,gy }
 *   - cb:place:cancel  {}
 *
 * WICHTIG:
 *   - Wir rechnen ALLES, was vom Game in Canvas-Pixeln kommt, nach CSS-Pixel
 *     um: cssPX = canvasPX / cssScale.{x|y}. So sitzen Ghost & Buttons exakt.
 *   - Bestätigen/Cancellen nutzt IMMER gx,gy aus der Preview → keine
 *     Rechenabweichungen mehr.
 * ========================================================================== */

/* --------------------------- Pfad-Helfer (Icons) -------------------------- */
function normBase(s){ return (s||'').replace(/\/+$/,'') + '/'; }
function isAbs(u){ return /^(https?:)?\/\//i.test(u) || u.startsWith('/') || u.startsWith('data:'); }
function withExt(n){ return /\.(png|webp|jpg|jpeg|svg)$/i.test(n) ? n : (n + '.png'); }

/** Liefert iconsBase aus der Registry oder Fallback. */
function getIconsBase(){
  try { return normBase(window.Registry?.get?.('iconsBase') || 'assets/icons/buildings/'); }
  catch{ return 'assets/icons/buildings/'; }
}

/** Sprite-Pfad für den Ghost (fällt auf icon zurück, wenn sprite fehlt). */
function spriteSrcFor(item){
  const raw = item?.sprite || item?.spriteId || item?.spritePath || item?.icon || '';
  if (!raw) return '';
  if (isAbs(raw)) return raw;
  return getIconsBase() + withExt(String(raw));
}

/* =============================== Modul ==================================== */
(function(){
  'use strict';

  const MOD  = 'ui-place';
  const log  = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`, ...a);

  // Zustand
  let root    = null;     // <div id="place-ui">
  let ghost   = null;     // <div class="place-box" id="place-ghost">
  let btnOk   = null;     // ✅
  let btnNo   = null;     // ❌
  let current = null;     // gewählt aus Baumenü {id, size:[w,h], sprite?, icon?}
  let lastPre = null;     // letztes Preview-Event

  // DOM-Helper
  const $  = (s, r=document)=>r.querySelector(s);
  const px = n => Math.round(n) + 'px';
  function normalizeSize(s){ return (Array.isArray(s) && s.length>=2)
    ? [Math.max(1, +s[0]||3), Math.max(1, +s[1]||3)]
    : [3,3]; }

  /* ---------- Root & Ghost einmalig anlegen (Buttons per CSS positioniert) --- */
  function ensureDOM(){
    if (!root){
      root = $('#place-ui') || document.createElement('div');
      root.id = 'place-ui';                         // CSS: fixed/absolute layer, pointer-events:none
      if (!root.parentNode) document.body.appendChild(root);
      // Root selbst lässt Pointer durch, Buttons haben pointer-events:auto
      Object.assign(root.style, { position:'fixed', left:0, top:0, inset:'0 0 0 0', pointerEvents:'none' });
    }
    if (!ghost){
      ghost = document.createElement('div');
      ghost.id = 'place-ghost';
      ghost.className = 'place-box';                // nutzt deine ui-place.css
      Object.assign(ghost.style, {
        position: 'absolute',
        pointerEvents: 'none',
        boxSizing: 'border-box'
      });

      // Buttons erzeugen – Positionierung macht CSS (.place-confirm / .place-cancel)
      btnOk = document.createElement('button');
      btnOk.className = 'place-btn place-confirm';
      btnOk.textContent = '✅';
      btnOk.title = 'Bauen (Bestätigen)';
      // Buttons selbst müssen klickbar sein:
      btnOk.style.pointerEvents = 'auto';
      btnOk.addEventListener('click', (e)=>{
        e.stopPropagation(); e.preventDefault();
        if (!lastPre) return;
        const id = lastPre.id ?? current?.id;
        // ❗ Immer gx,gy aus Preview verwenden – engine ist Quelle der Wahrheit
        window.dispatchEvent(new CustomEvent('cb:place:confirm', {
          detail:{ id, gx:lastPre.gx, gy:lastPre.gy }
        }));
        hide();
      });

      btnNo = document.createElement('button');
      btnNo.className = 'place-btn place-cancel';
      btnNo.textContent = '❌';
      btnNo.title = 'Abbrechen';
      btnNo.style.pointerEvents = 'auto';
      btnNo.addEventListener('click', (e)=>{
        e.stopPropagation(); e.preventDefault();
        window.dispatchEvent(new CustomEvent('cb:place:cancel'));
        hide();
      });

      ghost.append(btnOk, btnNo);
      root.appendChild(ghost);
    }
  }

  /* ---------------------------- Sichtbarkeit ------------------------------- */
  function hide(){
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    ghost = btnOk = btnNo = null;
  }

  /* ----------------------------- Rendering -------------------------------- */
  /**
   * Größe des Ghosts anwenden.
   * d.size ist die Kachelgröße in CANVAS-Pixeln (tile*zoom).
   * Wir rechnen auf CSS-Pixel um (→ / cssScale).
   */
  function applySizeFromPreview(d){
    ensureDOM();
    const [wTiles,hTiles] = normalizeSize(d.size ? [d.w||current?.size?.[0], d.h||current?.size?.[1]] : current?.size);

    // Kachelgröße (Canvas-Px) → CSS-Px
    const tileCanvas = Number(d.size) || 64; // fallback
    const cssX = d.cssScale?.x || 1;
    const cssY = d.cssScale?.y || 1;
    const tileCssW = tileCanvas / cssX;
    const tileCssH = tileCanvas / cssY;

    ghost.style.setProperty('--tile-w', px(tileCssW));
    ghost.style.setProperty('--tile-h', px(tileCssH));
    ghost.style.width  = px(wTiles * tileCssW);
    ghost.style.height = px(hTiles * tileCssH);

    // Sprite auf Boxgröße skalieren (optional)
    const src = spriteSrcFor(current || {});
    if (src){
      ghost.style.backgroundImage    = `url("${src}")`;
      ghost.style.backgroundRepeat   = 'no-repeat';
      ghost.style.backgroundPosition = 'center center';
      ghost.style.backgroundSize     = `${wTiles*tileCssW}px ${hTiles*tileCssH}px`;
    } else {
      ghost.style.backgroundImage = '';
    }
  }

  /**
   * Position aus Preview anwenden.
   * sx/sy kommen in CANVAS-Pixeln → auf CSS-Pixel umrechnen.
   */
  function applyPosFromPreview(d){
    ensureDOM();
    const cssX = d.cssScale?.x || 1;
    const cssY = d.cssScale?.y || 1;
    const left = (typeof d.sx === 'number') ? (d.sx / cssX) : (d.gx||0) * ((d.size||64)/cssX);
    const top  = (typeof d.sy === 'number') ? (d.sy / cssY) : (d.gy||0) * ((d.size||64)/cssY);
    ghost.style.left = px(left);
    ghost.style.top  = px(top);
  }

  /* ----------------------------- Event-Wiring ------------------------------ */
  // 1) Auswahl aus Baumenü – Größe/Sprite vormerken (Ghost erscheint erst mit Preview)
  window.addEventListener('cb:build:select', (ev)=>{
    const id   = ev.detail?.id;
    const list = (window.Registry && Registry.get) ? Registry.get('buildings') : [];
    current    = (list || []).find(b => b && String(b.id) === String(id)) || { id, size:[3,3] };
    // Falls der Ghost schon sichtbar ist, beim nächsten Preview wird Größe/Pos aktualisiert.
  });

  // 2) Live-Preview der Engine – Ghost zeigen/positionieren (DPI-sicher)
  window.addEventListener('cb:place:preview', (e)=>{
    const d = e.detail || {};
    lastPre = d;
    if (d.invalid) { hide(); return; }     // ungültig → UI weg

    ensureDOM();
    // Größe & Position ausschließlich anhand der Preview-Daten bestimmen
    // (inkl. cssScale → CSS-Pixel)
    const sizeHint = current?.size || [3,3];
    // Fülle w/h falls nicht gesetzt (z. B. beim ersten Event)
    d.w = d.w || sizeHint[0]; d.h = d.h || sizeHint[1];

    applySizeFromPreview(d);
    applyPosFromPreview(d);
  });

  // 3) Nach Bestätigen/Abbrechen ebenfalls ausblenden
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);

  log('geladen');
})();
