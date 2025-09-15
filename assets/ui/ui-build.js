/**
 * ui-build.js – v18.3.2 (stabiler Stand)
 * --------------------------------------
 * Stellt das Baumenü bereit und rendert die Gebäudekarten.
 * Arbeitet mit Registry + Fallback JSON.
 */

import { UIDataBridge } from "./ui-build.data-bridge.js";

export const UIBuild = (function() {
  let root, list;

  function init() {
    root = document.getElementById("ui-build");
    if (!root) {
      console.warn("[ui-build] Kein Container gefunden!");
      return;
    }
    list = root.querySelector(".build-list");
    console.log("[ui-build] bereit (v18.3.2)");
  }

  function setItems(items) {
    if (!list) return;
    list.innerHTML = "";

    items.forEach(it => {
      const card = document.createElement("div");
      card.className = "build-card";

      // Icon
      const img = document.createElement("img");
      img.src = it.icon || it.sprite || "assets/placeholder64.PNG";
      img.alt = it.name;
      card.appendChild(img);

      // Name
      const lbl = document.createElement("span");
      lbl.textContent = it.name;
      card.appendChild(lbl);

      list.appendChild(card);
    });

    console.log(`[ui-build] Items gesetzt (${items.length} Karten)`);
  }

  return {
    init,
    setItems
  };
})();
