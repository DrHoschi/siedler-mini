/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v19.1.0
 * Zweck   : Build-Dock (öffnen/schließen) + Rendering aus Registry
 * Events  : listen -> cb:registry-ready, cb:build:open, cb:build:close
 *           emit   -> cb:build:select { id }, cb:build:cancel
 * Leitlinien:
 *   - KEIN Fallback: Es werden ausschließlich die Daten aus Registry gerendert.
 *   - Kategorien → Gruppen; Items zeigen Kosten inkl. 0 (HQ sichtbar)
 *   - Selektion bekommt .is-selected; externes cb:build:select synchronisiert
 *   - Dock öffnet nur auf Event (Button unten links), nicht automatisch
 * ========================================================================== */

(() => {
  const MOD='ui-build';
  const log  = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);
  const warn = (...a)=>(window.CBLog?.warn||console.warn)(`[${MOD}]`,...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const dock = document.getElementById('build-dock');
  if (!dock) { warn('#build-dock fehlt'); return; }

  // Grundgerüst (Header + Container)
  dock.innerHTML = `
    <div class="wrap" role="region" aria-label="Baumenü">
      <div class="build-head">
        <div class="build-actions" style="text-align:right">
          <button id="btn-build-close" class="btn ghost" aria-label="Baumenü schließen">Schließen</button>
        </div>
      </div>
      <div id="build-root"></div>
    </div>`;
  dock.setAttribute('hidden','');
  dock.querySelector('#btn-build-close').addEventListener('click', () => EVT('cb:build:close', { reason:'user' }));

  let selectedId = null;

  // View aus Registry aufbereiten (ohne Fallback)
  function fetchView(){
    const reg = window.Registry;
    if (!reg?.list){
      warn('Registry.list nicht verfügbar – keine Daten.');
      return { cats:[], groups:[] };
    }

    const cats = reg.list('category').map(c => ({
      id: String(c.id),
      label: String(c.label ?? c.id)
    }));

    const bmap = reg.list('building').map(b => ({
      id   : String(b.id),
      cat  : String(b.cat ?? b.category ?? 'misc'),
      label: String(b.label ?? b.name ?? b.id),
      icon : b.icon || `assets/icons/${b.id}.png`,
      cost : {
        wood : b.cost?.wood  ?? 0,
        stone: b.cost?.stone ?? 0,
        gold : b.cost?.gold  ?? 0
      }
    }));

    // nach Kategorien gruppieren (nur vorhandene Kategorien zeigen)
    const groups = cats.map(cat => ({
      cat,
      items: bmap.filter(b => b.cat === cat.id)
    })).filter(g => g.items.length);

    return { cats, groups };
  }

  function render(){
    const { groups } = fetchView();
    const root = dock.querySelector('#build-root');
    root.innerHTML = '';

    if (!groups.length){
      const em = document.createElement('em');
      em.textContent = 'Keine Baueinträge gefunden. Prüfe data/buildings.json und Registry.';
      em.style.opacity = '.8';
      root.appendChild(em);
      return;
    }

    // Gruppe je Kategorie
    groups.forEach(g => {
      const catWrap = document.createElement('div');
      catWrap.className = 'build-cat';

      catWrap.innerHTML = `
        <div class="build-header">
          <h3 class="build-title">${g.cat.label}</h3>
        </div>
        <div class="build-list"></div>
      `;

      const list = catWrap.querySelector('.build-list');
      g.items.forEach(b => {
        const li = document.createElement('div');
        li.className = 'build-item';
        li.dataset.id = b.id;
        li.innerHTML = `
          <img src="${b.icon}" alt="${b.label}">
          <div class="label">${b.label}</div>
          <small>[Holz:${b.cost.wood} Stein:${b.cost.stone}${b.cost.gold?` Gold:${b.cost.gold}`:''}]</small>
        `;
        if (b.id === selectedId) li.classList.add('is-selected');

        li.addEventListener('click', () => {
          selectedId = b.id;
          root.querySelectorAll('.build-item').forEach(x=>x.classList.remove('is-selected'));
          li.classList.add('is-selected');
          EVT('cb:build:select', { id: b.id });
        });

        list.appendChild(li);
      });

      root.appendChild(catWrap);
    });

    log('Baumenü gerendert');
  }

  function open(){ dock.removeAttribute('hidden'); document.body.classList.add('has-build-open'); }
  function close(){ dock.setAttribute('hidden','');  document.body.classList.remove('has-build-open'); }

  // Öffnen/Schließen via Events (Button unten links feuert diese)
  window.addEventListener('cb:build:open',  open);
  window.addEventListener('cb:build:close', close);

  // Erst rendern, wenn Registry bereit
  window.addEventListener('cb:registry-ready', render);
  window.addEventListener('cb:registry:ready', render); // Alias-Support

  // Auswahl von außen (Hotkey etc.) → Markierung nachziehen
  window.addEventListener('cb:build:select', (e) => {
    const id = String(e?.detail?.id || '');
    if (!id) return;
    selectedId = id;
    const root = dock.querySelector('#build-root');
    root?.querySelectorAll('.build-item').forEach(x=>{
      x.classList.toggle('is-selected', x.dataset.id === id);
    });
  });

  log('ui-build geladen (ohne Fallback, Registry-only)');
})();
