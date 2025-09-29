/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v1.0.4
 * Zweck   : Ressourcen-HUD oben; erzeugt DOM bei Bedarf, reagiert auf Events
 * Events  : listen  -> cb:game-start, cb:res:change
 *           emit    -> cb:hud-ready
 * Hinweise: Safe-Areas in CSS, HUD erst ab Spielstart sichtbar
 * ========================================================================== */
(() => {
  const MOD = 'ui-hud';
  const log  = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);
  const warn = (...a)=>(window.CBLog?.warn||console.warn)(`[${MOD}]`,...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const $    = (s, r=document)=>r.querySelector(s);

  // Ressourcen-Definition (kann später aus Registry/data/resources.json kommen)
  const RES_LIST = [
    { id:'wood',  label:'Holz',   icon:'assets/icons/wood.png'  },
    { id:'stone', label:'Stein',  icon:'assets/icons/stone.png' },
    { id:'food',  label:'Nahrung',icon:'assets/icons/food.png'  },
    { id:'gold',  label:'Gold',   icon:'assets/icons/gold.png'  },
    { id:'pop',   label:'Bev.',   icon:'assets/icons/pop.png'   }
  ];

  // interner Zustand
  const state = { values:Object.create(null), ready:false, shown:false };

  function ensureContainer(){
    // Container vorhanden? sonst erzeugen (look kommt aus ui.css + deiner ui-hud.css)
    let hud = $('#hud-top');
    if (!hud){
      hud = document.createElement('div');
      hud.id = 'hud-top';
      hud.className = 'ui-panel hidden'; // hidden bis Spielstart
      document.body.appendChild(hud);
    }
    // leeren & Grundstruktur füllen
    hud.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'hud-row res';
    hud.appendChild(row);

    // Badges/Stats rendern
    for(const r of RES_LIST){
      const el = document.createElement('div');
      el.className = 'hud-stat';
      el.dataset.res = r.id;

      const ic = document.createElement('img');
      ic.className = 'ic';
      ic.alt = r.label;
      ic.src = r.icon;             // Pfade zu assets/icons/*.png
      el.appendChild(ic);

      const val = document.createElement('span');
      val.className = 'val';
      val.textContent = '0';
      el.appendChild(val);

      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = r.label;
      el.appendChild(lbl);

      row.appendChild(el);
      state.values[r.id] ??= 0;
    }
    state.ready = true;
    EVT('cb:hud-ready',{ok:true});
    log('bereit ✓');
    return hud;
  }

  function setVisible(on){
    const hud = $('#hud-top') || ensureContainer();
    if (!hud) return;
    if (on){
      hud.classList.remove('hidden');
      hud.style.visibility = 'visible';
      hud.style.opacity = '1';
      state.shown = true;
    }else{
      hud.classList.add('hidden');
      state.shown = false;
    }
  }

  function updateAll(map){
    if (!state.ready) ensureContainer();
    for(const [k,v] of Object.entries(map||{})){
      updateOne(k, v);
    }
  }
  function updateOne(key, value){
    if (!state.ready) ensureContainer();
    if (typeof value !== 'number') return;
    state.values[key] = value;
    const cell = $(`.hud-stat[data-res="${key}"]`);
    if (cell){
      const val = $('.val', cell);
      if (val) val.textContent = String(value);
    }
  }

  // === Event-Wiring =========================================================
  // Spielstart -> HUD sichtbar & initiale Werte (falls mitgegeben)
  window.addEventListener('cb:game-start', (ev)=>{
    setVisible(true);
    // ev.detail kann Startwerte tragen; falls nicht, alles auf aktuellen state lassen
    const startRes = ev?.detail?.resources || null;
    if (startRes) updateAll(startRes);
  });

  // Ressourcenänderungen aus der Engine
  // core/game.js emittiert laut Spec cb:res:change (z. B. detail = { key, value, all })
  window.addEventListener('cb:res:change', (ev)=>{
    const d = ev?.detail||{};
    if (d.all) updateAll(d.all);
    if (d.key != null && d.value != null) updateOne(d.key, d.value);
  });

  // Fallback: Bei UI-ready die Struktur anlegen (aber noch nicht zeigen)
  window.addEventListener('cb:ui-ready', ()=>{
    ensureContainer();
    setVisible(false);
  });

  // Sofort Grundgerüst bauen (falls Script nach Spielstart nachgeladen wird)
  document.readyState !== 'loading' ? ensureContainer() : 
    document.addEventListener('DOMContentLoaded', ensureContainer);
})();
