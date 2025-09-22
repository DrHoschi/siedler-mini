/* ============================================================================
 * Datei: ui/ui-build.js
 * Projekt: Neue Siedler
 * Version: v1.3.0 (2025-09-22)
 * Zweck:
 *   - Build-Dock unten rendern (Kategorien/Items aus ui-build.categories.js)
 *   - Auswahl/Platziermodus anstoßen → req:build:select { id }
 *   - Cancel/Close (ESC, Right-Click) → req:build:cancel { reason }
 *   - Keyboard-Navigation (Pfeile, Enter), Fokus-Management
 *   - Enable/Disable-Status aus Core (ev:build:enabled)
 * Events:
 *   listen:
 *     - cb:build-categories-ready { categories }
 *     - ev:build:enabled { id, enabled }
 *     - cb:game-start (Dock sichtbar)
 *   emit:
 *     - req:build:select { id }
 *     - req:build:cancel { reason }
 *     - cb:build:open|cb:build:close
 * Standards:
 *   - Kommentare DE, Debug-Logs schaltbar, Accessibility-Rollen
 *   - 2-Zeilen-Clamp + Scroll via CSS (ui/css/ui-build.css)
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[ui-build]';
  const VERSION='v1.3.0';

  // ========= Imports / Globals =========
  const UIE = window.UIEvents; // optional
  const emit = (name, detail)=> (UIE?.emit||((n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}))))(name, detail);
  const on   = (name, handler)=> (UIE?.on||((n,h)=>{ const fn=(e)=>h(e.detail,e); window.addEventListener(n,fn); return ()=>window.removeEventListener(n,fn);}))(name, handler);

  // ========= DOM-Refs =========
  const dock = document.getElementById('build-dock');
  const wrap = document.getElementById('build-wrap');

  // ========= State =========
  let CATEGORIES = [];                 // aus ui-build.categories.js
  let itemIndexMap = new Map();        // id → button
  let selectedId = null;               // aktuell gewählte Bau-ID

  // ========= Hilfsfunktionen =========
  function log(...a){ if(window.UI_EVENT_DEBUG!==false) (console.log||(()=>{}))('🏗️', MOD, ...a); }
  function warn(...a){ (console.warn||(()=>{}))('⚠️', MOD, ...a); }

  function setSelected(id){
    // Entferne alte Auswahl
    if(selectedId && itemIndexMap.has(selectedId)){
      itemIndexMap.get(selectedId).classList.remove('is-selected');
      itemIndexMap.get(selectedId).setAttribute('aria-pressed','false');
    }
    selectedId = id;
    if(selectedId && itemIndexMap.has(selectedId)){
      const btn = itemIndexMap.get(selectedId);
      btn.classList.add('is-selected');
      btn.setAttribute('aria-pressed','true');
      btn.focus({preventScroll:false});
      // Sichtbar scrollen
      btn.scrollIntoView({ block:'nearest', inline:'nearest' });
    }
  }

  function select(id){
    if(!id || !itemIndexMap.has(id)) return;
    if(itemIndexMap.get(id).disabled) {
      window.UINotify?.push?.('Eintrag ist gesperrt','warn');
      return;
    }
    setSelected(id);
    emit('req:build:select', { id });
    window.UINotify?.push?.(`Bauauswahl: ${id}`,'info');
    log('select', id);
  }

  function cancel(reason){
    setSelected(null);
    emit('req:build:cancel', { reason });
    log('cancel', reason);
  }

  function button(label, icon, id){
    const btn = document.createElement('button');
    btn.className='build-item';
    btn.type='button';
    btn.setAttribute('role','listitem');
    btn.setAttribute('aria-pressed','false');
    btn.dataset.id = id;
    btn.innerHTML = `<img src="${icon}" alt="" /><span class="label">${label}</span>`;
    btn.addEventListener('click', ()=> select(id));
    btn.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); cancel('contextmenu'); });
    btn.addEventListener('mouseenter', (ev)=>{
      window.UITooltip?.show?.(label, ev.clientX, ev.clientY);
    });
    btn.addEventListener('mouseleave', ()=> window.UITooltip?.hide?.());
    btn.addEventListener('keydown', (ev)=>{
      switch(ev.key){
        case 'Enter':
        case ' ':
          ev.preventDefault(); select(id); break;
        case 'Escape':
          ev.preventDefault(); cancel('esc'); break;
        case 'ArrowRight':
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'ArrowDown':
          // Pfeilnavigation: an Nachbar springen
          ev.preventDefault(); focusNeighbor(btn, ev.key); break;
      }
    });
    return btn;
  }

  function focusNeighbor(btn, key){
    // Grid-Navigation: wir suchen den nächsten/sinnvollen Button
    const items = Array.from(wrap.querySelectorAll('.build-item'));
    const idx = items.indexOf(btn);
    if(idx < 0) return;

    const cols = computeGridColumns();
    let target = idx;
    if(key==='ArrowRight') target = Math.min(items.length-1, idx+1);
    if(key==='ArrowLeft')  target = Math.max(0, idx-1);
    if(key==='ArrowDown')  target = Math.min(items.length-1, idx+cols);
    if(key==='ArrowUp')    target = Math.max(0, idx-cols);
    items[target]?.focus();
  }

  function computeGridColumns(){
    // Schätzung anhand von Breite/Min-Width (entspricht CSS grid-template)
    const wrapStyles = getComputedStyle(wrap);
    const gap = parseInt(wrapStyles.gap || '6', 10);
    const minW = 120; // entspricht CSS: minmax(120px,1fr)
    const w = wrap.clientWidth;
    return Math.max(1, Math.floor((w + gap) / (minW + gap)));
  }

  function render(categories){
    if(!wrap) return warn('kein #build-wrap');
    wrap.innerHTML='';
    itemIndexMap.clear();

    categories.forEach(cat=>{
      const catDiv = document.createElement('div');
      catDiv.className = 'build-cat';

      const head = document.createElement('div');
      head.className = 'build-header';
      head.innerHTML = `<h4 class="build-title">${cat.title}</h4>`;
      catDiv.appendChild(head);

      const list = document.createElement('div');
      list.className = 'build-list';
      list.setAttribute('role','list');

      cat.items.forEach(it=>{
        const btn = button(it.label, it.icon, it.id);
        list.appendChild(btn);
        itemIndexMap.set(it.id, btn);
      });

      catDiv.appendChild(list);
      wrap.appendChild(catDiv);
    });

    emit('cb:build:open',{version:VERSION});
    dock.style.display='block';
    log('render', categories.length, 'Kategorien');
  }

  // ========= Event-Bindings =========
  on('cb:build-categories-ready', ({categories})=>{
    if(!Array.isArray(categories)){ warn('invalid categories'); return; }
    CATEGORIES = categories;
    render(CATEGORIES);
  });

  // Core kann Items (de-)aktivieren
  on('ev:build:enabled', ({id, enabled})=>{
    const btn = itemIndexMap.get(id);
    if(!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('is-disabled', !enabled);
    log('enabled', id, enabled);
  });

  // Game-Start (falls Dock initial unsichtbar)
  on('cb:game-start', ()=>{
    if(wrap && CATEGORIES.length && dock) dock.style.display='block';
  });

  // Global: ESC kommt zusätzlich in index.html → hier nur aufräumen
  on('req:build:cancel', ()=> setSelected(null));

  // ========= Exports =========
  window.UIBuild = {
    open(){ dock.style.display='block'; emit('cb:build:open',{version:VERSION}); },
    close(reason='manual'){ dock.style.display='none'; emit('cb:build:close',{reason}); },
    select, cancel,
    setCategories(list){ CATEGORIES = Array.isArray(list) ? list : []; render(CATEGORIES); },
    VERSION
  };

  log('bereit', VERSION);
})();
