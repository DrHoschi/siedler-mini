/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.05-workarea-overlay-final-global
 *
 * Zweck   :
 *   Zentraler Renderer für:
 *   - Map / Terrain (Fallback, falls GameMap.render nicht alles übernimmt)
 *   - Gebäude / Baustellen (mit einfachen Platzhalter-Grafiken)
 *   - Debug-/Produktions-Overlays (WorkArea, Pfade, Unit-Overlay)
 *
 * WICHTIG:
 *   - KEINE ES-Module (kein import/export), sondern klassisches IIFE
 *   - `window.Renderer` wird global bereitgestellt
 *   - Game.js ruft dann `Renderer.init(Game)` + `Renderer.draw(Game)` auf
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

    /**
     * Wird beim Game-Start aus game.js aufgerufen.
     * Erwartet das zentrale Game-Objekt mit:
     *   - Game.canvas (Haupt-Canvas)
     *   - Game.ctx    (2D-Context)
     *   - Game.map    (mit tileSize, draw / drawLayersCulled)
     *   - Game.camera (optional, mit applyTransform / toScreen)
     */
    init(game) {
      this.game = game;
      this.ctx  = game.ctx;

      // Overlay-Canvas (für WorkAreas, Pfade, Unit-Overlay etc.)
      this.canvasOverlay = document.getElementById('overlay');
      this.ctxOverlay    = this.canvasOverlay
        ? this.canvasOverlay.getContext('2d')
        : null;

      // Fallback: wenn game.map.tileSize nicht existiert
      this.tile = (game.map && game.map.tileSize) || game.tileSize || 64;

      LOG('initialisiert (tileSize=%d)', this.tile);

      // Overlay-Größe initial + on resize an Game-Canvas koppeln
      this._syncOverlaySize();
      window.addEventListener('resize', () => this._syncOverlaySize());
    },

    /**
     * Stellt sicher, dass #overlay immer dieselbe Pixelgröße wie der
     * Game-Canvas hat (Breite/Höhe in Pixel, NICHT CSS-Scale).
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

      ctx.save();

      // -----------------------------------------------------------
      // 1. Kamera-Transform setzen (falls vorhanden)
      // -----------------------------------------------------------
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

      // -----------------------------------------------------------
      // 2. Map zeichnen (Boden / Terrain)
      //    → nur als Fallback, falls GameMap.render nicht alles macht.
      // -----------------------------------------------------------
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

      // -----------------------------------------------------------
      // 3. Gebäude / Baustellen zeichnen
      // -----------------------------------------------------------
      const list = getBuildingsList(g);
      for (const b of list) {
        this.drawBuilding(b);
      }

      ctx.restore();

      // -----------------------------------------------------------
      // 4. Overlays (WorkArea, Pfade, Units)
      // -----------------------------------------------------------
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

      // Diagnose: falls Sprite fehlt → roter Block
      if (!img) {
      //  ctx.fillStyle = 'red';
       // ctx.fillRect(px, py, b.w * t, b.h * t);
        return;
      }

      // Einfaches Draw – später gerne durch isometrische Projektion ersetzen
      ctx.drawImage(
        img,
        px, py,
        b.w * t, b.h * t
      );
    },

    // -----------------------------------------------------------------
    // Overlays zeichnen (ein einzelnes Canvas über dem Spiel)
    // -----------------------------------------------------------------
    drawOverlays() {
      const ctxO = this.ctxOverlay;
      if (!ctxO) return;

      this._syncOverlaySize();

      // Overlay immer im Screen-Space:
      ctxO.setTransform(1, 0, 0, 1, 0, 0);
      ctxO.clearRect(0, 0, ctxO.canvas.width, ctxO.canvas.height);

      // DEBUG (kann bei Bedarf wieder aktiviert werden):
      // ctxO.fillStyle = 'rgba(255,0,0,0.25)';
      // ctxO.fillRect(0, 0, 80, 80);

      try {
        if (window.OverlayHooks && typeof window.OverlayHooks.draw === 'function') {
          // OverlayHooks verteilt den Zeichenvorgang auf alle Layer,
          // z.B. 'workareas', 'paths', 'unit-overlay', 'test-workarea-debug'
          window.OverlayHooks.draw(ctxO);
        }
      } catch (e) {
        WARN('OverlayHooks.draw Fehler:', e);
      }
    }
  };

  // Global verfügbar machen, damit game.js darauf zugreifen kann
  window.Renderer = Renderer;

  LOG('Modul geladen – Renderer global verfügbar.');

})();
