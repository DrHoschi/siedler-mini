/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler
 * Version : v25.11.28-initial
 * Zweck   : Rein fürs Zeichnen → Gebäude, Baustellen, Boden, Overlays
 * ============================================================================
 */

import { Buildings } from "./game.buildings.js";

export const Renderer = {

    init(game) {
        this.game = game;
        this.ctx = game.ctx;

        console.info("ℹ️ [renderer] initialisiert");
    },

    /** Wird vom Tick aufgerufen */
    draw() {
        const ctx = this.ctx;
        const cam = this.game.camera;

        ctx.save();
        cam.applyTransform(ctx);

        // 1. Boden (Map)
        this.game.map.draw(ctx);

        // 2. Gebäude & Baustellen
        for (const b of Buildings.getAll()) {
            this.drawBuilding(b);
        }

        ctx.restore();
    },

    drawBuilding(b) {
        const ctx = this.ctx;
        const tile = this.game.map.tileSize;

        const px = b.x * tile;
        const py = b.y * tile;

        if (b.buildStage === 0) {
            // Baustelle
            ctx.fillStyle = "rgba(255,200,50,0.4)";
            ctx.fillRect(px, py, b.w * tile, b.h * tile);
            ctx.strokeStyle = "rgba(120,60,0,0.8)";
            ctx.strokeRect(px, py, b.w * tile, b.h * tile);
            return;
        }

        // Fertiges Gebäude
        const def = window.Registry.buildings[b.type];
        if (!def || !def.img) {
            ctx.fillStyle = "red";
            ctx.fillRect(px, py, b.w * tile, b.h * tile);
            return;
        }

        const img = window.Assets.get(def.img);
        if (!img) return;

        ctx.drawImage(
            img,
            px,
            py,
            b.w * tile,
            b.h * tile
        );
    }
};
