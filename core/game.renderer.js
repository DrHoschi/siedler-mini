/* ============================================================================
 * Datei   : core/game.renderer.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-workarea-maincanvas-prod-v3
 *
 * Zweck   :
 *   Zusatz-Renderer für:
 *   - Arbeitsbereiche (WorkArea) direkt auf dem Haupt-Canvas
 *   - Produktions-Overlays (Holz / Stein / Fisch) direkt auf dem Haupt-Canvas
 *   - Pfade/Units über OverlayHooks auf separatem Overlay-Canvas (#overlay)
 *
 * WICHTIG:
 *   - Die eigentliche Map + Gebäude werden von GameMap.render gezeichnet.
 *   - GameMap.render setzt bereits die Kamera-Transform (Pan + Zoom).
 *   - Renderer.draw **setzt KEINE eigene Kamera-Transform mehr**, sondern
 *     zeichnet einfach in den bestehenden Welt-Koordinaten weiter.
 *
 *   Aufruf-Reihenfolge (game.js):
 *     1) GameMap.render(Game)      → Terrain + Gebäude, Kamera gesetzt
 *     2) GameConstruction.render() → Baustellen-Drops etc.
 *     3) Renderer.draw(Game)       → WorkArea + Produktion (Holz/Stein/Fisch)
 *     4) OverlayHooks.render()     → Pfad-/Unit-Overlays im Overlay-Canvas
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
     *   - Game.map    (mit tileSize)
     *   - Game.camera (GameCamera, wird aber NICHT hier transformiert)
     */
    init(game) {
      this.game = game;
      this.ctx  = game.ctx;

      // Overlay-Canvas (für Pfade, Unit-Overlay etc.)
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
     *
     * ACHTUNG:
     *   - GameMap.render wurde bereits aufgerufen und hat:
     *       • den Canvas gecleart
     *       • die Kamera-Transform (Pan + Zoom) gesetzt
     *       • Terrain + Gebäude gezeichnet
     *   - Hier NICHT noch einmal setTransform aufrufen!
     */
    draw(gameArg) {
      const g   = gameArg || this.game;
      const ctx = this.ctx;
      if (!g || !ctx) return;

      const cam = g.camera || window.GameCamera || null;

      // Wir gehen davon aus, dass die aktuelle Transform bereits
      // die Welt-Koordinaten (mit Kamera) repräsentiert.
      ctx.save();

      const tileSize = this.tile;

      // -----------------------------------------------------------
      // 1. Arbeitsbereiche (WorkAreas) direkt auf dem Haupt-Canvas
      // -----------------------------------------------------------
      try {
        if (window.GameWorkArea) {
          const wa = window.GameWorkArea;

          if (typeof wa.drawWorld === 'function') {
            // Neuer, "sauberer" Weg: Welt-Koordinaten mit tileSize + Kamera
            const camState =
              (cam && typeof cam.getState === 'function')
                ? cam.getState()
                : (window.GameCamera?.getState?.() || { x: 0, y: 0, zoom: 1 });

            wa.drawWorld(ctx, { tileSize, camera: camState });
          } else if (typeof wa.drawOnMainCanvas === 'function') {
            // Fallback: ältere Variante
            wa.drawOnMainCanvas(ctx, cam, tileSize);
          }
        }
      } catch (e) {
        WARN('WorkArea-Zeichnung Fehler:', e);
      }

      // -----------------------------------------------------------
      // 2. Produktions-Overlays (Holz, Stein, Fisch) auf Haupt-Canvas
      //    → zeichnen in Welt-Koordinaten, nutzen dieselbe Transform.
      // -----------------------------------------------------------
      try {
        if (window.ProductionWood && typeof window.ProductionWood.drawOnMainCanvas === 'function') {
          window.ProductionWood.drawOnMainCanvas(ctx, cam, tileSize);
        }
      } catch (e) {
        WARN('ProductionWood.drawOnMainCanvas Fehler:', e);
      }

      try {
        if (window.ProductionStone && typeof window.ProductionStone.drawOnMainCanvas === 'function') {
          window.ProductionStone.drawOnMainCanvas(ctx, cam, tileSize);
        }
      } catch (e) {
        WARN('ProductionStone.drawOnMainCanvas Fehler:', e);
      }

      try {
        if (window.ProductionFish && typeof window.ProductionFish.drawOnMainCanvas === 'function') {
          window.ProductionFish.drawOnMainCanvas(ctx, cam, tileSize);
        }
      } catch (e) {
        WARN('ProductionFish.drawOnMainCanvas Fehler:', e);
      }

      ctx.restore();

      // -----------------------------------------------------------
      // 3. Overlays (Pfade, Units etc.) auf eigenem Overlay-Canvas
      //     → Screen-Space, LOSGELÖST von der Kameratransform.
      // -----------------------------------------------------------
      this.drawOverlays();
    },

    // -----------------------------------------------------------------
    // Gebäude zeichnen (wird aktuell NICHT benutzt, Map macht das)
    //   – bleibt als Reserve / späterer Ausbau drin.
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

      // Ressourcen-Layer zeichnen (nur Platzhalter solange keine Sprites existieren)
if (window.MapResources && MapResources.drawWorld) {
    MapResources.drawWorld(ctx, { tileSize: ts });
}
      
      // Diagnose: falls Registry-Eintrag fehlt → lila Block
      if (!def) {
        ctx.fillStyle = 'magenta';
        ctx.fillRect(px, py, b.w * t, b.h * t);
        return;
      }

      const imgKey = def.img || def.sprite || def.icon;
      const img    = window.Assets?.get ? Assets.get(imgKey) : null;

      if (!img) {
        return; // kein Fallback-Block, um Dopplungen zu vermeiden
      }

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

      try {
        if (window.OverlayHooks && typeof window.OverlayHooks.draw === 'function') {
          // OverlayHooks verteilt den Zeichenvorgang auf alle Layer,
          // z.B. 'paths', 'unit-overlay', ...
          window.OverlayHooks.draw(ctxO);
        }
      } catch (e) {
        WARN('OverlayHooks.draw Fehler:', e);
      }
    }
  };

  // Global verfügbar machen, damit game.js darauf zugreifen kann
  window.Renderer = Renderer;

  LOG('Modul geladen – Renderer global verfügbar (WorkArea + Produktion auf MainCanvas).');

})();
