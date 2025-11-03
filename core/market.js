/* ============================================================================
 * Datei   : core/market.js
 * Version : v25.11.03 (skeleton)
 * Zweck   : Markt- & Routen-System (Intra-Region Handel)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 * Ereignisse:
 *   req:market:route:add  {from,to,allow:[…],cap:N}
 *   cb:market:route:ok    {routeId}
 *   cb:market:route:list  {routes:[…]}
 * ============================================================================
 */

let nextRouteId = 1;
const routes = [];

class MarketRoute {
  constructor(from, to, allow = [], cap = 20) {
    this.id = nextRouteId++;
    this.from = from;
    this.to = to;
    this.allow = allow;
    this.cap = cap;
    this.active = true;
  }
}

function addRoute({ from, to, allow, cap }) {
  const r = new MarketRoute(from, to, allow, cap);
  routes.push(r);
  dispatchEvent(new CustomEvent("cb:market:route:ok", { detail: { routeId: r.id } }));
  dispatchEvent(new CustomEvent("cb:market:route:list", { detail: { routes } }));
  console.info("[market] Neue Route", r);
}

addEventListener("req:market:route:add", e => addRoute(e.detail || {}));

window.Market = { routes, addRoute };
