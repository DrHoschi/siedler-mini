/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-workarea-maincanvas-prod-v3
 *
 * Zweck   :
 *   Zentraler Renderer für:
 *   - Map / Terrain (Fallback, falls GameMap.render nicht alles übernimmt)
 *   - Gebäude / Baustellen (mit einfachen Platzhalter-Grafiken)
 *   - Debug-/Produktions-Overlays:
 *       • WorkArea (direkt auf Haupt-Canvas)
 *       • Holz/Stein/Fisch-Produktion (direkt auf Haupt-Canvas)
 *       • Pfade/Units über OverlayHooks auf separatem Overlay-Canvas
 * ============================================================================ */

(function () {
  'use strict';

  const TAG  = '[renderer]';
  const LOG  = (window.CBLog?.ok   ?? console.log).bind(console, TAG);
  const WARN = (window.CBLog?.warn ?? console.warn).bind(console, TAG);

  // Kleine Helper, um auch zu laufen, wenn Buildings oder Registry fehlen
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
    ctx: null,

    canvasOverlay: null,
    ctxOverlay: null,

    tile: 64,

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

    _syncOverlaySize() {
      if (!this.canvasOverlay || !this.game?.canvas) return;

      const src = this.game.canvas;  // <canvas id="game">
      const dst = this.canvasOverlay;

      if (dst.width  !== src.width)  dst.width  = src.width;
      if (dst.height !== src.height) dst.height = src.height;
    },

    draw(gameArg) {
      const g   = gameArg || this.game;
      const ctx = this.ctx;
      if (!g || !ctx) return;

      const cam = g.camera || null;

      ctx.save();

      // 1. Kamera-Transform
      if (cam && typeof cam.applyTransform === 'function') {
        cam.applyTransform(ctx);
      } else if (cam && typeof cam.toScreen === 'function') {
        const z = cam.zoom || 1;
        ctx.translate(-cam.x * z, -cam.y * z);
        ctx.scale(z, z);
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // 2. Map
      const map = g.map;
      if (map) {
        if (typeof map.drawLayersCulled === 'function') {
          map.drawLayersCulled(ctx);
        } else if (typeof map.draw === 'function') {
          map.draw(ctx);
        } else if (typeof map.render === 'function') {
          map.render(ctx);
        }
      }

      // 2b. Steine HINTER Gebäuden (Back-Layer)
      if (window.ProductionStone && typeof window.ProductionStone.drawBackOnMainCanvas === 'function') {
        window.ProductionStone.drawBackOnMainCanvas(ctx, cam, this.tile);
      }

      // 3. Gebäude / Baustellen
      const list = getBuildingsList(g);
      for (const b of list) {
        this.drawBuilding(b);
      }

      // 3b. WorkArea-Kreise auf Haupt-Canvas
      if (window.GameWorkArea && typeof window.GameWorkArea.drawOnMainCanvas === 'function') {
        window.GameWorkArea.drawOnMainCanvas(ctx, cam, this.tile);
      }

      // 3c. Produktions-Overlays Holz & Fisch (komplett vor Gebäuden)
      if (window.ProductionWood && typeof window.ProductionWood.drawOnMainCanvas === 'function') {
        window.ProductionWood.drawOnMainCanvas(ctx, cam, this.tile);
      }

      if (window.ProductionFish && typeof window.ProductionFish.drawOnMainCanvas === 'function') {
        window.ProductionFish.drawOnMainCanvas(ctx, cam, this.tile);
      }

      // 3d. Steine VOR Gebäuden (Front-Layer)
      if (window.ProductionStone && typeof window.ProductionStone.drawFrontOnMainCanvas === 'function') {
        window.ProductionStone.drawFrontOnMainCanvas(ctx, cam, this.tile);
      }

      ctx.restore();

      // 4. Overlay-Canvas (Pfade, Units ...)
      this.drawOverlays();
    },

    drawBuilding(b) {
      if (!b) return;
      const ctx = this.ctx;
      const t   = this.tile;

      const px = b.x * t;
      const py = b.y * t;

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

      const def = getBuildingDef(b);

      if (!def) {
        ctx.fillStyle = 'magenta';
        ctx.fillRect(px, py, b.w * t, b.h * t);
        return;
      }

      const imgKey = def.img || def.sprite || def.icon;
      const img    = window.Assets?.get ? Assets.get(imgKey) : null;

      if (!img) {
        return;
      }

      ctx.drawImage(
        img,
        px, py,
        b.w * t, b.h * t
      );
    },

    drawOverlays() {
      const ctxO = this.ctxOverlay;
      if (!ctxO) return;

      this._syncOverlaySize();

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

  window.Renderer = Renderer;

  LOG('Modul geladen – Renderer global verfügbar (WorkArea + Holz/Stein/Fisch auf MainCanvas, Stone mit Back/Front-Layern).');

})();
