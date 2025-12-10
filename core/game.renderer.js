/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-workarea-maincanvas-prod-v5
 *
 * Zweck   :
 *   Zentraler Renderer für:
 *   - Map / Terrain
 *   - Gebäude / Baustellen
 *   - Debug-/Produktions-Overlays:
 *       • WorkArea (Haupt-Canvas, Weltkoordinaten)
 *       • Holz / Stein / Fisch (Haupt-Canvas, Weltkoordinaten)
 *       • Pfade/Units über OverlayHooks auf separatem Overlay-Canvas
 *
 * WICHTIG:
 *   - KEINE ES-Module (kein import/export)
 *   - `window.Renderer` global
 *   - game.js ruft `Renderer.init(Game)` + `Renderer.draw(Game)` auf
 * ============================================================================ */

(function () {
  'use strict';

  const TAG  = '[renderer]';
  const LOG  = (window.CBLog?.ok   ?? console.log).bind(console, TAG);
  const WARN = (window.CBLog?.warn ?? console.warn).bind(console, TAG);

  // ---------------------------------------------------------------------------
  // Helper: Buildings / Registry
  // ---------------------------------------------------------------------------

  function getBuildingsList(game) {
    const B = window.Buildings;
    if (B && typeof B.getAll === 'function') {
      return B.getAll();
    }
    return game?.buildings || [];
  }

  function getBuildingDef(b) {
    const reg = window.Registry || {};
    if (typeof reg.getBuilding === 'function') {
      return reg.getBuilding(b.type || b.id);
    }
    if (reg.buildings) {
      return reg.buildings[b.type || b.id] || null;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // ZENTRALER RENDERER
  // ---------------------------------------------------------------------------

  const Renderer = {

    game: null,
    ctx : null,

    canvasOverlay: null,
    ctxOverlay   : null,

    tile: 64,

    /**
     * Init wird beim Game-Start aus game.js aufgerufen.
     */
    init(game) {
      this.game = game;
      this.ctx  = game.ctx;

      this.canvasOverlay = document.getElementById('overlay');
      this.ctxOverlay    = this.canvasOverlay
        ? this.canvasOverlay.getContext('2d')
        : null;

      this.tile = (game.map && game.map.tileSize) || game.tileSize || 64;

      LOG('initialisiert (tileSize=%d)', this.tile);

      this._syncOverlaySize();
      window.addEventListener('resize', () => this._syncOverlaySize());
    },

    /**
     * Overlay-Canvas immer an Game-Canvas koppeln (Pixelgröße, kein CSS-Scale).
     */
    _syncOverlaySize() {
      if (!this.canvasOverlay || !this.game?.canvas) return;

      const src = this.game.canvas;  // <canvas id="game">
      const dst = this.canvasOverlay;

      if (dst.width  !== src.width)  dst.width  = src.width;
      if (dst.height !== src.height) dst.height = src.height;
    },

    /**
     * Haupt-Zeichnen pro Frame.
     * Wird aus game.js als `Renderer.draw(Game)` aufgerufen.
     */
    draw(gameArg) {
      const g   = gameArg || this.game;
      const ctx = this.ctx;
      if (!g || !ctx) return;

      const cam = g.camera || null;

      // ================================
      // 1) HAUPT-CANVAS (Weltkoordinaten)
      // ================================
      ctx.save();

      // 1a) Kamera-Transform setzen
      if (cam && typeof cam.applyTransform === 'function') {
        // Neues Kamera-Modul
        cam.applyTransform(ctx);
      } else if (cam && typeof cam.toScreen === 'function') {
        // Älteres Kamera-Modul: einfache translate/scale
        const z = cam.zoom || 1;
        ctx.translate(-cam.x * z, -cam.y * z);
        ctx.scale(z, z);
      } else {
        // Fallback: Identitäts-Transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      const map = g.map;

      // 1b) Map / Terrain zeichnen
      if (map) {
        if (typeof map.drawLayersCulled === 'function') {
          map.drawLayersCulled(ctx);
        } else if (typeof map.draw === 'function') {
          map.draw(ctx);
        } else if (typeof map.render === 'function') {
          map.render(ctx);
        }
      }

      // 1c) Gebäude / Baustellen zeichnen
      const list = getBuildingsList(g);
      for (const b of list) {
        this.drawBuilding(b);
      }

      // 1d) WorkArea-Kreise auf Haupt-Canvas (Weltkoordinaten)
      if (window.GameWorkArea && typeof window.GameWorkArea.drawOnMainCanvas === 'function') {
        window.GameWorkArea.drawOnMainCanvas(ctx, cam, this.tile);
      }

      // 1e) Produktions-Module – ALLE in Weltkoordinaten,
      //     Kamera-Transform kommt vom Renderer, KEIN eigenes toScreen!
      if (window.ProductionWood && typeof window.ProductionWood.drawOnMainCanvas === 'function') {
        window.ProductionWood.drawOnMainCanvas(ctx, cam, this.tile);
      }

      if (window.ProductionStone && typeof window.ProductionStone.drawOnMainCanvas === 'function') {
        window.ProductionStone.drawOnMainCanvas(ctx, cam, this.tile);
      }

      if (window.ProductionFish && typeof window.ProductionFish.drawOnMainCanvas === 'function') {
        window.ProductionFish.drawOnMainCanvas(ctx, cam, this.tile);
      }

      // 1f) Kamera-Transform wieder aufheben – ab hier nur noch Screen-Space
      ctx.restore();

      // ================================
      // 2) OVERLAY-CANVAS (Screen-Space)
      // ================================
      this.drawOverlays();
    },

    // -----------------------------------------------------------------
    // Gebäude ODER Baustelle zeichnen
    // -----------------------------------------------------------------
    drawBuilding(b) {
      if (!b) return;
      const ctx = this.ctx;
      const t   = this.tile;

      const px = b.x * t;
      const py = b.y * t;

      // Baustelle (buildStage 0/undefined)
      if (b.buildStage === 0 || b.buildStage == null) {
        ctx.fillStyle   = 'rgba(255,200,50,0.35)';
        ctx.strokeStyle = 'rgba(120,60,0,0.85)';
        ctx.lineWidth   = 2;

        ctx.fillRect(px, py, b.w * t, b.h * t);
        ctx.strokeRect(px, py, b.w * t, b.h * t);

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font      = 'bold 16px system-ui';
        ctx.fillText('🔨', px + 4, py + 20);
        return;
      }

      // Fertiges Gebäude – Definition aus Registry holen
      const def = getBuildingDef(b);

      // Diagnose: falls Registry-Eintrag fehlt → lila Block
      if (!def) {
        ctx.fillStyle = 'magenta';
        ctx.fillRect(px, py, b.w * t, b.h * t);
        return;
      }

      const imgKey = def.img || def.sprite || def.icon;
      const img    = window.Assets?.get ? Assets.get(imgKey) : null;

      // Falls Sprite fehlt, zeichnen wir NICHTS
      if (!img) {
        return;
      }

      ctx.drawImage(
        img,
        px, py,
        b.w * t, b.h * t
      );
    },

    // -----------------------------------------------------------------
    // Overlays zeichnen (ein einzelnes Canvas über dem Spiel, Screen-Space)
    // -----------------------------------------------------------------
    drawOverlays() {
      const ctxO = this.ctxOverlay;
      if (!ctxO) return;

      this._syncOverlaySize();

      // Overlay immer im Screen-Space:
      ctxO.setTransform(1, 0, 0, 1, 0, 0);
      ctxO.clearRect(0, 0, ctxO.canvas.width, ctxO.canvas.height);

      try {
        if (window.OverlayHooks && typeof window.OverlayHooks.draw === 'function') {
          window.OverlayHooks.draw(ctxO);
        }
      } catch (e) {
        WARN('OverlayHooks.draw Fehler:', e);
      }
    }
  };

  // Global verfügbar machen
  window.Renderer = Renderer;

  LOG('Modul geladen – Renderer global verfügbar (WorkArea + Holz/Stein/Fisch auf MainCanvas).');

})();
