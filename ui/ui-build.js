/* ============================================================================
 * Datei : ui/ui-build.js
 * Version: v19.0.0
 * Zweck : Build-Dock (öffnen/schließen), Kategorien+Items, Auswahl → cb:build:select
 * Events: listen -> cb:registry-ready, cb:build:open, cb:build:close
 *         emit   -> cb:build:select, cb:build:cancel
 * Notizen: zeigt Kosten immer inkl. 0 (HQ!), .is-selected state; Dock bleibt zu bis geöffnet
 * Lastenheft: cb:build:* Flows.  [oai_citation:2‡Lastenheft_NeueSiedler_Vollversion v1.0.pdf](file-service://file-3LhVFNfaWzhV5CMo8PkBF7)
 * ========================================================================== */

(() => {
  const MOD='ui-build';
  const log  = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);
  const warn = (...a)=>(window.CBLog?.warn||console.warn)(`[${MOD}]`,...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const dock = document.getElementById('build-dock');
  if (!dock) { warn('#build-dock fehlt'); return; }

  // Grundgerüst
  dock.innerHTML = `<div class="wrap"><div class="build-cat"><div class="build-header">
    <h3 class="build-title">Bauen</h3>
    <div class="build-actions"><button id="btn-build-close" class="btn ghost">Schließen</button></div>
  </div><div id="build-list" class="build-list"></div></div></div>`;
  dock.setAttribute('hidden','');

  dock.querySelector('#btn-build-close').addEventListener('click', () => EVT('cb:build:close', { reason:'user' }));

  // Daten lesen
  function view(){
    // Registry → Kategorien/Buildings
    const cats = (window.Registry?.list?.('category') ?? [
      { id:'infra', label:'Infrastruktur' },
      { id:'prod',  label:'Produktion'   },
      { id:'home',  label:'Wohnen'       },
      { id:'trade', label:'Handel'       },
      { id:'mil',   label:'Militär'      },
    ]).map(c => ({ id:String(c.id), label: String(c.label??c.id)}));

    const bld = (window.Registry?.list?.('building') ?? []).map(b => ({
      id: String(b.id),
      cat: String(b.cat ?? b.category ?? 'infra'),
      label: String(b.label ?? b.name ?? b.id),
      icon: b.icon || `assets/icons/${b.id}.png`,
      cost: {
        wood:  b.cost?.wood  ?? 0,
        stone: b.cost?.stone ?? 0,
        gold:  b.cost?.gold  ?? 0
      }
    }));

    // Fallback: wenn Registry leer ist, einfache Demo-Einträge
    if (!bld.length){
      bld.push({ id:'b.hq', cat:'infra', label:'HQ', icon:'assets/icons/b.hq.png', cost:{wood:0,stone:0,gold:0} });
      bld.push({ id:'b.sawmill', cat:'prod', label:'Sägewerk', icon:'assets/icons/b.sawmill.png', cost:{wood:3,stone:1,gold:0} });
    }
    return { cats, buildings: bld };
  }

  let selectedId = null;

  function render(){
    const root = dock.querySelector('#build-list');
    const { buildings } = view();
    root.innerHTML = '';

    buildings.forEach(b => {
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

      root.appendChild(li);
    });
  }

  function open(){ dock.removeAttribute('hidden'); document.body.classList.add('has-build-open'); }
  function close(){ dock.setAttribute('hidden',''); document.body.classList.remove('has-build-open'); }

  // Events
  window.addEventListener('cb:build:open',  ()=> open());
  window.addEventListener('cb:build:close', ()=> close());
  window.addEventListener('cb:registry-ready', render);

  log('Modul geladen (v19.0.0)');
})();
