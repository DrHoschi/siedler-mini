/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.12
 * Zweck:
 *  - Build-Menü rendern (Einzeilig pro Kategorie)
 *  - Robust gegen unterschiedliche Registry-/Event-Bezeichnungen
 *  - Build-Aktionen an Engine weitergeben (mehrere Kompat-Varianten)
 * ============================================================================
 */
(() => {
  'use strict';

  const TAG  = '[ui-build]';
  const LOG  = (...a) => (window.CBLog?.log || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  // ---------- Registry lesen (robust) --------------------------------------
  function readRegistry() {
    // bevorzugt: EntitiesRegistry.get()
    const er = window.EntitiesRegistry;
    if (er && typeof er.get === 'function') {
      const r = er.get();
      if (r && (r.categories?.length || r.items?.length)) return r;
    }
    // evtl. flach: EntitiesRegistry.data
    if (er && er.data && (er.data.categories?.length || er.data.items?.length)) {
      return er.data;
    }
    // ältere Setups: window.ENTITIES
    if (window.ENTITIES && (window.ENTITIES.categories?.length || window.ENTITIES.items?.length)) {
      return window.ENTITIES;
    }
    // sehr alt: window.Entities?.registry
    if (window.Entities && window.Entities.registry && (window.Entities.registry.categories?.length || window.Entities.registry.items?.length)) {
      return window.Entities.registry;
    }
    return { categories: [], items: [] };
  }

  function normalizeRegistry(raw) {
    const catMap = new Map();
    const categories = (raw.categories || []).map(c => {
      const id = (c.id || c.key || c.slug || c.name || '').toString();
      const title = c.title || c.name || id;
      const order = typeof c.order === 'number' ? c.order : 9999;
      const res = { id, title, order };
      catMap.set(id, res);
      return res;
    }).sort((a,b) => a.order - b.order || a.title.localeCompare(b.title));

    const items = (raw.items || raw.buildings || raw.entities || []).map(it => {
      const id = (it.id || it.key || it.slug || it.name || '').toString();
      const title = it.title || it.name || id;
      const category = (it.category || it.cat || 'misc').toString();
      const icon = it.icon || it.thumb || it.sprite || it.image || '';
      const order = typeof it.order === 'number' ? it.order : 9999;
      const placeAction = it.placeAction || it.action || `place-${id}`;
      return { id, title, category, icon, order, placeAction };
    }).sort((a,b) => a.order - b.order || a.title.localeCompare(b.title));

    // Falls keine Kategorien geliefert wurden → aus Items ableiten
    if (!categories.length && items.length) {
      const derived = Array.from(new Set(items.map(i => i.category)));
      derived.forEach((cid, idx) => {
        catMap.set(cid, { id: cid, title: titleize(cid), order: idx });
      });
      return { categories: Array.from(catMap.values()), items };
    }
    return { categories, items };
  }

  function titleize(s='') {
    return s.replace(/[-_]/g,' ').replace(/\b\w/g, m => m.toUpperCase());
  }

  // ---------- DOM bauen -----------------------------------------------------
  let panel, inner;

  function ensurePanel() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'build-panel';
    panel.setAttribute('aria-hidden', 'true');

    const wrap = document.createElement('div');
    wrap.className = 'bp-inner';

    const header = document.createElement('div');
    header.className = 'bp-header';

    const h = document.createElement('div');
    h.className = 'bp-title';
    h.textContent = 'Bauen';

    const btn = document.createElement('button');
    btn.className = 'bp-close';
    btn.addEventListener('click', () => closePanel());

    header.appendChild(h);
    header.appendChild(btn);

    inner = document.createElement('div');
    inner.className = 'bp-content';

    wrap.appendChild(header);
    wrap.appendChild(inner);
    panel.appendChild(wrap);
    document.body.appendChild(panel);

    return panel;
  }

  function imgEl(src, alt) {
    const img = document.createElement('img');
    img.className = 'bp-thumb';
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = src;
    img.onerror = () => {
      // Platzhalter, wenn Icon fehlt
      img.src = 'assets/placeholder64.PNG';
    };
    return img;
  }

  function buttonCard(item) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bp-card';
    btn.setAttribute('data-id', item.id);

    // Bild: wenn icon leer ist, versuchen wir generischen Pfad
    let icon = item.icon || '';
    if (!icon) {
      // Standard: aus /assets/buildings/<id>*.png erraten
      icon = `assets/buildings/${item.id}.png`;
    }

    btn.appendChild(imgEl(icon, item.title));
    const lab = document.createElement('div');
    lab.className = 'bp-label';
    lab.textContent = item.title;
    btn.appendChild(lab);

    btn.addEventListener('click', () => triggerPlace(item));
    return btn;
  }

  function renderMenu() {
    ensurePanel();

    inner.innerHTML = '';
    const raw = readRegistry();
    const reg = normalizeRegistry(raw);

    if (!reg.items.length) {
      WARN('Keine Items in Registry gefunden – Menü leer.', raw);
      // trotzdem UI zeigen, damit man sieht „leer“
      const empty = document.createElement('div');
      empty.style.color = '#cbd5cf';
      empty.style.padding = '12px 8px 20px 8px';
      empty.textContent = 'Keine Baueinträge gefunden.';
      inner.appendChild(empty);
      LOG('geladen (v17.9.12) – Kategorien:', 0, ', Buttons:', 0);
      return;
    }

    let totalButtons = 0;

    for (const cat of reg.categories) {
      const block = document.createElement('section');
      block.className = 'bp-cat';

      const h3 = document.createElement('h3');
      h3.textContent = cat.title || titleize(cat.id);
      block.appendChild(h3);

      const row = document.createElement('div');
      row.className = 'bp-row';

      reg.items.filter(it => (it.category||'') === cat.id)
        .forEach(it => {
          row.appendChild(buttonCard(it));
          totalButtons++;
        });

      // Kategorie völlig leer? Dann überspringen.
      if (!row.children.length) continue;

      block.appendChild(row);
      inner.appendChild(block);
    }

    LOG('geladen (v17.9.12) – Kategorien:', (inner.querySelectorAll('.bp-cat').length), ', Buttons:', totalButtons);
  }

  // ---------- Öffnen/Schließen ---------------------------------------------
  function openPanel() {
    renderMenu();
    ensurePanel();
    panel.dataset.open = '1';
    panel.setAttribute('aria-hidden','false');
  }
  function closePanel() {
    if (!panel) return;
    panel.dataset.open = '0';
    panel.setAttribute('aria-hidden','true');
  }

  // ---------- Platzieren (Kompat-Feuerwerk) --------------------------------
  function triggerPlace(item) {
    const id = item.id;
    let ok = false;

    // 1) Moderne Bridge?
    try {
      if (window.GameCore?.placeBuilding) {
        window.GameCore.placeBuilding(id);
        ok = true;
      }
    } catch (e) {}

    // 2) Entities-Modul?
    try {
      if (!ok && window.Entities?.place) {
        window.Entities.place(id);
        ok = true;
      }
    } catch (e) {}

    // 3) Klassische Custom-Events
    try {
      if (!ok) {
        const ev = new CustomEvent('cb:build-place', { detail:{ id }});
        window.dispatchEvent(ev);
        ok = true;
      }
    } catch (e) {}

    LOG('Build-Aktion:', id, ok ? 'ok' : 'unsent');
    // Panel offen lassen, damit man mehrere setzen kann
  }

  // ---------- Event-Brücken binden -----------------------------------------
  function bindOpenClose() {
    const OPEN_EVENTS  = ['cb:build-open','ui:build:open','build:open'];
    const CLOSE_EVENTS = ['cb:build-close','ui:build:close','build:close'];

    OPEN_EVENTS.forEach(n => window.addEventListener(n, openPanel));
    CLOSE_EVENTS.forEach(n => window.addEventListener(n, closePanel));

    // Falls ui-bridge direkt Methoden erwartet:
    window.UIBuild = {
      open: openPanel,
      close: closePanel
    };
  }

  // ---------- Start ---------------------------------------------------------
  function init() {
    bindOpenClose();
    ensurePanel();
    LOG('bereit (v17.9.12)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
