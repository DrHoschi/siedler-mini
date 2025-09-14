/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.11
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Build-Menü dynamisch aus der Entities-Registry rendern (SSOT)
 *  - Fallback: eigenen Panel-Container erzeugen, wenn keiner im DOM existiert
 *  - Events: cb:build:place (modern) + cb:build-action (legacy) dispatchen
 *
 * Erwartete Registry (tolerant gelesen):
 *  window.EntitiesRegistry = {
 *    version: "1.x",
 *    categories: [
 *      {
 *        id: "admin", title: "Allg. / Verwaltung", color: "#8891ff",
 *        items: [
 *          { kind: "rathaus", title: "Rathaus", icon: "assets/buildings/rathaus_wood1.png" },
 *          ...
 *        ]
 *      },
 *      ...
 *    ],
 *    // optionale Helfer:
 *    getCategories?(): Category[]; getMenu?(): Category[];
 *  }
 * ============================================================================
 */
(() => {
  'use strict';

  const TAG  = '[ui-build]';
  const LOG  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const OK   = (...a) => (window.CBLog?.ok    || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  const VERSION = '17.9.11';

  // ------------------------------------------------------------
  // Registry tolerant lesen
  // ------------------------------------------------------------
  function pick(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  function readRegistry() {
    const R = window.EntitiesRegistry || window.entitiesRegistry || {};
    // Mögliche Getter:
    const cats = typeof R.getMenu === 'function'
      ? R.getMenu()
      : (typeof R.getCategories === 'function' ? R.getCategories() : R.categories);
    const categories = pick(cats).map(raw => {
      // item shape tolerant:
      const items = pick(raw.items || raw.buildings).map(it => ({
        kind : it.kind || it.id || it.key || '',
        title: it.title || it.name || it.label || (it.kind || '?'),
        // icon/sprite tolerant – häufig liegen die korrekten Images unter assets/buildings/
        icon : it.icon || it.sprite || it.img || null,
        color: it.color || raw.color || null
      })).filter(b => b.kind);

      return {
        id    : raw.id || raw.key || raw.slug || (raw.title || '').toLowerCase().replace(/\s+/g,'-'),
        title : raw.title || raw.name || 'Kategorie',
        color : raw.color || null,
        items
      };
    });

    return {
      version: R.version || 'unknown',
      categories
    };
  }

  // ------------------------------------------------------------
  // DOM Hilfen
  // ------------------------------------------------------------
  function ensurePanelRoot() {
    // 1) Versuche bestehende Container (kompatibel zu älteren Layouts)
    const known = document.querySelector('[data-build-root], #build-root, #build-panel .content, #build-panel, .ui-build');
    if (known) return known;

    // 2) Eigenen leichten Panel-Container anlegen
    const wrap = document.createElement('div');
    wrap.id = 'ui-build-panel';
    wrap.setAttribute('data-build-root', '1');
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.right = '0';
    wrap.style.bottom = '0';
    wrap.style.maxHeight = '45vh';
    wrap.style.overflow = 'auto';
    wrap.style.background = 'rgba(245,247,250,0.95)';
    wrap.style.backdropFilter = 'blur(6px)';
    wrap.style.borderTop = '1px solid rgba(0,0,0,0.08)';
    wrap.style.boxShadow = '0 -10px 30px rgba(0,0,0,0.08)';
    wrap.style.padding = '12px 16px';
    wrap.style.zIndex = '9990';
    wrap.style.display = 'none'; // zunächst zu
    document.body.appendChild(wrap);

    return wrap;
  }

  function sectionEl(title) {
    const s = document.createElement('section');
    s.className = 'ui-build-section';
    s.style.margin = '0 0 16px';
    const h = document.createElement('h3');
    h.textContent = title || 'Kategorie';
    h.style.margin = '0 0 8px';
    h.style.font = '600 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    h.style.opacity = '0.85';
    s.appendChild(h);
    return s;
  }

  function gridEl() {
    const g = document.createElement('div');
    g.className = 'ui-build-grid';
    g.style.display = 'grid';
    g.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
    g.style.gap = '10px';
    return g;
  }

  function cardEl({ title, icon, color }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-build-card';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '8px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid rgba(0,0,0,0.08)';
    btn.style.background = 'rgba(255,255,255,0.9)';
    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
    btn.style.cursor = 'pointer';

    const thumb = document.createElement('div');
    thumb.style.width = '72px';
    thumb.style.height = '72px';
    thumb.style.borderRadius = '8px';
    thumb.style.marginBottom = '6px';
    thumb.style.display = 'grid';
    thumb.style.placeItems = 'center';
    thumb.style.background = 'rgba(0,0,0,0.04)';
    thumb.style.overflow = 'hidden';

    if (icon) {
      const img = document.createElement('img');
      img.decoding = 'async';
      img.loading = 'lazy';
      img.src = icon;
      img.alt = title || '';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.onerror = () => {
        // Fallback: farbiger Platzhalter
        img.remove();
        thumb.appendChild(makeSwatch(color));
      };
      thumb.appendChild(img);
    } else {
      thumb.appendChild(makeSwatch(color));
    }

    const label = document.createElement('div');
    label.textContent = title || '';
    label.style.font = '500 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    label.style.color = '#223';
    label.style.whiteSpace = 'nowrap';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';

    btn.appendChild(thumb);
    btn.appendChild(label);
    return btn;
  }

  function makeSwatch(color) {
    const c = document.createElement('div');
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.borderRadius = '8px';
    c.style.background = color || 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)';
    c.style.border = '1px solid rgba(0,0,0,0.06)';
    return c;
  }

  // ------------------------------------------------------------
  // Event-Dispatch (modern + legacy)
  // ------------------------------------------------------------
  function dispatchPlace(kind) {
    try {
      window.dispatchEvent(new CustomEvent('cb:build:place', {
        detail: { kind }
      }));
      // Legacy-Fallback
      window.dispatchEvent(new CustomEvent('cb:build-action', {
        detail: { action: `place-${kind}` }
      }));
      OK('Place dispatch:', kind);
    } catch (e) {
      ERR('Dispatch-Fehler:', e);
    }
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  let ROOT = null;

  function clearRoot() {
    while (ROOT.firstChild) ROOT.removeChild(ROOT.firstChild);
  }

  function renderMenu() {
    const { categories } = readRegistry();
    clearRoot();

    let buttonCount = 0;

    categories.forEach(cat => {
      if (!cat.items || !cat.items.length) return;

      const sec  = sectionEl(cat.title);
      const grid = gridEl();

      cat.items.forEach(it => {
        // Korrigiere ggf. Icon auf assets/buildings/… (lowercase), wenn kein Icon gesetzt
        let icon = it.icon || null;
        if (!icon && it.kind) {
          icon = `assets/buildings/${(it.kind + '_wood').toLowerCase()}.png`;
        }

        const btn = cardEl({
          title: it.title || it.kind,
          icon,
          color: it.color || cat.color
        });
        btn.dataset.kind = it.kind;
        btn.addEventListener('click', () => dispatchPlace(it.kind));
        grid.appendChild(btn);
        buttonCount++;
      });

      sec.appendChild(grid);
      ROOT.appendChild(sec);
    });

    LOG('Build-Buttons verdrahtet:', buttonCount);
  }

  // ------------------------------------------------------------
  // Open/Close API (für ui-bridge & manuell)
  // ------------------------------------------------------------
  function open()  { ROOT.style.display = 'block'; }
  function close() { ROOT.style.display = 'none';  }
  function toggle(){ ROOT.style.display = (ROOT.style.display === 'none') ? 'block' : 'none'; }
  function refresh(){ renderMenu(); }

  // Events vom ui-bridge (tolerant – nur wenn vorhanden)
  window.addEventListener('ui:build:open',  open);
  window.addEventListener('ui:build:close', close);
  window.addEventListener('ui:build:toggle', toggle);

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    ROOT = ensurePanelRoot();
    // Falls ein existierendes Layout den Container schon sichtbar macht,
    // lassen wir ihn geschlossen starten und ui-bridge öffnet ihn bei Bedarf.
    ROOT.style.display = ROOT.style.display || 'none';

    renderMenu();

    // Öffentliche API
    window.UIBuild = { open, close, toggle, refresh, version: VERSION };
    LOG(`geladen (v${VERSION})`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
