/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v1.1.0 (2025-10-04)
 * Zweck   : Ressourcen-HUD oben; erzeugt DOM bei Bedarf, reagiert robust auf
 *           Engine-Events (Production/Carrier) und summiert bei Bedarf die
 *           Bestände aus der Welt (HQ + Gebäude).
 *
 * Events  : listen  -> cb:ui-ready, cb:game-start, cb:res:change
 *           emit    -> cb:hud-ready
 *
 * Kompatibilität:
 * - Unterstützt neue Events aus Production/Carrier:
 *   detail = { res:'res.wood'|'res.stone'|'res.fish', delta:+/-N }
 * - Unterstützt alte Variante:
 *   detail = { key:'wood'|'stone'|'fish'|'food'|'gold'|'pop', value:Number }
 * - Unterstützt Bulk:
 *   detail = { all: { wood:..., stone:..., fish:..., ... } }
 *
 * Anzeige:
 * - Standardmäßig Holz, Stein, Fisch, (optional Food/Gold/Pop wenn geliefert).
 * - Icon-Pfade können später zentralisiert werden; hier Default-Pfade.
 * ========================================================================== */
(() => {
  const MOD = 'ui-hud';
  const log  = (...a)=>(window.CBLog?.ok  || console.log) (`[${MOD}]`,...a);
  const warn = (...a)=>(window.CBLog?.warn|| console.warn)(`[${MOD}]`,...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const $    = (s, r=document)=>r.querySelector(s);

  // ---------------------------------------------------------------------------
  // Ressourcen-Definition (UI-Schicht)
  // keys ohne "res."-Präfix sind reine HUD-Keys. Engine nutzt "res.*".
  // Du kannst Icons jederzeit austauschen (Dateien liegen bereits im Projekt).
  // ---------------------------------------------------------------------------
  const RES_LIST = [
    { id:'wood',  label:'Holz',   icon:'assets/icons/resources/wood.png'  },
    { id:'stone', label:'Stein',  icon:'assets/icons/resources/stone.png' },
    { id:'fish',  label:'Fisch',  icon:'assets/icons/resources/fish.png'  },
    // Optional – werden nur aktualisiert, wenn Events/Bestände geliefert werden:
    { id:'food',  label:'Nahrung',icon:'assets/icons/resources/food.png'  },
    { id:'gold',  label:'Gold',   icon:'assets/icons/resources/gold.png'  },
    { id:'pop',   label:'Bev.',   icon:'assets/icons/resources/pop.png'   }
  ];

  // Mapping Engine-IDs → HUD-IDs
  // (Damit ist es egal, ob die Engine "res.stone" sagt – im HUD heißt es "stone")
  const RES_ENGINE_TO_HUD = {
    'res.wood' : 'wood',
    'res.stone': 'stone',
    'res.fish' : 'fish',
    'res.food' : 'food',
    'res.gold' : 'gold',
    'res.pop'  : 'pop'
  };

  // interner Zustand (Werte als HUD-Keys)
  const state = { values:Object.create(null), ready:false, shown:false };

  // ---------------------------------------------------------------------------
  // DOM-Erzeugung
  // ---------------------------------------------------------------------------
  function ensureContainer(){
    let hud = $('#hud-top');
    if (!hud){
      hud = document.createElement('div');
      hud.id = 'hud-top';
      hud.className = 'ui-panel hidden'; // bleibt bis Spielstart versteckt
      document.body.appendChild(hud);
    }
    // Grundstruktur neu aufbauen (stabiler gegenüber späteren Layout-Änderungen)
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
      ic.src = r.icon;             // Pfade zu assets/icons/resources/*.png
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
      // Startwert nur initialisieren, nicht erzwingen (0 als Default)
      if (typeof state.values[r.id] !== 'number') state.values[r.id] = 0;
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
    } else {
      hud.classList.add('hidden');
      state.shown = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Welt-Scanner (summiert Bestände aus HQ + allen Gebäuden)
  // Damit bleiben die Zähler immer korrekt – auch wenn deltas mal verpasst werden.
  // ---------------------------------------------------------------------------
  function worldSum(resEngineId){
    const world = window.Game?.world || {};
    let sum = 0;
    const B = Array.isArray(world.buildings) ? world.buildings : [];
    for (const b of B){ sum += (b.stock?.[resEngineId] || 0); }
    // HQ kann als eigenes Objekt oder als Gebäude in B existieren – doppelt zählen vermeiden:
    const HQ = world.hq;
    if (HQ && !B.includes(HQ)) sum += (HQ.stock?.[resEngineId] || 0);
    return sum;
  }

  function recalcAllFromWorld(){
    // nur für Ressourcen, die wir im HUD anzeigen
    for (const [eng, hud] of Object.entries(RES_ENGINE_TO_HUD)){
      if (!$(`.hud-stat[data-res="${hud}"]`)) continue; // HUD hat evtl. nicht alle Felder sichtbar
      // Fisch/Holz/Stein etc.
      const total = worldSum(eng);
      setVal(hud, total);
    }
  }

  // ---------------------------------------------------------------------------
  // Werte-Update im HUD
  // ---------------------------------------------------------------------------
  function setVal(hudKey, value){
    if (!state.ready) ensureContainer();
    if (typeof value !== 'number') return;
    state.values[hudKey] = value;
    const cell = $(`.hud-stat[data-res="${hudKey}"]`);
    if (cell){
      const val = $('.val', cell);
      if (val) val.textContent = String(value|0);
    }
  }

  function addDelta(hudKey, delta){
    const next = (state.values[hudKey] || 0) + (delta|0);
    setVal(hudKey, next);
  }

  function updateAll(mapHUD){
    if (!state.ready) ensureContainer();
    for(const [k,v] of Object.entries(mapHUD||{})){
      if (typeof v === 'number') setVal(k, v);
    }
  }

  // ---------------------------------------------------------------------------
  // Event-Wiring
  // ---------------------------------------------------------------------------
  // UI bereit -> DOM anlegen (noch nicht zeigen)
  window.addEventListener('cb:ui-ready', ()=>{
    ensureContainer();
    setVisible(false);
  });

  // Spielstart -> HUD sichtbar & initiale Summen aus der Welt
  window.addEventListener('cb:game-start', ()=>{
    ensureContainer();
    setVisible(true);
    recalcAllFromWorld(); // initiale Werte aus Weltzustand
  });

  // Ressourcenänderungen aus Engine/Spiel
  window.addEventListener('cb:res:change', (ev)=>{
    const d = ev?.detail||{};

    // 1) Neue Engine-Variante: { res:'res.xxx', delta:+/-N }
    if (typeof d.res === 'string' && typeof d.delta === 'number'){
      const hudKey = RES_ENGINE_TO_HUD[d.res];
      if (hudKey){
        // Sicherheit geht vor: wir re-summieren statt nur delta aufzuschlagen
        // (verhindert Drift bei verpassten Events)
        const total = worldSum(d.res);
        setVal(hudKey, total);
        return;
      }
    }

    // 2) Bulk: { all: { wood:..., stone:..., fish:..., ... } }
    if (d.all && typeof d.all === 'object'){
      updateAll(d.all);
      return;
    }

    // 3) Alte Variante: { key:'wood'|..., value:Number }
    if (d.key != null && typeof d.value === 'number'){
      setVal(String(d.key), d.value);
      return;
    }
  });

  // Sofort Grundgerüst bauen (falls Script nach Spielstart nachgeladen wird)
  document.readyState !== 'loading'
    ? ensureContainer()
    : document.addEventListener('DOMContentLoaded', ensureContainer);
})();
