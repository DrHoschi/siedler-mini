/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v19.0.2 (2025-10-05)
 * Zweck    : Baumenü rendern (Epoche 1), Kosten-Icons, Platziermodus (Ghost)
 * Hinweise :
 *   - Zeigt klar an, wie viele Gebäude gefunden wurden.
 *   - Falls 0 gefunden: sichtbarer Hinweis im Dock (nicht nur Toast).
 *   - Nutzt Registry.iconsBase() als Prefix für die Gebäude-Icons, wenn gesetzt.
 * Events   :
 *   IN  : cb:registry:ready, cb:place:done
 *   OUT : req:place:start {buildingId}, req:place:confirm {tx,ty}, req:place:cancel
 * ============================================================================
 */
(function(){
  const $dock = document.getElementById('build-dock');
  const $ghostRoot = ensureGhostRoot();

  function ensureGhostRoot(){
    let r = document.querySelector('.place-overlay');
    if(!r){
      r = document.createElement('div');
      r.className = 'place-overlay';
      document.body.appendChild(r);
    }
    r.innerHTML = '';
    return r;
  }

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, {detail})); }

  // ---------- Render ----------
  function renderDock(){
    if(!$dock) return;

    const list = Registry.list('buildings', { epoche:1 });
    const iconsBase = (typeof Registry.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    $dock.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'build-head';
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    head.innerHTML = `<strong>Baumenü (Epoche 1)</strong><span id="build-count" style="opacity:.85"></span>`;
    $dock.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'build-grid';
    $dock.appendChild(grid);

    const $count = head.querySelector('#build-count');
    $count.textContent = `${list.length} Gebäude`;

    if(!list.length){
      const empty = document.createElement('div');
      empty.className = 'build-empty';
      empty.style.cssText = 'padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.35);';
      empty.innerHTML = `Keine Gebäude für Epoche 1 gefunden.<br>Prüfe <code>data/buildings.json</code> → <code>buildings[]</code> &amp; Icon-Dateien.`;
      $dock.appendChild(empty);
      return;
    }

    list.forEach(b=>{
      const card = document.createElement('button');
      card.className = 'build-card';
      card.title = b.name || b.id;

      const img = document.createElement('img');
      img.className = 'build-icon';
      // bevorzugt iconsBase + id.png
      img.src = `${iconsBase.replace(/\/?$/,'/')}${b.id}.png`;
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

      card.appendChild(img); card.appendChild(label); card.appendChild(cost);
      card.addEventListener('click', ()=> startPlacing(b));
      grid.appendChild(card);
    });
  }

  // ---------- Platzieren ----------
  let placing = null;
  const TILE = window.Game && Game.tileSize ? Game.tileSize : 32;

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

    // Ghost-Bild (Icon als Platzhalter)
    const iconsBase = (typeof Registry.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    ghost.style.backgroundImage = `url(${iconsBase.replace(/\/?$/,'/')}${building.id}.png)`;
    ghost.style.backgroundSize  = 'cover';

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('keydown', onKeyDown);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', cancelPlacing);

    emit('req:place:start', { buildingId: building.id });
  }

  function onKeyDown(e){ if(e.key==='Escape'||e.key==='Backspace') cancelPlacing(); }
  function onMouseClick(e){ /* Absichtlich leer – bestätigen nur per ✔ */ }

  function onMouseMove(e){
    if(!placing) return;
    const tx = Math.floor(e.clientX / TILE);
    const ty = Math.floor(e.clientY / TILE);
    const {w,h} = placing.size;
    const ghost = $ghostRoot.querySelector('.place-sprite');
    ghost.style.left = (tx*TILE)+'px';
    ghost.style.top  = (ty*TILE)+'px';
    ghost.style.width  = (w*TILE)+'px';
    ghost.style.height = (h*TILE)+'px';
  }

  function onOk(e){
    e.stopPropagation();
    if(!placing) return;
    const rect = $ghostRoot.querySelector('.place-sprite').getBoundingClientRect();
    const tx = Math.round(rect.left / TILE);
    const ty = Math.round(rect.top  / TILE);
    emit('req:place:confirm', { tx, ty });
    // Serienbau: NICHT canceln
  }

  function cancelPlacing(){
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onMouseClick);
    window.removeEventListener('keydown', onKeyDown);
    $ghostRoot.innerHTML = '';
    placing = null;
    emit('req:place:cancel');
  }

  window.addEventListener('cb:place:done', (ev)=>{
    const {exit=false} = ev.detail||{};
    if(exit) cancelPlacing();
  });

  // Startsignal
  window.addEventListener('cb:registry:ready', renderDock);
})();
