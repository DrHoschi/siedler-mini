/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler
 * Version : v25.11.28-final
 * Zweck   : Zentrale Gebäudeliste + Definitionen pro Gebäude
 * ============================================================================
 */

export const Buildings = {

    /** Liste aller Gebäude-Instanzen */
    list: [],

    /**
     * Neues Gebäude erzeugen
     * → wird von game.build.js aufgerufen
     */
    create(buildingType, x, y) {
        const def = window.Registry.buildings[buildingType];

        if (!def) {
            console.warn("[buildings] Unbekannter Typ:", buildingType);
            return null;
        }

        const obj = {
            id: crypto.randomUUID(),

            // Registry-Daten
            type: buildingType,
            w: def.size.w,
            h: def.size.h,

            // Position (Tile-Koordinaten)
            x, y,

            // Bauphasen
            buildStage: 0,       // 0 = Baustelle → später 1,2,3 = complete

            // Ressourcen/Produktion
            stock: {},
            productionRule: def.productionRule || null
        };

        this.list.push(obj);
        return obj;
    },

    /** Gibt alle Gebäude zurück */
    getAll() {
        return this.list;
    },

    /**
     * Prüft, ob eine Tile-Koordinate ein Gebäude enthält
     */
    getAt(tx, ty) {
        return this.list.find(b =>
            tx >= b.x && ty >= b.y &&
            tx < b.x + b.w &&
            ty < b.y + b.h
        );
    }
};
