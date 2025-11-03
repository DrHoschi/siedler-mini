/* ============================================================================
 * Datei   : core/logistics.prio.js
 * Version : v25.11.03 (skeleton)
 * Zweck   : Verwaltung von Waren-Prioritäten & Logistik-Regeln (S4-Stil)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 * Ereignisse:
 *   req:logistics:prio:set   {order:[…]}   → Setzt Prioritätenreihenfolge
 *   cb:logistics:prio        {order:[…]}   → Meldet neue Reihenfolge zurück
 *   cb:logistics:queue:update{jobs:[…]}    → Optional: aktualisierte Transportwarteschlange
 * ============================================================================
 */

 // [IMPORTS]
 // (keine nötig, liest aus globalem Registry)

 // [KONSTANTEN]
 const DEFAULT_ORDER = ["boards", "stone", "tools", "weapons", "food"];

 // [STATE]
 const state = {
   order: [...DEFAULT_ORDER],
   queue: []   // optional: Transportaufträge sichtbar für Inspector
 };

 // [HILFSFUNKTIONEN]
 function setPriorityOrder(newOrder = []) {
   state.order = Array.isArray(newOrder) && newOrder.length ? newOrder : [...DEFAULT_ORDER];
   dispatchEvent(new CustomEvent("cb:logistics:prio", { detail: { order: state.order } }));
   console.info("[logistics] Neue Prioritäten:", state.order.join(", "));
 }

 function getPriority(item) {
   return state.order.indexOf(item);
 }

 // [KLASSEN]
 class LogisticsManager {
   static getOrder() { return state.order; }
   static setOrder(arr) { setPriorityOrder(arr); }
   static compare(a, b) { return getPriority(a.item) - getPriority(b.item); }
   static sortQueue() { state.queue.sort(LogisticsManager.compare); }
 }

 // [EVENTS - Listener]
 addEventListener("req:logistics:prio:set", e => {
   const { order } = e.detail || {};
   setPriorityOrder(order);
 });

 // [EXPORT]
 window.LogisticsManager = LogisticsManager;
