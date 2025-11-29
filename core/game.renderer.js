/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-split1
 * Zweck   : Rein fürs Zeichnen → Boden + Baustellen/Gebäude + Overlays
 * ========================================================================= */

(function () {
  'use strict';

  const TAG = '[renderer]';
  const LOG = (...a) => (window.CBLog?.ok ?? console.log)(TAG, ...a);

  const Renderer = {
    game: null,
    ctx : null,
    tile: 64,

    // -----------------------------------------------------------------------
    //  Init – wird aus game.js mit Game aufgerufen
    // -----------------------------------------------------------------------
    init (game) {
      this.game = game;
      this.ctx  = game.ctx;
      this.tile = game.tileSize || 64;

      LOG('initialisiert (tileSize=%d)', this.tile);
    },

    // -----------------------------------------------------------------------
    //  Haupt-Draw
    // -----------------------------------------------------------------------
    draw () {
      const g   = this.game;
      const ctx = this.ctx;
      if (!g || !ctx || !g.map) return;

      const cam = g.camera || {
        x   : 0,
        y   : 0,
        zoom: 1,
        applyTransform (c) {
          const z = this.zoom || 1;
          c.setTransform(z, 0, 0, z, -this.x * z, -this.y * z);
        }
      };

      ctx.save();
      if (typeof cam.applyTransform === 'function') {
        cam.applyTransform(ctx);
      }

      // 1) Boden (Terrain-Layer aus der Map)
      if (g.map?.draw) {
        g.map.draw(ctx);
      }

      // 2) Gebäude / Baustellen
      const list = window.Buildings?.getAll
        ? Buildings.getAll()
        : (g.buildings || []);
      for (const b of list) {
        this.drawBuilding(b);
      }

      // 3) Spätere Overlays (Produktion, Debug, Units etc.)
      this.drawOverlays();

      ctx.restore();
    },

    // -----------------------------------------------------------------------
    //  Gebäude ODER Baustelle zeichnen
    // -----------------------------------------------------------------------
    drawBuilding (b) {
      const ctx = this.ctx;
      const t   = this.tile;

      const px = b.x * t;
      const py = b.y * t;

      // ------------------------ Baustelle -------------------------
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

      // ------------------------ Fertiges Gebäude ------------------
      const reg = window.Registry || {};
      const def = (typeof reg.getBuilding === 'function')
        ? reg.getBuilding(b.type)
        : (reg.buildings && reg.buildings[b.type]) || null;

      if (!def) {
        // Diagnose: lila Block, falls Registry-Eintrag fehlt
        ctx.fillStyle = 'magenta';
        ctx.fillRect(px, py, b.w * t, b.h * t);
        return;
      }

      const img = window.Assets?.get
        ? Assets.get(def.img)
        : null;

      if (!img) {
        // Diagnose: roter Block, falls Sprite fehlt
        ctx.fillStyle = 'red';
        ctx.fillRect(px, py, b.w * t, b.h * t);
        return;
      }

      ctx.drawImage(img, px, py, b.w * t, b.h * t);
    },

    // -----------------------------------------------------------------------
    //  Debug/Production-Overlays (Platzhalter)
    // -----------------------------------------------------------------------
    drawOverlays () {
      // TODO: Produktion-Icons etc.
    }
  };

  window.Renderer = Renderer;
})();
