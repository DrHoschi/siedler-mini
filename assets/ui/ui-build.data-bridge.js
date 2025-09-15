/* UIBuild Daten-Bridge v1.0 – füttert UIBuild.setItems() aus Registry/Legacy */
(function(){
  const log=(m)=> (window.CBLog?.info||console.log)(`[ui-build.bridge] ${m}`);
  const warn=(m)=> (window.CBLog?.warn||console.warn)(`[ui-build.bridge] ${m}`);

  function fromRegistry(){
    const R = window.Registry || window.registry || window.__REGISTRY;
    if (!R) return null;

    const cats = R.getCategories?.() || R.categories || R.kategorien;
    const getB = (id)=> (R.getBuilding?.(id) || (Array.isArray(R.buildings)? R.buildings.find(b=>b.id===id) : (R.buildings?.[id]||null)));

    if (!Array.isArray(cats) || !cats.length) return null;

    const out = [];
    for (const c of cats){
      const cName = c.title || c.name || c.id || 'Kategorie';
      const list  = c.items || c.buildings || c.gebaeude || [];
      const cards = [];

      for (const ref of list){
        const b = (typeof ref==='string'||typeof ref==='number') ? getB(ref) : ref;
        if (!b) continue;
        const id    = b.id || b.key || b.type || b.name;
        const label = b.name || b.title || id;
        const icon  = b.icon || b.uiIcon || b.sprite || (id?`assets/buildings/${id}.png`:null);
        cards.push({ id, label, icon, data: b.data||{} });
      }
      out.push({ category: cName, items: cards });
    }
    return out;
  }

  function fromLegacy(){
    const A = window.__buildItems || window.BuildAssets || window.assetsBuild;
    if (!A) return null;

    if (Array.isArray(A) && A[0]?.items) return A;               // bereits gruppiert
    if (Array.isArray(A)) return [{ category:'Bauen', items:A }]; // flach

    return null;
  }

  function apply(items){
    if (!window.UIBuild || typeof window.UIBuild.setItems!=='function'){
      warn('UIBuild.setItems nicht verfügbar – versuche später erneut');
      setTimeout(()=>apply(items), 200);
      return;
    }
    window.UIBuild.setItems(items);
    log(`Items gesetzt (${items.reduce((s,c)=>s+(c.items?.length||0),0)} / ${items.length})`);
  }

  function tryOnce(){
    const reg = fromRegistry();
    if (reg && reg.some(c=>c.items.length)) return apply(reg);
    const old = fromLegacy();
    if (old && old.some(c=>c.items.length)) return apply(old);
    warn('Keine Items gefunden – retry …'); setTimeout(tryOnce, 250);
  }

  document.addEventListener('DOMContentLoaded', tryOnce);
  window.addEventListener('cb:assets-ready', tryOnce);
  window.addEventListener('cb:game-start',  tryOnce);
})();
