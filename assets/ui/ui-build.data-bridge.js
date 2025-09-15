/* UIBuild Daten-Bridge v1.3 – Deep Introspect + Debug
   Erkennt viele Registry-Shapes (APIs, data-Container, Kataloge),
   löst String-IDs in Kategorien auf und füttert UIBuild.setItems(...).
*/
(function(){
  const LG = {
    i:(m)=> (window.CBLog?.info||console.log)(`[ui-build.bridge] ${m}`),
    w:(m)=> (window.CBLog?.warn||console.warn)(`[ui-build.bridge] ${m}`)
  };

  // ------------ helpers ------------
  const titleOf = (c)=> c?.title || c?.name || c?.id || c?.key || 'Kategorie';
  function normItem(b){
    if (!b) return null;
    const id = b.id || b.key || b.type || b.name;
    if (!id) return null;
    const label = b.name || b.title || id;
    const icon =
      b.icon || b.uiIcon || b.sprite || b.image || b.preview ||
      (id ? `assets/buildings/${id}.png` : null);
    return { id, label, icon, data: b.data || {} };
  }
  const pack = (cat, arr)=> [{ category: cat, items: (arr||[]).map(normItem).filter(Boolean) }];

  // beliebige Liste → Objekt-Map (id -> obj)
  const toMap = (src)=>{
    if (!src) return {};
    if (Array.isArray(src)) {
      const m={}; for (const x of src){ const id=x?.id||x?.key||x?.type||x?.name; if(id) m[id]=x; } return m;
    }
    if (typeof src==='object') return src;
    return {};
  };

  // ------------ Registry Reader (viele Varianten + Auflösung von IDs) ------------
  function tryRegistry(){
    const R =
      window.Registry || window.registry || window.__REGISTRY ||
      window.entities?.registry || null;
    if (!R) return null;

    // mögliche Quellen für buildings
    const buildingsArr =
      R.getBuildings?.() ||
      (Array.isArray(R.buildings) ? R.buildings : null) ||
      (Array.isArray(R.data?.buildings) ? R.data.buildings : null) ||
      (Array.isArray(R.catalog?.buildings) ? R.catalog.buildings : null) ||
      (Array.isArray(R.map?.buildings) ? R.map.buildings : null) ||
      null;

    const buildingsObj =
      (!buildingsArr && (R.buildings && typeof R.buildings==='object') && R.buildings) ||
      (!buildingsArr && (R.data?.buildings && typeof R.data.buildings==='object') && R.data.buildings) ||
      (!buildingsArr && (R.catalog?.buildings && typeof R.catalog.buildings==='object') && R.catalog.buildings) ||
      (!buildingsArr && (R.map?.buildings && typeof R.map.buildings==='object') && R.map.buildings) ||
      null;

    const BUILD = toMap(buildingsArr || buildingsObj);

    // mögliche Quellen für Kategorien
    let cats =
      R.getCategories?.() ||
      R.categories || R.kategorien ||
      R.data?.categories || R.data?.kategorien ||
      R.catalog?.categories || R.catalog?.kategorien ||
      R.map?.categories || R.map?.kategorien || null;

    if (Array.isArray(cats) && cats.length){
      const out = [];
      for (const c of cats){
        const raw = c.items || c.buildings || c.gebaeude || c.ids || [];
        const items = [];
        for (const ref of raw){
          // Eintrag kann bereits ein Objekt sein oder nur eine ID (string/number)
          const obj = (typeof ref==='string' || typeof ref==='number') ? (BUILD[ref] || null) : ref;
          const it = normItem(obj);
          if (it) items.push(it);
        }
        out.push({ category: titleOf(c), items });
      }
      if (out.some(c=>c.items.length)){
        LG.i(`Registry erkannt (cats:${out.length} / items:${out.reduce((s,c)=>s+c.items.length,0)})`);
        return out;
      }
    }

    // reine buildings-Listen
    if (buildingsArr && buildingsArr.length){
      const items = buildingsArr.map(normItem).filter(Boolean);
      if (items.length){ LG.i(`Registry.buildings[] → ${items.length} Karten`); return pack('Bauen', items); }
    }
    if (buildingsObj && Object.keys(buildingsObj).length){
      const items = Object.values(buildingsObj).map(normItem).filter(Boolean);
      if (items.length){ LG.i(`Registry.buildings{…} → ${items.length} Karten`); return pack('Bauen', items); }
    }

    return null;
  }

  // ------------ EntitiesRegistry ------------
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
          LG.i(`EntitiesRegistry erkannt (cats:${out.length} / items:${out.reduce((s,c)=>s+c.items.length,0)})`);
          return out;
        }
      }
      if (Array.isArray(all.buildings)){
        const items = all.buildings.map(normItem).filter(Boolean);
        if (items.length){ LG.i(`EntitiesRegistry.buildings[] → ${items.length} Karten`); return pack('Bauen', items); }
      }
    }catch(e){ LG.w(`EntitiesRegistry Fehler: ${e?.message||e}`); }
    return null;
  }

  // ------------ Legacy / Monolith ------------
  function tryLegacy(){
    const A = window.__buildItems || window.BuildAssets || window.assetsBuild || window.BUILDINGS || null;
    if (!A) return null;
    if (Array.isArray(A) && A[0]?.items){ LG.i(`Legacy __buildItems (gruppiert)`); return A; }
    if (Array.isArray(A)){
      const items = A.map(normItem).filter(Boolean);
      if (items.length){ LG.i(`Legacy flach → ${items.length} Karten`); return pack('Bauen', items); }
    }
    return null;
  }

  // ------------ apply ------------
  function apply(items){
    if (!window.UIBuild || typeof window.UIBuild.setItems!=='function'){
      LG.w('UIBuild.setItems nicht verfügbar – retry …');
      return setTimeout(()=>apply(items), 150);
    }
    window.UIBuild.setItems(items);
    LG.i(`Items gesetzt (${items.reduce((s,c)=>s+(c.items?.length||0),0)} / ${items.length})`);
  }

  function tryOnce(){
    const a = tryRegistry();  if (a && a.some(c=>c.items.length)) return apply(a);
    const b = tryEntities();  if (b && b.some(c=>c.items.length)) return apply(b);
    const c = tryLegacy();    if (c && c.some(c=>c.items.length)) return apply(c);
    LG.w('Keine Items gefunden – retry …'); setTimeout(tryOnce, 250);
  }

  // genügend Trigger setzen (Reihenfolge-tolerant)
  document.addEventListener('DOMContentLoaded', tryOnce);
  window.addEventListener('cb:assets-ready', tryOnce);
  window.addEventListener('cb:game-start',  tryOnce);
  window.addEventListener('cb:registry-ready', tryOnce); // falls vorhanden
})();
