/* assets/ui/ui-build.js
 * Aufgabe:
 *  - Render-Logik für das Build-Dock (unten andockend)
 *  - Öffnen/Schließen steuert GameUI (Bridge), hier Fokus aufs Rendering
 *  - Exponiert API: UIBuild.setItems(items, categories)
 *  - Items-Struktur:
 *      items: [{ id, name, cat, icon (Pfad), descr?, cost? }, ...]
 *      categories: [{ id, name, order? }, ...]
 */

(function(){
  const log = (window.CBLog?.info || console.log).bind(console);
  const warn = (window.CBLog?.warn || console.warn).bind(console);

  const state = {
    root: null,             // #build-dock (oder #build-panel)
    tabsEl: null,           // Kategorien-Tabs
    listEl: null,           // Karten-Container
    cats: [],
    items: [],
    activeCat: null,
    version: 'v18.3.2'
  };

  function bySel(sel){ return state.root.querySelector(sel); }

  function ensureRoot(){
    if (state.root && document.body.contains(state.root)) return state.root;
    state.root = document.getElementById('build-dock') || document.getElementById('build-panel');
    if (!state.root) {
      warn('[ui-build] Kein Build-Dock im DOM gefunden.');
      return null;
    }
    // Grundgerüst einmalig einziehen
    if (!state.root.dataset.uiInit){
      state.root.innerHTML = `
        <div class="ui-build-head">
          <div class="ui-build-tabs" role="tablist" aria-label="Kategorien"></div>
          <button class="ui-build-close" title="Schließen" aria-label="Schließen">×</button>
        </div>
        <div class="ui-build-body">
          <div class="ui-build-list" aria-label="Gebäude-Liste"></div>
          <div class="ui-build-empty">Keine Gebäude verfügbar</div>
        </div>
      `;
      state.root.dataset.uiInit = '1';
      state.tabsEl = bySel('.ui-build-tabs');
      state.listEl = bySel('.ui-build-list');

      // Close-Button → Bridge
      const btnClose = bySel('.ui-build-close');
      btnClose?.addEventListener('click', () => window.GameUI?.closeBuild());

      // Optik: graues Panel (anpassbar in CSS)
      state.root.style.setProperty('--ui-build-bg', '#2b2f33');    // dunkles Grau
      state.root.style.setProperty('--ui-build-fg', '#e8e9ea');    // helle Schrift
      state.root.style.setProperty('--ui-build-tab', '#3b4046');   // Tab-Farbe
      state.root.style.setProperty('--ui-build-tab-active', '#52575e');
      state.root.style.setProperty('--ui-build-card', '#343a40');  // Kartenfläche
      state.root.style.setProperty('--ui-build-accent', '#8ea0b4'); // Akzent (Rahmen/hover)

      log('[ui-build] Grundgerüst initialisiert.');
    } else {
      state.tabsEl = bySel('.ui-build-tabs');
      state.listEl = bySel('.ui-build-list');
    }
    return state.root;
  }

  function clear(el){ while (el?.firstChild) el.removeChild(el.firstChild); }

  // Tabs rendern
  function renderTabs(){
    const root = ensureRoot(); if (!root) return;
    const tabs = state.tabsEl; if (!tabs) return;
    clear(tabs);

    const cats = [...state.cats].sort((a,b)=>(a.order||0)-(b.order||0) || a.name.localeCompare(b.name));
    cats.forEach(cat=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-build-tab' + (state.activeCat===cat.id ? ' active':'');
      btn.setAttribute('role','tab');
      btn.textContent = cat.name;
      btn.addEventListener('click', ()=>{
        state.activeCat = cat.id;
        renderTabs();
        renderCards();
      });
      tabs.appendChild(btn);
    });
  }

  // Karten rendern
  function renderCards(){
    const root = ensureRoot(); if (!root) return;
    const list = state.listEl; if (!list) return;
    clear(list);

    const empty = root.querySelector('.ui-build-empty');
    const curItems = state.activeCat
      ? state.items.filter(it => it.cat===state.activeCat)
      : state.items;

    if (!curItems.length){
      empty?.classList.add('show');
      return;
    }
    empty?.classList.remove('show');

    curItems.forEach(it=>{
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ui-build-card';
      card.title = it.name;

      const img = document.createElement('img');
      img.className = 'ui-build-icon';
      img.alt = it.name;
      img.decoding = 'async';
      // Icon-Pfad: bevorzugt assets/icons…, sonst building image, sonst placeholder
      img.src = it.icon || it.image || 'assets/placeholder64.PNG';

      const name = document.createElement('div');
      name.className = 'ui-build-name';
      name.textContent = it.name;

      card.appendChild(img);
      card.appendChild(name);
      card.addEventListener('click', ()=>{
        // Auswahl melden (nur log + CustomEvent – Platzierung gehört zum Game/Core)
        (window.CBLog?.info || console.log)(`[ui-build] select ${it.id}`);
        document.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: it.id, item: it }}));
      });

      list.appendChild(card);
    });
  }

  // API: Items setzen (von der Data-Bridge aufgerufen)
  function setItems(items = [], categories = []){
    ensureRoot();
    state.items = Array.isArray(items) ? items.slice() : [];
    state.cats  = Array.isArray(categories) ? categories.slice() : [];

    // Beim ersten Setzen: aktive Kategorie = erste Kategorie (falls vorhanden)
    if (!state.activeCat && state.cats.length) state.activeCat = state.cats[0].id;

    renderTabs();
    renderCards();

    log(`[ui-build] Items gesetzt (${state.items.length} Karten / ${state.cats.length} Kategorien)`);
  }

  // Events: Re-Render nach Spielstart/Assets-ready
  function onGameStart(){ renderTabs(); renderCards(); }
  function onAssetsReady(){ renderTabs(); renderCards(); }

  document.addEventListener('cb:game-start', onGameStart);
  document.addEventListener('cb:assets-ready', onAssetsReady);
  // Fallback-Events (Bindestrich-Variante)
  document.addEventListener('cb:game-start'.replace(':','-'), onGameStart);
  document.addEventListener('cb:assets-ready'.replace(':','-'), onAssetsReady);

  ensureRoot();

  // Export globale API
  window.UIBuild = Object.assign(window.UIBuild || {}, {
    setItems,
    _state: state   // optional: für Debug/Inspector
  });

  log(`[ui-build] bereit (${state.version})`);
})();
