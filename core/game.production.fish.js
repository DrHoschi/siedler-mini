/* ============================================================================
 * Datei   : core/game.production.fish.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-fish-workarea-maincanvas-v1
 *
 * Zweck   :
 *   Visuelle Darstellung & einfache Produktionslogik für Fisch:
 *     - Reagiert auf cb:build:complete für Fisch-Gebäude (Fischerhütte, Fishery ...)
 *     - Legt pro Gebäude ein "FishField" an (Schwarm-Bereich im Wasser)
 *     - Zeichnet Fische direkt auf dem HAUPT-CANVAS im Arbeitsbereich
 *     - Nutzt fish_mega_atlas.* als Grafikquelle (Fallback: einfache Kreise)
 *
 *   Optional:
 *     - Reagiert auf cb:prod:output { item:'fish', ... }
 *       → könnte z.B. den Fischschwarm ausdünnen / animieren
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *     - cb:workarea:set   { id|buildingId|kind, uid, cx,cy,radiusTiles, x,y,w,h }
 *     - cb:prod:output    { bId, kind, item:'fish', qty }  (optional)
 *
 *   OUT :
 *     - aktuell keine eigenen Events (nur Deko / Visualisierung)
 *
 * Debug / API:
 *   - window.ProductionFish.fields
 *   - window.ProductionFish.drawOnMainCanvas(ctx, cam, tileSize)
 *   - window.ProductionFish.ensureAtlas()
 *
 * WICHTIG:
 *   - KEINE OverlayHooks, KEIN eigenes Overlay-Canvas.
 *   - Renderer ruft ProductionFish.drawOnMainCanvas(ctx, cam, tileSize)
 *     im gleichen Kamera-Kontext auf wie Map & Gebäude.
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[prod-fish]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ========================================================================
  // KONSTANTEN
  // ========================================================================

  // Alle Building-IDs, die als "Fischerhütte / Fishery" gelten sollen.
  const FISH_BUILDING_IDS = new Set([
    'b.fishery',
    'fishery',
    'b.fisher',
    'fisher',
    'b.fischerhuette',
    'fischerhuette',
    'b.fisher_hut',
    'fisher_hut'
  ]);

  // Anzahl Fische pro Field
  const FISH_PER_FIELD = 8;

  // Radius um den WorkArea-Mittelpunkt (in Tiles)
  const FISH_RADIUS_MIN = 1.5;
  const FISH_RADIUS_MAX = 3.5;

  // "Zustände" im Schwarm (z.B. für spätere Animation / Depletion)
  const FISH_STAGE = [
    'IDLE',
    'JUMP',
    'DIVE'
  ];

  // Atlas-Konfiguration (bitte bei Bedarf an deine Pfade anpassen)
  const FISH_ATLAS_CFG = {
    urlJson  : 'assets/resources/fish_mega_atlas.json',
    urlImage : 'assets/resources/fish_mega_atlas.png',

    // Logische Gruppen → Präfixe im Atlas
    groups   : {
      IDLE : 'fish_idle_',
      JUMP : 'fish_jump_',
      DIVE : 'fish_dive_'
    },

    resolvedFrames : null,
    groupFrames    : null
  };

  // ========================================================================
  // STATE
  // ========================================================================

  /** Map<uid, FishFieldState> */
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

  function ensureFishAtlasReady(){
    if (!fishAtlasLoaded || !fishAtlasImg || !fishAtlas || !fishAtlas.frames){
      return false;
    }

    // 1) Einzel-Frames mit Pivot auflösen (falls im JSON vorhanden)
    if (!FISH_ATLAS_CFG.resolvedFrames){
      const resolved = {};
      const frames   = fishAtlas.frames || {};

      for (const [name, info] of Object.entries(frames)){
        const f = info.frame || {};
        const p = info.pivot || {};
        resolved[name] = {
          x      : f.x|0,
          y      : f.y|0,
          w      : f.w|0,
          h      : f.h|0,
          pivotX : (p.x|0) || ((f.w|0) / 2),
          pivotY : (p.y|0) || (f.h|0)
        };
      }

      FISH_ATLAS_CFG.resolvedFrames = resolved;
      LOG('Fish-Atlas Frames aufgelöst (resolvedFrames).');
    }

    // 2) Gruppen (IDLE, JUMP, DIVE) aus Präfixen auflösen
    if (!FISH_ATLAS_CFG.groupFrames){
      const groupFrames = {};
      const frames = fishAtlas.frames || {};
      const groupDefs = FISH_ATLAS_CFG.groups || {};

      for (const name of Object.keys(frames)){
        for (const [gName, prefix] of Object.entries(groupDefs)){
          if (name.startsWith(prefix)){
            if (!groupFrames[gName]) groupFrames[gName] = [];
            groupFrames[gName].push(name);
            break;
          }
        }
      }

      FISH_ATLAS_CFG.groupFrames = groupFrames;
      LOG('Fish-Atlas Gruppen aufgelöst (groupFrames).');
    }

    return true;
  }

  function drawFishFrame(ctx, key, cx, cy, scale){
    if (!ensureFishAtlasReady()) return false;

    const frames = FISH_ATLAS_CFG.resolvedFrames;
    const f = frames && frames[key];
    if (!f || !fishAtlasImg) return false;

    const s  = (typeof scale === 'number' && scale>0) ? scale : 1;
    const dw = f.w * s;
    const dh = f.h * s;

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
      fishes : []
    };

    createRandomFishLayout(field);
    FishFields.set(uid, field);

    LOG('FishField registriert', field);
    ensureFishAtlasLoaded();
  }

  function createRandomFishLayout(field){
    const rng = makeRng(field.uid);
    field.fishes.length = 0;

    const count = FISH_PER_FIELD;

    for (let i=0; i<count; i++){
      const angle  = rng() * Math.PI * 2;
      const radius = FISH_RADIUS_MIN + (FISH_RADIUS_MAX - FISH_RADIUS_MIN) * rng();

      const tx = field.cx + Math.cos(angle) * radius;
      const ty = field.cy + Math.sin(angle) * radius;

      const scale = 0.8 + 0.3 * rng();

      // simple Stage-Auswahl
      let stageIndex;
      const rStage = rng();
      if (rStage < 0.6)       stageIndex = 0; // IDLE
      else if (rStage < 0.85) stageIndex = 1; // JUMP
      else                    stageIndex = 2; // DIVE

      const variant = Math.floor(rng() * 16) & 0xFF;

      field.fishes.push({
        tx,
        ty,
        stageIndex,
        variant,
        scale,
        // kleines internes "Phasen-Timing", falls wir später animieren wollen
        tOffset: rng() * 10000
      });
    }
  }

  // ========================================================================
  // ZEICHNUNG AUF DEM HAUPT-CANVAS (Fische)
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

    ctx.save();

    const now = performance.now ? performance.now() : Date.now();

    for (const field of FishFields.values()){
      const fishes = field.fishes || [];
      if (!fishes.length) continue;

      for (const fsh of fishes){
        if (fsh.stageIndex == null || fsh.stageIndex < 0) continue;

        const tx = fsh.tx;
        const ty = fsh.ty;

        // Welt → Pixel (Kamera-Transform ist bereits aktiv)
        let cxPx = (tx + 0.5) * ts;
        let cyPx = (ty + 0.9) * ts; // leicht unterhalb der Tile-Mitte (Wasseroberfläche)

        let drawn = false;

        // einfache "Pseudo-Animation" über Zeit:
        // Stage kann sanft zwischen IDLE / JUMP / DIVE wechseln, je nach Zeit.
        let stageIndex = fsh.stageIndex;
        const tPhase = ((now + fsh.tOffset) / 1000.0) % 4.0; // 0..4s Schleife

        if (tPhase < 1.5){
          stageIndex = 0; // IDLE
        } else if (tPhase < 2.2){
          stageIndex = 1; // JUMP
        } else if (tPhase < 3.0){
          stageIndex = 2; // DIVE
        } else {
          stageIndex = 0;
        }

        if (atlasReady){
          let groupName = FISH_STAGE[stageIndex] || 'IDLE';
          const groupFrames = groupName &&
                              FISH_ATLAS_CFG.groupFrames &&
                              FISH_ATLAS_CFG.groupFrames[groupName];

          if (groupFrames && groupFrames.length){
            const frameName = groupFrames[fsh.variant % groupFrames.length];

            // Beim Sprung den Fisch etwas nach oben schieben
            if (groupName === 'JUMP'){
              cyPx -= ts * 0.2;
            }
            // Beim Abtauchen etwas nach unten
            if (groupName === 'DIVE'){
              cyPx += ts * 0.1;
            }

            drawn = drawFishFrame(ctx, frameName, cxPx, cyPx, fsh.scale);
          }
        }

        if (!drawn){
          // Fallback: kleiner blauer Blob
          const r = ts * 0.22;
          ctx.beginPath();
          ctx.fillStyle   = 'rgba(30,144,255,0.85)';
          ctx.strokeStyle = 'rgba(0, 0, 80, 0.9)';
          ctx.lineWidth   = Math.max(1.0, ts * 0.03);
          ctx.arc(cxPx, cyPx, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  // ========================================================================
  // WORKAREA-HOOK: cb:workarea:set
  // ========================================================================

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

    // Mittelpunkt auf neuen WorkArea-Mittelpunkt setzen
    field.cx = field.workArea.cx;
    field.cy = field.workArea.cy;

    // Neues Layout innerhalb des (neuen) Arbeitsbereiches
    createRandomFishLayout(field);

    LOG(TAG, 'Arbeitsbereich (Fisch) aktualisiert:', uid, field.workArea);
  }

  // ========================================================================
  // PRODUKTIONS-HOOK (optional): cb:prod:output item:'fish'
  // ========================================================================

  function onFishProduced(detail){
    if (!detail) return;
    const item = detail.item || detail.resource || detail.resId;
    if (item !== 'fish') return;

    const uid = detail.bId || detail.buildingUid || detail.uid;
    if (!uid) return;

    const field = FishFields.get(uid);
    if (!field) return;

    // aktuell nur "kurze Reaktion":
    // wir könnten z.B. kurz alle Fische in JUMP-Stufe setzen, oder
    // später die Schwarmgröße reduzieren.
    LOG(TAG, 'Fisch-Produktion erkannt (Deko-Hook):', uid, detail.qty || 1);
  }

  // ========================================================================
  // TICK (optional, aktuell nur Stub)
  // ========================================================================

  function tick(dtMs){
    // Aktuell nutzen wir nur performance.now() für pseudo-Animation,
    // brauchen kein eigenes Zeitaccum hier.
    void dtMs;
  }

  // ========================================================================
  // EVENT-BINDING (build/production/workarea)
  // ========================================================================

  function onBuildComplete(detail){
    try {
      registerFishFieldFromBuild(detail);
    } catch(e){
      ERR('onBuildComplete Fehler:', e);
    }
  }

  try {
    // Gebäude-Event
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

    // WorkArea-Event
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

    // Produktions-Event (optional)
    window.addEventListener('cb:prod:output', (ev)=>{
      const detail = ev.detail || {};
      try {
        onFishProduced(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'cb:prod:output-Listener Fehler (fish):',
          e
        );
      }
    }, { passive:true });

  } catch(e){
    (window.CBLog?.warn || console.warn)(
      TAG,
      'Event-Listener (fish) konnten nicht registriert werden:',
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
        drawOnMainCanvas
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
    FISH_STAGE,
    drawOnMainCanvas,
    ensureAtlas   : ensureFishAtlasReady,
    _createLayout : createRandomFishLayout
  };

  LOG('Fisch-Modul geladen v25.12.10-fish-workarea-maincanvas-v1');

})();
