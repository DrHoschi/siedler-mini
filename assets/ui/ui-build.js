/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.13
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Baut das Baumenü aus window.EntitiesRegistry (Single-Source-of-Truth)
 *  - Robust gegen unterschiedliche Registry-Shapes (Arrays ODER Getter-Methoden)
 *  - Einzeilige Kategorien-Reihen (horizontales Scrollen)
 *  - Klick auf Karte → Build-Aktion (legacy + modern + Event-Fallback)
 *
 * Events:
 *  - cb:build-open / cb:build-close (für FAB-Offsets etc.)
 *  - cb:build:request { detail:{ id } } (Fallback, falls keine Bridge greift)
 * ============================================================================
 */
(() => {
  'use strict';

  const TAG  = '[ui-build]';
  const log  = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);
  const err  = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const PANEL_ID = 'build-panel';

  // ------------------- Registry Access (robust) -------------------
  function getRegistry() {
    const R = window.EntitiesRegistry;
    if (!R) return null;

    // Kategorien
    const categories =
      (typeof R.getCategories === 'function' ? R.getCategories() :
      Array.isArray(R.categories) ? R.categories : [])
      // nur sichtbare Kategorien
      .filter(c => !c?.hidden);

    // Buildings / Items
    const allItems =
      (typeof R.getBuildings === 'function' ? R.getBuildings() :
      Array.isArray(R.buildings) ? R.buildings :
      Array.isArray(R.items) ? R.items : [])
      // nur sichtbare/baubare Einträge
      .filter(b => !b?.hidden && (b?.buildable ?? true));

    // Lookup pro Kategorie
    const byCategory = (catId) => {
      if (typeof R.byCategory === 'function') {
        return (R.byCategory(catId) || []).filter(b => !b?.hidden && (b?.buildable ?? true));
      }
      return allItems.filter(b => (b.category === catId || b.cat === catId));
    };

    // Bild-URL ermitteln (icon → sprite → placeholder)
    const resolveIcon = (b) => {
      const p = b.icon || b.preview || b.sprite || b.src;
      if (p) return p;
      return 'assets/placeholder64.PNG';
    };

    // Anzeigename
    const resolveName = (b) => b.title || b.name || b.id || 'Unbenannt';

    // ID
    const resolveId = (b) => b.id || b.key || b.name;

    return { categories, allItems, byCategory, resolveIcon, resolveName, resolveId, version: R.version || 'unknown' };
  }

  // ------------------- Build Bridge (robust) -------------------
  function requestBuild(id) {
    let ok = false;

    // Modern / Core
    try {
      if (typeof window.Entities?.place === 'function') {
        window.Entities.place(id);
        ok = true;
      }
    } catch(e){ /* ignore */ }

    // Legacy
    try {
      if (typeof window.GameCore?.placeBuilding === 'function') {
        window.GameCore.placeBuilding(id);
        ok = true;
      }
    } catch(e){ /* ignore */ }

    // Universeller Event-Fallback
    if (!ok) {
      window.dispatchEvent(new CustomEvent('cb:build:request', { detail: { id } }));
    }
  }

  // ------------------- Panel Lifecycle -------------------
  let panel, isOpen = false;

  function openPanel() {
    if (!panel) return;
    panel.classList.add('open');
    document.body.classList.add('has-build-open');
    window.dispatchEvent(new Event('cb:build-open'));
    isOpen = true;
  }
  function closePanel() {
    if (!panel) return;
    panel.classList.remove('open');
    document.body.classList.remove('has-build-open');
    window.dispatchEvent(new Event('cb:build-close'));
    isOpen = false;
  }
  function togglePanel() { isOpen ? closePanel() : openPanel(); }

  // ------------------- DOM Builders -------------------
  function buildCard(b, helpers) {
    const id = helpers.resolveId(b);
    const name = helpers.resolveName(b);
    const img = helpers.resolveIcon(b);

    const card = document.createElement('button');
    card.className = 'ui-build-card';
    card.type = 'button';
    card.setAttribute('data-id', id);
    card.innerHTML = `
      <span class="ui-build-thumb">
        <img alt="" loading="lazy">
      </span>
      <span class="ui-build-title">${name}</span>
    `;
    const imgEl = $('img', card);
    imgEl.src = img;
    imgEl.onerror = () => { imgEl.src = 'assets/placeholder64.PNG'; };

    card.addEventListener('click', () => {
      requestBuild(id);
      // Optional: Panel schließen nach Auswahl
      // closePanel();
    });

    return card;
  }

  function buildCategory(cat, items, helpers) {
    const sec = document.createElement('section');
    sec.className = 'ui-build-section';

    const h = document.createElement('h3');
    h.className = 'ui-build-section-title';
    h.textContent = cat.title || cat.name || cat.id || 'Kategorie';
    sec.appendChild(h);

    const row = document.createElement('div');
    row.className = 'ui-build-row';
    items.forEach(b => row.appendChild(buildCard(b, helpers)));
    sec.appendChild(row);

    return sec;
  }

  function render() {
    const R = getRegistry();
    if (!R) {
      warn('Registry nicht gefunden → Menü leer.');
      renderEmpty('Registry nicht verfügbar.');
      return;
    }

    const { categories, allItems } = R;
    if (!categories.length || !allItems.length) {
      warn('Keine Items in Registry gefunden – Menü leer.', R);
      renderEmpty('Keine Baueinträge gefunden.');
      return;
    }

    panel.innerHTML = `
      <div class="ui-build-header">
        <h2>Bauen</h2>
        <button class="ui-build-close" aria-label="Schließen">×</button>
      </div>
      <div class="ui-build-content"></div>
    `;
    const content = $('.ui-build-content', panel);
    $('.ui-build-close', panel).addEventListener('click', closePanel);

    categories.forEach(cat => {
      const items = R.byCategory(cat.id || cat.key || cat.name);
      if (items && items.length) {
        content.appendChild(buildCategory(cat, items, R));
      }
    });
  }

  function renderEmpty(msg) {
    panel.innerHTML = `
      <div class="ui-build-header">
        <h2>Bauen</h2>
        <button class="ui-build-close" aria-label="Schließen">×</button>
      </div>
      <div class="ui-build-empty">${msg || '—'}</div>
    `;
    $('.ui-build-close', panel).addEventListener('click', closePanel);
  }

  // ------------------- Boot -------------------
  function wireGlobalAPI() {
    // Stelle sicher, dass die UI-Bridge den Toggle nutzen kann
    const GUI = (window.GameUI ||= {});
    GUI.openBuild   = openPanel;
    GUI.closeBuild  = closePanel;
    GUI.toggleBuild = togglePanel;
  }

  function init() {
    panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }
    panel.classList.add('ui-build');

    wireGlobalAPI();
    render();

    log('geladen (v17.9.13).');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
