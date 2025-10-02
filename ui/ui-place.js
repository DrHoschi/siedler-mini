/* ============================================================================
 * Datei   : ui/ui-place.js
 * Version : v1.3.0 (2025-10-01)
 * Zweck   : Platzieren-UI (Ghost mit ✅/❌ an der Box)
 *
 * Hört  :
 *   - cb:build:select  { id }                         (aus Baumenü)
 *   - cb:place:preview { id,gx,gy,sx,sy,size,invalid} (Live-Vorschau vom Game)
 * Sendet:
 *   - cb:place:confirm { id,gx,gy }
 *   - cb:place:cancel  {}
 *
 * Hinweise
 *   - Größe kommt aus detail.size ([w,h]) oder Default 3×3.
 *   - Position: bevorzugt Pixel (sx,sy), sonst Raster (gx,gy) * TILE.
 *   - Buttons werden per CSS positioniert: ✅ links oben, ❌ rechts oben.
 *   - Dieses Modul ist rein visuell. Die Engine bleibt Quelle der Wahrheit.
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
  const TILE = (window.Game && Game.tile) || 64;   // Kachelgröße (Fallback 64)

  // Zustand
  let root    = null;     // <div id="place-ui">
  let ghost   = null;     // <div class="place-box" id="place-ghost">
  let btnOk   = null;     // ✅
  let btnNo   = null;     // ❌
  let current = null;     // aktuell aus Baumenü gewählt {id, size:[w,h], sprite?, icon?}
  let lastPre = null;     // letztes Preview-Event (für gx,gy)

  // Utils
  const $  = (s, r=document)=>r.querySelector(s);
  const px = n => Math.round(n) + 'px';
  function normalizeSize(s){ return (Array.isArray(s) && s.length>=2)
    ? [Math.max(1, +s[0]||3), Math.max(1, +s[1]||3)]
    : [3,3]; }

  /* ---------- Root & Ghost einmalig anlegen (Buttons per CSS positioniert) --- */
  function ensureDOM(){
    if (!root){
      root = $('#place-ui') || document.createElement('div');
      root.id = 'place-ui';                 // CSS kümmert sich um Layering/pointer-events
      if (!root.parentNode) document.body.appendChild(root);
    }
    if (!ghost){
      ghost = document.createElement('div');
      ghost.id = 'place-ghost';
      ghost.className = 'place-box';        // nutzt deine ui-place.css
      // minimale Basestyles, Rest via CSS
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
      btnOk.addEventListener('click', (e)=>{
        e.stopPropagation(); e.preventDefault();
        const id = (lastPre?.id) || (current?.id);
        // Rasterkoordinaten aus Preview ableiten (Pixel→Grid, falls nötig)
        const gx = (typeof lastPre?.gx === 'number') ? lastPre.gx
                 : (typeof lastPre?.sx === 'number') ? Math.round(lastPre.sx / TILE) : 0;
        const gy = (typeof lastPre?.gy === 'number') ? lastPre.gy
                 : (typeof lastPre?.sy === 'number') ? Math.round(lastPre.sy / TILE) : 0;
        window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail:{ id, gx, gy }}));
        hide();
      });

      btnNo = document.createElement('button');
      btnNo.className = 'place-btn place-cancel';
      btnNo.textContent = '❌';
      btnNo.title = 'Abbrechen';
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
  function applySize(size){
    ensureDOM();
    const [w,h] = normalizeSize(size || current?.size);
    ghost.style.setProperty('--s', px(TILE));       // falls CSS var nutzt
    ghost.style.width  = px(w * TILE);
    ghost.style.height = px(h * TILE);

    // Sprite auf Boxgröße skalieren
    const src = spriteSrcFor(current || {});
    if (src){
      ghost.style.backgroundImage    = `url("${src}")`;
      ghost.style.backgroundRepeat   = 'no-repeat';
      ghost.style.backgroundPosition = 'center center';
      ghost.style.backgroundSize     = `${w*TILE}px ${h*TILE}px`;
    }
  }

  function applyPosFromPreview(pre){
    ensureDOM();
    const left = (typeof pre.sx === 'number') ? pre.sx : (pre.gx||0) * TILE;
    const top  = (typeof pre.sy === 'number') ? pre.sy : (pre.gy||0) * TILE;
    ghost.style.left = px(left);
    ghost.style.top  = px(top);
  }

  /* ----------------------------- Event-Wiring ------------------------------ */
  // 1) Auswahl aus Baumenü – Größe/Sprite vormerken (Ghost erscheint erst mit Preview)
  window.addEventListener('cb:build:select', (ev)=>{
    const id   = ev.detail?.id;
    const list = (window.Registry && Registry.get) ? Registry.get('buildings') : [];
    current    = (list || []).find(b => b && String(b.id) === String(id)) || { id, size:[3,3] };
    if (ghost) applySize(current.size); // falls Ghost bereits sichtbar → sofort anpassen
  });

  // 2) Live-Preview der Engine – Ghost zeigen/positionieren
  window.addEventListener('cb:place:preview', (e)=>{
    const d = e.detail || {};
    lastPre = d;
    if (d.invalid) { hide(); return; }     // ungültig → UI weg

    ensureDOM();
    applySize(d.size);
    applyPosFromPreview(d);
  });

  // 3) Nach Bestätigen/Abbrechen ebenfalls ausblenden
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);

  log('geladen');
})();
