/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler
 * Version : v25.11.28-initial
 * Zweck   : Zentrale Gebäudeliste + Definitionen pro Gebäude
 * ============================================================================
 */

export const Buildings = {
    list: [],

    /**
     * Neues Gebäude-Objekt erzeugen (Daten kommen aus buildings.json)
     */
    create(buildingType, x, y) {
        const def = window.Registry.buildings[buildingType];
        if (!def) {
            console.warn("[buildings] Unbekannter Typ:", buildingType);
            return null;
        }

        const obj = {
            id: crypto.randomUUID(),
            type: buildingType,
            x, y,
            w: def.size.w,
            h: def.size.h,

            buildStage: 0,          // 0 = Baustelle
            stock: {},              // Ressourcenlager
            productionRule: def.productionRule || null
        };

        this.list.push(obj);
        return obj;
    },

    getAll() {
        return this.list;
    },

    /**
     * Holt ein Gebäude an einer Tile-Position
     */
    getAt(tx, ty) {
        return this.list.find(b =>
            tx >= b.x && ty >= b.y &&
            tx < b.x + b.w &&
            ty < b.y + b.h
        );
    }
};
