<script>
/* ============================================================
 * Neue Siedler – Daten-Adapter für UIBuild
 * Datei: assets/ui/ui-build.data-bridge.js
 * Version: v1.1 (robust)
 * Aufgabe:
 *   - Items aus Registry (wenn vorhanden) beziehen
 *   - sonst Fallback JSON laden (assets/data/buildings.json)
 *   - UIBuild.setItems zuverlässig aufrufen (mit Retry-Logik)
 * ============================================================ */

(function(){
  const BRIDGE = "[ui-build.bridge]";
  const CBLog = window.CBLog ?? console;

  // ---- Kern ----
  async function collectItems(){
    // 1) Registry bevorzugt
    if (window.Registry?.list) {
      try {
        const list = window.Registry.list("buildings");
        if (Array.isArray(list) && list.length){
          CBLog?.log?.(`${BRIDGE} Items gesetzt (via Registry) (${list.length})`);
          return normalize(list);
        }
      } catch (e) {
        CBLog?.warn?.(`${BRIDGE} Registry.list('buildings') Fehler`, e);
      }
    }
    // 2) Fallback JSON
    try {
      const res = await fetch("assets/data/buildings.json", {cache:"no-store"});
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items : json;
        CBLog?.log?.(`${BRIDGE} Fallback JSON erkannt (items:${items?.length ?? 0})`);
        return normalize(items||[]);
      } catch(e){}
    } catch (e) {
      CBLog?.warn?.(`${BRIDGE} Fallback JSON nicht ladbar`, e);
    }
    return [];
  }

  function normalize(arr){
    return (arr||[]).map(it=>{
      const id = it.id || it.key || it.slug || it.name?.toLowerCase?.().replace(/\s+/g,"") || "";
      return {
        id,
        title: it.title || it.name || id,
        category: it.category || it.cat || it.group || "misc",
        icon: it.icon || it.image || it.preview || it.thumb
      };
    });
  }

  async function ensureItemsApplied(){
    const items = await collectItems();
    if (!items.length){
      CBLog?.warn?.(`${BRIDGE} Keine Items gefunden – retry …`);
      // leichter Retry – manchmal kommt Registry minimal später
      setTimeout(ensureItemsApplied, 250);
      return;
    }
    // UIBuild existiert garantiert (wird in ui-build.js sofort bereitgestellt).
    if (window.UIBuild?.setItems) {
      window.UIBuild.setItems(items);
    } else {
      // Ultra-früh – parken bis UIBuild init ist
      window.__UIBUILD_PENDING_ITEMS__ = items;
      CBLog?.log?.(`${BRIDGE} UIBuild noch nicht init – Items gepuffert`);
    }
  }

  // ---- Wiring ----
  // Sofort starten – aber auch auf Events hören, damit späte Registry greift
  ensureItemsApplied();

  window.addEventListener("cb:registry:ready", ensureItemsApplied);
  window.addEventListener("cb:assets-ready", ensureItemsApplied);
})();
</script>
