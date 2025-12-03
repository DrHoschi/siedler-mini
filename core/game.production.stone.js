/* ============================================================================
 * Datei   : core/game.production.stone.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.03-stone-overlay+degrade+workarea
 *
 * Zweck   :
 *   - Deko- und Abbau-Logik für Stein (Steinbruch / Steinmetz)
 *   - Für jedes Stein-Gebäude wird ein zufälliges "Steinfeld" erzeugt:
 *       große Felsen, Geröll, kleine Haufen ...
 *   - Der Renderer zeichnet diese Steine als Overlay um das Gebäude herum.
 *   - Bei jeder produzierten stone-Ressource wird EIN Fels degradert:
 *
 *       RAW_BIG → CRACKED → RUBBLE_LARGE → RUBBLE_SMALL → entfernt
 *
 *   - Datenbasis: stones_mega_atlas.json + stones_mega_atlas.png
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *         → Steinbruch registrieren + zufälliges Steinfeld anlegen
 *     - cb:prod:output { bId, kind, item:'stone', qty }
 *         → pro qty einen Fels im Feld degradieren
 *     - cb:workarea:set { id, uid, cx, cy, radiusTiles, x,y,w,h }
 *         → Arbeitsbereich merken (für spätere Logik)
 *
 *   OUT :
 *     - keine (nur visuelle Darstellung)
 *
 * Debug / API:
 *   - window.ProductionStone.fields        → Map<uid, StoneFieldState>
 *   - window.ProductionStone._degradeOne  → 1 Stein manuell degradieren
 *   - window.ProductionStone._degradeField(uid, qty) → mehrere degradieren
 * ========================================================================== */
(function(){
  'use strict';

  // ========================================================================
  // LOGGING
  // ========================================================================

  const TAG  = '[prod-stone]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ========================================================================
  // KONSTANTEN
  // ========================================================================

  // Welche Gebäude-IDs sollen ein Steinfeld bekommen?
  const STONE_BUILDING_IDS = new Set([
    'b.quarry',
    'quarry',
    'b.steinmetz',
    'steinmetz',
    'b.stonecutter',
    'stonecutter'
  ]);

  // Wie viele Steine pro Feld ca.?
  const STONES_PER_FIELD = 7;

  // Radius (in Tiles) um die Gebäudemitte, in dem Steine verteilt werden
  const STONE_RADIUS_MIN = 1.2;
  const STONE_RADIUS_MAX = 3.0;

  /**
   * Abbau-Stufen in Reihenfolge von "voll" → "fast leer".
   *  Index 0 = RAW_BIG, 3 = RUBBLE_SMALL, danach = entfernt.
   */
  const STONE_STAGE = [
    'RAW_BIG',
    'CRACKED',
    'RUBBLE_LARGE',
    'RUBBLE_SMALL'
  ];

  /* ------------------------------------------------------------------------
   * Atlas-Konfiguration
   *  - stones_mega_atlas.json:
   *      { frames: { name: { frame:{x,y,w,h}, pivot:{x,y} }, ... } }
   *  - stones_mega_atlas.png:
   *      Bild mit allen Sprites
   *  - groups: logische Gruppen → Namenspräfixe im Atlas
   * --------------------------------------------------------------------- */

  const STONE_ATLAS_CFG = {
    // → Pfade ggf. anpassen!
    urlJson  : 'assets/resources/stones_mega_atlas.json',
    urlImage : 'assets/resources/stones_mega_atlas.png',

    // Präfixe zum automatischen Gruppieren der Frames
    groups   : {
      RAW_BIG      : 'e1_rock_big_raw_',
      CRACKED      : 'e1_rock_big_cracked_',
      RUBBLE_LARGE : 'e1_rubble_large_',
      RUBBLE_SMALL : 'e1_rubble_small_',
      // weitere Gruppen für spätere Nutzung
      BLOCK_ROUGH  : 'e1_block_rough_',
      BLOCK_CUT    : 'e1_block_cut_',
      STACK_LOW    : 'e1_block_stack_low_',
      STACK_HIGH   : 'e1_block_stack_high_'
    },

    /**
     * resolvedFrames[name] = { x,y,w,h,pivotX,pivotY }
     * groupFrames[group]   = [frameName1, frameName2, ...]
     */
    resolvedFrames : null,
    groupFrames    : null
  };

  // ========================================================================
  // STATE
  // ========================================================================

  /**
   * Map<uid, StoneFieldState>
   *
   * StoneFieldState:
   *   {
   *     uid, kind, x,y,w,h,
   *     cx, cy,           // Gebäudecenter (Tiles)
   *     workArea?: { cx, cy, radiusTiles },
   *     stones: [
   *       {
   *         tx, ty,       // Position in Tiles
   *         stageIndex,   // 0..3 → STONE_STAGE, <0 = entfernt
   *         variant,      // 0..N → Index in Frame-Liste (für Varianz)
   *         scale         // Größenfaktor
   *       }
   *     ]
   *   }
   */
  const StoneFields = new Map();

  /** Atlas-Rohdaten + Bild */
  let stoneAtlas        = null;
  let stoneAtlasImg     = null;
  let stoneAtlasLoaded  = false;
  let stoneAtlasLoading = false;

  // ========================================================================
  // HILFSFUNKTIONEN – GENERELL
  // ========================================================================

  /** kleiner deterministischer RNG, damit Layout stabil bleibt */
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
    const r = rng ? rng() : Math.random();
    const idx = Math.floor(r * arr.length);
    return arr[Math.max(0, Math.min(arr.length-1, idx))];
  }

  function isStoneBuildingId(kind){
    if (!kind) return false;
    const k = String(kind).toLowerCase();
    if (STONE_BUILDING_IDS.has(k)) return true;
    // Fallback: "steinmetz" → "b.steinmetz"
    if (!k.startsWith('b.')) return STONE_BUILDING_IDS.has('b.'+k);
    return false;
  }

  // ========================================================================
  // ATLAS-LADEN + AUFBEREITEN
  // ========================================================================

  function ensureStoneAtlasLoaded(){
    if (stoneAtlasLoaded || stoneAtlasLoading) return;
    stoneAtlasLoading = true;

    // JSON laden
    try {
      fetch(STONE_ATLAS_CFG.urlJson)
        .then(r => r.json())
        .then(data => {
          stoneAtlas = data;
          LOG('Stone-Atlas JSON geladen:', STONE_ATLAS_CFG.urlJson);
        })
        .catch(err => {
          WARN('Stone-Atlas JSON konnte nicht geladen werden:', err);
        });
    } catch(e){
      WARN('Stone-Atlas JSON fetch nicht verfügbar:', e);
    }

    // Bild laden
    try {
      const img = new Image();
      img.onload = function(){
        stoneAtlasImg    = img;
        stoneAtlasLoaded = true;
        LOG('Stone-Atlas Bild geladen:', STONE_ATLAS_CFG.urlImage);
      };
      img.onerror = function(err){
        WARN('Stone-Atlas Bild konnte nicht geladen werden:', err);
      };
      img.src = STONE_ATLAS_CFG.urlImage;
    } catch(e){
      WARN('Stone-Atlas Bild-Ladevorgang fehlgeschlagen:', e);
    }
  }

  /**
   * Prüft, ob Bild + JSON da sind, berechnet:
   *   - resolvedFrames (Pixel)
   *   - groupFrames (Liste aller Frames pro Gruppe)
   */
  function ensureStoneAtlasReady(){
    if (!stoneAtlasLoaded || !stoneAtlasImg || !stoneAtlas || !stoneAtlas.frames){
      return false;
    }

    // 1) Frames in Pixel-Koordinaten auflösen
    if (!STONE_ATLAS_CFG.resolvedFrames){
      const resolved = {};
      const frames = stoneAtlas.frames || {};

      // stones_mega_atlas.json:
      //   frames[name].frame {x,y,w,h}
      //   frames[name].pivot {x,y}
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

      STONE_ATLAS_CFG.resolvedFrames = resolved;
      LOG('Stone-Atlas Frames aufgelöst (resolvedFrames).');
    }

    // 2) Namens-Gruppen anhand der Präfixe aufbauen
    if (!STONE_ATLAS_CFG.groupFrames){
      const groupFrames = {};
      const frames = stoneAtlas.frames || {};
      const groupDefs = STONE_ATLAS_CFG.groups || {};

      for (const name of Object.keys(frames)){
        for (const [gName, prefix] of Object.entries(groupDefs)){
          if (name.startsWith(prefix)){
            if (!groupFrames[gName]) groupFrames[gName] = [];
            groupFrames[gName].push(name);
            break;
          }
        }
      }

      STONE_ATLAS_CFG.groupFrames = groupFrames;
      LOG('Stone-Atlas Gruppen aufgelöst (groupFrames).');
    }

    return true;
  }

  /**
   * Einen konkreten Frame zeichnen.
   *
   *  cx,cy  = Pivot-Position in Weltpixeln
   *  scale  = Skalierungsfaktor (1 = Originalgröße)
   */
  function drawStoneFrame(ctx, key, cx, cy, scale){
    if (!ensureStoneAtlasReady()) return false;

    const frames = STONE_ATLAS_CFG.resolvedFrames;
    const f = frames && frames[key];
    if (!f || !stoneAtlasImg) return false;

    const s  = (typeof scale === 'number' && scale>0) ? scale : 1;
    const dw = f.w * s;
    const dh = f.h * s;

    const dx = cx - f.pivotX * s;
    const dy = cy - f.pivotY * s;

    try {
      ctx.drawImage(
        stoneAtlasImg,
        f.x, f.y, f.w, f.h,
        dx, dy, dw, dh
      );
      return true;
    } catch(e){
      WARN('drawStoneFrame Fehler:', e);
      return false;
    }
  }

  // ========================================================================
  // STEINFELDER ERZEUGEN (ZUFÄLLIGES DEKO-LAYOUT)
  // ========================================================================

  function registerStoneFieldFromBuild(detail){
    if (!detail) return;

    const kind = (detail.id || detail.buildingId || detail.kind || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const uid = detail.uid || `${kind}@${x},${y}`;
    if (StoneFields.has(uid)){
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
      stones : []
    };

    // zufälliges Layout generieren
    createRandomLayoutForField(field);

    StoneFields.set(uid, field);
    LOG('StoneField registriert', field);

    ensureStoneAtlasLoaded();
  }

  /**
   * Legt STONES_PER_FIELD Steine um das Gebäude herum an.
   * Jeder Stein bekommt:
   *   - Position (tx,ty)
   *   - Start-Stufe (meist RAW/CRACKED)
   *   - Variant-Index für das Sprite
   */
  function createRandomLayoutForField(field){
    const rng = makeRng(field.uid);
    field.stones.length = 0;

    const count = STONES_PER_FIELD;

    for (let i=0; i<count; i++){
      const angle  = rng() * Math.PI * 2;
      const radius = STONE_RADIUS_MIN + (STONE_RADIUS_MAX - STONE_RADIUS_MIN) * rng();

      const tx = field.cx + Math.cos(angle) * radius;
      const ty = field.cy + Math.sin(angle) * radius;

      // leichte Größen-Variation
      const scale = 0.85 + 0.3 * rng();

      // Start-Stufe: mehr große Felsen als kleine Haufen
      let stageIndex;
      const rStage = rng();
      if (rStage < 0.5)      stageIndex = 0; // RAW_BIG
      else if (rStage < 0.8) stageIndex = 1; // CRACKED
      else if (rStage < 0.95)stageIndex = 2; // RUBBLE_LARGE
      else                   stageIndex = 3; // RUBBLE_SMALL

      // Variant-Index → später in drawStoneOverlay mit Frame-Liste verknüpft
      const variant = Math.floor(rng() * 16) & 0xFF;

      field.stones.push({
        tx,
        ty,
        stageIndex,
        variant,
        scale
      });
    }
  }

  // ========================================================================
  // OVERLAY-ZEICHNUNG (Steine)
  // ========================================================================

  function drawStoneOverlay(ctx, cam){
    if (!ctx) return;
    if (!StoneFields.size) return;

    const zoom = cam?.zoom ?? 1;
    const oxPx = cam?.x    ?? 0;
    const oyPx = cam?.y    ?? 0;

    const ts =
      (window.Game?.map?.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      64;

    ctx.save();
    ctx.translate(-oxPx * zoom, -oyPx * zoom);
    ctx.scale(zoom, zoom);

    const atlasReady = ensureStoneAtlasReady();

    for (const field of StoneFields.values()){
      const stones = field.stones || [];
      if (!stones.length) continue;

      for (const s of stones){
        // entfernt?
        if (s.stageIndex == null || s.stageIndex < 0) continue;

        const tx = s.tx;
        const ty = s.ty;

        // Pivot in Weltpixeln
        const cxPx = (tx + 0.5) * ts;
        const cyPx = (ty + 1.0) * ts;

        let drawn = false;

        if (atlasReady){
          const stageName = STONE_STAGE[s.stageIndex] || null;
          const groupFrames = stageName &&
                              STONE_ATLAS_CFG.groupFrames &&
                              STONE_ATLAS_CFG.groupFrames[stageName];

          if (groupFrames && groupFrames.length){
            const frameName = groupFrames[s.variant % groupFrames.length];
            drawn = drawStoneFrame(ctx, frameName, cxPx, cyPx, s.scale);
          }
        }

        if (!drawn){
          // Fallback: einfache graue Kugel
          const r = ts * 0.35;
          ctx.beginPath();
          ctx.fillStyle   = '#888888';
          ctx.strokeStyle = '#444444';
          ctx.lineWidth   = Math.max(1.5, ts * 0.04);
          ctx.arc(cxPx, cyPx - r * 0.2, r, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  // ========================================================================
  // ABBAU-LOGIK: pro stone-Ressource einen Fels degradieren
  // ========================================================================

  /**
   * Sucht im Feld einen Kandidaten zum Degradieren:
   *   - geht die STONE_STAGE von "voll" → "leer" durch
   *   - wählt innerhalb der Stufe einen zufälligen Stein
   */
  function pickStoneForDegrade(field){
    const stones = field.stones || [];
    if (!stones.length) return null;

    for (let stageIndex=0; stageIndex<STONE_STAGE.length; stageIndex++){
      const candidatesIdx = [];
      for (let i=0; i<stones.length; i++){
        const s = stones[i];
        if (s.stageIndex === stageIndex){
          candidatesIdx.push(i);
        }
      }
      if (candidatesIdx.length){
        const idx = candidatesIdx[Math.floor(Math.random() * candidatesIdx.length)];
        return { index: idx, stone: stones[idx] };
      }
    }
    return null;
  }

  /**
   * Einen Stein im Feld um 1 Stufe degradieren.
   * Rückgabe:
   *   TRUE  → es wurde ein Stein gefunden und angepasst
   *   FALSE → kein degradierbarer Stein mehr vorhanden
   */
  function degradeSingleStone(field){
    const sel = pickStoneForDegrade(field);
    if (!sel) return false;

    const stone = sel.stone;
    if (stone.stageIndex == null || stone.stageIndex < 0) return false;

    stone.stageIndex += 1;
    // key wird bei Bedarf neu aus der Gruppenliste gewählt
    stone.key = null;

    // über letzte Stufe hinaus → entfernt
    if (stone.stageIndex >= STONE_STAGE.length){
      stone.stageIndex = -1;
    }

    return true;
  }

  /**
   * Mehrere Steine im Feld degradieren (z.B. bei qty > 1).
   */
  function degradeFieldByStone(field, qty){
    let remaining = (qty|0) || 1;
    if (remaining < 1) remaining = 1;

    while (remaining-- > 0){
      if (!degradeSingleStone(field)) break;
    }
  }

  /**
   * Reagiert auf cb:prod:output.
   * Sobald ein Gebäude "stone" ausgibt, wird sein Steinfeld abgebaut.
   */
  function onStoneProduced(detail){
    if (!detail) return;
    const item = detail.item || detail.resource || detail.resId;
    if (item !== 'stone') return;

    const uid = detail.bId || detail.buildingUid || detail.uid;
    if (!uid) return;

    const field = StoneFields.get(uid);
    if (!field) return;

    const qty = detail.qty || detail.amount || 1;
    degradeFieldByStone(field, qty);
  }

  // ========================================================================
  // OVERLAY-REGISTRIERUNG
  // ========================================================================

  (function registerStoneOverlay(){
    function tryRegister(){
      if (!window.OverlayHooks?.register) return false;
      try {
        window.OverlayHooks.register('stones', (ctx)=>{
          const cam = window.GameCamera?.getState?.() || { x:0, y:0, zoom:1 };
          drawStoneOverlay(ctx, cam);
        });
        LOG('Stone-Overlay registriert (stones).');
        return true;
      } catch(e){
        WARN('Stone-Overlay Registrierung fehlgeschlagen:', e);
        return true;
      }
    }

    if (tryRegister()) return;
    let tries = 0;
    const t = setInterval(()=>{
      if (tryRegister() || ++tries > 20) clearInterval(t);
    }, 200);
  })();

  // ========================================================================
  // EVENT-BINDING
  // ========================================================================

  function onBuildComplete(detail){
    try {
      registerStoneFieldFromBuild(detail);
    } catch(e){
      ERR('onBuildComplete Fehler:', e);
    }
  }

  try {
    // Baustellen-Fertigmeldung → Feld registrieren
    window.addEventListener('cb:build:complete', (ev)=>{
      const detail = ev.detail || {};
      try {
        (window.CBLog?.info || console.info)(
          TAG,
          'direct cb:build:complete',
          detail.id,
          detail
        );
        registerStoneFieldFromBuild(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'Direkter cb:build:complete-Listener Fehler:',
          e
        );
      }
    }, { passive:true });

    // Produktions-Event → Abbau-Stufe aktualisieren
    window.addEventListener('cb:prod:output', (ev)=>{
      const detail = ev.detail || {};
      try {
        onStoneProduced(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'cb:prod:output-Listener Fehler:',
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
  // WORKAREA-HOOK: cb:workarea:set
  // ========================================================================

  /**
   * Wird vom Production-Manager bei cb:workarea:set aufgerufen.
   *
   * detail:
   *   { id, uid, cx, cy, radiusTiles, x, y, w, h }
   *
   * Aktuell wird der Arbeitsbereich nur im State gespeichert, damit
   * der Steinmetz später daran seine Abbau-Logik ausrichten kann.
   */
  function onWorkAreaSet(detail){
    if (!detail) return;
    const kind = (detail.id || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const field = StoneFields.get(uid);
    if (!field){
      // Falls noch kein Feld existiert, ignorieren wir es einfach –
      // der nächste cb:build:complete legt das Feld an.
      return;
    }

    const radius = (typeof detail.radiusTiles === 'number')
      ? detail.radiusTiles
      : (field.workArea?.radiusTiles || STONE_RADIUS_MAX);

    field.workArea = {
      cx         : (typeof detail.cx === 'number') ? detail.cx : field.cx,
      cy         : (typeof detail.cy === 'number') ? detail.cy : field.cy,
      radiusTiles: radius
    };

    LOG('WorkArea für Stein-Feld aktualisiert', uid, field.workArea);
  }

  // ========================================================================
  // STUB-TICK (für spätere Erweiterungen)
  // ========================================================================

  function tick(dtMs){
    // aktuell keine zeitgesteuerte Logik notwendig
    void dtMs;
  }

  // ========================================================================
  // REGISTRIERUNG BEIM Production-Manager (optional)
  // ========================================================================

  function registerWithManager(){
    if (!window.Production || typeof window.Production.registerModule !== 'function'){
      return false;
    }
    try {
      window.Production.registerModule({
        id             : 'stone',
        onBuildComplete,
        onWorkAreaSet,
        tick
      });
      LOG('Produktionsmodul "stone" registriert.');
      return true;
    } catch(e){
      WARN('Production.registerModule(stone) fehlgeschlagen', e);
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

  window.ProductionStone = {
    fields          : StoneFields,
    STONE_ATLAS_CFG,
    STONE_STAGE,
    ensureAtlas     : ensureStoneAtlasReady,
    _degradeOne     : degradeSingleStone,
    _degradeField   : degradeFieldByStone
  };

  LOG('Stein-Modul geladen v25.12.03-stone-overlay+degrade+workarea');

})();
