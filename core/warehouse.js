/* ============================================================================
 * Datei   : core/warehouse.js
 * Version : v25.11.03 (skeleton)
 * Zweck   : Lagerverwaltung (HQ + Lagerhäuser)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 * Ereignisse:
 *   req:stock:push   {store,item,qty}
 *   req:stock:pull   {store,item,qty}
 *   cb:stock:change  {store,item,delta}
 * ============================================================================
 */

const warehouses = new Map();

class Warehouse {
  constructor(id) {
    this.id = id;
    this.stock = {};
  }
  push(item, qty) {
    this.stock[item] = (this.stock[item] || 0) + qty;
    dispatchEvent(new CustomEvent("cb:stock:change", { detail:{ store:this.id, item, delta:+qty } }));
  }
  pull(item, qty) {
    if ((this.stock[item] || 0) >= qty) {
      this.stock[item] -= qty;
      dispatchEvent(new CustomEvent("cb:stock:change", { detail:{ store:this.id, item, delta:-qty } }));
      return true;
    }
    return false;
  }
}

function getWarehouse(id="HQ") {
  if (!warehouses.has(id)) warehouses.set(id, new Warehouse(id));
  return warehouses.get(id);
}

addEventListener("req:stock:push", e => {
  const {store,item,qty} = e.detail||{};
  getWarehouse(store).push(item,qty);
});

addEventListener("req:stock:pull", e => {
  const {store,item,qty} = e.detail||{};
  getWarehouse(store).pull(item,qty);
});

window.Warehouse = { get:getWarehouse, list:warehouses };
