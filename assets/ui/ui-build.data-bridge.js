/* UIBuild Daten-Bridge v1.2 – Deep-Probe + Debug
   Füttert UIBuild.setItems() aus moderner Registry, EntitiesRegistry
   oder Legacy-Arrays. Erkennt viele mögliche Shapes. */
(function(){
  const LG = {
    info:(m)=> (window.CBLog?.info||console.log)(`[ui-build.bridge] ${m}`),
    warn:(m)=> (window.CBLog?.warn||console.warn)(`[ui-build.bridge] ${m}`)
  };

  // ---------- Utils ----------
  const titleOf = (c)=>(c?.title||c?.name||c?.id||c?.key||'Kategorie');
  function normItem(b){
    if (!b) return null;
    const id = b.id || b.key || b.type || b.name;
    if (!id) return null;
    const label = b.name || b.title || id;
    const icon =
      b.icon || b.uiIcon || b.sprite || b.image || b.preview ||
      (id ? `assets/buildings/${id}.png` : null);
    return { id, label, icon, data: b.data||{} };
  }
  const pack = (cat, arr)=> [{ category: cat, items: (arr||[]).map(normItem).filter(Boolean) }];

  // ---------- Registry-Reader (viele Varianten) ----------
  function tryRegistry(){
    const R =
      window.Registry || window.registry || window.__REGISTRY ||
      window.entities?.registry || null;
    if (!R) return null;

    // helper
    const buildingsObj = ()=> (Array.isArray(R.buildings)? null : (R.buildings||null));
    const buildingsArr = ()=> (Array.isArray(R.buildings)? R.buildings : null);
    const getById = (id)=>{
      const B = buildingsArr(); if (B) return B.find(x=>(x.id||x.key)===id) || null;
      const O = buildingsObj(); if (O) return O[id] || null;
      return null;
    };

    // 1) Offene Kategorien
    let cats = R.getCategories?.() || R.categories || R.kategorien || null;
    if (!cats && R.catalog) cats = R.catalog.categories || R.catalog.kategorien || null;
    if (!cats && R.map)     cats = R.map.categories     || R.map.kategorien     || null;

    if (Array.isArray(cats) && cats.length){
      const out = [];
      for (const c of cats){
        const list = c.items || c.buildings || c.gebaeude || c.ids || [];
        const items = [];
        for (const ref of list){
          const b = (typeof ref==='string'||typeof ref==='number') ? getById(ref) : ref;
          const it = normItem(b);
          if (it) items.push(it);
        }
        out.push({ category: titleOf(c), items });
      }
      if (out.some(c=>c.items.length)){
        LG.info(`Registry erkannt (${out.reduce((s,c)=>s+c.items.length,0)} Karten / ${out.length} Kategorien)`);
        return out;
      }
    }

    // 2) Nur buildings (Array oder Objekt)
    if (buildingsArr()?.length){
      const items = buildingsArr().map(normItem).filter(Boolean);
      if (items.length){ LG.info(`Registry.buildings[] → ${items.length} Karten`); return pack('Bauen', items); }
    }
    if (buildingsObj() && Object.keys(buildingsObj()).length){
      const items = Object.values(buildingsObj()).map(normItem).filter(Boolean);
      if (items.length){ LG.info(`Registry.buildings{…} → ${items.length} Karten`); return pack('Bauen', items); }
    }

    // 3) Alternative Container
    if (R.catalog?.buildings){
      const src = R.catalog.buildings;
      const items = (Array.isArray(src)?src:Object.values(src)).map(normItem).filter(Boolean);
      if (items.length){ LG.info(`Registry.catalog.buildings → ${items.length} Karten`); return pack('Bauen', items); }
    }
    if (R.map?.buildings){
      const src = R.map.buildings;
      const items = (Array.isArray(src)?src:Object.values(src)).map(normItem).filter(Boolean);
      if (items.length){ LG.info(`Registry.map.buildings → ${items.length} Karten`); return pack('Bauen', items); }
    }

    return null;
  }

  // ---------- EntitiesRegistry ----------
  function tryEntities(){
    const ER = window.EntitiesRegistry || window['entities.registry'] || null;
    if (!ER) return null;
    try{
      const all = ER.getAll?.() || ER;
      if (!all) return null;

      if (Array.isArray(all.categories)){
        const out = all.categories.map(c=>{
          const list = c.items || c.buildings || [];
          return { category: titleOf(c), items: (list||[]).map(normItem).filter(Boolean) };
        }).filter(c=>c.items.length);
        if (out.length){
          LG.info(`EntitiesRegistry erkannt (${out.reduce((s,c)=>s+c.items.length,0)} Karten / ${out.length} Kategorien)`);
          return out;
        }
      }
      if (Array.isArray(all.buildings)){
        const items = all.buildings.map(normItem).filter(Boolean);
        if (items.length){ LG.info(`EntitiesRegistry.buildings[] → ${items.length} Karten`); return pack('Bauen', items); }
      }
    }catch(e){ LG.warn(`EntitiesRegistry Fehler: ${e?.message||e}`); }
    return null;
  }

  // ---------- Legacy / Monolith ----------
  function tryLegacy(){
    const A = window.__buildItems || window.BuildAssets || window.assetsBuild || window.BUILDINGS || null;
    if (!A) return null;
    if (Array.isArray(A) && A[0]?.items){ LG.info(`Legacy __buildItems (gruppiert)`); return A; }
    if (Array.isArray(A)){
      const items = A.map(normItem).filter(Boolean);
      if (items.length){ LG.info(`Legacy flach → ${items.length} Karten`); return pack('Bauen', items); }
    }
    return null;
  }

  function apply(items){
    if (!window.UIBuild || typeof window.UIBuild.setItems!=='function'){
      LG.warn('UIBuild.setItems nicht verfügbar – retry …');
      return setTimeout(()=>apply(items), 150);
    }
    window.UIBuild.setItems(items);
    LG.info(`Items gesetzt (${items.reduce((s,c)=>s+(c.items?.length||0),0)} / ${items.length})`);
  }

  function tryOnce(){
    const a = tryRegistry();  if (a && a.some(c=>c.items.length)) return apply(a);
    const b = tryEntities();  if (b && b.some(c=>c.items.length)) return apply(b);
    const c = tryLegacy();    if (c && c.some(c=>c.items.length)) return apply(c);
    LG.warn('Keine Items gefunden – retry …'); setTimeout(tryOnce, 250);
  }

  document.addEventListener('DOMContentLoaded', tryOnce);
  window.addEventListener('cb:assets-ready', tryOnce);
  window.addEventListener('cb:game-start',  tryOnce);
})();
