/* ============================================================================
 * Datei   : ui/ui-place.js
 * Zweck   : Platzieren-UI (Ghost + Confirm/Cancel-Buttons an der Ghost-Box)
 * Events  :
 *   hört   -> cb:build:select   { id }                   (aus Baumenü)
 *             cb:place:preview  { id,gx,gy,sx,sy,size,invalid }
 *   sendet -> cb:place:confirm  { id,gx,gy }
 *             cb:place:cancel   { }
 *
 * Hinweise:
 * - Größe des Ghosts kommt aus detail.size ([w,h]) oder Default 3×3.
 * - Position kann als Pixel (sx,sy) oder Grid (gx,gy*TILE) geliefert werden.
 * - Dieses Modul ist VISUELL. Das Game bleibt die Quelle der Wahrheit.
 * ========================================================================== */
(function(){
  'use strict';

  // ---- Logging -------------------------------------------------------------
  const MOD = 'ui-place';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  // ---- Konstanten ----------------------------------------------------------
  const TILE = (window.Game && Game.tile) || 64;   // Kachelgröße (Fallback 64)

  // ---- Interner Zustand ----------------------------------------------------
  let root, ghostBox, btnOk, btnNo;
  let currentSel = null;         // { id, size:[w,h] } (aus Registry zum gewählten Item)
  let lastPrev   = null;         // letztes Preview-Event (um gx,gy beim Confirm zu senden)

  // ---- Utilities -----------------------------------------------------------
  function $(s, r=document){ return r.querySelector(s); }
  function normalizeSize(s){
    if (!Array.isArray(s) || s.length < 2) return [3,3];
    return [ Math.max(1, +s[0]||3), Math.max(1, +s[1]||3) ];
  }
  function px(n){ return Math.round(n) + 'px'; }

  // ---- DOM Grundgerüst einmalig herstellen --------------------------------
  function ensureRoot(){
    if (!root){
      root = $('#place-ui') || document.createElement('div');
      root.id = 'place-ui';
      if (!root.parentNode) document.body.appendChild(root);
    }
    if (!ghostBox){
      ghostBox = document.createElement('div');
      ghostBox.id = 'place-ghost';
      // Basestyles: absolute + klick-durchlässig
      Object.assign(ghostBox.style, {
        position: 'absolute',
        pointerEvents: 'none',            // Buttons bekommen wieder pointerEvents
        background: 'rgba(0,200,0,.22)',
        outline: '2px solid rgba(0,255,0,.55)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        zIndex: 1000
      });

      // Buttons erstellen (sie hängen an der Ghost-Box)
      btnOk = document.createElement('button');
      btnNo = document.createElement('button');
      btnOk.className = 'place-btn place-confirm';
      btnNo.className = 'place-btn place-cancel';
      btnOk.textContent = '✅';
      btnNo.textContent = '❌';
      btnOk.title = 'Bauen (Bestätigen)';
      btnNo.title = 'Abbrechen';

      // Buttons sollen klickbar sein → pointerEvents reaktivieren
      Object.assign(btnOk.style, {
        position:'absolute', right:'-10px', bottom:'-10px',
        width:'44px', height:'44px', borderRadius:'12px',
        boxShadow:'0 6px 16px rgba(0,0,0,.35)',
        pointerEvents:'auto'
      });
      Object.assign(btnNo.style, {
        position:'absolute', left:'-10px', bottom:'-10px',
        width:'44px', height:'44px', borderRadius:'12px',
        boxShadow:'0 6px 16px rgba(0,0,0,.35)',
        pointerEvents:'auto'
      });

      // Click-Handler
      btnOk.addEventListener('click', (e)=>{
        e.stopPropagation(); e.preventDefault();
        const id = (lastPrev?.id) || (currentSel?.id);
        const gx = (typeof lastPrev?.gx === 'number') ? lastPrev.gx
                 : (typeof lastPrev?.sx === 'number') ? Math.round(lastPrev.sx / TILE) : 0;
        const gy = (typeof lastPrev?.gy === 'number') ? lastPrev.gy
                 : (typeof lastPrev?.sy === 'number') ? Math.round(lastPrev.sy / TILE) : 0;
        window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail:{ id, gx, gy }}));
        hide();
      });
      btnNo.addEventListener('click', (e)=>{
        e.stopPropagation(); e.preventDefault();
        window.dispatchEvent(new CustomEvent('cb:place:cancel'));
        hide();
      });

      ghostBox.appendChild(btnOk);
      ghostBox.appendChild(btnNo);
      root.appendChild(ghostBox);
    }
  }

  // ---- Sichtbarkeit --------------------------------------------------------
  function hide(){
    if (ghostBox && ghostBox.parentNode){
      ghostBox.parentNode.removeChild(ghostBox);
    }
    ghostBox = null;
  }

  // ---- Render der Ghost-Box ------------------------------------------------
  function applySize(size){
    ensureRoot();
    const [w,h] = normalizeSize(size || currentSel?.size || [3,3]);
    ghostBox.style.width  = px(w * TILE);
    ghostBox.style.height = px(h * TILE);
  }
  function applyPosFromPreview(pre){
    ensureRoot();
    // Position: sx/sy (Pixel) bevorzugt, sonst via gx,gy*TILE
    const left = (typeof pre.sx === 'number') ? pre.sx : (pre.gx||0) * TILE;
    const top  = (typeof pre.sy === 'number') ? pre.sy : (pre.gy||0) * TILE;
    ghostBox.style.left = px(left);
    ghostBox.style.top  = px(top);
  }

  // ---- Event-Wiring --------------------------------------------------------
  // 1) Auswahl aus dem Baumenü -> Größe vormerken
  window.addEventListener('cb:build:select', (ev)=>{
    const id = ev.detail?.id;
    const list = (window.Registry && Registry.get) ? Registry.get('buildings') : [];
    currentSel = (list || []).find(b => b && String(b.id) === String(id)) || { id, size:[3,3] };
    // Ghost schon da? -> Größe sofort aktualisieren
    if (ghostBox) applySize(currentSel.size);
  });

  // 2) Live-Preview vom Game -> Ghost zeigen/positionieren
  window.addEventListener('cb:place:preview', (e)=>{
    const d = e.detail || {};
    lastPrev = d;

    // invalid => ausblenden
    if (d.invalid){ hide(); return; }

    ensureRoot();
    applySize(d.size);
    applyPosFromPreview(d);
  });

  // 3) Auf Confirm/Cancel ebenfalls ausblenden (Game baut/abbricht)
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);

  log('geladen');
})();
