/* ============================================================================
 * Datei   : ui/ui-place.js
 * Zweck   : Schwebende Confirm(✅)/Cancel(❌)-Buttons am Ghost positionieren
 * Events  : hört  -> cb:place:preview { id,gx,gy,sx,sy,size }
 *           sendet-> cb:place:confirm { id,gx,gy }
 *                    cb:place:cancel  { }
 * Hinweis : rein visuell – Game bleibt Quelle der Wahrheit.
 * ========================================================================== */

(() => {
  const MOD='ui-place';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  // Root-Overlay einmalig anlegen
  let root = document.getElementById('place-ui');
  if (!root){
    root = document.createElement('div');
    root.id = 'place-ui';
    document.body.appendChild(root);
  }

  // Aktuelle Box (wird recycelt)
  let box = null;

  function hide(){
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null;
  }

  function show(preview){
    const { sx, sy, size, gx, gy, id } = preview || {};
    if (sx==null || sy==null) return hide();

    if (!box){
      box = document.createElement('div');
      box.className = 'place-box';
      root.appendChild(box);

      const btnOk = document.createElement('button');
      btnOk.className = 'place-btn place-confirm';
      btnOk.textContent = '✅';
      btnOk.title = 'Bauen (Bestätigen)';
      btnOk.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail: { id, gx, gy } }));
        hide();
      });

      const btnNo = document.createElement('button');
      btnNo.className = 'place-btn place-cancel';
      btnNo.textContent = '❌';
      btnNo.title = 'Abbrechen';
      btnNo.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        window.dispatchEvent(new CustomEvent('cb:place:cancel'));
        hide();
      });

      box.appendChild(btnOk);
      box.appendChild(btnNo);
    }

    // Position & Größe setzen
    box.style.setProperty('--s', `${size}px`);
    box.style.left   = `${Math.round(sx)}px`;
    box.style.top    = `${Math.round(sy)}px`;
  }

  // Preview vom Game
  window.addEventListener('cb:place:preview', (e) => {
    const d = e.detail || {};
    // Wenn invalid (z.B. außerhalb Map), UI verstecken
    if (!d || d.invalid) return hide();
    show(d);
  });

  // Sicherheitshalber auf Confirm/Cancel ebenfalls ausblenden
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel', hide);

  log('geladen');
})();

(function(){
  'use strict';

  const TILE = (window.Game && Game.tile) || 64;  // Kachelgröße

  let current = null;   // { id, size:[w,h], ... }
  let ghostEl = document.getElementById('place-ghost'); // dein Overlay/Preview

  // Fallback: Ghost-Element erzeugen, wenn es fehlt
  if (!ghostEl){
    ghostEl = document.createElement('div');
    ghostEl.id = 'place-ghost';
    ghostEl.style.position = 'absolute';
    ghostEl.style.pointerEvents = 'none';
    ghostEl.style.background = 'rgba(0, 200, 0, .25)';
    ghostEl.style.outline = '2px solid rgba(0,255,0,.6)';
    document.body.appendChild(ghostEl);
  }

  function normalizeSize(s){
    if (!Array.isArray(s) || s.length < 2) return [3,3];  // <- Default 3x3
    return [ Math.max(1, +s[0]||3), Math.max(1, +s[1]||3) ];
  }

  function updateGhostSize(){
    if (!current) return;
    const [w,h] = normalizeSize(current.size);
    ghostEl.style.width  = (w * TILE) + 'px';
    ghostEl.style.height = (h * TILE) + 'px';
  }

  // Auswahl aus dem Baumenü
  window.addEventListener('cb:build:select', (ev) => {
    const id = ev.detail?.id;
    const list = (window.Registry && Registry.get) ? Registry.get('buildings') : [];
    current = (list || []).find(b => b && String(b.id) === String(id)) || { id, size:[3,3] };
    updateGhostSize();
    // ggf. Platziermodus aktivieren …
  });

  // Bei Maus/Touch-Bewegung Ghost versetzen (hier nur Raster-Snapping Idee)
  function moveGhostTo(gridX, gridY){
    ghostEl.style.left = (gridX * TILE) + 'px';
    ghostEl.style.top  = (gridY * TILE) + 'px';
  }

  // TODO: deine bestehenden Pointer-/Touch-Handler rufen moveGhostTo(...)
})();
