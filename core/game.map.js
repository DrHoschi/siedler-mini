/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.14-units-anim-b3
 * Zweck   : Map (map-epoch1.json) + Tileset laden und mit GameCamera
 *           rendern (Pan + Zoom) + Baustellen + einfache Einheitenanzeige.
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[map]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const Mod = {
    name       : 'unknown',
    cols       : 1,
    rows       : 1,
    tileSize   : 64,
    grid       : null,    // 2D-Array [y][x] = tileId

    tileset    : null,    // Image
    tilesetUrl : '',
    tilesetCols: 1,

    ready      : false,
    sized      : false
  };

  // -------------------------------------------------------------------------
  // Sprites: Baustellen + fertige Gebäude
  // -------------------------------------------------------------------------
  const BuildPlaceSprites   = [];          // baustelle_0/1/2
  const BuildingSpriteCache = new Map();   // key = buildingId ("b.hq" …) → Image

  /**
   * Baustellen-Sprites vorbereiten (einmalig).
   */
  function ensureBuildPlaceSprites(){
    if (BuildPlaceSprites.length) return;
    for (let i = 0; i < 3; i++){
      const img = new Image();
      img.onload  = ()=>{/* ok */};
      img.onerror = (e)=>{
        WARN('Baustellen-Sprite konnte nicht geladen werden:', i, e);
      };
      img.src = `assets/buildings/building_place/baustelle_${i}.png`;
      BuildPlaceSprites[i] = img;
    }
  }

  /**
   * Pfad für ein Gebäudesprite bestimmen.
   *
   * Aktueller Stand laut Repo:
   *   siedler-mini/assets/icons/buildings/b.hq.png
   *   siedler-mini/assets/icons/buildings/b.lumberjack.png
   *   siedler-mini/assets/icons/buildings/b.quarry.png
   *   …
   *
   * Wenn sich die Struktur ändert, bitte HIER anpassen.
   */
  function resolveBuildingSpritePath(id){
    const raw = String(id || '');
    // Icons-Ordner benutzen:
    return `assets/icons/buildings/${raw}.png`;
    // Falls du später eigene Welt-Sprites hast, könntest du hier auch
    // zwischen icons/ und buildings/ unterscheiden.
  }

  /**
   * Image-Objekt für ein Gebäude holen (mit Cache).
   */
  function getBuildingSprite(id){
    if (!id) return null;
    if (BuildingSpriteCache.has(id)) return BuildingSpriteCache.get(id);

    const path = resolveBuildingSpritePath(id);
    const img  = new Image();

    img.onload = ()=>{
      if (!img.naturalWidth || !img.naturalHeight){
        WARN('Gebäudesprite geladen, aber ohne Größe (evtl. defekt):', id, path);
      } else {
        LOG('Gebäudesprite geladen:', id, path);
      }
    };
    img.onerror = (e)=>{
      WARN('Gebäudesprite NICHT ladbar:', id, path, e);
    };

    img.src = path;
    BuildingSpriteCache.set(id, img);
    return img;
  }

  /**
   * Prüfen, ob ein Image wirklich zeichnbar ist
   * (kein "broken" Image – wichtig für Safari).
   */
  function isDrawableImage(img){
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  // -------------------------------------------------------------------------
  // Canvas-Größe an Viewport anpassen
  // -------------------------------------------------------------------------
  function ensureCanvasSize(Game){
    try{
      const ctx = Game?.ctx;
      if (!ctx) return;
      const c = ctx.canvas;
      if (!c) return;

      const w = window.innerWidth  || document.documentElement.clientWidth  || c.width;
      const h = window.innerHeight || document.documentElement.clientHeight || c.height;

      if (!Mod.sized || c.width !== w || c.height !== h){
        c.width  = w;
        c.height = h;
        Mod.sized = true;
        LOG('Canvasgröße gesetzt:', w, 'x', h);
      }
    }catch(e){
      WARN('ensureCanvasSize Fehler:', e?.message || e);
    }
  }

  // -------------------------------------------------------------------------
  // Map-JSON normalisieren
  // -------------------------------------------------------------------------
  function applyMapJson(json){
    if (!json || !Array.isArray(json.tiles) || !json.tiles.length){
      WARN('Map-JSON ungültig oder leer – Fallback 1x1');
      Mod.name     = 'fallback';
      Mod.cols     = 1;
      Mod.rows     = 1;
      Mod.tileSize = 64;
      Mod.grid     = [[1]];
      return;
    }

    const tiles = json.tiles;
    const rows  = tiles.length;
    const cols  = tiles[0].length;

    Mod.name     = json.name || 'epoch1';
    Mod.rows     = rows;
    Mod.cols     = cols;
    Mod.tileSize = Array.isArray(json.size) ? (json.size[0] || 64) : 64;

    const grid = new Array(rows);
    for (let y = 0; y < rows; y++){
      const row = Array.isArray(tiles[y]) ? tiles[y] : [];
      grid[y] = new Array(cols);
      for (let x = 0; x < cols; x++){
        grid[x] = grid[x] || 0;
        grid[y][x] = row[x] | 0;
      }
    }
    Mod.grid = grid;

    if (Mod.tileset){
      Mod.ready = true;
      LOG('Map übernommen:', json, '→ renderfähig');
    } else {
      LOG('Map übernommen – warte noch auf Tileset …');
    }
  }

  // -------------------------------------------------------------------------
  // Tileset laden
  // -------------------------------------------------------------------------
  function loadTileset(Game){
    const canvas     = Game?.ctx?.canvas;
    const tilesetUrl = canvas?.getAttribute('data-tileset')
                     || 'assets/tiles/tileset.terrain.png';

    Mod.tilesetUrl = tilesetUrl;

    const img = new Image();
    img.onload = ()=>{
      Mod.tileset = img;
      Mod.tilesetCols = Math.max(1, Math.floor(img.width / Mod.tileSize) || 1);
      LOG('Tileset geladen:', tilesetUrl, 'Cols=', Mod.tilesetCols);
      if (Mod.grid) {
        Mod.ready = true;
        LOG('Map + Tileset bereit → renderfähig');
      }
    };
    img.onerror = (e)=>{
      WARN('Fehler beim Laden des Tilesets:', tilesetUrl, e);
    };
    img.src = tilesetUrl;

    LOG('init() – Map-Renderer vorbereitet');
    return Mod;
  }

  // -------------------------------------------------------------------------
  // Units ermitteln (für Fallback-Punkte)
  // -------------------------------------------------------------------------
  function getUnitsForDraw(){
    if (Array.isArray(window.Game?.units)) return window.Game.units;
    // kompatibel zu neuen/alten Units-Systemen
    if (Array.isArray(window.GameUnits?.list)) return window.GameUnits.list;
    if (window.GameUnits && typeof window.GameUnits.getUnits === 'function') {
      const u = window.GameUnits.getUnits();
      if (Array.isArray(u)) return u;
    }
    if (Array.isArray(window.__units)) return window.__units;
    return [];
  }

  
  // -------------------------------------------------------------------------
  // Units: Sprite-Mapping (Carrier) – nutzt Assets.drawAtlasFrame()
  // -------------------------------------------------------------------------
  const CARRIER_ATLAS = 'carrier_atlas';

  // Preview-Layout: 9 Spalten pro Reihe (0..8):
  //   [0..1]=N, [2..3]=E, [4]=Center, [5..6]=S, [7..8]=W
  // Reihen:
  //   0 = Idle (Front), 1 = Idle (Side), 2 = Walk (Front), 3 = Walk (Side), 4 = Handover (optional)
  const CARRIER_SPRITES = {
    idle: {
      N: ['frame_0_0','frame_0_1'],
      E: ['frame_1_2','frame_1_3'],
      S: ['frame_0_5','frame_0_6'],
      W: ['frame_1_7','frame_1_8']
    },
    walk: {
      N: ['frame_2_0','frame_2_1'],
      E: ['frame_3_2','frame_3_3'],
      S: ['frame_2_5','frame_2_6'],
      W: ['frame_3_7','frame_3_8']
    }
  };

  let _unitsAnimLastT = 0;
  function _unitsGetDt(){
    const now = performance.now();
    const dt = _unitsAnimLastT ? Math.min(0.05, (now - _unitsAnimLastT) / 1000) : 0;
    _unitsAnimLastT = now;
    return dt;
  }

  function _dir4FromDelta(dx, dy){
    if (Math.abs(dx) > Math.abs(dy)) return (dx >= 0) ? 'E' : 'W';
    return (dy >= 0) ? 'S' : 'N';
  }

  function _pickAnimFrame(arr, t, fps){
    if (!arr || !arr.length) return null;
    const i = Math.floor(t * fps) % arr.length;
    return arr[i];
  }
// -------------------------------------------------------------------------
  // INIT – Map + Tileset laden
  // -------------------------------------------------------------------------
  function init(Game){
    const canvas = document.getElementById('game');
    const mapUrl = canvas?.getAttribute('data-map')
                 || 'data/maps/map-epoch1.json';

    fetch(mapUrl)
      .then(r => {
        if (!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      })
      .then(json => {
        applyMapJson(json);
        if (Mod.tileset) {
          Mod.ready = true;
          LOG('Map + Tileset bereit → renderfähig');
        }
      })
      .catch(err => {
        WARN('Fehler beim Laden der Map:', mapUrl, err);
      });

    loadTileset(Game);
    return Mod;
  }

  // -------------------------------------------------------------------------
  // RENDER – Map + Gebäude + Units
  // -------------------------------------------------------------------------
  function render(Game){
    const ctx = Game?.ctx;
    if (!ctx) return;

    // Canvas an Bildschirm anpassen
    ensureCanvasSize(Game);

    // Screen-Space clear
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);

    // Kamera anwenden
    const cam  = window.GameCamera || {};
    const zoom = cam.zoom ?? 1;
    const camX = cam.x    ?? 0;
    const camY = cam.y    ?? 0;
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);

    // Map + Tileset bereit?
    if (!Mod.ready || !Mod.grid || !Mod.tileset) return;

    const img = Mod.tileset;
    const ts  = Mod.tileSize;

    // Terrain
    for (let y = 0; y < Mod.rows; y++){
      const row = Mod.grid[y];
      for (let x = 0; x < Mod.cols; x++){
        const id = row[x] | 0;
        if (id <= 0) continue;

        const tid = id - 1;
        const sx  = (tid % Mod.tilesetCols) * ts;
        const sy  = Math.floor(tid / Mod.tilesetCols) * ts;
        const dx  = x * ts;
        const dy  = y * ts;

        try{
          ctx.drawImage(img, sx, sy, ts, ts, dx, dy, ts, ts);
        }catch(e){
          WARN('drawImage-Fehler (x='+x+', y='+y+', id='+id+'):', e?.message || e);
        }
      }
    }

    // ---------------------------------------------------------------------
    // Gebäude-Overlay (Baustellen + fertige Gebäude)
    // ---------------------------------------------------------------------
    if (Array.isArray(Game?.buildings) && Game.buildings.length){
      ensureBuildPlaceSprites();

      for (const b of Game.buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        const stage = typeof b.buildStage === 'number' ? b.buildStage : 3;

        // Standard-Farben
        let col = 'rgba(80,200,80,0.9)';   // fertig
        if (stage === 0) col = 'rgba(200,150,50,0.6)';
        if (stage === 1) col = 'rgba(220,180,80,0.7)';
        if (stage === 2) col = 'rgba(140,200,120,0.8)';

        let useFallback = false;

        if (stage < 3){
          // Baustelle 0/1/2
          const idx    = Math.max(0, Math.min(2, stage));
          const imgSite = BuildPlaceSprites[idx];

          if (isDrawableImage(imgSite)){
            try{
              ctx.drawImage(imgSite, bx, by, bw, bh);
            }catch(e){
              WARN('drawImage Baustelle-Fehler:', e?.message || e);
              useFallback = true;
            }
          } else {
            // Bild noch nicht fertig oder defekt → Fallback-Rechteck
            useFallback = true;
          }
        } else {
          // Fertiges Gebäude
          const imgB = getBuildingSprite(b.id);
          if (isDrawableImage(imgB)){
            try{
              ctx.drawImage(imgB, bx, by, bw, bh);
            }catch(e){
              WARN('drawImage Gebäude-Fehler id='+b.id+':', e?.message || e);
              useFallback = true;
            }
          } else {
            // Sprite noch nicht da oder kaputt → Fallback-Rechteck
            useFallback = true;
          }
        }

        if (useFallback){
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, bw, bh);
        }
      }
    }
    // ---------------------------------------------------------------------
// Ressourcen-Layer (Bäume/Steine/Fische)
//  - unterstützt beide APIs:
//      A) MapResources.drawWorld(ctx,{tileSize})
//      B) MapResources.drawOnMainCanvas(ctx, cam, tileSize)
// ---------------------------------------------------------------------
if (window.MapResources) {
  try {
    // bevorzugt: Atlas-Version / neue API
    if (typeof window.MapResources.drawOnMainCanvas === 'function') {
      window.MapResources.drawOnMainCanvas(ctx, cam, ts);
    }
    // fallback: alte API (Platzhalter-Kreis/Quadrat)
    else if (typeof window.MapResources.drawWorld === 'function') {
      window.MapResources.drawWorld(ctx, { tileSize: ts });
    }
  } catch (e) {
    WARN('MapResources draw Fehler:', e);
  }
}
    
    // ---------------------------------------------------------------------
// Arbeitsbereiche (WorkAreas) zeichnen
//   - bevorzugt: drawWorld(ctx, {tileSize})
//   - Fallback: drawOnMainCanvas(ctx, cam)
// ---------------------------------------------------------------------
if (window.GameWorkArea) {
  try {
    const wa  = window.GameWorkArea;
    const cam = window.GameCamera?.getState?.() || { x: 0, y: 0, zoom: 1 };

    if (typeof wa.drawWorld === 'function') {
      // Neuer Weg: Welt-Koordinaten, TileSize kommt aus GameMap
      wa.drawWorld(ctx, { tileSize: ts, camera: cam });
    } else if (typeof wa.drawOnMainCanvas === 'function') {
      // Fallback: alte Variante benutzt eigene Kamera-Infos
      wa.drawOnMainCanvas(ctx, cam);
    }
  } catch (e) {
    WARN('WorkArea-Draw Fehler:', e);
  }
}
    
    
    // ---------------------------------------------------------------------
    // Einheiten: erst Sprite versuchen, sonst Fallback-Punkte
    // ---------------------------------------------------------------------
    const units = getUnitsForDraw();
    if (units.length){
      const Assets = window.Assets;

      // Defensive Checks: Assets & Carrier-Atlas müssen nicht zwingend ready sein.
      const hasAssets = !!(Assets && typeof Assets.getAtlas === 'function' && typeof Assets.drawAtlasFrame === 'function');
      const carrierOk = hasAssets && !!Assets.getAtlas(CARRIER_ATLAS)?.ok;

      // dt für einfache Animation (ohne kompletten Anim-Controller)
      const dt = _unitsGetDt();

      // Registry-Helper (Option B)
      const _getUnitDef = (kind)=>{
        const R = window.Registry;
        if (!R || !kind) return null;
        if (typeof R.getUnit === 'function') return R.getUnit(kind);
        if (typeof R.get === 'function') return R.get('units', kind);
        if (R.units && R.units[kind]) return R.units[kind];
        return null;
      };

      const _getUnitKind = (u)=>{
        // Best effort – je nach Runtime können die Felder anders heißen
        const cand = [
          u?.kind, u?.type, u?.unitKind, u?.unitType, u?.defId, u?.template,
          (typeof u?.id === 'string' && u.id.startsWith('u.')) ? u.id : null
        ];
        for (const k of cand){
          if (typeof k === 'string' && k.length) return k;
        }
        return null;
      };

      const _pickFirstFrame = (atlas)=>{
        const keys = Object.keys(atlas?.frames || {});
        return keys[0] || null;
      };

      ctx.save();

      for (const u of units){
        // Einheit kann tile coords als float haben → wir zeichnen am "Fußpunkt" des Tiles
        const tx = (u.x || 0);
        const ty = (u.y || 0);

        // Richtung schätzen: bei Task Richtung zur Zielposition, sonst letzte Richtung behalten
        let dir = u._dir || 'S';
        const target = u.task?.target || u.task?.dest || u.task?.source;
        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)){
          dir = _dir4FromDelta((target.x - tx), (target.y - ty));
          u._dir = dir;
        }

        // moving?
        const moving = !!u.task && (Math.hypot((target?.x ?? tx) - tx, (target?.y ?? ty) - ty) > 0.01);

        // anim time pro unit
        u._animT = (u._animT || 0) + dt;

        // Registry → AtlasKey (falls vorhanden)
        const kind = _getUnitKind(u);
        const def  = _getUnitDef(kind) || {};

        // atlasKey kann direkt am Def stehen oder aus sprite.* kommen
        const desiredAtlasKey =
          def.atlasKey ||
          def.spriteAtlasKey ||
          def.sprite?.atlasKey ||
          def.sprite?.atlas ||
          null;

        // finaler Atlas: erst Wunsch, dann Carrier, dann Punkt
        let atlasKey = null;
        if (hasAssets && desiredAtlasKey && Assets.getAtlas(desiredAtlasKey)?.ok) atlasKey = desiredAtlasKey;
        else if (carrierOk) atlasKey = CARRIER_ATLAS;

        // Weltkoordinaten: X = tile-center, Y = tile-bottom (Fußpunkt)
        const wx = tx * ts + ts/2;
        const wy = ty * ts + ts - 2;

        if (hasAssets && atlasKey){
          let a = Assets.getAtlas(atlasKey);

          // Frame wählen:
          // - Wenn Carrier-Atlas: nutze bestehende Mapping + einfache Animation
          // - Sonst: defaultFrame aus Def (oder erstes Frame)
          let frameName = null;

          if (atlasKey === CARRIER_ATLAS){
            const fps = 6;
            const cycle = moving ? 'walk' : 'idle';
            const frames = CARRIER_SPRITES[cycle]?.[dir] || CARRIER_SPRITES[cycle]?.S;
            if (frames && frames.length){
              const idx = Math.floor(u._animT * fps) % frames.length;
              frameName = frames[idx];
            }
            // falls Mapping nicht passt: erstes Frame
            if (frameName && !(a.frames && a.frames[frameName])) frameName = null;
            if (!frameName) frameName = 'frame_0_4'; // Center als safe-default
            if (frameName && !(a.frames && a.frames[frameName])) frameName = _pickFirstFrame(a);
          } else {
            // -------------------------------------------------------------
            // NEU (B3): Zentrale datengetriebene Animationsauswahl
            //   - nutzt core/unit.anim.js (window.UnitAnim)
            //   - actions: idle / walk / work / carry
            //   - dirs:    8 Richtungen (mit Fallback auf 4-dir)
            //
            // Hinweise:
            //   - WorkArea/Worker-Loop kann u.__animState = 'work' setzen
            //   - Wenn nichts gesetzt ist, nutzen wir eine Heuristik (moving -> walk)
            //   - Richtung kommt bevorzugt aus u.vx/u.vy (hier best-effort gesetzt)
            // -------------------------------------------------------------
            const UA = window.UnitAnim;
            const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

            // Falls WorkArea/Jobs keinen State setzen: Heuristik
            if (!u.__animState || u.__animState === 'idle' || u.__animState === 'walk') {
              u.__animState = moving ? 'walk' : 'idle';
            }

            // Richtungsvector (8-dir): für Renderer reichen Target-Deltas
            if (moving && target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
              u.vx = (target.x - tx);
              u.vy = (target.y - ty);
            } else {
              u.vx = 0;
              u.vy = 0;
            }

            if (UA && typeof UA.getFrameForUnit === 'function') {
              const pick = UA.getFrameForUnit(u, nowMs);

              // Wenn UnitAnim einen anderen Atlas vorschlägt (z.B. korrekt normalisiert),
              // und der Atlas geladen ist, dann umschalten.
              if (pick?.atlasKey && Assets.getAtlas(pick.atlasKey)?.ok) {
                atlasKey = pick.atlasKey;
                a = Assets.getAtlas(atlasKey);
              }

              // Frame übernehmen (und validieren)
              frameName = pick?.frame || def.defaultFrame || def.sprite?.defaultFrame || 'frame_0_0';
              if (frameName && !(a.frames && a.frames[frameName])) frameName = _pickFirstFrame(a);
            } else {
              // Fallback: wie vorher (statisches defaultFrame)
              frameName = def.defaultFrame || def.sprite?.defaultFrame || 'frame_0_0';
              if (frameName && !(a.frames && a.frames[frameName])) frameName = _pickFirstFrame(a);
            }
          }

          // Skalierung: wir targeten ca. 1.4 Tiles Höhe
          let scale = 1;
          const fr = frameName ? a.frames?.[frameName] : null;
          if (fr && fr.h){
            const desiredH = ts * 1.4;
            scale = desiredH / fr.h;
          }

          const ok = frameName
            ? Assets.drawAtlasFrame(ctx, atlasKey, frameName, wx, wy, { scale, align:'pivot' })
            : false;

          if (!ok){
            // Fallback: Punkt (nur wenn Sprite nicht gezeichnet werden konnte)
            ctx.fillStyle   = 'rgba(255,255,255,0.95)';
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.arc(wx, wy - ts/2, 6, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
          }
        } else {
          // reiner Fallback: weiße Punkte (wenn Assets nicht ready)
          ctx.fillStyle   = 'rgba(255,255,255,0.95)';
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.beginPath();
          ctx.arc(wx, wy - ts/2, 6, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    }

  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameMap = { init, render, _state: Mod };

})();
