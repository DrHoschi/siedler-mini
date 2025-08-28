/* ui-build.js v16.1.12
 * Kleines Bau-Menü für Touch (ein Icon pro Tool).
 * – Öffnen/Schließen via window.GameUI.openBuildMenu()/closeBuildMenu()
 * – Sendet Tool-Events an die Engine (falls vorhanden)
 * – Minimal-Styles kommen aus assets/ui/ui-build.css
 */

(function(){
  const VERSION = 'ui-build.js v16.1.12';

  // ===== intern: UI erzeugen =====
  let root, bar, isOpen = false;

  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  // Icons: EIN Bild pro Button (keine Atlanten nötig)
  // → hier kannst du später auf Lumberjack-Preview(s) wechseln.
  const TOOLS = [
    { id:'road',    label:'Straße', icon:'./assets/tex/road/topdown_road_straight.png' },
    { id:'path',    label:'Weg',    icon:'./assets/tex/path/topdown_path1.PNG' },
    { id:'bulldoze',label:'Abreißen', icon:'./assets/icons/icons_spritesheet_64.png', iconTip:'🪓' },
    { id:'house',   label:'Haus',   icon:'./assets/buildings/lumberjack/lumberjack_tiers_grid.png', iconFrameNote:'zeigt nur das Sprite-Sheet (wird später auf 1 Frame beschnitten)' },
    { id:'factory', label:'Fabrik', icon:'./assets/icons/icons_spritesheet_64.png', iconTip:'🏭' },
    { id:'cancel',  label:'Abbrechen', icon:'./assets/icons/icons_spritesheet_64.png', iconTip:'⛔' },
  ];

  function buildMenu(){
    root = el('div', 'build-menu-root');   // siehe ui-build.css
    const header = el('div', 'build-menu-header', `<strong>Bauen</strong> <span class="ver">${VERSION}</span>`);
    bar = el('div', 'build-menu-bar');

    // Buttons
    for (const t of TOOLS){
      const btn = el('button', 'bm-btn');
      // Nur EIN Motiv pro Button anzeigen
      if (t.icon){
        const img = new Image();
        img.src = t.icon;
        img.alt = t.label;
        img.decoding = 'async';
        img.loading = 'lazy';
        img.className = 'bm-ico';
        btn.appendChild(img);
      }
      if (t.iconTip){
        const tip = el('span', 'bm-tip', t.iconTip);
        btn.appendChild(tip);
      }
      btn.appendChild(el('div','bm-label', t.label));
      btn.addEventListener('click', () => chooseTool(t.id));
      bar.appendChild(btn);
    }

    const footer = el('div', 'build-menu-footer',
      `<button class="bm-close">Schließen</button>`
    );
    footer.querySelector('.bm-close').addEventListener('click', close);

    root.appendChild(header);
    root.appendChild(bar);
    root.appendChild(footer);
    document.body.appendChild(root);
  }

  // ===== Tool-Wechsel an Engine melden =====
  function chooseTool(id){
    // deine bisherige Hook-Stelle:
    window.Game?.setTool?.(id);
    window.GameUI?.setTool?.(id);
    log('ok', `Tool gesetzt: ${id}`);
  }

  // ===== Öffnen/Schließen =====
  function open(){
    if (!root) buildMenu();
    root.style.display = 'block';
    isOpen = true;
  }
  function close(){
    if (root) root.style.display = 'none';
    isOpen = false;
  }

  // ===== Logging Richtung Inspector =====
  function log(type, msg){
    if (window.Inspector?.log) window.Inspector.log(type, msg);
    console.log('[bm]', msg);
  }

  // ===== public API =====
  window.GameUI = Object.assign(window.GameUI || {}, {
    openBuildMenu: open,
    closeBuildMenu: close,
    onGameStarted(){ log('ok', 'Bau-Menü bereit ('+VERSION+')'); }
  });

  // sofort Bescheid geben, dass UI geladen ist
  log('ok', 'Bau-Menü bereit ('+VERSION+')');

})();
