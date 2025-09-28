// ============================================================================
// Datei : ui/ui-build.js
// Zweck : Baumenü rendern (Kategorien → Items) und Auswahl senden
// Events: hört   auf cb:registry-ready (und cb:registry:ready alias)
//         sendet cb:build:select  { id }  beim Klick auf ein Gebäude
// Hinweise:
//   • Kein globaler STATE – nur lokaler Status (activeCat, activeItem).
//   • Robustes Mounting: erzeugt #build-cats / #build-items bei Bedarf.
//   • Nutzt optional window.BuildBridge.view() (falls vorhanden), sonst direkt Registry.
// ============================================================================

(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[ui-build]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[ui-build]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // ---- DOM helpers ----------------------------------------------------------
  const q  = (sel) => document.querySelector(sel);
  function ensureLists() {
    const dock = q('#build-dock');
    if (!dock) { warn('Container #build-dock fehlt – index.html prüfen'); return null; }
    // Falls noch leer: Grundgerüst erzeugen
    if (!dock.querySelector('#build-cats')) {
      const h2 = dock.querySelector('h2') || Object.assign(document.createElement('h2'), {textContent:'Baumenü'});
      const cats = Object.assign(document.createElement('ul'), { id:'build-cats', className:'build-cats' });
      const sep  = document.createElement('hr');
      const items= Object.assign(document.createElement('ul'), { id:'build-items', className:'build-items' });
      dock.append(h2, cats, sep, items);
    }
    return {
      cats : dock.querySelector('#build-cats'),
      items: dock.querySelector('#build-items'),
    };
  }

  // ---- Datenquelle (Registry → ViewModel) ----------------------------------
  function readData() {
    // Falls eine Bridge vorhanden ist, nutzen wir sie (kann Labels/Kosten aufbereiten)
    if (window.BuildBridge?.view) return window.BuildBridge.view();

    const cats = (Registry.get('categories') || []).map(c => ({
      id   : String(c.id),
      label: String(c.label ?? c.id)
    }));

    const bld = (Registry.get('buildings') || []).map(b => ({
      id   : String(b.id),
      cat  : String(b.cat ?? 'misc'),
      label: String(b.label ?? b.id),
      icon : b.icon || '',        // Registry.normalisiert icon bereits (falls gesetzt)
      cost : b.cost || null       // { wood, stone, gold } optional
    }));

    return { cats, buildings: bld };
  }

  // ---- Render-State ---------------------------------------------------------
  let activeCat  = null;
  let activeItem = null;

  function renderCats(root, cats) {
    root.innerHTML = '';
    cats.forEach((c, idx) => {
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.dataset.cat = c.id;
      li.textContent = c.label;
      if (!activeCat && idx === 0) activeCat = c.id;
      if (c.id === activeCat) li.classList.add('active');
      li.addEventListener('click', () => {
        activeCat = c.id;
        activeItem = null;
        highlightCats(root);
        renderItems(q('#build-items'), readData().buildings);
      });
      root.appendChild(li);
    });
  }

  function highlightCats(root) {
    root.querySelectorAll('li').forEach(li => {
      li.classList.toggle('active', li.dataset.cat === activeCat);
    });
  }

  function renderItems(root, buildings) {
    root.innerHTML = '';
    const list = buildings.filter(b => b.cat === activeCat);
    list.forEach(b => {
      const li = document.createElement('li');
      li.className = 'build-item';
      li.dataset.id = b.id;

      // Icon (falls vorhanden)
      if (b.icon) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = b.icon;
        img.alt = b.label;
        img.width = 20; img.height = 20;
        img.style.verticalAlign = 'middle';
        img.style.marginRight = '6px';
        li.appendChild(img);
      }

      // Label + Kosten
      const text = document.createElement('span');
      text.textContent = b.label;
      li.appendChild(text);

      if (b.cost) {
        const small = document.createElement('small');
        const w = +b.cost.wood  || 0;
        const s = +b.cost.stone || 0;
        const g = +b.cost.gold  || 0;
        small.textContent = `  [Holz:${w} Stein:${s}${g ? ' Gold:'+g : ''}]`;
        small.style.opacity = .75;
        small.style.marginLeft = '6px';
        li.appendChild(small);
      }

      if (b.id === activeItem) li.classList.add('active');

      li.addEventListener('click', () => {
        // Auswahl markieren
        activeItem = b.id;
        root.querySelectorAll('li').forEach(x => x.classList.remove('active'));
        li.classList.add('active');

        // Event nach außen: Game/UI kann darauf reagieren (Platzierung, Ghost, etc.)
        EVT('cb:build:select', { id: b.id });
        log('select', b.id);
      });

      root.appendChild(li);
    });

    // Keine Items? Kurzer Hinweis.
    if (!root.children.length) {
      const em = document.createElement('em');
      em.textContent = 'Keine Einträge in dieser Kategorie.';
      em.style.opacity = .7;
      root.appendChild(em);
    }
  }

  // ---- Boot-Wiring ----------------------------------------------------------
  function mount() {
    const lists = ensureLists();
    if (!lists) return;

    const { cats, buildings } = readData();
    if (!cats.length) { warn('keine Kategorien'); return; }

    renderCats(lists.cats, cats);
    renderItems(lists.items, buildings);
    log('gerendert');
  }

  // Registry bereit? Dann mounten. (Beide Event-Varianten akzeptieren)
  window.addEventListener('cb:registry-ready', mount);
  window.addEventListener('cb:registry:ready', mount);
})();
