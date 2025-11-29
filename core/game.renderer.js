/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler
 * Version : v25.11.29-mapfix
 * Zweck   : Rein fürs Zeichnen → Boden (Map), Gebäude, Baustellen, Overlays
 * ============================================================================
 *
 * WICHTIG:
 * - Game.map kommt aus game.map.js / map-bridge
 * - Wir rufen pro Frame die Zeichenfunktion der Map auf
 * - Danach zeichnen wir alle Gebäude aus Buildings.list
 * - Kamera-Transform wird einmalig pro Frame gesetzt
 * ========================================================================= */

import { Buildings } from "./game.buildings.js";

/** Zentraler Renderer – wird von game.js benutzt */
export const Renderer = {

    /** Wird aus game.js mit dem Game-Objekt aufgerufen */
    init(game) {
        this.game = game;
        this.ctx  = game.ctx;
        // Fallback: wenn game.map.tileSize nicht existiert, nimm game.tileSize oder 64
        this.tile = (game.map && game.map.tileSize) || game.tileSize || 64;

        const LOG = (window.CBLog?.ok ?? console.log);
        LOG("[renderer]", "initialisiert (tileSize=%d)", this.tile);
    },

    /** Haupt-Zeichnen pro Frame */
    draw() {
        const g   = this.game;
        const ctx = this.ctx;
        if (!g || !ctx) return;

        const cam = g.camera || null;

        ctx.save();

        // -------------------------------------------------------------
        // 1. Kamera-Transform setzen (falls vorhanden)
        // -------------------------------------------------------------
        if (cam && typeof cam.applyTransform === "function") {
            // Neues Kamera-Modul hat eigene applyTransform(...)
            cam.applyTransform(ctx);
        } else if (cam && typeof cam.toScreen === "function") {
            // Älteres Kamera-Modul: wir setzen eine einfache translate/scale
            const z = cam.zoom || 1;
            ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
        } else {
            // Fallback: Identitäts-Transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // -------------------------------------------------------------
        // 2. Map zeichnen (Boden / Terrain)
        // -------------------------------------------------------------
        const map = g.map;

        if (map) {
            // a) bevorzugt: Sichtfeld-Culling
            if (typeof map.drawLayersCulled === "function") {
                map.drawLayersCulled(ctx);
            }
            // b) alternativ: einfache draw-Funktion
            else if (typeof map.draw === "function") {
                map.draw(ctx);
            }
            // c) alternativ: render()
            else if (typeof map.render === "function") {
                map.render(ctx);
            }
            // Wenn nichts davon existiert, lassen wir die Map einfach weg.
            // (Dann liegt der Fehler in game.map.js → separat prüfen)
        }

        // -------------------------------------------------------------
        // 3. Gebäude / Baustellen zeichnen
        // -------------------------------------------------------------
        const list = Buildings.getAll ? Buildings.getAll() : (g.buildings || []);
        for (const b of list) {
            this.drawBuilding(b);
        }

        // -------------------------------------------------------------
        // 4. Debug-/Produktions-Overlays
        // -------------------------------------------------------------
        this.drawOverlays();

        ctx.restore();
    },

    // -----------------------------------------------------------------
    //  Gebäude ODER Baustelle zeichnen
    // -----------------------------------------------------------------
    drawBuilding(b) {
        if (!b) return;
        const ctx = this.ctx;
        const t   = this.tile;

        const px = b.x * t;
        const py = b.y * t;

        // Baustelle (buildStage 0/undefined)
        if (b.buildStage === 0 || b.buildStage == null) {
            ctx.fillStyle   = "rgba(255,200,50,0.35)";
            ctx.strokeStyle = "rgba(120,60,0,0.85)";
            ctx.lineWidth   = 2;

            ctx.fillRect(px, py, b.w * t, b.h * t);
            ctx.strokeRect(px, py, b.w * t, b.h * t);

            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.font      = "bold 16px system-ui";
            ctx.fillText("🔨", px + 4, py + 20);
            return;
        }

        // Fertiges Gebäude – Definition aus Registry holen
        const reg = window.Registry || {};
        const def = (typeof reg.getBuilding === "function")
            ? reg.getBuilding(b.type || b.id)
            : (reg.buildings && reg.buildings[b.type || b.id]) || null;

        // Diagnose: falls Registry-Eintrag fehlt → lila Block
        if (!def) {
            ctx.fillStyle = "magenta";
            ctx.fillRect(px, py, b.w * t, b.h * t);
            return;
        }

        const imgKey = def.img || def.sprite || def.icon;
        const img = window.Assets?.get ? Assets.get(imgKey) : null;

        // Diagnose: falls Sprite fehlt → roter Block
        if (!img) {
            ctx.fillStyle = "red";
            ctx.fillRect(px, py, b.w * t, b.h * t);
            return;
        }

        ctx.drawImage(img, px, py, b.w * t, b.h * t);
    },

    /** Debug-/Produktions-Overlay (optional) */
    drawOverlays() {
        // Platzhalter:
        // - Produktion-Icons
        // - Selektions-Rahmen
        // - Debug-Grid etc.
    }
};
