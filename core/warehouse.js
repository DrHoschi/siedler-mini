/* ============================================================================
 * Datei   : core/warehouse.js
 * Version : v25.11.27-hud-bridge
 * Zweck   : Lagerverwaltung (HQ + Lagerhäuser) + Bridge zum HUD
 *
 * Ereignisse:
 *   req:stock:push   {store,item,qty}
 *   req:stock:pull   {store,item,qty}
 *   cb:stock:change  {store,item,delta}
 *   cb:res:change    {store,res,delta,value}   // NEU – fürs HUD
 *
 * Hinweise:
 *   - item/res sind z.B. "wood", "stone", "food", "gold"
 *   - HUD (ui/ui-hud.js) lauscht auf cb:res:change und erwartet:
 *       detail = { res:"wood", delta:+1, value:5 }
 * ============================================================================ */

(() => {
  const TAG  = "[warehouse]";
  const LOG  = (...a) => (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);

  const warehouses = new Map();

  class Warehouse {
    constructor(id) {
      this.id    = id;
      this.stock = {};
    }

    push(item, qty) {
      const before = this.stock[item] || 0;
      const add    = +qty || 0;
      const after  = before + add;
      this.stock[item] = after;

      // Event für interne Lager-Logik / Inspector
      dispatchEvent(new CustomEvent("cb:stock:change", {
        detail: { store: this.id, item, delta: add }
      }));

      // NEU: Event fürs HUD
      dispatchEvent(new CustomEvent("cb:res:change", {
        detail: { store: this.id, res: item, delta: add, value: after }
      }));
    }

    pull(item, qty) {
      const have = this.stock[item] || 0;
      const need = +qty || 0;
      if (have < need) return false;

      const after = have - need;
      this.stock[item] = after;

      const delta = -need;

      dispatchEvent(new CustomEvent("cb:stock:change", {
        detail: { store: this.id, item, delta }
      }));

      // NEU: HUD-Event
      dispatchEvent(new CustomEvent("cb:res:change", {
        detail: { store: this.id, res: item, delta, value: after }
      }));

      return true;
    }
  }

  function getWarehouse(id = "HQ") {
    if (!warehouses.has(id)) warehouses.set(id, new Warehouse(id));
    return warehouses.get(id);
  }

  // ---------------------------------------------------------------------------
  //  Event-Brücke: von außen nur req:stock:push/pull benutzen
  // ---------------------------------------------------------------------------
  addEventListener("req:stock:push", (e) => {
    const d = e.detail || {};
    const store = d.store || "HQ";
    const item  = d.item;
    const qty   = +d.qty || 0;
    if (!item || !qty) return;
    getWarehouse(store).push(item, qty);
    LOG("push", store, item, qty);
  });

  addEventListener("req:stock:pull", (e) => {
    const d = e.detail || {};
    const store = d.store || "HQ";
    const item  = d.item;
    const qty   = +d.qty || 0;
    if (!item || !qty) return;
    const ok = getWarehouse(store).pull(item, qty);
    LOG("pull", store, item, qty, "→", ok ? "OK" : "FAIL");
  });

  // Für Debug/Inspector
  window.Warehouse = {
    get  : getWarehouse,
    list : warehouses
  };

  LOG("geladen (v25.11.27-hud-bridge)");
})();
