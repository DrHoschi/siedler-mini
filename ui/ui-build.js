/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v19.0.0 (2025-10-05)
 * Zweck    : Baumenü rendern (Epoche 1), Kosten-Icons, Platziermodus (Ghost)
 * Events   :
 *   IN  : cb:registry:ready
 *         cb:place:done                (nach erfolgreichem Bauen)
 *   OUT : req:place:start {buildingId}
 *         req:place:confirm {tx,ty}
 *         req:place:cancel
 * UI    : Icons: assets/icons/buildings/<id>.png
 *         Kosten: assets/icons/resources/<res>.png
 * ============================================================================
 */

(function(){
  const $dock = document.getElementById('build-dock');
  const $ghostRoot = ensureGhostRoot(); // ein Overlay

  function ensureGhostRoot(){
    let r = document.querySelector('.place-overlay');
    if(!r){
      r = document.createElement('div');
      r.className = 'place-overlay';
      document.body.appendChild(r);
    }
    r.innerHTML = ''; // clean
    return r;
  }

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, {detail})); }

  // --------------------------- Baumenü rendern -------------------------------
  function renderDock(){
    const list = Registry.list('buildings', { epoche:1 });
    if(!$dock) return;
    $dock.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'build-grid';

    list.forEach(b=>{
      const card = document.createElement('button');
      card.className = 'build-card';
      card.title = b.name || b.id;

      const img = document.createElement('img');
      img.className = 'build-icon';
      img.src = `assets/icons/buildings/${b.id}.png`;
      img.alt = b.name || b.id;

      const label = document.createElement('div');
      label.className = 'build-label';
      label.textContent = b.name || b.id;

      const cost = document.createElement('div');
      cost.className = 'build-cost';
      (b.cost || []).forEach(c=>{
        const row = document.createElement('span');
        row.className = 'cost-row';
        const i = document.createElement('img');
        i.className = 'cost-icon';
        i.src = `assets/icons/resources/${c.id}.png`;
        i.alt = c.id;

        const t = document.createElement('span');
        t.textContent = `×${c.qty}`;
        row.appendChild(i); row.appendChild(t);
        cost.appendChild(row);
      });

      card.appendChild(img);
      card.appendChild(label);
      card.appendChild(cost);
      card.addEventListener('click', ()=>{
        startPlacing(b);
      });

      grid.appendChild(card);
    });

    $dock.appendChild(grid);
  }

  // --------------------------- Platziermodus --------------------------------
  let placing = null; // { building, size, okBtn, cancelBtn, ghostElm }

  function startPlacing(building){
    placing = { building, size: building.size || {w:1, h:1} };
    $ghostRoot.innerHTML = '';

    const ghost = document.createElement('div');
    ghost.className = 'place-sprite';
    $ghostRoot.appendChild(ghost);

    const ok = document.createElement('button');
    ok.className = 'place-btn ok';
    ok.textContent = '✔';
    ghost.appendChild(ok);

    const cancel = document.createElement('button');
    cancel.className = 'place-btn cancel';
    cancel.textContent = '✖';
    ghost.appendChild(cancel);

    // Maus/Touch folgen
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('keydown', onKeyDown);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', cancelPlacing);

    // Ghost-Bild als großes Vorschau-Sprite (optional: echtes Gebäude-Sprite)
    ghost.style.backgroundImage = `url(assets/icons/buildings/${building.id}.png)`;
    ghost.style.backgroundSize = 'cover';

    emit('req:place:start', { buildingId: building.id });
  }

  function cancelPlacing(){
    cleanupPlacing();
    emit('req:place:cancel');
  }

  function onKeyDown(e){
    if(e.key === 'Escape' || e.key === 'Backspace'){
      cancelPlacing();
    }
  }

  // Map-API: wir gehen von einer globalen Tilesize & World→Screen umrechnung aus
  const TILE = window.Game && Game.tileSize ? Game.tileSize : 32;

  function onMouseMove(e){
    if(!placing) return;
    const tx = Math.floor(e.clientX / TILE);
    const ty = Math.floor(e.clientY / TILE);

    const w = placing.size.w;
    const h = placing.size.h;

    const px = tx * TILE;
    const py = ty * TILE;

    const ghost = $ghostRoot.querySelector('.place-sprite');
    ghost.style.left = px + 'px';
    ghost.style.top  = py + 'px';
    ghost.style.width  = (w*TILE) + 'px';
    ghost.style.height = (h*TILE) + 'px';
  }

  function onMouseClick(e){
    // Blockiere globale Klicks – wir bestätigen nur über den ✔ Button
    // (Serienbau: OK legt, bleibt im Modus)
  }

  function onOk(e){
    e.stopPropagation();
    if(!placing) return;
    const rect = $ghostRoot.querySelector('.place-sprite').getBoundingClientRect();
    const tx = Math.round(rect.left / TILE);
    const ty = Math.round(rect.top  / TILE);

    emit('req:place:confirm', { tx, ty });
    // Serienbau: NICHT canceln. Ghost bleibt, Spieler kann OK erneut drücken.
  }

  function cleanupPlacing(){
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onMouseClick);
    window.removeEventListener('keydown', onKeyDown);
    $ghostRoot.innerHTML = '';
    placing = null;
  }

  // Nach erfolgreichem Setzen von außen informiert werden:
  window.addEventListener('cb:place:done', (ev)=>{
    const {exit=false} = ev.detail||{};
    if(exit){ cleanupPlacing(); } // expliziter Abbruch über Abbrechen-Button
  });

  // Startsignal
  window.addEventListener('cb:registry:ready', renderDock);
})();
