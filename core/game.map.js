/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.28-final (Camera-aware Renderer)
 * Zweck   : Map laden (via map-runtime.bridge.js) + rendern mit GameCamera
 *
 * Struktur:
 *   - State/Modul-Objekt
 *   - Hilfsfunktionen (clear + applyCamera)
 *   - API: init(Game), render(Game)
 *
 * Erwartet:
 *   - Game.ctx  : 2D-Context des Canvas #game
 *   - Game.map  : Map-Objekt (wird von map-runtime.bridge.js gesetzt)
 *   - Game.buildings : Array der platzierten Gebäude
 *   - window.GameCamera : { x, y, zoom } aus core/camera.js
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[map]';
  const LOG = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO= (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // Modul-State (KEIN eigenes Game-Objekt, sondern nur Map-Daten)
  // ---------------------------------------------------------------------------
  const Mod = {
    tileset : null,   // Image-Objekt
    ts      : 64,     // TileSize
    ready   : false   // wird true, wenn Map + Tileset da sind
  };

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  /** Canvas zurücksetzen (Transform = Identity + alles löschen) */
  function clear(ctx){
    if (!ctx) return;
    // Transform zurücksetzen, sonst löscht clearRect nur den sichtbaren Ausschnitt
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /** Kamera auf den Context anwenden (Pan + Zoom) */
  function applyCamera(ctx){
    // Fallback, falls Kamera noch nicht bereit ist
    const camX   = window.GameCamera?.x    ?? 0;
    const camY   = window.GameCamera?.y    ?? 0;
    const camZoom= window.GameCamera?.zoom ?? 1;

    // setTransform(a, b, c, d, e, f)
    // a,d = Scale, e,f = Translation
    ctx.setTransform(camZoom, 0, 0, camZoom, -camX * camZoom, -camY * camZoom);
  }

  /** interner Helper: Tileset laden (nur 1×) */
  function ensureTileset(){
    return new Promise((resolve, reject)=>{
      if (Mod.tileset){
        resolve(Mod.tileset);
        return;
      }
      const img = new Image();
      img.onload = ()=>{
        Mod.tileset = img;
        INFO('Tileset geladen:', img.src);
        resolve(img);
      };
      img.onerror = (e)=>{
        WARN('Tileset konnte nicht geladen werden:', e);
        reject(e);
      };
      // Pfad wie in deinem Canvas data-Attribut / bisherigen Logs
      img.src = 'assets/tiles/tileset.terrain.png';
    });
  }

  // ---------------------------------------------------------------------------
  // API: init(Game)
  //   - wird von core/game.js beim Start aufgerufen
  //   - sorgt nur dafür, dass Tileset vorgeladen wird
  // ---------------------------------------------------------------------------
  function init(Game){
    INFO('init() – Map-Renderer vorbereitet');
    // Tileset schon mal anstoßen, aber nicht blockierend
    ensureTileset().catch(()=>{ /* Fehler wird im Log oben angezeigt */ });
    return Mod;
  }

  // ---------------------------------------------------------------------------
  // API: render(Game)
  //   - wird im Game-Loop pro Frame aufgerufen
  // ---------------------------------------------------------------------------
  function render(Game){
    const ctx = Game?.ctx;
    const map = Game?.map;       // kommt aus map-runtime.bridge.js
    if (!ctx || !map) return;

    // TileSize aus Map oder Fallback
    const ts = Number(map.tileSize || Mod.ts || 64) | 0;
    Mod.ts = ts;

    clear(ctx);          // 1) Canvas leeren
    applyCamera(ctx);    // 2) Kamera anwenden (Pan + Zoom)

    // -----------------------------------------------------------------------
    // 3) Tiles zeichnen
    // -----------------------------------------------------------------------
    if (!Mod.tileset){
      // Falls Tileset noch lädt → nur einmal warnen
      WARN('Tileset noch nicht bereit – Frame ohne Terrain.');
    } else if (Array.isArray(map.tiles)){
      const img = Mod.tileset;
      for (const t of map.tiles){
        // Erwartete Struktur aus deinem JSON:
        // t.x, t.y  → Tile-Koordinate im Grid
        // t.sx, t.sy→ Quelle im Tileset (Pixel)
        const sx = t.sx | 0;
        const sy = t.sy | 0;
        const dx = (t.x | 0) * ts;
        const dy = (t.y | 0) * ts;

        ctx.drawImage(
          img,
          sx, sy, ts, ts,
          dx, dy, ts, ts
        );
      }
    }

    // -----------------------------------------------------------------------
    // 4) Gebäude zeichnen (einfaches Platzhalter-Rendering)
    // -----------------------------------------------------------------------
    if (Array.isArray(Game.buildings)){
      for (const b of Game.buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        // Farbe je nach Bauphase
        let col = 'rgba(80,200,80,0.9)'; // fertig
        if (b.buildStage === 0) col = 'rgba(200,150,50,0.6)';  // Baustelle
        if (b.buildStage === 1) col = 'rgba(220,180,80,0.7)';  // Material
        if (b.buildStage === 2) col = 'rgba(140,200,120,0.8)'; // Finish

        ctx.fillStyle = col;
        ctx.fillRect(bx, by, bw, bh);
      }
    }
  }

  // Export ins globale Fenster
  window.GameMap = { init, render };
})();
