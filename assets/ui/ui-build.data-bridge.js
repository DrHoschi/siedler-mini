/**
 * ui-build.data-bridge.js – v1.0 (stabil)
 * ---------------------------------------
 * Brücke zwischen Registry/JSON und UI-Build.
 */

import { Registry } from "../core/registry.js";
import { UIBuild } from "./ui-build.js";

export const UIBuildBridge = (function() {
  let retry = 0;

  function tryLoad() {
    // Datenquelle bevorzugt Registry
    let items = [];
    if (Registry && Registry.getBuildings) {
      items = Registry.getBuildings();
      if (items && items.length) {
        UIBuild.setItems(items);
        return;
      }
    }

    // Fallback
    fetch("assets/data/buildings.json")
      .then(r => r.json())
      .then(json => {
        if (json && json.buildings) {
          UIBuild.setItems(json.buildings);
          console.log("[ui-build.bridge] Fallback JSON erkannt");
        }
      })
      .catch(err => console.error("[ui-build.bridge] Fehler:", err));
  }

  function init() {
    console.log("[ui-build.bridge] aktiv");
    tryLoad();
  }

  return {
    init
  };
})();
