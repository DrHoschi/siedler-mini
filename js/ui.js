// ui.js
//
// Bau-Menü und UI-Steuerung
// Verknüpft Gebäude-Buttons mit den Grafiken aus assets.js

import { ASSETS } from "../core/assets.js";

export class UI {
    constructor(game) {
        this.game = game;
        this.selectedBuilding = null;

        // Menü anlegen
        this.menu = document.createElement("div");
        this.menu.id = "build-menu";
        this.menu.style.position = "absolute";
        this.menu.style.bottom = "10px";
        this.menu.style.left = "10px";
        this.menu.style.display = "flex";
        this.menu.style.gap = "6px";
        this.menu.style.background = "rgba(0,0,0,0.4)";
        this.menu.style.padding = "6px";
        this.menu.style.borderRadius = "6px";
        document.body.appendChild(this.menu);

        // Buttons hinzufügen
        this.createButton("HQ", ASSETS.building.hq, "hq");
        this.createButton("Depot", ASSETS.building.depot, "depot");
        this.createButton("Farm", ASSETS.building.farm, "farm");
        this.createButton("Holzfäller", ASSETS.building.lumberjack, "lumberjack");
        this.createButton("Fischer", ASSETS.building.fischer, "fischer");
        this.createButton("Haus1", ASSETS.building.haeuser1, "haeuser1");
        this.createButton("Haus2", ASSETS.building.haeuser2, "haeuser2");
        this.createButton("Steinbruch", ASSETS.building.stonebraker, "stonebraker");
        this.createButton("Wassermühle", ASSETS.building.wassermuehle, "wassermuehle");
        this.createButton("Windmühle", ASSETS.building.windmuehle, "windmuehle");
        this.createButton("Bäckerei", ASSETS.building.baeckerei, "baeckerei");
    }

    createButton(label, iconSrc, buildingId) {
        const btn = document.createElement("button");
        btn.style.width = "48px";
        btn.style.height = "48px";
        btn.style.backgroundImage = `url(${iconSrc})`;
        btn.style.backgroundSize = "cover";
        btn.style.border = "1px solid #888";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.title = label;

        btn.onclick = () => {
            this.selectedBuilding = buildingId;
            console.log("Gebäude gewählt:", buildingId);
        };

        this.menu.appendChild(btn);
    }

    getSelectedBuilding() {
        return this.selectedBuilding;
    }
}
