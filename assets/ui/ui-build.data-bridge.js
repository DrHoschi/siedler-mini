/* UIBuild Daten-Bridge v1.1 – füttert UIBuild.setItems() aus Registry/Legacy (mit Debug) */
(function(){
  const L = {
    in:(m)=> (window.CBLog?.info||console.log)(`[ui-build.bridge] ${m}`),
    w: (m)=> (window.CBLog?.warn||console.warn)(`[ui-build.bridge] ${m}`)
  };

  function normalizeCatTitle(c){
    return c?.title || c?.name || c?.id || c?.key || 'Kategorie';
  }
  function normalizeItem(b){
    if (!b) return null;
    const id    = b.id || b.key || b.type || b.name;
    if (!id) return null;
    const label = b.name || b.title || id;
    const icon  = b.icon || b.uiIcon || b.sprite || (id ? `assets/buildings/${id}.png` : null);
    return { id, label, icon, data: b.data||{} };
  }

  // --- Quelle 1: moderne Registry --------------------------------------------
  function fromRegistry(){
    const R = window.Registry || window.registry || window.__REGISTRY;
    if (!R) return null;

    // Frei stehende buildings (Object oder Array)
    const getById = (id)=>{
      const B = R.buildings;
      if (!B) return null;
      if (Array.isArray(B)) return B.find(x=> (x.id||x.key)===id) || null;
      if (typeof B==='object') return B[id] || null;
      return null;
    };

    const cats = R.getCategories?.() || R.categories || R.kategorien;
    if (Array.isArray(cats) && cats.length){
      const out = [];
      for (const c of cats){
        const list = c.items || c.buildings || c.gebaeude || [];
        const items = [];
        for (const ref of list){
          const b = (typeof ref==='string'||typeof ref==='number') ? getById(ref) : ref;
          const it = normalizeItem(b);
          if (it) items.push(it);
        }
        out.push({ category: normalizeCatTitle(c), items });
      }
      if (out.some(c=>c.items.length)){
        L.in(`Registry erkannt → ${out.reduce((s,c)=>s+c.items.length,0)} Karten / ${out.length} Kategorien`);
        return out;
      }
    }

    // Fallback: reine buildings-Liste
    if (Array.isArray(R.buildings) && R.buildings.length){
      const items = R.buildings.map(normalizeItem).filter(Boolean);
      if (items.length){
        L.in(`Registry.buildings[] erkannt → ${items.length} Karten`);
        return [{ category:'Bauen', items }];
      }
    }
    if (R.buildings && typeof R.buildings==='object'){
      const items = Object.values(R.buildings).map(normalizeItem).filter(Boolean);
      if (items.length){
        L.in(`Registry.buildings{…} erkannt → ${items.length} Karten`);
        return [{ category:'Bauen', items }];
      }
    }
    return null;
  }

  // --- Quelle 2: EntitiesRegistry (falls vorhanden) ---------------------------
  function fromEntities(){
    const ER = window.EntitiesRegistry || window['entities.registry'] || null;
    if (!ER) return null;
    try{
      const all = ER.getAll?.() || ER; // je nach Implementierung
      if (!all) return null;

      if (Array.isArray(all.categories)){
        const out = all.categories.map(c=>{
          const list = c.items || c.buildings || [];
          const items = list.map(normalizeItem).filter(Boolean);
          return { category: normalizeCatTitle(c), items };
        }).filter(c=>c.items.length);
        if (out.length){
          L.in(`EntitiesRegistry erkannt → ${out.reduce((s,c)=>s+c.items.length,0)} Karten / ${out.length} Kategorien`);
          return out;
        }
      }
      if (Array.isArray(all.buildings)){
        const items = all.buildings.map(normalizeItem).filter(Boolean);
        if (items.length){
          L.in(`EntitiesRegistry.buildings[] erkannt → ${items.length} Karten`);
          return [{ category:'Bauen', items }];
        }
      }
    }catch(e){ L.w(`EntitiesRegistry Fehler: ${e?.message||e}`); }
    return null;
  }

  // --- Quelle 3: Legacy / Monolith -------------------------------------------
  function fromLegacy(){
    const A = window.__buildItems || window.BuildAssets || window.assetsBuild;
    if (!A) return null;
    if (Array.isArray(A) && A[0]?.items){
      L.in(`Legacy __buildItems erkannt → ${A.reduce((s,c)=>s+(c.items?.length||0),0)} Karten / ${A.length} Kategorien`);
      return A;
    }
    if (Array.isArray(A)){
      const items = A.map(normalizeItem).filter(Boolean);
      if (items.length){
        L.in(`Legacy flach erkannt → ${items.length} Karten`);
        return [{ category:'Bauen', items }];
      }
    }
    return null;
  }

  function apply(items){
    if (!window.UIBuild || typeof window.UIBuild.setItems!=='function'){
      L.w('UIBuild.setItems nicht verfügbar – retry …');
      setTimeout(()=>apply(items), 150);
      return;
    }
    window.UIBuild.setItems(items);
    L.in(`Items gesetzt (${items.reduce((s,c)=>s+(c.items?.length||0),0)} / ${items.length})`);
  }

  function tryOnce(){
    const reg = fromRegistry();
    if (reg && reg.some(c=>c.items.length)) return apply(reg);
    const ent = fromEntities();
    if (ent && ent.some(c=>c.items.length)) return apply(ent);
    const leg = fromLegacy();
    if (leg && leg.some(c=>c.items.length)) return apply(leg);
    L.w('Keine Items gefunden – retry …'); setTimeout(tryOnce, 250);
  }

  document.addEventListener('DOMContentLoaded', tryOnce);
  window.addEventListener('cb:assets-ready', tryOnce);
  window.addEventListener('cb:game-start',  tryOnce);
})();
