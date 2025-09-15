<!-- assets/ui/ui-build.js -->
<script>
/* Neue Siedler – UI Build-Menü (kompakter, stabiler Stand)
 * API:
 *   UIBuild.init()
 *   UIBuild.setItems(items, categories)
 *   UIBuild.open() / close() / toggle()
 * DOM:
 *   #build-dock (bereits in index.html vorhanden)
 */

(function () {
  const LOG = (...a)=> (window.CBLog?.info||console.log)('[ui-build]', ...a);

  const state = {
    root: null,
    cats: [],
    items: [],
    activeCat: null,
    isOpen: false
  };

  function ensureRoot() {
    if (state.root && document.body.contains(state.root)) return state.root;
    state.root = document.getElementById('build-dock') || document.getElementById('build-panel');
    if (!state.root) {
      state.root = document.createElement('div');
      state.root.id = 'build-dock';
      state.root.className = 'ui-build-dock';
      document.body.appendChild(state.root);
    }
    return state.root;
  }

  function renderEmpty(message = 'Keine Gebäudedaten → leerer Hinweis') {
    const root = ensureRoot();
    root.innerHTML = `
      <div class="ui-build">
        <div class="ui-build-head">
          <div class="ui-build-tabs"></div>
        </div>
        <div class="ui-build-body">
          <div class="ui-build-empty">${message}</div>
        </div>
      </div>`;
    LOG('Keine Gebäudedaten → leerer Hinweis');
  }

  function renderTabs() {
    const tabsEl = state.root.querySelector('.ui-build-tabs');
    tabsEl.innerHTML = '';
    state.cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'tab' + (cat.id === state.activeCat ? ' active' : '');
      btn.type = 'button';
      btn.textContent = cat.title || cat.id;
      btn.onclick = () => {
        state.activeCat = cat.id;
        renderGrid();
      };
      tabsEl.appendChild(btn);
    });
  }

  function resolveIcon(it) {
    // bevorzugt explizite iconPath/icon; sonst simple Heuristik
    if (it.iconPath) return it.iconPath;
    if (it.icon) return it.icon;
    // häufige Muster (hq, depot, lumberjack, …)
    const guess = `assets/buildings/${(it.id||it.name||'').toLowerCase()}.png`;
    return guess;
  }

  function renderGrid() {
    const bodyEl = state.root.querySelector('.ui-build-body');
    bodyEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'ui-build-grid';

    const list = state.activeCat
      ? state.items.filter(i => (i.category === state.activeCat || i.cat === state.activeCat))
      : state.items;

    list.forEach(it => {
      const card = document.createElement('button');
      card.className = 'ui-build-card';
      card.type = 'button';
      card.title = it.title || it.name || it.id;

      const img = document.createElement('img');
      img.alt = it.title || it.name || it.id || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = resolveIcon(it);

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = it.title || it.name || it.id;

      card.appendChild(img);
      card.appendChild(label);
      card.onclick = () => {
        LOG('select', it.id || it.name);
        // optional: globale Bau-Action auslösen
        window.dispatchEvent(new CustomEvent('cb:build-select', { detail: it }));
      };

      wrap.appendChild(card);
    });

    bodyEl.appendChild(wrap);
  }

  function fullRender() {
    const root = ensureRoot();
    root.innerHTML = `
      <div class="ui-build">
        <div class="ui-build-head">
          <div class="ui-build-tabs"></div>
        </div>
        <div class="ui-build-body"></div>
      </div>`;
    renderTabs();
    renderGrid();
  }

  const UIBuild = {
    init() {
      ensureRoot();
      renderEmpty('Lade Baumenü …');
      LOG('bereit (v18.3.2)');
    },
    setItems(items, categories) {
      ensureRoot();
      if (!Array.isArray(items) || !items.length || !Array.isArray(categories) || !categories.length) {
        renderEmpty();
        return;
      }
      state.items = items;
      state.cats  = categories;
      if (!state.activeCat && state.cats.length) state.activeCat = state.cats[0].id || state.cats[0].name;
      fullRender();
      LOG(`Items gesetzt (${items.length} Karten / ${categories.length} Kategorien)`);
    },
    open() {
      ensureRoot();
      state.root.classList.add('open');
      document.body.classList.add('has-build-open');
      state.isOpen = true;
      LOG('open');
      window.dispatchEvent(new Event('cb:build-open'));
      window.dispatchEvent(new Event('cb:build:open'));
    },
    close() {
      ensureRoot();
      state.root.classList.remove('open');
      document.body.classList.remove('has-build-open');
      state.isOpen = false;
      LOG('close');
      window.dispatchEvent(new Event('cb:build-close'));
      window.dispatchEvent(new Event('cb:build:close'));
    },
    toggle() { (state.isOpen ? this.close() : this.open()); }
  };

  // Expose
  window.UIBuild = UIBuild;

  // GameUI-Fassade (für FAB)
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = () => UIBuild.toggle();

  // Auto-Init
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    UIBuild.init();
  } else {
    document.addEventListener('DOMContentLoaded', () => UIBuild.init());
  }

  // Auf Game-Events reagieren: nach Spielstart evtl. Layout refreshen
  window.addEventListener('cb:game-start', () => {
    if (state.items.length && state.cats.length) {
      fullRender();
    }
  });
})();
</script>
