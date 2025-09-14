/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.11
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Baumenü dynamisch aus window.EntitiesRegistry aufbauen
 *  - Null-Downtime: erstellt Container selbst, falls nicht vorhanden
 *  - Verdrahtet Buttons (modern + legacy Events)
 *  - Resilient gegen fehlende Sprites (graue Platzhalter-Kachel)
 *
 * Erwartet:
 *  - window.EntitiesRegistry = { version, categories: {...}, buildings: {...} }
 *  - assets/ui/ui-build.css (für Layout; funktioniert aber auch ohne)
 *  - ui-bridge (optional) toggelt Sichtbarkeit via Klasse ".open"
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[ui-build]';
  const LOG  = (...a)=> (window.CBLog?.info || console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error|| console.error)(TAG, ...a);

  let registry = null;
  let root = null;         // Panel-Root
  let wired = false;

  // ---------- DOM Helpers --------------------------------------------------
  function ensureRoot() {
    // Versuche bestehende Container zu finden (kompatibel zu alten Builds)
    root =
      document.getElementById('ui-build') ||
      document.getElementById('build') ||
      document.querySelector('[data-role="build-panel"]') ||
      document.querySelector('.ui-build') ||
      null;

    if (!root) {
      // Fallback: eigenen Bottom-Sheet-Container anlegen
      root = document.createElement('div');
      root.id = 'ui-build';
      root.className = 'ui-build'; // Styles kommen aus ui-build.css (falls vorhanden)
      // Minimal-Flex-Styles, falls CSS fehlt:
      root.style.position = 'fixed';
      root.style.left     = '0';
      root.style.right    = '0';
      root.style.bottom   = '0';
      root.style.maxHeight= '45%';
      root.style.overflow = 'auto';
      root.style.background = 'rgba(245,245,245,0.96)';
      root.style.backdropFilter = 'blur(4px)';
      root.style.borderTopLeftRadius  = '14px';
      root.style.borderTopRightRadius = '14px';
      root.style.boxShadow = '0 -8px 24px rgba(0,0,0,0.18)';
      root.style.padding   = '12px 14px 16px';
      root.style.zIndex    = '1000';
      // zunächst geschlossen; ui-bridge setzt/entfernt ".open"
      root.style.display   = 'none';
      document.body.appendChild(root);
    }
    return root;
  }

  function sectionEl(title) {
    const sec = document.createElement('section');
    sec.className = 'ub-section';
    const h = document.createElement('h3');
    h.className = 'ub-title';
    h.textContent = title;
    h.style.margin = '10px 6px';
    h.style.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    const grid = document.createElement('div');
    grid.className = 'ub-grid';
    // minimale Grid-Styles, falls CSS fehlt
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(96px, 1fr))';
    grid.style.gap = '10px';
    sec.appendChild(h);
    sec.appendChild(grid);
    return { sec, grid };
  }

  function makeButton(kind, def) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ub-item';
    btn.setAttribute('data-kind', kind);
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '8px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid rgba(0,0,0,0.08)';
    btn.style.background = 'rgba(255,255,255,0.85)';
    btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    btn.style.cursor = 'pointer';

    const thumb = document.createElement('div');
    thumb.className = 'ub-thumb';
    thumb.style.width = '72px';
    thumb.style.height = '72px';
    thumb.style.borderRadius = '8px';
    thumb.style.background = '#e8eaee';
    thumb.style.display = 'grid';
    thumb.style.placeItems = 'center';
    thumb.style.overflow = 'hidden';

    const img = document.createElement('img');
    img.alt = def.title || kind;
    img.decoding = 'async';
    img.loading = 'lazy';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';

    // Sprite wählen (wenn nicht vorhanden → Platzhalter)
    const sprite = def?.sprite || '';
    if (sprite) {
      img.src = sprite;
      img.onerror = () => { img.remove(); thumb.appendChild(placeholder(def)); };
      thumb.appendChild(img);
    } else {
      thumb.appendChild(placeholder(def));
    }

    const label = document.createElement('div');
    label.className = 'ub-label';
    label.textContent = def.title || kind;
    label.style.marginTop = '6px';
    label.style.font = '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    label.style.color = '#1a1a1a';

    btn.appendChild(thumb);
    btn.appendChild(label);
    return btn;
  }

  // farbiger Platzhalter auf Basis der Kategorie-Farbe
  function placeholder(def) {
    const ph = document.createElement('div');
    ph.style.width = '64px';
    ph.style.height = '64px';
    ph.style.borderRadius = '6px';
    ph.style.display = 'grid';
    ph.style.placeItems = 'center';
    ph.style.color = '#111';
    ph.style.font = '500 11px system-ui, sans-serif';
    ph.textContent = (def?.abbr || (def?.title || '?').slice(0,2)).toUpperCase();

    const c = def?.color || '#d8d8d8';
    ph.style.background = c;
    ph.style.border = '1px solid rgba(0,0,0,0.15)';
    return ph;
  }

  // ---------- Events -------------------------------------------------------
  function firePlace(kind) {
    // modern
    try {
      const ev = new CustomEvent('cb:build:place', { detail:{ kind }});
      window.dispatchEvent(ev);
    } catch(e){/* ignore */}
    // legacy
    try {
      const ev2 = new CustomEvent('cb:build-action', { detail:{ action: 'place-' + kind }});
      window.dispatchEvent(ev2);
    } catch(e){/* ignore */}
  }

  function wireButtons() {
    if (!root) return 0;
    const all = root.querySelectorAll('.ub-item[data-kind]');
    all.forEach(btn => {
      if (btn.__wired) return;
      btn.__wired = true;
      btn.addEventListener('click', () => {
        const kind = btn.getAttribute('data-kind');
        firePlace(kind);
      });
    });
    wired = true;
    return all.length;
  }

  // ---------- Build Menu ---------------------------------------------------
  function buildMenu() {
    if (!registry) {
      WARN('keine Registry → Menü leer.');
      return 0;
    }
    ensureRoot();
    root.innerHTML = '';

    const cats = registry.categories || {};
    const order = Object.keys(cats)
      .map(id => ({ id, ...cats[id] }))
      .sort((a,b) => (a.order||999) - (b.order||999));

    const defs = registry.buildings || {};
    let btnCount = 0;

    for (const cat of order) {
      const { sec, grid } = sectionEl(cat.title || cat.id || '–');
      const kinds = (cat.items && cat.items.length) ? cat.items
                   : Object.keys(defs).filter(k => defs[k]?.category === cat.id);

      for (const kind of kinds) {
        const def = defs[kind];
        if (!def) continue;
        const btn = makeButton(kind, {
          title: def.title || kind,
          abbr : def.abbr || (def.title||kind).slice(0,2),
          sprite: def.sprite || '',
          color : def.color  || cat.color || '#e6e9ef'
        });
        grid.appendChild(btn);
        btnCount++;
      }
      if (grid.children.length) root.appendChild(sec);
    }

    const count = wireButtons();
    LOG(`Build-Buttons verdrahtet: ${count}`);
    return btnCount;
  }

  // ---------- Visibility Hooks (ui-bridge kompatibel) ---------------------
  function openPanel() {
    ensureRoot();
    root.style.display = 'block';
    root.classList.add('open');
  }
  function closePanel() {
    ensureRoot();
    root.classList.remove('open');
    root.style.display = 'none';
  }

  // ui-bridge kompatible Events
  window.addEventListener('ui-build:open', openPanel);
  window.addEventListener('ui-build:close', closePanel);
  window.addEventListener('cb:ui-build:open', openPanel);
  window.addEventListener('cb:ui-build:close', closePanel);

  // ---------- Boot ---------------------------------------------------------
  function init() {
    registry = window.EntitiesRegistry || null;
    if (!registry) {
      WARN('EntitiesRegistry fehlt – versuche später erneut (nach cb:entities-ready).');
      return;
    }
    ensureRoot();
    const n = buildMenu();
    LOG(`geladen (v17.9.11) – Kategorien: ${Object.keys(registry.categories||{}).length}, Buttons: ${n}`);
  }

  // Falls Registry später kommt:
  window.addEventListener('cb:entities-ready', init);

  // Beim Spielstart initialisieren & Panel von ui-bridge steuern lassen
  window.addEventListener('cb:game-start', () => {
    // Sicherstellen, dass Registry vorhanden ist (falls schon geladen)
    if (window.EntitiesRegistry && !wired) init();
  });

  // Sofort versuchen, sobald DOM bereit ist (Editor/Demos)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

})();
