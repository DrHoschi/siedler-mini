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
