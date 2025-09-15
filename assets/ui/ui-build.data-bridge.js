/* UIBuild Daten-Bridge v1.4 – Deep Introspect++
   - Erkennt Registry/Entities/Assets in vielen Shapes & Namespaces
   - Löst ID-Listen gegen Buildings sauber auf
   - Lauscht auf diverse Ready-Events
   - Einmaliges, präzises Debug-Logging (kein Spam)
*/
(function(){
  const LG = {
    i:(m)=> (window.CBLog?.info||console.log)(`[ui-build.bridge] ${m}`),
    w:(m)=> (window.CBLog?.warn||console.warn)(`[ui-build.bridge] ${m}`),
    d:(m)=> (window.CBLog?.debug||console.debug)(`[ui-build.bridge] ${m}`),
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

  // Liste → Map (id->obj)
  const toMap = (src)=>{
    if (!src) return {};
    if (Array.isArray(src)){
      const m={}; for (const x of src){ const id=x?.id||x?.key||x?.type||x?.name; if(id) m[id]=x; }
      return m;
    }
    if (typeof src==='object') return src;
    return {};
  };

  // Safely get nested prop
  const get = (obj, path)=> path.split('.').reduce((o,k)=> (o && o[k] != null ? o[k] : null), obj);

  // ---- Collect possible roots/namespaces once (broad) ----
  function collectRoots(){
    const roots = [];

    // Klassisch
    roots.push(['Registry', window.Registry || null]);
    roots.push(['registry', window.registry || null]);
    roots.push(['__REGISTRY', window.__REGISTRY || null]);

    // Core/Engine-Namespace
    roots.push(['Core.registry', get(window,'Core.registry')]);
    roots.push(['__core.Registry', get(window,'__core.Registry')]);
    roots.push(['GameCore.registry', get(window,'GameCore.registry')]);

    // Entities
    roots.push(['EntitiesRegistry', window.EntitiesRegistry || null]);
    roots.push(["entities.registry", window["entities.registry"] || null]);

    // Assets-Layer
    roots.push(['BuildAssets', window.BuildAssets || null]);
    roots.push(['assetsBuild', window.assetsBuild || null]);
    roots.push(['Asset', window.Asset || null]);
    roots.push(['Assets', window.Assets || null]);

    // Sonstige Container (data, catalog, map) könnten auch direkt unter window liegen
    roots.push(['Registry.data', get(window,'Registry.data')]);
    roots.push(['Registry.catalog', get(window,'Registry.catalog')]);
    roots.push(['Registry.map', get(window,'Registry.map')]);

    return roots.filter(([_,val])=> !!val);
  }

  // ---- Try reader for a single root object ----
  function readFromRoot(rootName, R){
    // 1) Kategorien holen
    let cats =
      R.getCategories?.() ||
      R.categories || R.kategorien ||
      R.data?.categories || R.data?.kategorien ||
      R.catalog?.categories || R.catalog?.kategorien ||
      R.map?.categories || R.map?.kategorien ||
      null;

    // 2) Buildings-Quelle bestimmen (Array oder Objekt)
    const buildingsArr =
      R.getBuildings?.() ||
      (Array.isArray(R.buildings) ? R.buildings : null) ||
      (Array.isArray(R.data?.buildings) ? R.data.buildings : null) ||
      (Array.isArray(R.catalog?.buildings) ? R.catalog.buildings : null) ||
      (Array.isArray(R.map?.buildings) ? R.map.buildings : null) ||
      (Array.isArray(R.list?.buildings) ? R.list.buildings : null) ||
      null;

    const buildingsObj =
      (!buildingsArr && R.buildings && typeof R.buildings==='object' && R.buildings) ||
      (!buildingsArr && R.data?.buildings && typeof R.data.buildings==='object' && R.data.buildings) ||
      (!buildingsArr && R.catalog?.buildings && typeof R.catalog.buildings==='object' && R.catalog.buildings) ||
      (!buildingsArr && R.map?.buildings && typeof R.map.buildings==='object' && R.map.buildings) ||
      (!buildingsArr && R.list?.buildings && typeof R.list.buildings==='object' && R.list.buildings) ||
      null;

    const BUILD = toMap(buildingsArr || buildingsObj);

    // 3) Falls Root ein Assets-Katalog ist
    // Asset-API (z. B. Asset.get('build.catalog'))
    try{
      if (rootName==='Asset' && typeof R.get==='function'){
        const catalog = R.get('build.catalog') || R.get('buildings') || null;
        const bList   = R.get('buildings.list') || R.get('buildings.all') || null;
        if (catalog?.categories || catalog?.kategorien){
          cats = catalog.categories || catalog.kategorien;
        }
        if (bList || catalog?.buildings){
          const bSrc = bList || catalog.buildings;
          if (Array.isArray(bSrc) || typeof bSrc==='object'){
            const M = toMap(bSrc);
            Object.assign(BUILD, M);
          }
        }
      }
    }catch(_){}

    // 4) Kategorien verarbeiten (inkl. ID-Auflösung)
    if (Array.isArray(cats) && cats.length){
      const out = [];
      for (const c of cats){
        const raw = c.items || c.buildings || c.gebaeude || c.ids || [];
        const items = [];
        for (const ref of raw){
          const obj = (typeof ref==='string' || typeof ref==='number') ? (BUILD[ref] || null) : ref;
          const it = normItem(obj);
          if (it) items.push(it);
        }
        out.push({ category: titleOf(c), items });
      }
      if (out.some(x=>x.items.length)){
        LG.i(`Registry erkannt @ ${rootName} (cats:${out.length} / items:${out.reduce((s,c)=>s+c.items.length,0)})`);
        return out;
      }
    }

    // 5) Nur Buildings ohne Kategorien
    if (buildingsArr && buildingsArr.length){
      const items = buildingsArr.map(normItem).filter(Boolean);
      if (items.length){ LG.i(`Buildings[] @ ${rootName} → ${items.length} Karten`); return pack('Bauen', items); }
    }
    if (buildingsObj && Object.keys(buildingsObj).length){
      const items = Object.values(buildingsObj).map(normItem).filter(Boolean);
      if (items.length){ LG.i(`Buildings{…} @ ${rootName} → ${items.length} Karten`); return pack('Bauen', items); }
    }

    // 6) Legacy-Varianten am Root
    const legacy = R.__buildItems || R.BuildAssets || R.assetsBuild || R.BUILDINGS || null;
    if (legacy){
      if (Array.isArray(legacy) && legacy[0]?.items){
        LG.i(`Legacy __buildItems (gruppiert) @ ${rootName}`);
        return legacy;
      }
      if (Array.isArray(legacy)){
        const items = legacy.map(normItem).filter(Boolean);
        if (items.length){ LG.i(`Legacy flach @ ${rootName} → ${items.length} Karten`); return pack('Bauen', items); }
      }
    }

    return null;
  }

  // ---- Master probe (einmalig) ----
  let _loggedOnce=false;
  function probe(){
    const roots = collectRoots();
    if (!_loggedOnce){
      LG.d(`Roots gefunden: ${roots.map(r=>r[0]).join(', ') || '(keine)'}`);
      _loggedOnce=true;
    }
    for (const [name,obj] of roots){
      const res = readFromRoot(name, obj);
      if (res && res.some(c=>c.items.length)) return res;
    }
    return null;
  }

  // ---- apply ----
  function apply(items){
    if (!window.UIBuild || typeof window.UIBuild.setItems!=='function'){
      LG.w('UIBuild.setItems nicht verfügbar – versuche später erneut');
      return setTimeout(()=>apply(items), 120);
    }
    window.UIBuild.setItems(items);
    LG.i(`Items gesetzt (${items.reduce((s,c)=>s+(c.items?.length||0),0)} / ${items.length})`);
  }

  // ---- Orchestrierung (dezent, kein Spam) ----
  let tries=0, maxTries=60, found=false;
  function tryOnce(){
    if (found) return;
    const res = probe();
    if (res && res.some(c=>c.items.length)){
      found=true; return apply(res);
    }
    tries++;
    if (tries<maxTries){
      setTimeout(tryOnce, 250);
    }else{
      LG.w('Keine Items gefunden (Timeout) – prüfe Registry-Namespace/Shape');
    }
  }

  // Trigger: möglichst tolerant
  document.addEventListener('DOMContentLoaded', tryOnce);
  window.addEventListener('cb:assets-ready', tryOnce);
  window.addEventListener('cb:game-start',  tryOnce);
  window.addEventListener('cb:registry-ready', tryOnce);
  window.addEventListener('cb:core-ready', tryOnce);
})();
