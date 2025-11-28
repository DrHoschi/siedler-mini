/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler
 * Version : v25.11.28-final
 * Zweck   : Rein fürs Zeichnen → Gebäude, Baustellen, Boden, Overlays
 * ============================================================================
 */

import { Buildings } from "./game.buildings.js";

export const Renderer = {

    init(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.tile = game.map.tileSize;

        console.info("ℹ️ [renderer] initialisiert (final)");
    },

    /** Wird vom game.tick.js pro Frame aufgerufen */
    draw() {
        const ctx = this.ctx;
        const cam = this.game.camera;

        ctx.save();
        cam.applyTransform(ctx);

        // 1) Boden (Terrain-Layer aus der Map)
        this.game.map.draw(ctx);

        // 2) Gebäude + Baustellen
        for (const b of Buildings.getAll()) {
            this.drawBuilding(b);
        }

        // 3) Debug/Production-Overlays (optional)
        this.drawOverlays();

        ctx.restore();
    },

    /** Gebäude ODER Baustelle zeichnen */
    drawBuilding(b) {
        const ctx = this.ctx;
        const t  = this.tile;

        const px = b.x * t;
        const py = b.y * t;

        // --------------------------------------------------------
        // BAUSTELLE (buildStage = 0)
        // --------------------------------------------------------
        if (b.buildStage === 0) {
            ctx.fillStyle = "rgba(255,200,50,0.35)";
            ctx.fillRect(px, py, b.w * t, b.h * t);

            ctx.strokeStyle = "rgba(120,60,0,0.85)";
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, b.w * t, b.h * t);

            // kleines Icon auf der Baustelle
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.font = "bold 16px system-ui";
            ctx.fillText("🔨", px + 4, py + 20);

            return;
        }

        // --------------------------------------------------------
        // FERTIGES GEBÄUDE
        // --------------------------------------------------------
        const def = window.Registry.buildings[b.type];
        if (!def) {
            ctx.fillStyle = "magenta";
            ctx.fillRect(px, py, b.w * t, b.h * t);
            return;
        }

        const img = window.Assets.get(def.img);
        if (!img) {
            ctx.fillStyle = "red";
            ctx.fillRect(px, py, b.w * t, b.h * t);
            return;
        }

        ctx.drawImage(img, px, py, b.w * t, b.h * t);
    },

    /** Debug/Production-Overlay (optional) */
    drawOverlays() {
        // Placeholder für spätere Produktionsicons:
        // TODO: wenn Gebäude produziert → Icon
    }
};
