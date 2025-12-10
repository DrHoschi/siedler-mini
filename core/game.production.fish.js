/* ============================================================================
 * Datei   : core/game.production.fish.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-fish-workarea-water-maincanvas-final
 *
 * Zweck   :
 *   Produktions-/Deko-Logik für Fisch (Fischerhütte):
 *     - Reagiert auf cb:build:complete für Fischer-Gebäude
 *     - Legt pro Gebäude ein eigenes "Fischfeld" an
 *     - Verteilt Fische IM Arbeitsbereich (WorkArea)
 *     - Fische dürfen NUR auf Wasser-Tiles (ID 8 oder 9) liegen
 *     - Zeichnet Fische + "arbeitenden Fischer" direkt auf dem HAUPT-CANVAS
 *
 *   Darstellung:
 *     - KEIN OverlayHooks, kein eigenes Overlay-Canvas
 *     - Nutzt fish_mega_atlas.* (Fallback: einfache blaue Punkte)
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *     - cb:workarea:set   { id|buildingId|kind, uid, cx,cy,radiusTiles, x,y,w,h }
 *
 *   OUT :
 *     - aktuell keine eigenen Produktions-Events (nur Deko + Worker)
 *
 *   API / Debug:
 *     - window.ProductionFish.fields
 *     - window.ProductionFish.drawOnMainCanvas(ctx, cam, tileSize)
 * ========================================================================== */

(function(){
  'use strict';

  // ========================================================================
  // LOGGING / META
  // ========================================================================

  const TAG  = '[prod-fish]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ========================================================================
  // KONSTANTEN
  // ========================================================================

  // Mögliche IDs für Fischerhütte / Fischer-Gebäude
  // → großzügig, damit wir alle Varianten erwischen.
  const FISH_BUILDING_IDS = new Set([
    'b.fish',
    'b.fishery',
    'b.fisher',
    'b.fischer',
    'fish',
    'fishery',
    'fisher',
    'fischer'
  ]);

  // Anzahl Fische pro Feld (pro Gebäude)
  const FISH_PER_FIELD = 10;

  // Basis-Radius um den Arbeitsbereich (in Tiles)
  // → tatsächlicher Radius = WorkArea.radiusTiles (falls gesetzt),
  //   sonst diese Default-Werte.
  const FISH_RADIUS_MIN = 2.0;
  const FISH_RADIUS_MAX = 6.0;

  // Wasser-Tile-IDs laut deiner Map (z. B. map-epoch1.json)
  const WATER_TILE_IDS = new Set([8, 9]);

  // Atlas-Konfiguration Fisch
  const FISH_ATLAS_CFG = {
    urlJson  : 'assets/resources/fish/fish_mega_atlas.json',
    urlImage : 'assets/resources/fish/fish_mega_atlas.png',

    resolvedFrames : null,  // Name → {x,y,w,h,pivotX,pivotY}
    frameNames     : null   // Array aller verfügbaren Framenamen
  };

  // ========================================================================
  // STATE
  // ========================================================================

  /**
   * Map<uid, FishFieldState>
   *
   * FishFieldState:
   *   {
   *     uid, kind,
   *     x,y,w,h,         // Gebäude-Rechteck in Tiles
   *     cx,cy,           // aktuelle Feld-Mitte in Tiles
   *     workArea,        // {cx,cy,radiusTiles} oder null
   *     fishes: [ ... ], // Liste aller Fisch-Instanzen
   *   }
   *
   * Fisch-Eintrag:
   *   {
   *     tx,ty,           // Tile-Position (float) in Tiles
   *     frameName,       // Sprite-Name aus dem Atlas
   *     scale,           // Skalierung des Sprites
   *     phaseOffset      // Zufalls-Offset für Animation (Springen/Wellen)
   *   }
   */
  const FishFields = new Map();

  let fishAtlas        = null;
  let fishAtlasImg     = null;
  let fishAtlasLoaded  = false;
  let fishAtlasLoading = false;

  // ========================================================================
  // HELFER – GENERELL
  // ========================================================================

  function makeRng(seedStr){
    let s = 0;
    for (let i=0; i<seedStr.length; i++){
      s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    if (!s) s = 1;
    return function rng(){
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  }

  function pickRandom(arr, rng){
    if (!arr || !arr.length) return null;
    const r   = rng ? rng() : Math.random();
    const idx = Math.floor(r * arr.length);
    return arr[Math.max(0, Math.min(arr.length-1, idx))];
  }

  function isFishBuildingId(kind){
    if (!kind) return false;
    const k = String(kind).toLowerCase();
    if (FISH_BUILDING_IDS.has(k)) return true;
    if (!k.startsWith('b.')) return FISH_BUILDING_IDS.has('b.' + k);
    return false;
  }

  // ========================================================================
  // HELFER – MAP / WASSER / KOLLISION
  // ========================================================================

  /**
   * Liefert die Tile-ID an einer (float-)Tile-Position tx,ty.
   * tx,ty sind in Tiles (nicht in Pixeln).
   */
  function getTileIdAt(tx, ty){
    const GameMap = window.GameMap;
    const state   = GameMap && GameMap._state;
    if (!state || !state.grid) return -1;

    const gx = Math.floor(tx);
    const gy = Math.floor(ty);

    if (gy < 0 || gy >= state.rows || gx < 0 || gx >= state.cols) return -1;

    const row = state.grid[gy];
    if (!row) return -1;

    return row[gx];
  }

  /**
   * Prüft, ob die Tile-Position auf Wasser liegt.
   * Nutzt WATER_TILE_IDS (hier: IDs 8 und 9).
   */
  function isWaterTile(tx, ty){
    const id = getTileIdAt(tx, ty);
    return WATER_TILE_IDS.has(id);
  }

  /**
   * Prüft, ob eine Tile-Position innerhalb des Gebäude-Rechtecks liegt.
   * → Damit Fische nicht auf/unter dem Haus gezeichnet werden.
   */
  function isInsideBuilding(field, tx, ty){
    if (!field) return false;
    const x = field.x | 0;
    const y = field.y | 0;
    const w = field.w || 3;
    const h = field.h || 3;
    return (tx >= x && tx < x + w && ty >= y && ty < y + h);
  }

  // ========================================================================
  // ATLAS-LADEN + AUFBEREITEN
  // ========================================================================

  function ensureFishAtlasLoaded(){
    if (fishAtlasLoaded || fishAtlasLoading) return;
    fishAtlasLoading = true;

    try {
      fetch(FISH_ATLAS_CFG.urlJson)
        .then(r => r.json())
        .then(data => {
          fishAtlas = data;
          LOG('Fish-Atlas JSON geladen:', FISH_ATLAS_CFG.urlJson);
        })
        .catch(err => {
          WARN('Fish-Atlas JSON konnte nicht geladen werden:', err);
        });
    } catch(e){
      WARN('Fish-Atlas JSON fetch nicht verfügbar:', e);
    }

    try {
      const img = new Image();
      img.onload = function(){
        fishAtlasImg    = img;
        fishAtlasLoaded = true;
        LOG('Fish-Atlas Bild geladen:', FISH_ATLAS_CFG.urlImage);
      };
      img.onerror = function(err){
        WARN('Fish-Atlas Bild konnte nicht geladen werden:', err);
      };
      img.src = FISH_ATLAS_CFG.urlImage;
    } catch(e){
      WARN('Fish-Atlas Bild-Ladevorgang fehlgeschlagen:', e);
    }
  }

  /**
   * Bereitet die Frames so auf, dass sowohl "trees_mega_atlas"-Stil (tileW/tileH
   * + [cx,cy]) als auch "stones_mega_atlas"-Stil (frame/pivot) unterstützt werden.
   */
  function ensureFishAtlasReady(){
    if (!fishAtlasLoaded || !fishAtlasImg || !fishAtlas || !fishAtlas.frames){
      return false;
    }

    if (!FISH_ATLAS_CFG.resolvedFrames){
      const rawFrames = fishAtlas.frames || {};
      const resolved  = {};
      const names     = [];

      const defaultTileW = fishAtlas.tileW || 128;
      const defaultTileH = fishAtlas.tileH || 128;

      for (const [name, info] of Object.entries(rawFrames)){
        let x, y, w, h, pivotX, pivotY;

        if (Array.isArray(info)){
          // Variante wie bei trees_mega_atlas:
          // info = [cx,cy] mit global tileW/tileH
          const cx = info[0] | 0;
          const cy = info[1] | 0;
          w = defaultTileW;
          h = defaultTileH;
          x = cx * w;
          y = cy * h;
          pivotX = w / 2;
          pivotY = h / 2;
        } else {
          // Variante wie bei stones_mega_atlas:
          // info.frame = {x,y,w,h}, info.pivot = {x,y} optional
          const f = info.frame || info;
          w = (f.w | 0) || defaultTileW;
          h = (f.h | 0) || defaultTileH;
          x = f.x | 0;
          y = f.y | 0;

          const p = info.pivot || {};
          pivotX = (typeof p.x === 'number') ? p.x : (w / 2);
          pivotY = (typeof p.y === 'number') ? p.y : h; // Fußpunkt unten
        }

        resolved[name] = { x, y, w, h, pivotX, pivotY };
        names.push(name);
      }

      FISH_ATLAS_CFG.resolvedFrames = resolved;
      FISH_ATLAS_CFG.frameNames     = names;

      LOG('Fish-Atlas Frames aufgelöst (resolvedFrames, frameNames).');
    }

    return true;
  }

  function drawFishFrame(ctx, key, cx, cy, scale){
    if (!ensureFishAtlasReady()) return false;

    const frames = FISH_ATLAS_CFG.resolvedFrames;
    const f      = frames && frames[key];
    if (!f || !fishAtlasImg) return false;

    const s  = (typeof scale === 'number' && scale > 0) ? scale : 1;
    const dw = f.w * s;
    const dh = f.h * s;

    // Pivot = Fußpunkt im Wasser (PivotY unten)
    const dx = cx - f.pivotX * s;
    const dy = cy - f.pivotY * s;

    try {
      ctx.drawImage(
        fishAtlasImg,
        f.x, f.y, f.w, f.h,
        dx, dy, dw, dh
      );
      return true;
    } catch(e){
      WARN('drawFishFrame Fehler:', e);
      return false;
    }
  }

  // ========================================================================
  // FISCHFELDER ERZEUGEN
  // ========================================================================

  function registerFishFieldFromBuild(detail){
    if (!detail) return;

    const kind = (detail.id || detail.buildingId || detail.kind || '').toLowerCase();
    if (!isFishBuildingId(kind)) return;

    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const uid = detail.uid || `${kind}@${x},${y}`;
    if (FishFields.has(uid)){
      return;
    }

    const cxTiles = x + w / 2;
    const cyTiles = y + h / 2;

    const field = {
      uid,
      kind,
      x, y, w, h,
      cx : cxTiles,
      cy : cyTiles,
      workArea : null,
      fishes   : []
    };

    createRandomFishLayout(field);
    FishFields.set(uid, field);

    LOG('FishField registriert', field);
    ensureFishAtlasLoaded();
  }

  /**
   * Erzeugt das Layout der Fische innerhalb des aktuellen Arbeitsbereichs.
   * - Mittelpunkt: field.workArea.cx/cy oder field.cx/field.cy
   * - Radius: field.workArea.radiusTiles oder FISH_RADIUS_MAX
   * - Fische dürfen NUR auf Wasser-Tiles (8/9) liegen
   * - Fische dürfen NICHT innerhalb des Gebäude-Rechtecks liegen
   */
  function createRandomFishLayout(field){
    const rng    = makeRng(field.uid);
    const fishes = field.fishes;
    fishes.length = 0;

    const wa = field.workArea || null;
    const cx = (wa && typeof wa.cx === 'number') ? wa.cx : field.cx;
    const cy = (wa && typeof wa.cy === 'number') ? wa.cy : field.cy;

    const rMax = (wa && typeof wa.radiusTiles === 'number')
      ? wa.radiusTiles
      : FISH_RADIUS_MAX;

    const rMin = Math.min(FISH_RADIUS_MIN, rMax * 0.6);

    const names = FISH_ATLAS_CFG.frameNames || null;
    const now   = performance.now ? performance.now() : Date.now();

    const targetCount = FISH_PER_FIELD;

    for (let i = 0; i < targetCount; i++){
      let placed = false;

      // Sicherheitsnetz: mehrere Versuche pro Fisch,
      // um eine Wasser-Position zu finden.
      for (let tries = 0; tries < 40 && !placed; tries++){
        const angle  = rng() * Math.PI * 2;
        const radius = rMin + (rMax - rMin) * rng();

        const tx = cx + Math.cos(angle) * radius;
        const ty = cy + Math.sin(angle) * radius;

        if (!isWaterTile(tx, ty)) continue;
        if (isInsideBuilding(field, tx, ty)) continue;

        const frameName = names && names.length
          ? pickRandom(names, rng)
          : null;

        const scale = 0.7 + 0.5 * rng();
        const phaseOffset = now + rng() * 5000;

        fishes.push({
          tx,
          ty,
          frameName,
          scale,
          phaseOffset
        });

        placed = true;
      }

      // Falls nach vielen Versuchen kein gültiger Platz gefunden wurde,
      // lassen wir diesen Fisch einfach weg (besser als auf Land zu landen).
      if (!placed){
        WARN('createRandomFishLayout: kein Wasserplatz gefunden für Fisch', i, 'in Feld', field.uid);
      }
    }
  }

  // ========================================================================
  // ZEICHNUNG AUF DEM HAUPT-CANVAS (Fische + Fischer)
  // ========================================================================

  /**
   * Wird vom Renderer nach Kamera-Transform aufgerufen.
   * ctx ist damit bereits in Weltkoordinaten.
   */
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;
    if (!FishFields.size) return;

    const Game = window.Game || {};
    const ts =
      (tileSize) ||
      (Game.map && Game.map.tileSize) ||
      (window.GameMap && window.GameMap._state && window.GameMap._state.map && window.GameMap._state.map.tileSize) ||
      Game.tileSize ||
      64;

    const atlasReady = ensureFishAtlasReady();
    const now        = performance.now ? performance.now() : Date.now();

    ctx.save();

    for (const field of FishFields.values()){
      const fishes = field.fishes || [];
      if (!fishes.length) continue;

      // -----------------------------------------------------------
      // 1) Fische zeichnen (leicht wabernde/wackelnde Position)
      // -----------------------------------------------------------
      for (const f of fishes){
        if (!f) continue;

        const tx = f.tx;
        const ty = f.ty;

        // Weltkoordinaten des Wassers (Tile-Mitte)
        let cxPx = (tx + 0.5) * ts;
        let cyPx = (ty + 1.0) * ts;

        // kleine Wellen-/Spring-Animation über phaseOffset
        const phase = (now - f.phaseOffset) * 0.004;
        const bobX  = Math.sin(phase * 0.7) * ts * 0.05;
        const bobY  = Math.sin(phase * 1.1) * ts * 0.04;

        cxPx += bobX;
        cyPx += bobY;

        let drawn = false;

        if (atlasReady && f.frameName){
          drawn = drawFishFrame(ctx, f.frameName, cxPx, cyPx, f.scale);
        }

        if (!drawn){
          // Fallback: einfacher blauer Punkt im Wasser
          const r = ts * 0.22;
          ctx.beginPath();
          ctx.fillStyle   = 'rgba(60, 140, 220, 0.9)';
          ctx.strokeStyle = 'rgba(0, 40, 90, 0.9)';
          ctx.lineWidth   = Math.max(1.5, ts * 0.04);
          ctx.arc(cxPx, cyPx - r * 0.3, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // -----------------------------------------------------------
      // 2) "Arbeitender Fischer" – einfache graue Blase am Gebäude
      //    (nur Deko, später echte Unit-Logik möglich)
      // -----------------------------------------------------------
      const gx = field.x | 0;
      const gy = field.y | 0;
      const gw = field.w || 3;
      const gh = field.h || 3;

      const workerX = (gx + gw * 0.5) * ts;
      const workerY = (gy + gh) * ts;

      const bob   = Math.sin(now * 0.004 + gx + gy) * ts * 0.07;
      const rWork = ts * 0.25;

      ctx.beginPath();
      ctx.fillStyle   = 'rgba(235,235,235,0.95)';
      ctx.strokeStyle = 'rgba(20,20,20,0.9)';
      ctx.lineWidth   = Math.max(1.0, ts * 0.035);
      ctx.arc(workerX, workerY - ts * 0.7 + bob, rWork, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // kleiner Punkt als "Kopf" / Blickrichtung
      ctx.beginPath();
      ctx.fillStyle = 'rgba(30,30,30,0.95)';
      ctx.arc(workerX + rWork * 0.25, workerY - ts * 0.8 + bob, rWork * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ========================================================================
  // EVENT-BINDING (build/workarea)
  // ========================================================================

  function onBuildComplete(detail){
    try {
      registerFishFieldFromBuild(detail);
    } catch(e){
      ERR('onBuildComplete Fehler:', e);
    }
  }

  function onWorkAreaSet(detail){
    if (!detail) return;
    const kind = (detail.id || detail.buildingId || detail.kind || '').toLowerCase();
    if (!isFishBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const field = FishFields.get(uid);
    if (!field){
      return;
    }

    const radius = (typeof detail.radiusTiles === 'number')
      ? detail.radiusTiles
      : (field.workArea?.radiusTiles || FISH_RADIUS_MAX);

    field.workArea = {
      cx         : (typeof detail.cx === 'number') ? detail.cx : field.cx,
      cy         : (typeof detail.cy === 'number') ? detail.cy : field.cy,
      radiusTiles: radius
    };

    // Feld-Mitte an WorkArea koppeln
    field.cx = field.workArea.cx;
    field.cy = field.workArea.cy;

    // neues Layout innerhalb des (neuen) Arbeitsbereiches
    createRandomFishLayout(field);

    LOG(TAG, 'Arbeitsbereich aktualisiert (Fisch):', uid, field.workArea);
  }

  function tick(dtMs){
    // aktuell keine eigene Zeit-Logik nötig (Animation läuft über performance.now)
    void dtMs;
  }

  // Browser-Events (Fallback, zusätzlich zur Production.registerModule-Koppelung)
  try {
    window.addEventListener('cb:build:complete', (ev)=>{
      const detail = ev.detail || {};
      try {
        (window.CBLog?.info || console.info)(
          TAG,
          'direct cb:build:complete',
          detail.id,
          detail
        );
        registerFishFieldFromBuild(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'Direkter cb:build:complete-Listener Fehler:',
          e
        );
      }
    }, { passive:true });

    window.addEventListener('cb:workarea:set', (ev)=>{
      const detail = ev.detail || {};
      try {
        onWorkAreaSet(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'cb:workarea:set-Listener Fehler:',
          e
        );
      }
    }, { passive:true });
  } catch(e){
    (window.CBLog?.warn || console.warn)(
      TAG,
      'Event-Listener konnten nicht registriert werden:',
      e
    );
  }

  // ========================================================================
  // REGISTRIERUNG BEIM Production-Manager
  // ========================================================================

  function registerWithManager(){
    if (!window.Production || typeof window.Production.registerModule !== 'function'){
      return false;
    }
    try {
      window.Production.registerModule({
        id             : 'fish',
        onBuildComplete,
        onWorkAreaSet,
        tick,
        drawOnMainCanvas   // <-- Main-Canvas-Zeichner
      });
      LOG('Produktionsmodul "fish" registriert.');
      return true;
    } catch(e){
      WARN('Production.registerModule(fish) fehlgeschlagen', e);
      return true;
    }
  }

  if (!registerWithManager()){
    let tries = 0;
    const t = setInterval(()=>{
      if (registerWithManager() || ++tries > 20) clearInterval(t);
    }, 200);
  }

  // ========================================================================
  // DEBUG-EXPORT
  // ========================================================================

  window.ProductionFish = {
    fields        : FishFields,
    FISH_ATLAS_CFG,
    drawOnMainCanvas,
    ensureAtlas   : ensureFishAtlasReady,
    _recreate     : createRandomFishLayout
  };

  LOG('Fisch-Modul geladen v25.12.10-fish-workarea-water-maincanvas-final');

})();
