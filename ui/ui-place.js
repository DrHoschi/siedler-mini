/* ============================================================================
 * Datei   : ui/ui-place.js
 * Projekt : Neue Siedler – Build/Ghost Confirm
 * Version : v2.2.0 (2025-10-05)
 * Zweck   : Zeigt Ghost-Overlay inkl. OK/X; dispatcht cb:place:confirm/-cancel
 * Events  : hört auf cb:place:preview ({id,gx,gy,tx,ty,sx,sy,size,invalid})
 *           sendet cb:place:confirm({gx,gy}) / cb:place:cancel()
 * Hinweis : rein visuell; Kollision/Validierung macht Game.js
 * ============================================================================ */
(function () {
  const TAG = '[ui-place]';
  const log  = (...a)=>console.log(TAG, ...a);
  const warn = (...a)=>console.warn(TAG, ...a);

  // Root-Container einmalig anlegen
  const host = document.createElement('div');
  host.id = 'ui-place-host';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);

  host.innerHTML = `
    <div class="place-ghost" id="place-ghost" hidden>
      <div class="place-ghost-box" id="place-box"></div>
      <div class="place-ctrl" id="place-ctrl" hidden>
        <button id="btn-place-ok" class="place-btn place-ok" aria-label="Platzieren">✓</button>
        <button id="btn-place-cancel" class="place-btn place-cancel" aria-label="Abbrechen">✕</button>
      </div>
    </div>
  `;

  const ghost = document.getElementById('place-ghost');
  const box   = document.getElementById('place-box');
  const ctrl  = document.getElementById('place-ctrl');
  const btnOk = document.getElementById('btn-place-ok');
  const btnX  = document.getElementById('btn-place-cancel');

  let last = null; // merkt sich letzte gültige Vorschau

  // Buttons -> Events
  btnOk.addEventListener('click', ()=>{
    if (!last) return;
    window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail:{ gx:last.gx, gy:last.gy } }));
  });
  btnX.addEventListener('click', ()=>{
    window.dispatchEvent(new Event('cb:place:cancel'));
    hide();
  });

  function hide(){
    ghost.hidden = true;
    ctrl.hidden  = true;
    last = null;
  }

  function showAt(pre){
    // pre: {sx,sy,size,w,h,invalid}
    const pad = Math.max(4, Math.floor(pre.size*0.06));
    const pxW = pre.w * pre.size;
    const pxH = pre.h * pre.size;

    ghost.hidden = false;
    ghost.style.transform = `translate(${Math.round(pre.sx)}px, ${Math.round(pre.sy)}px)`;
    box.style.width  = `${Math.round(pxW)}px`;
    box.style.height = `${Math.round(pxH)}px`;
    box.classList.toggle('is-invalid', !!pre.invalid);

    // OK/X nur bei gültiger Position, leicht nach oben links vom Ghost
    if (!pre.invalid){
      ctrl.hidden = false;
      ctrl.style.transform = `translate(${pad}px, ${-Math.round(pre.size*0.7)}px)`;
    } else {
      ctrl.hidden = true;
    }
  }

  // Preview aus dem Game empfangen
  window.addEventListener('cb:place:preview', (ev)=>{
    const d = ev?.detail||{};
    if (!d || d.invalid){
      hide();
      return;
    }
    last = d; // für Confirm
    showAt(d);
  });

  // Wenn Build-Mode beendet -> verstecken
  window.addEventListener('cb:build:mode', (ev)=>{
    if (!ev?.detail) return;
    if (!ev.detail.active) hide();
  });

  log('bereit');
})();
