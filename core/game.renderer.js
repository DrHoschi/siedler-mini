/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler
 * Version : v25.12.04-renderer-fix-overlay
 * Zweck   : Korrektes Zeichnen von Map, Gebäuden und Overlay-Layern
 * ========================================================================= */

import { Buildings } from "./game.buildings.js";

export const Renderer = {

    init(game) {
        this.game = game;
        this.ctx  = game.ctx;

        // === NEU: Overlay Canvas sicher abrufen ===
        this.canvasOverlay = document.getElementById("overlay");
        if (this.canvasOverlay) {
            this.ctxOverlay = this.canvasOverlay.getContext("2d");
        }

        // Tilesize fallback
        this.tile = (game.map?.tileSize) || game.tileSize || 64;

        (window.CBLog?.ok || console.log)("[renderer] initialisiert (tile=%d)", this.tile);
    },

    // =====================================================================
    // MAIN DRAW LOOP
    // =====================================================================
    draw() {
        const g   = this.game;
        const ctx = this.ctx;

        if (!g || !ctx) return;

        const cam = g.camera || null;
        ctx.save();

        // -------------------------------------------------------------
        // Kamera anwenden (egal welches Kamera-Modul geladen ist)
        // -------------------------------------------------------------
        if (cam?.applyTransform) {
            cam.applyTransform(ctx);
        }
        else if (cam?.toScreen) { 
            const z = cam.zoom || 1;
            ctx.setTransform(z,0,0,z, -cam.x*z, -cam.y*z);
        }
        else {
            ctx.setTransform(1,0,0,1,0,0);
        }

        // -------------------------------------------------------------
        // MAP
        // -------------------------------------------------------------
        const map = g.map;
        if (map) {
            if (map.drawLayersCulled)      map.drawLayersCulled(ctx);
            else if (map.draw)             map.draw(ctx);
            else if (map.render)           map.render(ctx);
        }

        // -------------------------------------------------------------
        // GEBÄUDE / BAUSTELLEN
        // -------------------------------------------------------------
        const list = Buildings.getAll ? Buildings.getAll() : (g.buildings || []);
        for (const b of list){
            this.drawBuilding(b);
        }

        ctx.restore();

        // -------------------------------------------------------------
        // OVERLAYS (WorkArea, Pfade, etc.)
        // → Wichtig: im Bildschirm-Space, NICHT im Welt-Space zeichnen!
        // -------------------------------------------------------------
        this.drawOverlays();
    },

    // =====================================================================
    // Gebäude zeichnen
    // =====================================================================
    drawBuilding(b) {
        if (!b) return;
        const ctx = this.ctx;
        const t   = this.tile;

        const px = b.x * t;
        const py = b.y * t;

        // Baustelle
        if (b.buildStage === 0 || b.buildStage == null) {
            ctx.fillStyle   = "rgba(255,200,50,0.35)";
            ctx.strokeStyle = "rgba(120,60,0,0.85)";
            ctx.fillRect(px, py, b.w*t, b.h*t);
            ctx.strokeRect(px, py, b.w*t, b.h*t);
            return;
        }

        // Registry → Sprite holen
        const def = window.Registry?.getBuilding?.(b.type || b.id);
        if (!def) {
            ctx.fillStyle = "magenta";
            ctx.fillRect(px, py, b.w*t, b.h*t);
            return;
        }

        const imgKey = def.img || def.sprite || def.icon;
        const img    = window.Assets?.get?.(imgKey);

        if (!img) {
            ctx.fillStyle = "red";
            ctx.fillRect(px, py, b.w*t, b.h*t);
            return;
        }

        ctx.drawImage(img, px, py, b.w*t, b.h*t);
    },

    // =====================================================================
    // Overlays (WorkAreas, Pfade, Trees, Stones …)
    // =====================================================================
    drawOverlays() {

        const ctxO = this.ctxOverlay;
        if (!ctxO) return;

        // Overlay arbeitet im SCREEN-SPACE
        ctxO.save();
        ctxO.setTransform(1,0,0,1,0,0);

        // Canvas leeren
        ctxO.clearRect(0,0, ctxO.canvas.width, ctxO.canvas.height);

        try {
            if (window.OverlayHooks?.draw) {
                // Übergibt korrekten Camera-State automatisch an Layer
                window.OverlayHooks.draw(ctxO);
            }
        } catch (e) {
            (window.CBLog?.warn || console.warn)(
                "[renderer] OverlayHooks.draw Fehler:", e
            );
        }

        ctxO.restore();
    }
};
