/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.04-map+overlay-workarea
 *
 * Zweck   :
 *   - Zentraler Renderer für:
 *       • Boden / Map
 *       • Gebäude / Baustellen
 *       • Overlay-Layer (Trees, Traces, WorkAreas, …) via OverlayHooks
 *
 * WICHTIG:
 *   - Game.map kommt aus game.map.js / map-bridge
 *   - Pro Frame:
 *       1) Kamera-Transform setzen
 *       2) Map zeichnen
 *       3) Gebäude / Baustellen zeichnen
 *       4) Overlay-Canvas leeren + OverlayHooks.draw(...) ausführen
 * ========================================================================== */

import { Buildings } from "./game.buildings.js";

/** Zentraler Renderer – wird von game.js benutzt */
export const Renderer = {

    // ---------------------------------------------------------------------
    // INIT
    // ---------------------------------------------------------------------
    /**
     * init(game)
     *  - wird einmalig aus game.js aufgerufen
     *  - merkt sich:
     *      • Game-Objekt
     *      • Haupt-Context (Terrain & Gebäude)
     *      • Overlay-Canvas + -Context (WorkAreas, Pfade, …)
     */
    init(game) {
        this.game = game;

        // Haupt-Canvas / Context (Map + Gebäude)
        this.ctx = game.ctx;
        this.canvas = (game.canvas || this.ctx?.canvas || document.getElementById("game"));

        // Overlay-Canvas (für WorkAreas, Traces, Trees, …)
        this.canvasOverlay = document.getElementById("overlay");
        if (this.canvasOverlay) {
            this.ctxOverlay = this.canvasOverlay.getContext("2d");
        } else {
            this.ctxOverlay = null;
        }

        // Fallback: wenn game.map.tileSize nicht existiert, nimm game.tileSize oder 64
        this.tile = (game.map && game.map.tileSize) || game.tileSize || 64;

        const LOG = (window.CBLog?.ok ?? console.log);
        LOG("[renderer]", "initialisiert (tileSize=%d)", this.tile);
    },

    // ---------------------------------------------------------------------
    // HAUPTZEICHNEN
    // ---------------------------------------------------------------------
    /** Haupt-Zeichnen pro Frame (wird von game.tick / game.js aufgerufen) */
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
            // Neues Kamera-Modul: eigene applyTransform(...)
            cam.applyTransform(ctx);
        } else if (cam && typeof cam.toScreen === "function") {
            // Älteres Kamera-Modul: einfache translate/scale
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

        ctx.restore();

        // -------------------------------------------------------------
        // 4. Overlay-Layer (WorkAreas, Traces, Trees, …) zeichnen
        //    → eigener Canvas im SCREEN-Space
        // -------------------------------------------------------------
        this.drawOverlays();
    },

    // ---------------------------------------------------------------------
    // GEBÄUDE / BAUSTELLEN
    // ---------------------------------------------------------------------
    drawBuilding(b) {
        if (!b) return;
        const ctx = this.ctx;
        const t   = this.tile;

        const px = b.x * t;
        const py = b.y * t;

        // ------------------------------
        // Baustelle (buildStage 0/undefined)
        // ------------------------------
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

        // ------------------------------
        // Fertiges Gebäude – Definition aus Registry holen
        // ------------------------------
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
        const img    = window.Assets?.get ? Assets.get(imgKey) : null;

        // Diagnose: falls Sprite fehlt → roter Block
        if (!img) {
            ctx.fillStyle = "red";
            ctx.fillRect(px, py, b.w * t, b.h * t);
            return;
        }

        ctx.drawImage(img, px, py, b.w * t, b.h * t);
    },

    // ---------------------------------------------------------------------
    // OVERLAYS (WorkAreas, Pfade, Trees, …)
    // ---------------------------------------------------------------------
    /**
     * drawOverlays()
     *
     * - Zeichnet ALLE über OverlayHooks registrierten Layer auf das
     *   Canvas #overlay im SCREEN-Space.
     * - Dazu gehören u. a.:
     *      • PathOverlay / traces
     *      • Trees-/Stones-Overlay
     *      • WorkArea-Kreise (GameWorkArea / "workareas")
     */
    drawOverlays() {
        const ctxO = this.ctxOverlay;
        if (!ctxO) return;

        // 1) Canvas-Größe an Haupt-Canvas anpassen (wichtig für iOS):
        const mainCanvas = this.canvas || this.ctx?.canvas;
        if (mainCanvas &&
            (ctxO.canvas.width  !== mainCanvas.width ||
             ctxO.canvas.height !== mainCanvas.height)) {

            ctxO.canvas.width  = mainCanvas.width;
            ctxO.canvas.height = mainCanvas.height;
        }

        // 2) In den SCREEN-Space wechseln (kein Welt-Transform)
        ctxO.setTransform(1, 0, 0, 1, 0, 0);

        // 3) Komplettes Overlay löschen
        ctxO.clearRect(0, 0, ctxO.canvas.width, ctxO.canvas.height);

        // 4) Kamera-State für OverlayHooks vorbereiten
        const g   = this.game || {};
        const cam = g.camera || window.GameCamera || {};
        let camState = null;

        if (typeof cam.getState === "function") {
            camState = cam.getState();
        } else {
            camState = {
                x   : cam.x    || 0,
                y   : cam.y    || 0,
                zoom: cam.zoom || 1
            };
        }

        // 5) Alle registrierten Overlay-Layer zeichnen lassen
        try {
            if (window.OverlayHooks && typeof window.OverlayHooks.draw === "function") {
                // OverlayHooks kümmert sich intern um:
                //  - Bäume / Steine
                //  - Pfad-Traces
                //  - WorkArea-Kreise (Layer "workareas")
                window.OverlayHooks.draw(ctxO, camState);
            }
        } catch (e) {
            (window.CBLog?.warn || console.warn)(
                "[renderer] OverlayHooks.draw Fehler:", e
            );
        }
    }
};
