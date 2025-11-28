/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.28-fix1 (Map-Render-Fix)
 * Zweck   : Map laden + sicher rendern (Map + Tileset warten)
 * Struktur: IMPORTS → STATE → INIT → RENDER → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[map]';
  const LOG = (...a)=> (window.CBLog?.ok  ?? console.log)(TAG, ...a);
  const WRN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const Mod = {
    map:     null,
    tileset: null,
    ts:      64,
    ready:   false,   // true, wenn Map + Tileset da
    sized:   false    // einmal Canvas auf Viewportgröße ziehen
  };

  // Hilfsfunktion: Canvas-Größe an Viewport anpassen (einmalig)
  function ensureCanvasSize(Game){
    try{
      const ctx = Game.ctx;
      if (!ctx) return;
      const c = ctx.canvas;
      if (!c) return;

      const w = window.innerWidth  || document.documentElement.clientWidth  || c.width;
      const h = window.innerHeight || document.documentElement.clientHeight || c.height;

      if (!Mod.sized && w > 0 && h > 0){
        c.width  = w;
        c.height = h;
        Mod.sized = true;
        LOG('Canvasgröße gesetzt:', w, 'x', h);
      }
    }catch(e){
      WRN('ensureCanvasSize Fehler:', e?.message || e);
    }
  }

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  function init(Game){
    // Quelle aus dem <canvas id="game" ...> lesen
    const canvas = document.getElementById('game');
    const mapUrl  = canvas?.getAttribute('data-map')     || 'data/maps/map-epoch1.json';
    const tileUrl = canvas?.getAttribute('data-tileset') || 'assets/tiles/tileset.terrain.png';

    // Map laden
    fetch(mapUrl)
      .then(r=>{
        if (!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      })
      .then(json=>{
        Mod.map = json;
        LOG('Map geladen:', mapUrl);
        if (Mod.tileset) {
          Mod.ready = true;
          LOG('Map + Tileset bereit → renderfähig');
        }
      })
      .catch(err=>{
        WRN('Fehler beim Laden der Map:', err);
      });

    // Tileset laden
    const img = new Image();
    img.onload = ()=>{
      Mod.tileset = img;
      LOG('Tileset geladen:', tileUrl);
      if (Mod.map) {
        Mod.ready = true;
        LOG('Map + Tileset bereit → renderfähig');
      }
    };
    img.onerror = (e)=>{
      WRN('Fehler beim Laden des Tilesets:', tileUrl, e);
    };
    img.src = tileUrl;

    return Mod;
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  function render(Game){
    const ctx = Game.ctx;
    if (!ctx) return;

    // Canvas ggf. einmalig auf Bildschirmgröße ziehen
    ensureCanvasSize(Game);

    // WICHTIG: Nur rendern, wenn Map + Tileset da sind
    if (!Mod.ready || !Mod.map || !Mod.tileset) {
      return; // kein Fehler → Loop läuft weiter
    }

    const c = ctx.canvas;
    const ts = Mod.ts;

    ctx.clearRect(0, 0, c.width, c.height);

    // Safety: falls Map-Tiles fehlen
    const tiles = Array.isArray(Mod.map.tiles) ? Mod.map.tiles : [];
    if (!tiles.length){
      WRN('Map enthält keine tiles[] – nichts zu zeichnen');
      return;
    }

    // Tiles zeichnen
    for (const t of tiles){
      // Fallbacks
      const sx = t.sx ?? 0;
      const sy = t.sy ?? 0;
      const tx = t.x  ?? 0;
      const ty = t.y  ?? 0;

      try{
        ctx.drawImage(
          Mod.tileset,
          sx, sy, ts, ts,
          tx*ts, ty*ts, ts, ts
        );
      }catch(e){
        WRN('drawImage-Fehler für Tile:', e?.message || e);
        break; // nicht den ganzen Frame zerschießen
      }
    }

    // Gebäude (simple Platzhalter-Visualisierung)
    const buildings = Array.isArray(Game.buildings) ? Game.buildings : [];
    for (const b of buildings){
      ctx.fillStyle = b.buildStage < 3
        ? 'rgba(200,150,50,0.6)'   // Baustelle
        : 'rgba(80,200,80,0.9)';  // fertig

      const bw = (b.w ?? 3) * ts;
      const bh = (b.h ?? 3) * ts;
      ctx.fillRect(b.x*ts, b.y*ts, bw, bh);
    }
  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameMap = { init, render };

})();
