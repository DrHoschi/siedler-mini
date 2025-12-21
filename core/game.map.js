/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.13-units-sprites
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

      // -------------------------------------------------------------------
      // WICHTIG (iPad / Split-View / Safari-Toolbars):
      //   window.innerWidth/innerHeight schwanken (Layout-Viewport vs.
      //   tatsächliche sichtbare Box). Dadurch kann der Canvas-Backbuffer
      //   zwischen CSS-Pixeln und "device px" hin- und herspringen.
      //   Ergebnis: Tiles wirken gestreckt/verschoben.
      //
      // Lösung:
      //   Wir nehmen IMMER die reale sichtbare CSS-Box des Canvas
      //   (getBoundingClientRect) als Source of Truth.
      // -------------------------------------------------------------------

      const r = c.getBoundingClientRect?.() || null;
      const cssW = Math.max(1, Math.round(r?.width  || 0));
      const cssH = Math.max(1, Math.round(r?.height || 0));

      // Fallback, falls Rect aus irgendeinem Grund 0 ist
      const fallbackW = (window.innerWidth  || document.documentElement.clientWidth  || c.width)  | 0;
      const fallbackH = (window.innerHeight || document.documentElement.clientHeight || c.height) | 0;

      // Wenn Rect valide ist → nutzen. Sonst Fallback.
      // Extra-Schutz: Wenn innerWidth plötzlich ~2x so groß ist (DPR-Effekt),
      // dann NICHT übernehmen.
      let w = cssW > 1 ? cssW : fallbackW;
      let h = cssH > 1 ? cssH : fallbackH;

      if (cssW > 1 && fallbackW > cssW * 1.35) {
        // Typisches iPad-Symptom: fallbackW enthält devicePixel-Äquivalent.
        w = cssW;
      }

      // Resize nur, wenn wirklich nötig (verhindert Flip-Flop bei Minimaländerungen)
      if (!Mod.sized || c.width !== w || c.height !== h){
        c.width  = w;
        c.height = h;
        Mod.sized = true;
        LOG('Canvasgröße gesetzt:', w, 'x', h, '(cssRect=', cssW+'x'+cssH, 'fallback=', fallbackW+'x'+fallbackH, ')');
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
        // Wichtig: Wir schreiben in die aktuelle Zeile (grid[y]) – NICHT grid[x]!
        // Der alte Code hat versehentlich grid[x] (Spalten-Index) beschrieben und damit
        // das 2D-Array zerstört → Ergebnis: Map bleibt schwarz/leer.
        grid[y][x] = (row[x] | 0);
      }
    }
    Mod.grid = grid;

    // ---------------------------------------------------------------------
    // Map-Metadaten & Spawns merken (für Auto-Start-HQ / Kamera-Fokus)
    // ---------------------------------------------------------------------
    Mod.spawns = Array.isArray(json.spawns) ? json.spawns : [];
    Mod.legend = (json.metadata && json.metadata.legend) ? json.metadata.legend : {};

    // Event: Map ist geladen (Grid/Size/Spawns vorhanden)
    // Achtung: Tileset kann ggf. noch nachladen – für Gameplay (HQ-Start) reicht das Grid.
    try{
      window.dispatchEvent(new CustomEvent('cb:map:ready', {
        detail: {
          mapId : json.id || Mod.name || 'map',
          cols  : Mod.cols,
          rows  : Mod.rows,
          spawns: Mod.spawns,
          legend: Mod.legend
        }
      }));
    } catch(e){ /* silent */ }


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
    // Robust gegen iOS/Safari: Image-Referenz halten + Watchdog + Fetch-Blob-Retry
    const canvasEl   = Game?.ctx?.canvas || document.getElementById('game');
    const tilesetUrl = canvasEl?.getAttribute?.('data-tileset')
                    || 'assets/tiles/tileset.terrain.png';

    Mod.tilesetUrl = tilesetUrl;

    // Schon fertig?
    if (Mod.tileset && Mod.tileset.complete && Mod.tileset.naturalWidth > 0) return Mod;

    // Wenn ein Load bereits läuft, nicht erneut starten (sonst iOS-Deadlocks möglich)
    if (Mod._tilesetLoading) return Mod;
    Mod._tilesetLoading = true;

    const clearWatchdog = ()=>{
      try{
        if (Mod._tilesetWatchdog) clearTimeout(Mod._tilesetWatchdog);
      }catch(e){}
      Mod._tilesetWatchdog = null;
    };

    const finishOk = (img, srcLabel)=>{
      clearWatchdog();
      Mod._tilesetLoading = false;

      Mod.tileset = img;
      Mod.tilesetCols = Math.max(1, Math.floor(img.width / Mod.tileSize) || 1);

      LOG('Tileset geladen:', tilesetUrl, 'Cols=', Mod.tilesetCols, 'via=', srcLabel);
      if (Mod.grid){
        Mod.ready = true;
        LOG('Map + Tileset bereit → renderfähig');
      }
    };

    const finishFail = (srcLabel, err)=>{
      clearWatchdog();
      Mod._tilesetLoading = false;
      WARN('Fehler beim Laden des Tilesets:', tilesetUrl, 'via=', srcLabel, err);
    };

    const fetchBlobRetryOnce = ()=>{
      if (Mod._tilesetRetryDone) return;
      Mod._tilesetRetryDone = true;

      LOG('Tileset Retry via fetch(blob) …', tilesetUrl);

      const ac = new AbortController();
      const t  = setTimeout(()=>{ try{ ac.abort(); }catch(e){} }, 9000);

      fetch(tilesetUrl, { cache:'no-store', signal: ac.signal })
        .then(r=>{
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.blob();
        })
        .then(blob=>{
          const objUrl = URL.createObjectURL(blob);
          const img2 = new Image();
          Mod._tilesetImg = img2; // Referenz halten!
          img2.onload = ()=>{
            try{ setTimeout(()=>URL.revokeObjectURL(objUrl), 1000); }catch(e){}
            finishOk(img2, 'fetch-blob');
          };
          img2.onerror = (e)=>{
            try{ URL.revokeObjectURL(objUrl); }catch(_e){}
            finishFail('fetch-blob', e);
          };
          img2.src = objUrl;
        })
        .catch(err=>{
          finishFail('fetch-blob', err);
        })
        .finally(()=>{ try{ clearTimeout(t); }catch(e){} });
    };

    // Normaler Image-Load
    const img = new Image();
    Mod._tilesetImg = img; // iOS/Safari: Referenz halten, damit onload sicher feuert

    img.onload = ()=> finishOk(img, 'img');
    img.onerror = (e)=>{
      // Erst loggen, dann einmal Retry mit fetch(blob)
      WARN('Tileset img.onerror – versuche fetch-blob Retry …', tilesetUrl, e);
      fetchBlobRetryOnce();
    };

    // Cache-Buster kann optional via data-tileset gesetzt werden.
    img.src = tilesetUrl;

    // Watchdog: falls onload/onerror nie feuert (iOS Edge-Cases) → Retry
    Mod._tilesetWatchdog = setTimeout(()=>{
      WARN('Tileset Watchdog: kein onload/onerror – starte Retry', tilesetUrl);
      try{ fetchBlobRetryOnce(); }catch(e){}
    }, 7000);

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
  // Units: einfache, stabile Anim-Zeit (unabhängig von dt/Render-Frequenz)
  // -------------------------------------------------------------------------
  function _hash01(str){
    // kleiner String-Hash → 0..1 (stabil)
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // >>>0 → uint32
    return (h >>> 0) / 4294967295;
  }

  function _unitAnimTime(u, kind, idx, tNow){
    // Seed pro Unit nur einmal bestimmen (stabil)
    if (u._animSeed == null){
      const key = String(kind || 'u.unknown') + '#' + String(u.id || u.uid || idx || 0);
      u._animSeed = _hash01(key) * 10; // 0..10s Offset
    }
    return tNow + u._animSeed;
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

  function _isGlobalYSortEnabled(){
    // Default: an. Kann im Inspector/Devtools temporär deaktiviert werden:
    // window.__GLOBAL_YSORT__ = false;
    if (window.__GLOBAL_YSORT__ === false) return false;
    if (window.__GLOBAL_YSORT__ === true)  return true;
    return true;
  }

  function drawWorldGlobalYSort(ctx, cam, ts){
    const z = [];
    const MR = window.MapResources;
    const MD = window.MapDecorations;

    // Ressourcen + Deko (pro-node drawables)
    if (MR?.collectDrawables) MR.collectDrawables(z, cam, ts);
    if (MD?.collectDrawables) MD.collectDrawables(z, cam, ts);

    // Gebäude
    if (Array.isArray(window.Game?.buildings)){
      // IMPORTANT: Baustellen-Sprites initialisieren, sonst sehen wir nur Fallback-Rechtecke
      try { ensureBuildPlaceSprites(); } catch (e) { /* ignore */ }
      let bi = 0;
      for (const b of window.Game.buildings){
        const sortY = ((b.y | 0) + (b.h || 1)) * ts;
        z.push({
          sortY,
          z: 30,
          i: bi++,
          kind: 'bld',
          draw: (ctx)=> _drawOneBuildingYS(ctx, cam, ts, b)
        });
      }
    }

    // Units
    const units = getUnitsForDraw();
    if (units.length){
      const S = _makeUnitDrawShared();
      for (let i = 0; i < units.length; i++){
        const u = units[i];
        const sortY = (u.y * ts) + ts * 0.95;
        z.push({
          sortY,
          z: 40,
          i,
          kind: 'unit',
          draw: (ctx)=> _drawOneUnitYS(ctx, cam, ts, u, i, S)
        });
      }
    }

    // Sort: y (world) → layer bias (z) → stabil (i)
    z.sort((a,b)=> (a.sortY - b.sortY) || (a.z - b.z) || ((a.i||0)-(b.i||0)));

    for (const it of z){
      it.draw(ctx);
    }
  }

  function _drawOneBuildingYS(ctx, cam, ts, b){
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


  function _makeUnitDrawShared(){
    const Assets = window.Assets;
    const hasAssets = !!(Assets && (Assets.getImage || Assets.getAtlas));
    // Hinweis: carrierOk heißt nur "Atlas verfügbar", nicht "Unit existiert".
    let carrierOk = false;
    try{
      if (hasAssets && Assets.getAtlas){
        const a = Assets.getAtlas('characters');
        carrierOk = !!(a && (a.frames || a.textures || a.ok));
      }
    }catch(e){ /* ignore */ }

    const tNow = (typeof performance !== 'undefined' && performance.now)
      ? (performance.now() * 0.001)
      : (Date.now() * 0.001);

    // Unit-Registry/Defs (optional): wir lesen defensiv.
    function _getUnitDef(kind){
      const reg = window.Registry;
      const units = reg?.units || reg?.data?.units || reg?.get?.('units');
      if (!units) return null;
      return units[kind] || units[String(kind)] || null;
    }

    // Normalisierung für id/kind – damit alte + neue Strukturen funktionieren.
    function _normalizeUnitId(u){
      return (u?.id ?? u?.uid ?? u?.unitId ?? u?.name ?? '').toString();
    }

    function _getUnitKind(u){
      return (u?.kind ?? u?.job ?? u?.type ?? 'carrier').toString();
    }

    return { Assets, hasAssets, carrierOk, tNow, _getUnitDef, _normalizeUnitId, _getUnitKind };
  }

  function _drawOneUnitYS(ctx, cam, ts, u, idx, S){
    const Assets = S.Assets;
    const hasAssets = S.hasAssets;
    const carrierOk = S.carrierOk;
    const tNow = S.tNow;
    const _getUnitDef = S._getUnitDef;
    const _normalizeUnitId = S._normalizeUnitId;
    const _getUnitKind = S._getUnitKind;
            const ui = idx;
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

            // Registry → AtlasKey (falls vorhanden)
            const kind = _getUnitKind(u);
            const def  = _getUnitDef(kind) || {};

            // Anim-Zeit (stabil): benutzt performance.now(), mit Seed pro Unit
            const animT = _unitAnimTime(u, kind, ui, tNow);

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
              const a = Assets.getAtlas(atlasKey);

              // Frame wählen:
              // - Wenn Carrier-Atlas: nutze bestehende Mapping + einfache Animation
              // - Sonst: defaultFrame aus Def (oder erstes Frame)
              let frameName = null;

              if (atlasKey === CARRIER_ATLAS){
                const fps = 6;
                const cycle = moving ? 'walk' : 'idle';
                const frames = CARRIER_SPRITES[cycle]?.[dir] || CARRIER_SPRITES[cycle]?.S;
                if (frames && frames.length){
                  const frameIdx = Math.floor(animT * fps) % frames.length;
                  frameName = frames[frameIdx];
                }
                // falls Mapping nicht passt: erstes Frame
                if (frameName && !(a.frames && a.frames[frameName])) frameName = null;
                if (!frameName) frameName = 'frame_0_4'; // Center als safe-default
                if (frameName && !(a.frames && a.frames[frameName])) frameName = _pickFirstFrame(a);
              } else {
                // -----------------------------------------------------------------
                // Nicht-Carrier-Units: Frame-Auswahl über UnitAnim (8-dir, datadriven)
                //
                // Warum?
                //  - Wir wollen *nicht* mehr stur def.defaultFrame (meist "frame_0_0") zeichnen.
                //  - UnitAnim kann (a) dir8 + (b) idle/walk/carry/work + (c) Auto-Fallbacks.
                // -----------------------------------------------------------------
                if (window.UnitAnim && typeof window.UnitAnim.getFrameForUnit === 'function') {
                  // Richtung 8-dir aus Task ableiten (falls vorhanden). Das hilft insbesondere
                  // bei Units, die ohne vx/vy "direkt" über x/y bewegt werden.
                  const tgt8 = target;
                  if (tgt8 && Number.isFinite(tgt8.x) && Number.isFinite(tgt8.y)) {
                    const dx8 = (tgt8.x - tx);
                    const dy8 = (tgt8.y - ty);
                    u._dir8 = window.UnitAnim.dir8FromDelta(dx8, dy8);
                  }

                  // Anim-State nur setzen, wenn nichts "stärkeres" vorgegeben wurde
                  // (Worker-Loop setzt z.B. work/carry explizit).
                  if (!u.__animState || u.__animState === 'idle' || u.__animState === 'walk') {
                    u.__animState = moving ? 'walk' : 'idle';
                  }

                  const info = window.UnitAnim.getFrameForUnit(u, (tNow * 1000));
                  frameName = info?.frame || null;

                  // Safety
                  if (frameName && !(a.frames && a.frames[frameName])) frameName = null;
                }

                // Wenn UnitAnim nicht verfügbar oder kein passender Frame gefunden wurde:
                if (!frameName) {
                  // -----------------------------------------------------------------
                  // Nicht-Carrier-Units: einfache Idle-Animation (Frame-Cycling)
                  //
                  // Ziel:
                  //  - Units wirken nicht mehr "starr", auch wenn wir noch keine
                  //    vollständigen Richtung-/Walk-/Carry-States implementiert haben.
                  //
                  // Datenquellen (in dieser Reihenfolge):
                  //  1) def.idleFrames (Array von Frame-Namen)
                  //  2) def.anims?.idle?.frames
                  //  3) def.sprite?.idleFrames / def.sprite?.anims?.idle?.frames
                  //
                  // Fallback:
                  //  - Wenn nichts definiert ist: versuche frame_0_0 + frame_0_1
                  //  - sonst: nimm die ersten Frames (sortiert) als Mini-Zyklus
                  // -----------------------------------------------------------------
                  const animIdle = def.anims?.idle || def.sprite?.anims?.idle || null;
                  const fps = Number(def.idleFps ?? animIdle?.fps ?? 2) || 2;

                  let frames =
                    def.idleFrames ||
                    animIdle?.frames ||
                    def.sprite?.idleFrames ||
                    null;

                  if (!frames || !frames.length){
                    const keys = Object.keys(a.frames || {});
                    const has00 = keys.includes('frame_0_0');
                    const has01 = keys.includes('frame_0_1');

                    if (has00 && has01){
                      frames = ['frame_0_0', 'frame_0_1'];
                    } else {
                      const sorted = keys.slice().sort();
                      frames = sorted.slice(0, Math.min(4, sorted.length));
                    }
                  }

                  frameName = _pickAnimFrame(frames, animT, fps);

                  // Safety: wenn Frame nicht existiert → zurückfallen
                  if (frameName && !(a.frames && a.frames[frameName])) frameName = null;

                  // Wenn anim nicht möglich war, nutze expliziten defaultFrame oder erstes Frame
                  if (!frameName){
                    frameName = def.defaultFrame || def.sprite?.defaultFrame || _pickFirstFrame(a);
                  }

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
        // -----------------------------------------------------------
    // GLOBAL Y-SORT: Ressourcen + Deko + Gebäude + Units in EINEM Lauf
    // -----------------------------------------------------------
    if (_isGlobalYSortEnabled()){
      try{
        drawWorldGlobalYSort(ctx, cam, ts);
      }catch(e){
        WARN('GLOBAL_YSORT failed – fallback to legacy order', e);
      }
      ctx.restore();
      return;
    }

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
// Deko-Layer (Pflanzen/Props, KEINE Ressourcen)
//  - benötigt core/map.decorations.js
//  - nutzt MapDecorations.drawOnMainCanvas(ctx, cam, tileSize)
// ---------------------------------------------------------------------
if (window.MapDecorations) {
  try {
    if (typeof window.MapDecorations.drawOnMainCanvas === 'function') {
      window.MapDecorations.drawOnMainCanvas(ctx, cam, ts);
    }
  } catch (e) {
    WARN('MapDecorations draw Fehler:', e);
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
      const tNow = performance.now() / 1000; // Sekunden

      // Registry-Helper (Option B)
      const _getUnitDef = (kind)=>{
        const R = window.Registry;
        if (!R || !kind) return null;
        if (typeof R.getUnit === 'function') return R.getUnit(kind);
        if (typeof R.get === 'function') return R.get('units', kind);
        if (R.units && R.units[kind]) return R.units[kind];
        return null;
      };

      const _normalizeUnitId = (raw)=>{
        if (!raw) return null;
        let k = String(raw).toLowerCase().trim();
        // häufige Varianten vereinheitlichen: u_builder → u.builder, builder → u.builder
        k = k.replace(/_/g, '.');
        if (!k.startsWith('u.')) k = 'u.' + k;
        return k;
      };

      const _getUnitKind = (u)=>{
        // Best effort – je nach Runtime können die Felder anders heißen
        const cand = [
          u?.kind, u?.type, u?.unitKind, u?.unitType, u?.defId, u?.template,
          (typeof u?.id === 'string' && (u.id.startsWith('u.') || u.id.startsWith('u_'))) ? u.id : null
        ];
        for (const k of cand){
          if (typeof k === 'string' && k.length) return _normalizeUnitId(k);
        }
        return null;
      };

      const _pickFirstFrame = (atlas)=>{
        const keys = Object.keys(atlas?.frames || {});
        return keys[0] || null;
      };

      ctx.save();

      let __ui = 0;
      for (const u of units){
        const ui = __ui++;
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

        // Registry → AtlasKey (falls vorhanden)
        const kind = _getUnitKind(u);
        const def  = _getUnitDef(kind) || {};

        // Anim-Zeit (stabil): benutzt performance.now(), mit Seed pro Unit
        const animT = _unitAnimTime(u, kind, ui, tNow);

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
          const a = Assets.getAtlas(atlasKey);

          // Frame wählen:
          // - Wenn Carrier-Atlas: nutze bestehende Mapping + einfache Animation
          // - Sonst: defaultFrame aus Def (oder erstes Frame)
          let frameName = null;

          if (atlasKey === CARRIER_ATLAS){
            const fps = 6;
            const cycle = moving ? 'walk' : 'idle';
            const frames = CARRIER_SPRITES[cycle]?.[dir] || CARRIER_SPRITES[cycle]?.S;
            if (frames && frames.length){
              const frameIdx = Math.floor(animT * fps) % frames.length;
              frameName = frames[frameIdx];
            }
            // falls Mapping nicht passt: erstes Frame
            if (frameName && !(a.frames && a.frames[frameName])) frameName = null;
            if (!frameName) frameName = 'frame_0_4'; // Center als safe-default
            if (frameName && !(a.frames && a.frames[frameName])) frameName = _pickFirstFrame(a);
          } else {
            // -----------------------------------------------------------------
            // Nicht-Carrier-Units: Frame-Auswahl über UnitAnim (8-dir, datadriven)
            //
            // Warum?
            //  - Wir wollen *nicht* mehr stur def.defaultFrame (meist "frame_0_0") zeichnen.
            //  - UnitAnim kann (a) dir8 + (b) idle/walk/carry/work + (c) Auto-Fallbacks.
            // -----------------------------------------------------------------
            if (window.UnitAnim && typeof window.UnitAnim.getFrameForUnit === 'function') {
              // Richtung 8-dir aus Task ableiten (falls vorhanden). Das hilft insbesondere
              // bei Units, die ohne vx/vy "direkt" über x/y bewegt werden.
              const tgt8 = target;
              if (tgt8 && Number.isFinite(tgt8.x) && Number.isFinite(tgt8.y)) {
                const dx8 = (tgt8.x - tx);
                const dy8 = (tgt8.y - ty);
                u._dir8 = window.UnitAnim.dir8FromDelta(dx8, dy8);
              }

              // Anim-State nur setzen, wenn nichts "stärkeres" vorgegeben wurde
              // (Worker-Loop setzt z.B. work/carry explizit).
              if (!u.__animState || u.__animState === 'idle' || u.__animState === 'walk') {
                u.__animState = moving ? 'walk' : 'idle';
              }

              const info = window.UnitAnim.getFrameForUnit(u, (tNow * 1000));
              frameName = info?.frame || null;

              // Safety
              if (frameName && !(a.frames && a.frames[frameName])) frameName = null;
            }

            // Wenn UnitAnim nicht verfügbar oder kein passender Frame gefunden wurde:
            if (!frameName) {
              // -----------------------------------------------------------------
              // Nicht-Carrier-Units: einfache Idle-Animation (Frame-Cycling)
              //
              // Ziel:
              //  - Units wirken nicht mehr "starr", auch wenn wir noch keine
              //    vollständigen Richtung-/Walk-/Carry-States implementiert haben.
              //
              // Datenquellen (in dieser Reihenfolge):
              //  1) def.idleFrames (Array von Frame-Namen)
              //  2) def.anims?.idle?.frames
              //  3) def.sprite?.idleFrames / def.sprite?.anims?.idle?.frames
              //
              // Fallback:
              //  - Wenn nichts definiert ist: versuche frame_0_0 + frame_0_1
              //  - sonst: nimm die ersten Frames (sortiert) als Mini-Zyklus
              // -----------------------------------------------------------------
              const animIdle = def.anims?.idle || def.sprite?.anims?.idle || null;
              const fps = Number(def.idleFps ?? animIdle?.fps ?? 2) || 2;

              let frames =
                def.idleFrames ||
                animIdle?.frames ||
                def.sprite?.idleFrames ||
                null;

              if (!frames || !frames.length){
                const keys = Object.keys(a.frames || {});
                const has00 = keys.includes('frame_0_0');
                const has01 = keys.includes('frame_0_1');

                if (has00 && has01){
                  frames = ['frame_0_0', 'frame_0_1'];
                } else {
                  const sorted = keys.slice().sort();
                  frames = sorted.slice(0, Math.min(4, sorted.length));
                }
              }

              frameName = _pickAnimFrame(frames, animT, fps);

              // Safety: wenn Frame nicht existiert → zurückfallen
              if (frameName && !(a.frames && a.frames[frameName])) frameName = null;

              // Wenn anim nicht möglich war, nutze expliziten defaultFrame oder erstes Frame
              if (!frameName){
                frameName = def.defaultFrame || def.sprite?.defaultFrame || _pickFirstFrame(a);
              }

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
