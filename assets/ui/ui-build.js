/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.12
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Liest EntitiesRegistry (Single Source of Truth)
 *  - Baut das Baumenü (UI) dynamisch – auch wenn kein HTML-Gerüst vorhanden ist
 *  - Gruppiert nach Kategorien & färbt Buttons nach Kategorie
 *  - Klick = dispatch moderner Event (cb:build:place) + Legacy-Fallback (cb:build-action)
 *
 * Public API:
 *  - window.UIBuild.open()
 *  - window.UIBuild.close()
 *  - window.UIBuild.render()  // menu neu aufbauen (z. B. nach Registry-Update)
 *
 * Events:
 *  - hört auf 'cb:game-start' → initialisiert sich
 * ============================================================================
 */
(() => {
  'use strict';

  const TAG   = '[ui-build]';
  const LOG   = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const WARN  = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);
  const ERR   = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  // Konfig / Selektoren (Panel wird notfalls erzeugt)
  const SEL = {
    panelId:  'build-panel',
    listId:   'build-list',
    toggleId: 'build-toggle',
  };

  // kleines CSS-Setup, wenn die Seite nichts mitliefert
  function injectFallbackCSS() {
    if (document.getElementById('ui-build-autocss')) return;
    const css = `
      #${SEL.panelId} {
        position: absolute; right: 12px; top: 12px;
        width: 280px; max-height: 70vh; overflow: auto;
        background: rgba(20,20,24,.92); backdrop-filter: saturate(150%) blur(2px);
        border: 1px solid rgba(255,255,255,.08); border-radius: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,.35);
        font: 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #e7e7ea; z-index: 1000; display: none;
      }
      #${SEL.panelId}.open { display: block; }
      #${SEL.panelId} header {
        position: sticky; top: 0; background: rgba(20,20,24,.96);
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.08);
      }
      #${SEL.panelId} header h3 { margin: 0; font-size: 15px; letter-spacing: .2px; }
      #${SEL.panelId} .cat {
        padding: 8px 10px 0; margin-top: 6px;
      }
      #${SEL.panelId} .cat h4 {
        margin: 0 0 6px 0; font-size: 12px; font-weight: 700; opacity: .8;
        text-transform: uppercase; letter-spacing: .5px;
      }
      #${SEL.panelId} .grid {
        display: grid; grid-template-columns: repeat(2, 1fr);
        gap: 8px; padding: 0 10px 10px;
      }
      #${SEL.panelId} button.b {
        display: flex; align-items: center; gap: 8px;
        width: 100%; padding: 8px; border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03); border-radius: 8px;
        color: inherit; cursor: pointer;
        transition: transform .06s ease, background .2s ease;
        text-align: left; min-height: 44px;
      }
      #${SEL.panelId} button.b:hover { transform: translateY(-1px); background: rgba(255,255,255,.06); }
      #${SEL.panelId} button.b:active { transform: translateY(0); }
      #${SEL.panelId} button.b .thumb {
        flex: 0 0 32px; width: 32px; height: 32px; border-radius: 6px;
        background: rgba(255,255,255,.06); display: grid; place-items: center;
        overflow: hidden; border: 1px solid rgba(0,0,0,.25);
      }
      #${SEL.panelId} button.b .thumb img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      #${SEL.panelId} button.b .label { font-size: 13px; font-weight: 600; letter-spacing: .2px; }
      #${SEL.toggleId} {
        position: absolute; right: 12px; top: 12px; z-index: 1001;
        width: 40px; height: 40px; border-radius: 10px;
        background: rgba(20,20,24,.92); color: #e7e7ea; border: 1px solid rgba(255,255,255,.08);
        display: grid; place-items: center; cursor: pointer;
      }
    `;
    const style = document.createElement('style');
    style.id = 'ui-build-autocss';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = document.getElementById(SEL.panelId);
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = SEL.panelId;
      panel.innerHTML = `
        <header>
          <h3>Bauen</h3>
          <button type="button" data-close="1" aria-label="Schließen">✕</button>
        </header>
        <div id="${SEL.listId}" role="list"></div>
      `;
      document.body.appendChild(panel);
    }
    let toggle = document.getElementById(SEL.toggleId);
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = SEL.toggleId;
      toggle.type = 'button';
      toggle.title = 'Bauen (Toggle)';
      toggle.textContent = '🧱';
      document.body.appendChild(toggle);
    }

    // Close-Button
    panel.querySelector('header [data-close]')?.addEventListener('click', () => close());
    // Toggle
    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
    });

    return { panel, list: panel.querySelector('#' + SEL.listId) };
  }

  function groupByCategory(reg) {
    const cats = {};
    for (const c of reg.listCategories()) {
      cats[c.id] = { meta: c, items: [] };
    }
    for (const b of reg.listBuildings()) {
      const catId = b.category || 'misc';
      if (!cats[catId]) cats[catId] = { meta: { id: catId, name: catId, color: '#888' }, items: [] };
      cats[catId].items.push(b);
    }
    // sort by category name, then item name
    const ordered = Object.values(cats).sort((a, b) => (a.meta.name || a.meta.id).localeCompare(b.meta.name || b.meta.id, 'de'));
    for (const g of ordered) g.items.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, 'de'));
    return ordered;
  }

  function paintBorder(el, color) {
    // subtile Farbhinweise je Kategorie (nicht für Platzierbarkeit!)
    el.style.boxShadow = `inset 0 0 0 2px ${color}22, 0 1px 0 rgba(255,255,255,.04)`;
  }

  function makeButton(reg, building) {
    const cat = reg.getCategory(building.category);
    const btn = document.createElement('button');
    btn.className = 'b';
    btn.type = 'button';
    btn.dataset.kind = building.id;

    // Thumb
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    if (cat?.color) paintBorder(thumb, cat.color);

    // Bild (optional, fällt auf Text zurück)
    const img = document.createElement('img');
    let hasImg = false;
    if (building.sprite) {
      hasImg = true;
      img.src = building.sprite;
      img.alt = building.name || building.id;
      img.addEventListener('error', () => {
        // Bild kaputt → Thumb bleibt als Platzhalter, aber kein kaputtes Icon
        thumb.innerHTML = '';
      });
      thumb.appendChild(img);
    } else {
      // kein Sprite → einfach Icon-Glyph
      thumb.textContent = '▦';
    }

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = building.name || building.id;

    btn.appendChild(thumb);
    btn.appendChild(label);

    if (cat?.color) paintBorder(btn, cat.color);

    btn.addEventListener('click', () => {
      // Moderner Event
      try {
        window.dispatchEvent(new CustomEvent('cb:build:place', { detail: { kind: building.id } }));
      } catch (e) {}
      // Legacy-Fallback
      try {
        window.dispatchEvent(new CustomEvent('cb:build-action', { detail: { action: `place-${building.id}` } }));
      } catch (e) {}
    });

    return btn;
  }

  function renderFromRegistry(container, reg) {
    container.innerHTML = '';
    const groups = groupByCategory(reg);

    let total = 0;
    for (const g of groups) {
      const catWrap = document.createElement('section');
      catWrap.className = 'cat';

      const h = document.createElement('h4');
      h.textContent = g.meta?.name || g.meta?.id || 'Sonstiges';
      if (g.meta?.color) {
        h.style.color = g.meta.color;
      }
      catWrap.appendChild(h);

      const grid = document.createElement('div');
      grid.className = 'grid';

      for (const b of g.items) {
        const btn = makeButton(reg, b);
        grid.appendChild(btn);
        total++;
      }

      catWrap.appendChild(grid);
      container.appendChild(catWrap);
    }

    LOG(`Build-Buttons verdrahtet: ${total}`);
    return total;
  }

  // Robust: Warte bis Registry verfügbar ist
  async function waitForRegistry(maxMs = 5000) {
    const start = performance.now();
    while (!window.EntitiesRegistry) {
      if (performance.now() - start > maxMs) return null;
      await new Promise(r => setTimeout(r, 50));
    }
    return window.EntitiesRegistry;
  }

  // Public API
  function open()  { document.getElementById(SEL.panelId)?.classList.add('open'); }
  function close() { document.getElementById(SEL.panelId)?.classList.remove('open'); }

  async function render() {
    const reg = await waitForRegistry();
    if (!reg) {
      WARN('Keine EntitiesRegistry gefunden – Menü bleibt leer.');
      return { ok: false, count: 0 };
    }
    const { panel, list } = ensurePanel();
    const count = renderFromRegistry(list, reg);
    panel.classList.add('open');
    return { ok: true, count };
  }

  // Init-Flow
  async function init() {
    try {
      injectFallbackCSS();
      const res = await render();
      LOG(`geladen (v17.9.12) – Buttons: ${res.count}`);
    } catch (e) {
      ERR('Init-Fehler:', e);
    }
  }

  // Auto-Init: beim Game-Start
  window.addEventListener('cb:game-start', init);
  // Falls cb:game-start schon durch ist (Reload-Szenario), trotzdem initialisieren:
  if (document.readyState !== 'loading') {
    // leicht verzögert, damit EntitiesRegistry Zeit hat zu laden
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  }

  window.UIBuild = { open, close, render };
})();
