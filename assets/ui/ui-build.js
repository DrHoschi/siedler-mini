/* Neue Siedler – UI Build Dock
   v18.4.0
   Features:
   - Sucht #build-dock ODER #build-panel, erstellt notfalls einen Container.
   - Rendert Kategorien + Grid.
   - Zeigt leere-Hinweise sichtbar (kein Transparent-Bug).
   - Re-render bei setItems() IMMER (auch wenn Dock bereits offen).
   - Events: cb:build:open/close UND cb:build-open/close (Compat).
   - Body-Class: has-build-open (für FAB-Abstand).
*/
(function () {
  const LG = {
    i: (m) => (window.CBLog?.info || console.log)(`[ui-build] ${m}`),
    w: (m) => (window.CBLog?.warn || console.warn)(`[ui-build] ${m}`),
    e: (m) => (window.CBLog?.error || console.error)(`[ui-build] ${m}`)
  };

  // ------ DOM Helpers ------
  function $(sel, root = document) { return root.querySelector(sel); }
  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function dispatch(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }

  // ------ State ------
  const State = {
    items: [],          // [{category, items:[{id,label,icon,data}]}]
    catIndex: 0,
    open: false,
    mounted: false
  };

  // ------ Container find/create ------
  function ensureContainer() {
    let host = $('#build-dock') || $('#build-panel');
    if (!host) {
      host = el('div', 'ui-build-dock');
      host.id = 'build-dock';
      document.body.appendChild(host);
      LG.i('Container neu erstellt (#build-dock).');
    } else {
      // Stelle sicher, dass grundlegende Klasse gesetzt ist
      host.classList.add('ui-build-dock');
    }
    host.setAttribute('aria-label', 'Bau-Menü');
    host.setAttribute('role', 'region');
    return host;
  }

  // ------ HTML Pieces ------
  function renderTabs(cats, activeIdx) {
    if (!cats?.length) return '';
    return `
      <div class="ui-build-tabs" role="tablist" aria-label="Kategorien">
        ${cats.map((c, i) => `
          <button class="tab ${i===activeIdx?'active':''}" role="tab"
                  aria-selected="${i===activeIdx?'true':'false'}"
                  data-tab="${i}" title="${escapeHtml(c.category)}">
            ${escapeHtml(c.category)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderGrid(items) {
    if (!items || !items.length) {
      return `
        <div class="ui-build-empty">
          <div class="empty-icon">🧱</div>
          <div class="empty-text">Keine Gebäude verfügbar</div>
        </div>
      `;
    }
    return `
      <div class="ui-build-grid" role="list">
        ${items.map(it => `
          <button class="card" role="listitem" data-build="${escapeAttr(it.id)}" title="${escapeAttr(it.label)}">
            <div class="thumb">
              <img src="${escapeAttr(it.icon || 'assets/placeholder64.PNG')}" alt="${escapeAttr(it.label)}">
            </div>
            <div class="label">${escapeHtml(it.label)}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderChrome() {
    return `
      <div class="ui-build-chrome">
        <div class="drag-handle" aria-hidden="true"></div>
        <button class="close" title="Schließen" aria-label="Bau-Menü schließen">×</button>
      </div>
    `;
  }

  function tplDock(cats, activeIdx) {
    const cur = cats?.[activeIdx] || { category: 'Bauen', items: [] };
    return `
      ${renderChrome()}
      ${renderTabs(cats, activeIdx)}
      <div class="ui-build-body">
        ${renderGrid(cur.items)}
      </div>
    `;
  }

  // ------ Render ------
  function render() {
    const host = ensureContainer();
    host.innerHTML = tplDock(State.items, State.catIndex);
    wireInteractions(host);
  }

  // ------ Interactions ------
  function wireInteractions(host) {
    // Tabs
    host.querySelectorAll('.ui-build-tabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-tab') || 0);
        if (!Number.isFinite(idx)) return;
        State.catIndex = idx;
        render();
      });
    });

    // Close
    const btnClose = host.querySelector('.ui-build-chrome .close');
    btnClose?.addEventListener('click', close);

    // Cards (nur Click-Feedback; eigentlicher Build-Place folgt später)
    host.querySelectorAll('.ui-build-grid .card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-build');
        (window.CBLog?.info || console.log)(`[ui-build] selected: ${id}`);
        // TODO: hier kann später Plazier-Flow andocken
      });
    });
  }

  // ------ Open/Close ------
  function open() {
    const host = ensureContainer();
    host.classList.add('open');
    document.body.classList.add('has-build-open');
    State.open = true;
    // Events (neu + legacy)
    dispatch('cb:build:open', { open: true });
    dispatch('cb:build-open', { open: true });
    LG.i('open');
  }

  function close() {
    const host = ensureContainer();
    host.classList.remove('open');
    document.body.classList.remove('has-build-open');
    State.open = false;
    // Events (neu + legacy)
    dispatch('cb:build:close', { open: false });
    dispatch('cb:build-close', { open: false });
    LG.i('close');
  }

  function toggle() { (State.open ? close : open)(); }

  // ------ API ------
  const API = {
    setItems(items) {
      // Erwarte [{category, items:[...]}] – defensive Normalisierung
      if (!Array.isArray(items)) items = [];
      State.items = items.map(cat => ({
        category: cat?.category || 'Bauen',
        items: Array.isArray(cat?.items) ? cat.items : []
      }));
      // Wenn aktive Kategorie plötzlich leer/außer Reichweite → zurücksetzen
      if (State.catIndex >= State.items.length) State.catIndex = 0;
      render();

      // Falls Dock geöffnet ist, bleibt es offen und zeigt sofort neue Items
      // Falls geschlossen: nichts weiter tun (Button steuert Öffnen)
      LG.i(`Items gesetzt (${State.items.reduce((s,c)=>s+(c.items?.length||0),0)} Karten / ${State.items.length} Kategorien)`);
    },
    open, close, toggle
  };

  // ------ Bootstrap / Mount ------
  function mountOnce() {
    if (State.mounted) return;
    State.mounted = true;

    // Host vorbereiten und initiales Render (leer)
    render();

    // FAB-Button optional – falls existiert
    const btnFab = document.getElementById('btn-build')?.querySelector('button');
    btnFab?.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });

    // Kompatible externe Steuerung
    window.GameUI = window.GameUI || {};
    if (!window.GameUI.toggleBuild) {
      window.GameUI.toggleBuild = toggle;
    }
    if (!window.GameUI.openBuild) {
      window.GameUI.openBuild = open;
    }
    if (!window.GameUI.closeBuild) {
      window.GameUI.closeBuild = close;
    }

    LG.i('bereit (v18.4.0)');
  }

  // Escapes
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // Expose
  window.UIBuild = API;

  // Events
  document.addEventListener('DOMContentLoaded', mountOnce);
  window.addEventListener('cb:assets-ready', () => { /* optional hooks */ });
  window.addEventListener('cb:game-start', () => {
    // bei Spielstart einmal redraw (z. B. nach Bridge-Set)
    if (State.items?.length) render();
  });

})();
