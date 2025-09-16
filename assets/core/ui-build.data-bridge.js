/* ============================================================================
 * Neue Siedler – UI-BUILD DATA BRIDGE
 * Version: v17.0.7
 * Aufgabe: Registry → UIBuild (Items) mappen
 * Events:  wartet auf cb:registry:ready, reagiert auf cb:registry:update
 * WICHTIG: UIBuild erwartet das Feld `category` (nicht `cat` / `categoryId`)
 * ============================================================================
 */
(function initUIBuildBridge (global) {
  const logI = (global.CBLog?.info  || console.log).bind(console, "[ui-build.data-bridge]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[ui-build.data-bridge]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[ui-build.data-bridge]");

  const UIB = () => global.UIBuild;
  const REG = () => global.Registry;

  // Konfig: Icons-Basis – vom Adapter oder Fallback
  function getIconsBase(){
    return global.__BUILD_ICONS_BASE
        || global.__buildIconsBase
        || "assets/ui/build/";
  }

  // Mappt Registry-Buildings -> UIBuild-Items
  function mapToItems(){
    if (!REG()) return [];
    const base = getIconsBase();
    const list = REG().list?.("buildings") || [];

    const items = list
      .filter(b => b && b.enabled !== false) // disabled fliegt raus
      .map(b => ({
        id:       b.id,
        name:     b.name,
        icon:     (b.icon ? (base + b.icon) : (base + "default.png")),
        // *** WICHTIG: genau dieses Feld erwartet die UI ***
        category: b.cat || b.category || "misc",
        // alles weitere als Meta mitgeben
        meta: {
          sprite: b.sprite || null,
          size:   Array.isArray(b.size) ? b.size : [1,1],
          place:  b.place || null,
        }
      }));

    return items;
  }

  // Items in die UI pushen
  function push(){
    if (!UIB() || typeof UIB().setItems !== "function") {
      logW("UIBuild.setItems nicht verfügbar – später erneut versuchen.");
      return;
    }
    const items = mapToItems();
    UIB().setItems(items);
    logI("Items gesetzt:", items.length);
  }

  // Ready-Handler (einmalig)
  function onReady(){
    try { push(); } catch(e){ logE("push() bei ready", e); }
  }

  // Update-Handler (bei Registry-Änderungen)
  function onUpdate(ev){
    try {
      const d = ev?.detail || {};
      if (d.kind === "buildings" || !d.kind) push();
    } catch(e){ logE("onUpdate()", e); }
  }

  // Bootstrap
  function boot(){
    logI("bereit v17.0.7");
    // Wenn Registry schon da -> sofort
    if (REG()?.__ready) onReady();
    // Events koppeln
    global.addEventListener("cb:registry:ready", onReady, { once:true });
    global.addEventListener("cb:registry:update", onUpdate);
  }

  // Falls UIBuild später kommt → kleiner Watcher
  (function watchUIBuild(){
    const t = setInterval(() => {
      if (UIB() && typeof UIB().setItems === "function") {
        clearInterval(t);
        boot();
      }
    }, 30);
    // Fallback beim DOM-Parsing
    global.addEventListener("DOMContentLoaded", () => {
      if (UIB() && typeof UIB().setItems === "function") {
        clearInterval(t);
        boot();
      }
    });
  })();

})(window);
