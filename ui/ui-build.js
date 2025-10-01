/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v2.1.0 (2025-10-01)
 * Zweck   : Build-Dock UI + API (window.UIBuild)
 * API     :
 *   UIBuild.mount(host?)                  -> Mount in <aside id="build-panel">
 *   UIBuild.setCategories(cats[])         -> [{id,label}]
 *   UIBuild.setItems(items[])             -> [{id,cat,label,icon,cost,enabled}]
 *   UIBuild.setIconsBase(base | base[])   -> "assets/ui/build/" ODER ["a/","b/"]
 *   UIBuild.rerender()                    -> UI neu zeichnen
 *   UIBuild.open() / UIBuild.close()      -> Dock sichtbar/unsichtbar
 *
 * Hinweise:
 * - Icons: relative Namen (z.B. "holzfaeller") werden mit setIconsBase() kombiniert.
 *          Absolut-URLs oder data:-URIs werden unverändert benutzt.
 * - Dieses Modul mountet NICHT automatisch beim Laden, sondern nur auf
 *   UIBuild.mount() und öffnet standardmäßig erst auf cb:game-start.
 * ========================================================================== */
(function(){
  'use strict';

  // -- Logging ---------------------------------------------------------------
  const LOG = (window.CBLog && CBLog.info) ? CBLog : console;

  // -- Interner Zustand ------------------------------------------------------
  let host = null;                  // Mount-Host (z.B. <aside id="build-panel">)
  let cats = [];                    // Kategorien [{id,label}]
  let items = [];                   // Items      [{id,cat,label,icon,cost,enabled}]
  let activeCat  = null;            // aktuelle Kategorie-ID
  let activeItem = null;            // aktuell markiertes Item (ID)

  // Icon-Basis: erlaubt 1 oder mehrere Pfade; wird über setIconsBase() gepflegt
  let iconBases = ['assets/icons/buildings/'];

  // Shorthands
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  // ==========================================================================
  // 1) Grundgerüst (Markup) sicherstellen
  // ==========================================================================
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

    // Dock (Hintergrund) sichtbar schalten
    const dock = document.getElementById('build-dock');
    if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }

    // Panel selbst sichtbar
    host.hidden = false;
    host.classList.remove('hidden');

    return { cats: $('#build-cats', host), items: $('#build-items', host) };
  }

  // ==========================================================================
  // 2) Fallback-Daten direkt aus Registry (falls Bridge noch nicht lieferte)
  // ==========================================================================
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

  // ==========================================================================
  // 3) Icons: Basen setzen & Pfade auflösen
  // ==========================================================================
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

  // Liefert den finalen Icon-URL-String (ohne Existenz-Check)
  function iconSrcFor(item){
    const raw = item?.icon || item?.iconId || item?.iconPath || '';
    if (!raw) return '';                       // kein Icon hinterlegt
    if (isAbsoluteUrl(raw)) return raw;        // bereits absolut/ data:

    // Dateiendung ergänzen, wenn nötig
    let name = String(raw);
    if (!/\.(png|webp|jpg|jpeg|svg)$/i.test(name)) name += '.png';

    // Mehrere Basen erlauben – wir nutzen die erste
    const base = iconBases[0] || '';
    return base + name;
  }

  // ==========================================================================
  // 4) Render-Helfer
  // ==========================================================================
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

  // ==========================================================================
  // 5) Render: Kategorien & Items
  // ==========================================================================
  function renderCats(catRoot){
    catRoot.innerHTML = '';

    cats.forEach((c, idx) => {
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.dataset.cat = c.id;
      li.textContent = c.label;

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
      icon.src = iconSrcFor(b); // <-- hier wird aus iconBases + item.icon gebaut

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

  // ==========================================================================
  // 6) Vollständiger Re-Render
  // ==========================================================================
  function rerender(){
    const els = ensureScaffold();
    if (!els) return;

    // Fallback-Daten, wenn noch nichts angekommen ist
    if (!cats.length || !items.length){
      const { rc, ri } = fallbackFromRegistry();
      if (!cats.length)  cats  = rc;
      if (!items.length) items = ri;
    }

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

  // ==========================================================================
  // 7) Öffentliche API
  // ==========================================================================
  window.UIBuild = {
    // Host mounten (optional el übergeben)
    mount(el){
      host = el || document.getElementById('build-panel');
      LOG.info('[ui-build] mount ok');
      // Beim Mount noch nicht zwingend öffnen – nur strukturieren
      ensureScaffold();
    },

    setCategories(nextCats){
      cats = (Array.isArray(nextCats) ? nextCats : []).map(c => ({
        id: String(c.id),
        label: String(c.label ?? c.id)
      }));
      // activeCat korrigieren
      if (!cats.find(c => c.id === activeCat)){
        activeCat = cats[0]?.id || null;
      }
    },

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

    // Akzeptiert String ODER Array von Strings
    setIconsBase(next){
      iconBases = normalizeBases(next);
    },

    rerender,

    open(){
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }
      if (host){ host.hidden = false; host.classList.remove('hidden'); }
      rerender();
    },

    close(){
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = true; dock.classList.add('hidden'); }
      if (host){ host.hidden = true; host.classList.add('hidden'); }
    }
  };

  // ==========================================================================
  // 8) Lifecycle-Hooks (sichtbar erst im Spiel)
  //    -> Öffnen erst bei Spielstart. Registry-Events triggern nur Re-Render.
  // ==========================================================================
  window.addEventListener('cb:registry-ready',  () => { UIBuild.rerender(); });
  window.addEventListener('cb:registry:ready',  () => { UIBuild.rerender(); });

  window.addEventListener('cb:game-start', () => {
    // beim ersten Start automatisch mounten, falls noch nicht passiert
    if (!host) UIBuild.mount(document.getElementById('build-panel'));
    UIBuild.open();
  });

  // Safety: falls die Bridge später kommt, Mount minimal vorbereiten
  setTimeout(() => {
    if (!host) UIBuild.mount(document.getElementById('build-panel'));
  }, 0);
})();
