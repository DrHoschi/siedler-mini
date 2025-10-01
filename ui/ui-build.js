/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v2.1.1 (2025-10-01)
 * Zweck   : Build-Dock UI + API (window.UIBuild)
 *
 * Öffentliche API (window.UIBuild):
 *   - mount(host?)                 // in <aside id="build-panel"> montieren
 *   - setCategories(cats[])        // [{id,label}]
 *   - setItems(items[])            // [{id,cat,label,icon,cost,enabled}]
 *   - setIconsBase(base | base[])  // "assets/ui/build/" ODER ["a/","b/"]
 *   - rerender()                   // UI neu zeichnen
 *   - open() / close()             // Dock sichtbar/unsichtbar
 *
 * Daten-Modelle:
 *   categories[] = { id, label }
 *   items[]      = { id, cat, label, icon, cost, enabled }
 *
 * Hinweise:
 *   - Icons: relative Namen (z.B. "hq" oder "hq.png") werden mit iconsBase
 *     kombiniert. Absolut-URLs (http(s)://), Root-Pfade (/…), oder data:-URIs
 *     werden unverändert benutzt.
 *   - Dieses Modul öffnet das Dock standardmäßig erst bei cb:game-start.
 * ========================================================================== */

(function(){
  'use strict';

  // --------------------------------------------------------------------------
  // Logging
  // --------------------------------------------------------------------------
  const LOG = (window.CBLog && CBLog.info) ? CBLog : console;

  // --------------------------------------------------------------------------
  // Interner Zustand
  // --------------------------------------------------------------------------
  let host = null;            // Mount-Host (z.B. <aside id="build-panel">)
  let cats = [];              // Kategorien [{id,label}]
  let items = [];             // Items      [{id,cat,label,icon,cost,enabled}]
  let activeCat  = null;      // aktuelle Kategorie-ID
  let activeItem = null;      // aktuell markiertes Item (ID)

  // Icons-Basis (ein oder mehrere Pfade; final immer mit Slash)
  let iconBases = ['assets/icons/buildings/'];

  // Shorthands
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  // --------------------------------------------------------------------------
  // 1) Grundgerüst (Markup) sicherstellen
  // --------------------------------------------------------------------------
  function ensureScaffold(){
    if (!host) return null;

    if (!host.querySelector('.ui-build-wrap')){
      host.innerHTML = '';

      const wrap  = document.createElement('div');
      wrap.className = 'ui-build-wrap';

      const catsU = document.createElement('ul');
      catsU.id = 'build-cats';
      catsU.className = 'build-cats';

      const listU = document.createElement('ul');
      listU.id = 'build-items';
      listU.className = 'build-list';

      wrap.append(catsU, listU);
      host.appendChild(wrap);
    }

    // Dock-Hintergrund sichtbar schalten
    const dock = document.getElementById('build-dock');
    if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }

    // Panel selbst sichtbar
    host.hidden = false;
    host.classList.remove('hidden');

    return { cats: $('#build-cats', host), items: $('#build-items', host) };
  }

  // --------------------------------------------------------------------------
  // 2) Fallback-Daten aus der Registry (wenn Bridge noch nichts gesetzt hat)
  // --------------------------------------------------------------------------
  function fallbackFromRegistry(){
    const rc = (window.Registry?.get?.('categories') || []).map(c => ({
      id: String(c.id),
      label: String(c.label ?? c.id)
    }));

    const ri = (window.Registry?.get?.('buildings') || []).map(b => ({
      id: String(b.id),
      cat: String(b.cat ?? b.category ?? 'misc'),
      label: String(b.label ?? b.name ?? b.id),
      icon: (b.icon || b.sprite || ''),   // relativer Name oder kompletter Pfad
      cost: (b.cost || null),
      enabled: (b.enabled !== false)
    }));

    return { rc, ri };
  }

  // --------------------------------------------------------------------------
  // 3) Icons: Basen setzen & Pfad-Resolver
  // --------------------------------------------------------------------------
  function normalizeBases(next){
    if (!next) return iconBases;
    const arr = Array.isArray(next) ? next : [next];
    return arr
      .filter(v => typeof v === 'string' && v.trim().length)
      .map(v => v.replace(/\/+$/,'') + '/');
  }

  function isAbsoluteUrl(str){
    return /^(https?:)?\/\//i.test(str) || /^data:/i.test(str) || str.startsWith('/');
  }

  /** iconsBase ggf. aus Registry ziehen (z.B. aus data/buildings.json) */
  function adoptIconsBaseFromRegistry(){
    try{
      const base = window.Registry?.get?.('iconsBase');
      if (base){
        iconBases = normalizeBases(base);
        LOG.info('[ui-build] iconsBase von Registry →', iconBases.join(', '));
      }
    } catch(e){ /* noop */ }
  }

  /** Liefert finalen Icon-Pfad-String (ohne Netz-Existenz-Check) */
  function iconSrcFor(item){
    const raw = item?.icon || item?.iconId || item?.iconPath || '';
    if (!raw) return '';                  // kein Icon hinterlegt
    if (isAbsoluteUrl(raw)) return raw;   // bereits absolut/ data:/ Rootpfad

    // Dateiendung ergänzen, wenn fehlt
    let name = String(raw);
    if (!/\.(png|webp|jpg|jpeg|svg)$/i.test(name)) name += '.png';

    // Mehrere Basen möglich – wir nehmen die erste
    const base = iconBases[0] || '';
    return base + name;
  }

  // --------------------------------------------------------------------------
  // 4) Render-Helfer
  // --------------------------------------------------------------------------
  function applyCatHighlight(catRoot){
    $$('.build-cat', catRoot).forEach(li =>
      li.classList.toggle('active', li.dataset.cat === activeCat)
    );
  }

  function applyItemHighlight(itemRoot){
    $$('.build-item', itemRoot).forEach(li => {
      const on = li.dataset.id === activeItem;
      li.classList.toggle('active', on);
      li.classList.toggle('is-selected', on);
    });
  }

  function resBadge(key, amount){
    if (!amount) return null;
    const span = document.createElement('span');
    span.className = 'res';
    span.setAttribute('data-res', key);
    const b = document.createElement('b');
    b.textContent = String(amount);
    span.appendChild(b);
    return span;
  }

  // --------------------------------------------------------------------------
  // 5) Render: Kategorien & Items
  // --------------------------------------------------------------------------
  function renderCats(catRoot){
    catRoot.innerHTML = '';

    cats.forEach((c, idx) => {
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.dataset.cat = c.id;
      li.textContent = c.label;

      // erste Kategorie aktiv, falls noch keine gesetzt
      if (!activeCat && idx === 0) activeCat = c.id;

      li.addEventListener('click', () => {
        activeCat = c.id;
        applyCatHighlight(catRoot);
        renderItems($('#build-items', host));
      });

      catRoot.appendChild(li);
    });

    applyCatHighlight(catRoot);
  }

  function renderItems(itemRoot){
    itemRoot.innerHTML = '';

    // Sichtbare Items: enabled + Kategorie-Filter
    const visible = items
      .filter(b => b && b.enabled !== false)
      .filter(b => String(b.cat) === String(activeCat));

    visible.forEach(b => {
      const li = document.createElement('li');
      li.className = 'build-item';
      li.dataset.id = b.id;

      // Icon
      const icon = document.createElement('img');
      icon.className = 'icon';
      icon.alt = b.label || b.id;
      icon.decoding = 'async';
      icon.loading  = 'lazy';
      icon.src = iconSrcFor(b);  // ← Resolver kombiniert iconsBase + Name

      // Titel
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = b.label;

      // Kosten
      const cost = document.createElement('div');
      cost.className = 'cost';
      const c = b.cost || {};
      ['wood','stone','food','gold'].forEach(k => {
        const node = resBadge(k, c[k]);
        if (node) cost.appendChild(node);
      });

      li.append(icon, title, cost);

      li.addEventListener('click', () => {
        activeItem = b.id;
        applyItemHighlight(itemRoot);
        window.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: b.id }}));
      });

      itemRoot.appendChild(li);
    });

    applyItemHighlight(itemRoot);
  }

  // --------------------------------------------------------------------------
  // 6) Vollständiger Re-Render
  // --------------------------------------------------------------------------
  function rerender(){
    const els = ensureScaffold();
    if (!els) return;

    // Fallback-Daten, wenn noch nichts gesetzt wurde
    if (!cats.length || !items.length){
      const { rc, ri } = fallbackFromRegistry();
      if (!cats.length)  cats  = rc;
      if (!items.length) items = ri;
    }

    // Icons-Basis aus Registry adaptieren (falls vorhanden)
    adoptIconsBaseFromRegistry();

    if (!cats.length){
      LOG.info('[ui-build] keine Kategorien – nix zu rendern');
      els.cats.innerHTML = '';
      els.items.innerHTML = '';
      return;
    }

    // aktive Kategorie sicherstellen
    if (!cats.find(c => c.id === activeCat)){
      activeCat = cats[0]?.id || null;
    }

    renderCats(els.cats);
    renderItems(els.items);

    LOG.info('[ui-build] rerender ✓ (%d cats / %d items)', cats.length, items.length);
  }

  // --------------------------------------------------------------------------
  // 7) Öffentliche API
  // --------------------------------------------------------------------------
  window.UIBuild = {
    /** Host montieren (optional el übergeben) */
    mount(el){
      host = el || document.getElementById('build-panel');
      LOG.info('[ui-build] mount ok');
      ensureScaffold();
    },

    /** Kategorien setzen */
    setCategories(nextCats){
      cats = (Array.isArray(nextCats) ? nextCats : []).map(c => ({
        id: String(c.id),
        label: String(c.label ?? c.id)
      }));
      if (!cats.find(c => c.id === activeCat)){
        activeCat = cats[0]?.id || null;
      }
    },

    /** Items setzen */
    setItems(nextItems){
      items = (Array.isArray(nextItems) ? nextItems : []).map(b => ({
        id: String(b.id),
        cat: String(b.cat ?? b.category ?? 'misc'),
        label: String(b.label ?? b.name ?? b.id),
        icon: (b.icon || b.sprite || ''),   // nur Name oder kompletter Pfad
        cost: (b.cost || null),
        enabled: (b.enabled !== false)
      }));
    },

    /** Icons-Basis manuell setzen (String oder Array) */
    setIconsBase(next){
      iconBases = normalizeBases(next);
    },

    rerender,

    /** Dock öffnen + rendern */
    open(){
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }
      if (host){ host.hidden = false; host.classList.remove('hidden'); }
      rerender();
    },

    /** Dock schließen */
    close(){
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = true; dock.classList.add('hidden'); }
      if (host){ host.hidden = true; host.classList.add('hidden'); }
    }
  };

  // --------------------------------------------------------------------------
  // 8) Lifecycle-Hooks
  //    - Registry fertig → nur (re)rendern, iconsBase ggf. übernehmen
  //    - Spielstart      → ggf. mounten + öffnen
  // --------------------------------------------------------------------------
  window.addEventListener('cb:registry-ready',  () => { UIBuild.rerender(); });
  window.addEventListener('cb:registry:ready',  () => { UIBuild.rerender(); });

  window.addEventListener('cb:game-start', () => {
    if (!host) UIBuild.mount(document.getElementById('build-panel'));
    UIBuild.open();
  });

  // Safety: falls die Bridge später kommt, Mount minimal vorbereiten
  setTimeout(() => {
    if (!host) UIBuild.mount(document.getElementById('build-panel'));
  }, 0);
})();
