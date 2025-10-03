// ============================================================================
// Datei : core/registry.js
// Projekt: Neue Siedler
// Version: v1.3.0 (2025-10-04)
// Zweck  : Zentrale Registry für Gebäude/Kategorien/Meta (Epoche 1)
// Events : cb:registry-ready (alias) cb:registry:ready
// Hinweise: Liest data/buildings.json (iconsBase, categories, buildings[])
//           Normalisiert Felder (id,label,cat,icon,sprite,cost,size,entrances)
// ============================================================================
(() => {
  // ---------------------------- Konstanten/Logging ---------------------------
  const LOG  = (window.CBLog?.ok   || console.log).bind(console, '[registry]');
  const WRN  = (window.CBLog?.warn || console.warn).bind(console, '[registry]');
  const ERR  = (window.CBLog?.err  || console.error).bind(console, '[registry]');
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // ---------------------------- Interner Zustand -----------------------------
  const state = {
    meta: { iconsBase: 'assets/ui/build/' },
    buildings: [],     // normalisierte Defs
    categories: []     // {id,label}
  };

  // ---------------------------- Helpers -------------------------------------
  const ensureSlash = s => (!s ? '' : s.endsWith('/') ? s : (s + '/'));
  const asInt = (n,d=0)=>Number.isFinite(+n)?(+n|0):d;
  const uniq = (arr,keyFn)=>{ const seen=new Set(); const out=[]; for(const x of arr){ const k=keyFn(x); if(!seen.has(k)){ seen.add(k); out.push(x); } } return out; };

  function normCost(cost){
    if (!cost || typeof cost!=='object') return { wood:0, stone:0, gold:0 };
    return {
      wood : asInt(cost.wood, 0),
      stone: asInt(cost.stone,0),
      gold : asInt(cost.gold, 0),
      food : asInt(cost.food, 0)
    };
  }

  function normSize(size){
    if (Array.isArray(size) && size.length===2) {
      return [Math.max(1,asInt(size[0],1)), Math.max(1,asInt(size[1],1))];
    }
    if (Number.isFinite(size)) { const s=Math.max(1,asInt(size,1)); return [s,s]; }
    return [1,1];
  }

  function normEntrances(ent){
    if (!Array.isArray(ent)) return [];
    const out=[];
    for(const e of ent){
      if (Array.isArray(e) && e.length===2) out.push([asInt(e[0],0), asInt(e[1],0)]);
      else WRN('Ungültiger entrance-Eintrag übersprungen:', e);
    }
    return out;
  }

  function normalizeBuildings(json, baseDefault){
    const base = ensureSlash(json.iconsBase || state.meta.iconsBase || baseDefault);
    state.meta.iconsBase = base;

    const list = Array.isArray(json.buildings) ? json.buildings : [];
    return list.map(b => {
      const id    = String(b.id);
      const cat   = String(b.cat ?? b.category ?? 'misc');
      const label = String(b.label ?? b.name ?? id);

      // Icon: relativer Name → mit iconsBase kombinieren; sonst direkt übernehmen
      let icon = b.icon || b.sprite || '';
      if (icon && !/^https?:|^\/|^data:/i.test(icon)) {
        if (!/\.(png|webp|jpg|jpeg|svg)$/i.test(icon)) icon += '.png';
        icon = base + icon;
      }

      return {
        id, label, cat,
        icon,
        sprite: b.sprite ? String(b.sprite) : '',
        cost: normCost(b.cost),
        size: normSize(b.size),
        entrances: normEntrances(b.entrances),
        enabled: (b.enabled !== false),
        // Platz für zukünftig: inputs/outputs/cycle/epoche…
        inputs: b.inputs || undefined,
        outputs: b.outputs || undefined,
        cycle: Number.isFinite(+b.cycle) ? (+b.cycle) : undefined
      };
    });
  }

  function deriveCategories(buildings, provided){
    if (Array.isArray(provided) && provided.length) {
      return provided.map(c => ({ id:String(c.id), label:String(c.label ?? c.id) }));
    }
    const cats = buildings.map(b => ({ id:b.cat, label:b.cat }));
    return uniq(cats, c => c.id);
  }

  // ---------------------------- Public API ----------------------------------
  async function init(){
    try{
      const res = await fetch('data/buildings.json', { cache:'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von data/buildings.json`);
      const json = await res.json();

      state.buildings  = normalizeBuildings(json);
      state.categories = deriveCategories(state.buildings, json.categories);

      LOG('ready', { buildings: state.buildings.length, categories: state.categories.length, base: state.meta.iconsBase });

      const detail = { ok:true, data:{ buildings:state.buildings, categories:state.categories, meta:state.meta } };
      EVT('cb:registry-ready', detail);
      EVT('cb:registry:ready', detail); // Alias
    } catch(e){
      ERR('Init-Fehler:', e);
      EVT('cb:registry-ready', { ok:false, error:String(e) });
    }
  }

  function get(key){
    if (key==='buildings')  return state.buildings;
    if (key==='categories') return state.categories;
    if (key==='meta')       return state.meta;
    if (key==='iconsBase')  return state.meta.iconsBase;
    return undefined;
  }

  function byId(id){ return state.buildings.find(b => b.id===String(id)) || null; }

  function getBuildingDef(id){
    const raw = byId(id);
    if (!raw) return null;
    return {
      id: raw.id, label: raw.label, cat: raw.cat,
      icon: raw.icon || '', sprite: raw.sprite || '',
      cost: raw.cost || { wood:0, stone:0, gold:0, food:0 },
      size: Array.isArray(raw.size) ? raw.size : [1,1],
      entrances: Array.isArray(raw.entrances) ? raw.entrances : [],
      inputs: raw.inputs, outputs: raw.outputs, cycle: raw.cycle
    };
  }

  window.Registry = { init, get, byId, getBuildingDef };
})();
