/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v20.0.0 (2025-10-06)
 * Zweck    : Baumenü (Epoche 1) rendern + Platziermodus (Ghost) mit ✔/✖
 *            - Responsive Karten (Größensteuerung rein in CSS: ui/css/ui-build.css)
 *            - Icons aus Registry.iconsBase() ODER pro Gebäude via b.icon
 *            - Platzier-Ghost skaliert optional mit globalem Zoom (core/zoom.js)
 *
 * Events   :
 *   IN  : cb:registry:ready       -> Baumenü rendern (Epoche 1)
 *         cb:place:done           -> Platziermodus ggf. beenden (Abbrechen)
 *         cb:zoom:change          -> Ghost live an Zoom anpassen (optional)
 *   OUT : req:place:start {buildingId}
 *         req:place:confirm {tx,ty}
 *         req:place:cancel
 *
 * Abhäng. :
 *   - Registry (core/registry.js)  : list/get/iconsBase
 *   - Game (core/game.js)          : tileSize (Basis-Kachelgröße in px)
 *   - Zoom (core/zoom.js, optional): Zoom.scale (Number), cb:zoom:change
 *
 * Wichtige Hinweise:
 *   [A] Karten-/Icon-Größen NICHT hier regeln, sondern in ui/css/ui-build.css.
 *       -> Variablen: --build-card-w, --build-icon-scale, --build-cost-scale
 *   [B] Icon-Quelle:
 *       - Standard:  assets/icons/buildings/<id>.png
 *       - Fallback:  wenn building.icon gesetzt ist, wird dieser Dateiname genutzt
 *   [C] Ghost-Skalierung:
 *       - Ohne core/zoom.js bleibt scale=1 (alles wie bisher)
 *       - Mit Zoom.set(n) (0.5..3) skaliert der Ghost live mit
 * ============================================================================
 */

(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // [00] Shortcuts & Utilities
  // ---------------------------------------------------------------------------
  const $dock = document.getElementById('build-dock');
  const $ghostRoot = ensureGhostRoot();

  function $(sel, r = document) { return r.querySelector(sel); }
  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }

  function ensureGhostRoot(){
    let root = document.querySelector('.place-overlay');
    if (!root){
      root = document.createElement('div');
      root.className = 'place-overlay';
      document.body.appendChild(root);
    }
    root.innerHTML = ''; // immer sauber starten
    return root;
  }

  // Icon-Basis aus Registry (oder Default)
  function iconsBase(){
    const base = (typeof Registry.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/'); // trailing slash garantieren
  }

  // Aktuelle Zoom-Skalierung (optional)
  function getScale(){
    return (window.Zoom && typeof Zoom.scale === 'number') ? Zoom.scale : 1;
  }

  // Kachelgröße in Pixel → skaliert mit Zoom (wenn vorhanden)
  function tilePx(){
    const base = (window.Game && Game.tileSize) ? Game.tileSize : 32;
    return base * getScale();
  }

  // ---------------------------------------------------------------------------
  // [01] Baumenü rendern (Epoche 1)
  // ---------------------------------------------------------------------------
  function renderDock(){
    if(!$dock) return;

    const list = Registry.list('buildings', { epoche:1 }); // nur Epoche 1
    const base = iconsBase();

    // Dock leeren
    $dock.innerHTML = '';

    // Kopfzeile
    const head = document.createElement('div');
    head.className = 'build-head';
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    head.innerHTML = `<strong>Baumenü (Epoche 1)</strong><span id="build-count" style="opacity:.85"></span>`;
    $dock.appendChild(head);

    const $count = head.querySelector('#build-count');
    $count.textContent = `${list.length} Gebäude`;

    // Grid
    const grid = document.createElement('div');
    grid.className = 'build-grid';
    $dock.appendChild(grid);

    if(!list.length){
      // sichtbarer Hinweis (nicht nur Toast)
      const empty = document.createElement('div');
      empty.className = 'build-empty';
      empty.style.cssText = 'padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.35);';
      empty.innerHTML = `Keine Gebäude für Epoche 1 gefunden.<br>Prüfe <code>data/buildings.json</code> → <code>buildings[]</code> &amp; Icon-Dateien.`;
      $dock.appendChild(empty);
      return;
    }

    // Karten erzeugen
    list.forEach(b=>{
      const card  = document.createElement('button');
      const label = document.createElement('div');
      const img   = document.createElement('img');
      const cost  = document.createElement('div');

      card.className  = 'build-card';
      card.title      = b.name || b.id;

      // Name (oben)
      label.className = 'build-label';
      label.textContent = b.name || b.id;

      // Icon (mittig) – b.icon als Fallback erlauben
      img.className   = 'build-icon';
      const fileName  = (b.icon && typeof b.icon === 'string') ? b.icon : `${b.id}.png`;
      img.src         = base + fileName;
      img.alt         = b.name || b.id;

      // Kosten (unten)
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

        row.appendChild(i);
        row.appendChild(t);
        cost.appendChild(row);
      });

      card.appendChild(label);
      card.appendChild(img);
      card.appendChild(cost);

      // Klick → Platziermodus starten
      card.addEventListener('click', ()=> startPlacing(b));
      grid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // [02] Platziermodus (Ghost mit ✔/✖)
  // ---------------------------------------------------------------------------
  let placing = null; // { building, size:{w,h} }

  function startPlacing(building){
    placing = { building, size: building.size || {w:1, h:1} };
    $ghostRoot.innerHTML = '';

    // Ghost-Bild als Hintergrund (Icon als Platzhalter)
    const ghost = document.createElement('div');
    ghost.className = 'place-sprite';
    const fileName  = (building.icon && typeof building.icon === 'string') ? building.icon : `${building.id}.png`;
    ghost.style.backgroundImage = `url(${iconsBase()}${fileName})`;
    ghost.style.backgroundSize  = 'cover';
    $ghostRoot.appendChild(ghost);

    // ✔ OK
    const ok = document.createElement('button');
    ok.className = 'place-btn ok';
    ok.textContent = '✔';
    ghost.appendChild(ok);

    // ✖ Abbrechen
    const cancel = document.createElement('button');
    cancel.className = 'place-btn cancel';
    cancel.textContent = '✖';
    ghost.appendChild(cancel);

    // Event-Wiring
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('keydown', onKeyDown);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', cancelPlacing);

    // Zoomänderungen live anwenden (optional)
    window.addEventListener('cb:zoom:change', onZoomChange);

    emit('req:place:start', { buildingId: building.id });

    // Initiale Position setzen (falls Maus schon steht)
    // -> triggere einmalig onMouseMove mit der letzten bekannten Pos (0,0 Fallback)
    onMouseMove({ clientX: 0, clientY: 0 });
  }

  function onKeyDown(e){
    if(e.key === 'Escape' || e.key === 'Backspace'){
      cancelPlacing();
    }
  }

  function onMouseClick(e){
    // Absichtlich leer – bestätigen NUR über den ✔ Button (Serienbau)
  }

  function onMouseMove(e){
    if(!placing) return;
    const tpx = tilePx();

    // Clientkoordinaten -> Tile
    const tx = Math.floor(e.clientX / tpx);
    const ty = Math.floor(e.clientY / tpx);

    // Größe gemäß Gebäude (w,h) in Tiles -> in Pixel
    const {w,h} = placing.size;
    const ghost = $ghostRoot.querySelector('.place-sprite');

    ghost.style.left   = (tx * tpx) + 'px';
    ghost.style.top    = (ty * tpx) + 'px';
    ghost.style.width  = (w  * tpx) + 'px';
    ghost.style.height = (h  * tpx) + 'px';
  }

  function onZoomChange(){
    // Bei Zoomänderung Ghost neu layouten – Mauspos kennen wir hier nicht -> einfach BoundingBox neu auslesen und “snappen”
    if(!placing) return;
    const ghost = $ghostRoot.querySelector('.place-sprite');
    if(!ghost) return;

    const tpx = tilePx();
    const rect = ghost.getBoundingClientRect();

    const tx = Math.round(rect.left / tpx);
    const ty = Math.round(rect.top  / tpx);
    const {w,h} = placing.size;

    ghost.style.left   = (tx * tpx) + 'px';
    ghost.style.top    = (ty * tpx) + 'px';
    ghost.style.width  = (w  * tpx) + 'px';
    ghost.style.height = (h  * tpx) + 'px';
  }

  function onOk(e){
    e.stopPropagation();
    if(!placing) return;

    const tpx = tilePx();
    const rect = $ghostRoot.querySelector('.place-sprite').getBoundingClientRect();
    const tx = Math.round(rect.left / tpx);
    const ty = Math.round(rect.top  / tpx);

    emit('req:place:confirm', { tx, ty });
    // Serienbau: NICHT abbrechen – der Modus bleibt aktiv,
    // bis der Spieler ✖ drückt oder ESC nutzt.
  }

  function cancelPlacing(){
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onMouseClick);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('cb:zoom:change', onZoomChange);

    $ghostRoot.innerHTML = '';
    placing = null;
    emit('req:place:cancel');
  }

  // Externes Done (z. B. expliziter Abbruch) -> Modus verlassen
  window.addEventListener('cb:place:done', (ev)=>{
    const { exit=false } = ev.detail || {};
    if (exit) cancelPlacing();
  });

  // ---------------------------------------------------------------------------
  // [03] Startsignal: Registry ready -> Baumenü einmal aufbauen
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', renderDock);

})();
