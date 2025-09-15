<script>
// UIBuild–Daten-Bridge  v1.0
// Zweck: Registry-Daten → UIBuild.setItems(...) füttern.
// Greift NICHT in Registry/Inspector ein und arbeitet defensiv.

// kleine Logger
const L = {
  ok:  (m)=> (window.CBLog?.ok   || console.log)(`[ui-build.bridge] ${m}`),
  in:  (m)=> (window.CBLog?.info || console.log)(`[ui-build.bridge] ${m}`),
  warn:(m)=> (window.CBLog?.warn || console.warn)(`[ui-build.bridge] ${m}`)
};

(function bridge(){
  // Abbruch, wenn UIBuild gar nicht geladen
  function hasUIBuild(){ return !!(window.UIBuild && typeof window.UIBuild.setItems === "function"); }

  // Source 1: moderne Registry-API (falls vorhanden)
  function readFromRegistry(){
    const R = window.Registry || window.entities?.registry || window.entitiesRegistry;
    if (!R) return null;

    // Mögliche Shapes tolerant behandeln
    const cats = R.getCategories?.() || R.categories || R.kategorien;
    const byId = (id)=> (R.getBuilding?.(id) || R.buildings?.[id] || (Array.isArray(R.buildings) ? R.buildings.find(b=>b.id===id) : null));

    if (!cats || !cats.length) return null;

    const items = [];
    for (const c of cats){
      const cName = c.name || c.title || c.id || "Allg.";
      const list  = c.items || c.buildings || c.gebaeude || [];
      const cards = [];

      for (const ref of list){
        const b = (typeof ref === "string" || typeof ref === "number") ? byId(ref) : ref;
        if (!b) continue;

        // Felder tolerant lesen
        const label = b.label || b.name || b.title || b.id || "Gebäude";
        const icon  = b.icon  || b.uiIcon || b.sprite || (b.id ? `assets/buildings/${b.id}.png` : "");
        const id    = b.id || label.toLowerCase().replace(/\s+/g,'_');

        cards.push({
          id, label,
          icon,
          // alles, was das Platzieren braucht, unverändert durchreichen
          data: { buildingId: id, ...(b.data || {}) }
        });
      }

      items.push({ category: cName, items: cards });
    }
    return items;
  }

  // Source 2: historisches Assets-Mapping (falls vorhanden)
  function readFromLegacyAssets(){
    const A = window.BuildAssets || window.assetsBuild || window.__buildItems;
    if (!A) return null;

    // ist es bereits im Ziel-Format?
    if (Array.isArray(A) && A[0]?.items) return A;

    // oder Liste flach → in eine Kategorie „Allg.“
    if (Array.isArray(A)) return [{ category:"Allg.", items: A }];

    return null;
  }

  function apply(items){
    if (!hasUIBuild()) { L.warn("UIBuild noch nicht verfügbar."); return false; }
    if (!Array.isArray(items) || !items.length) { L.warn("Keine Items gefunden."); return false; }

    // global auch wieder bereitstellen, damit ältere Stände funktionieren
    window.__buildItems = items;
    try { window.UIBuild.setItems(items); L.ok(`Items gesetzt (${items.map(c=>c.items.length).reduce((a,b)=>a+b,0)} Karten / ${items.length} Kategorien)`); }
    catch(e){ console.error(e); L.warn("Konnte Items nicht setzen."); return false; }
    return true;
  }

  // Versuche in dieser Reihenfolge, mehrmals während des Boots
  function tryFill(){
    const fromReg = readFromRegistry();
    if (fromReg && apply(fromReg)) return;

    const fromLegacy = readFromLegacyAssets();
    if (fromLegacy && apply(fromLegacy)) return;

    // später nochmal probieren (Assets/Registry laden asynchron)
    setTimeout(tryFill, 200);
  }

  // Start-Heuristik: sobald UI + Core laufen
  document.addEventListener("DOMContentLoaded", tryFill);
  window.addEventListener("cb:assets-ready", tryFill);
  window.addEventListener("cb:game-start",  tryFill);
})();
</script>
