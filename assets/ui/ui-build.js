/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.13
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Build-Menü aus Registry (Single-Source-of-Truth) aufbauen
 *  - robustes Waiting/Retry bis Registry verfügbar ist
 *  - Einzeiliges Karten-Layout pro Eintrag (Bild + Label)
 *  - Kompatibel mit älteren Bridges (Events & Fallbacks)
 *
 * Events, die wir verstehen:
 *  - 'cb:registry-ready'   → Registry ist initialisiert
 *  - 'cb:game-start'       → Spielstart (zur Sicherheit)
 *  - 'ui:build:open'       → Menü öffnen (neuer Stil)
 *  - 'cb:build-open'       → Menü öffnen (älterer Stil)
 *  - 'cb:build-close'      → Menü schließen
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[ui-build]';
  const LOG  = (...a) => console.log(TAG, ...a);
  const WARN = (...a) => console.warn(TAG, ...a);
  const ERR  = (...a) => console.error(TAG, ...a);

  // ---------- Helper --------------------------------------------------------
  function getRegistry() {
    // Tolerant alle Varianten durchprobieren
    const r =
      (window.EntitiesRegistry && typeof window.EntitiesRegistry.getAll === 'function' && window.EntitiesRegistry) ||
      (window.BuildRegistry    && typeof window.BuildRegistry.getAll    === 'function' && window.BuildRegistry)    ||
      (window.Registry         && typeof window.Registry.getAll         === 'function' && window.Registry)         ||
      null;
    return r;
  }

  function byId(id) { return document.getElementById(id); }

  function ensurePanel() {
    let panel = byId('build-panel');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'build-panel';
    panel.className = 'build-panel';

    panel.innerHTML = `
      <div class="build-panel__head">
        <h2 class="build-panel__title">Bauen</h2>
        <button class="build-panel__close" aria-label="Schließen" title="Schließen">✕</button>
      </div>
      <div class="build-panel__body" id="build-body">
        <div class="build-empty" id="build-empty">Lädt&nbsp;…</div>
      </div>
    `;

    document.body.appendChild(panel);
    panel.querySelector('.build-panel__close').addEventListener('click', close);
    return panel;
  }

  function clearBody() {
    const body = byId('build-body');
    if (body) body.innerHTML = '';
  }

  function createSection(title) {
    const sec = document.createElement('section');
    sec.className = 'build-sec';

    const h = document.createElement('h3');
    h.className = 'build-sec__title';
    h.textContent = title;

    const grid = document.createElement('div');
    grid.className = 'build-grid';

    sec.appendChild(h);
    sec.appendChild(grid);
    return { sec, grid };
  }

  function createCard(item) {
    const card = document.createElement('button');
    card.className = 'build-card';
    card.type = 'button';
    card.dataset.key = item.key;

    // Bild
    const imgWrap = document.createElement('div');
    imgWrap.className = 'build-card__imgwrap';
    const img = document.createElement('img');
    img.className = 'build-card__img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = item.title || item.key;
    img.src = item.icon || item.sprite || item.preview || 'assets/placeholder64.png';
    imgWrap.appendChild(img);

    // Label
    const label = document.createElement('div');
    label.className = 'build-card__label';
    label.textContent = item.title || item.key;

    card.appendChild(imgWrap);
    card.appendChild(label);

    // Klick → Build-Action auslösen (legacy & modern)
    card.addEventListener('click', () => {
      try {
        const actionKey = item.action || item.key;
        // Moderner Event-Weg
        const ev = new CustomEvent('ui:build:select', { detail: { key: actionKey, item }});
        window.dispatchEvent(ev);
        // Legacy-Bridge (falls vorhanden)
        if (window.UIBridge && typeof window.UIBridge.onBuildSelect === 'function') {
          window.UIBridge.onBuildSelect(actionKey, item);
        }
        LOG('Build-Item gewählt:', actionKey);
        close();
      } catch (e) {
        ERR('Build-Select Fehler', e);
      }
    });

    return card;
  }

  // ---------- Datenaufbereitung --------------------------------------------
  function normalizeEntries(raw) {
    // erwartete Shape aus Registry.getAll():
    // { categories: [{id, title, order}], items: [{key,title,category,icon/sprite/preview,order}], version }
    // Toleranzen: category kann id oder name sein; icon/sprite/preview – wir nehmen die 1. gefüllte.
    const categories = (raw && raw.categories) ? [...raw.categories] : [];
    const items      = (raw && raw.items)      ? [...raw.items]      : [];

    // Fallback-Sortierungen
    categories.sort((a,b) => (a.order ?? 999) - (b.order ?? 999));
    items.sort((a,b) => (a.order ?? 999) - (b.order ?? 999));

    // Map nach Kategorie
    const byCat = new Map();
    for (const c of categories) {
      const id = c.id || c.key || c.name;
      if (!id) continue;
      byCat.set(id, { meta: c, items: [] });
    }
    for (const it of items) {
      const catId = it.category || it.cat || it.group || 'misc';
      if (!byCat.has(catId)) {
        byCat.set(catId, { meta: { id: catId, title: catId, order: 999 }, items: [] });
      }
      byCat.get(catId).items.push(it);
    }
    // Items innerhalb der Kategorie sortieren
    for (const c of byCat.values()) {
      c.items.sort((a,b) => (a.order ?? 999) - (b.order ?? 999));
    }

    return byCat;
  }

  // ---------- Rendering -----------------------------------------------------
  function renderMenu() {
    const panel = ensurePanel();
    const body  = byId('build-body');
    if (!body) return;

    body.innerHTML = ''; // clear

    const reg = getRegistry();
    if (!reg) {
      body.innerHTML = `<div class="build-empty">Keine Baueinträge gefunden.</div>`;
      WARN('Keine Registry im Window gefunden.');
      return;
    }

    let data;
    try {
      data = reg.getAll ? reg.getAll() : null;
    } catch (e) {
      ERR('Registry.getAll() wirft Fehler:', e);
    }

    if (!data || !data.items || data.items.length === 0) {
      body.innerHTML = `<div class="build-empty">Keine Baueinträge gefunden.</div>`;
      WARN('Keine Items in Registry gefunden – Menü leer.', data);
      return;
    }

    const byCat = normalizeEntries(data);
    let catCount = 0, btnCount = 0;

    for (const [catId, pack] of byCat) {
      if (!pack || !pack.items || pack.items.length === 0) continue;
      const title = pack.meta?.title || catId;

      const { sec, grid } = createSection(title);
      for (const it of pack.items) {
        const card = createCard(it);
        grid.appendChild(card);
        btnCount++;
      }
      body.appendChild(sec);
      catCount++;
    }

    LOG(`geladen (v17.9.13) – Kategorien: ${catCount} , Buttons: ${btnCount}`);
  }

  // ---------- Open/Close/Retry ---------------------------------------------
  let retryTimer = 0;
  let tries = 0;

  function open() {
    const panel = ensurePanel();
    panel.classList.add('is-open');
    scheduleRender();
  }

  function close() {
    const panel = byId('build-panel');
    if (panel) panel.classList.remove('is-open');
  }

  function scheduleRender() {
    clearTimeout(retryTimer);
    const reg = getRegistry();

    if (reg && reg.getAll) {
      const data = reg.getAll();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        tries = 0;
        renderMenu();
        return;
      }
    }

    // Retry mit Backoff
    tries++;
    const delay = Math.min(2000, 100 + tries * 150);
    const body = byId('build-body');
    if (body && !body.querySelector('.build-empty')) {
      body.innerHTML = `<div class="build-empty">Lädt&nbsp;…</div>`;
    }
    retryTimer = setTimeout(scheduleRender, delay);
  }

  // ---------- Event-Wiring --------------------------------------------------
  window.addEventListener('cb:registry-ready', scheduleRender);
  window.addEventListener('cb:game-start', scheduleRender);

  // Öffnen/schließen – wir unterstützen beide Welten
  window.addEventListener('ui:build:open', open);
  window.addEventListener('cb:build-open', open);
  window.addEventListener('cb:build-close', close);

  // Falls eine Bridge uns direkt benutzen möchte:
  window.UIBuild = Object.assign((window.UIBuild || {}), { open, close, refresh: scheduleRender });

  // Initial-Log
  LOG('bereit (v17.9.13)');

  // Optional: sofort rendern, wenn Registry schon da ist (Hot-Reload-Fall)
  if (getRegistry()) scheduleRender();
})();
