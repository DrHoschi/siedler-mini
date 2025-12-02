/* ============================================================================
 * Datei   : core/game.production.stone.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.02-stone-quarry-overlay+atlas
 *
 * Zweck   :
 *   - Spezielle Deko-/Produktionslogik für Stein (Steinbruch / Steinmetz)
 *   - Reagiert auf cb:build:complete für Stein-Gebäude (b.quarry, b.steinmetz …)
 *   - Legt pro Gebäude ein "StoneField" mit zufälligen Fels/Haufen-Sprites an
 *   - Zeichnet diese Steine als Overlay über der Map (kein Wachstum wie bei Holz)
 *   - Nutzt den neuen stones_mega_atlas.* als Grafikquelle
 *
 *   ACHTUNG:
 *   - Aktuell kümmert sich dieses Modul NUR um die optische Darstellung der
 *     Steinfelder. Die eigentliche Ressourcenerzeugung (stone++) bleibt vorerst
 *     im generischen Production-Manager / Registry.
 *   - Wenn wir später eine spezielle Abbau-Logik (Fels → Geröll → leer) wollen,
 *     können wir hierauf aufbauen.
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *
 *   OUT :
 *     - (derzeit keine; nur Overlay-Darstellung)
 *
 *   API / Debug:
 *     - window.ProductionStone.redraw()    → Debug-Log, zeigt dass Modul aktiv ist
 *     - window.ProductionStone.fields     → Map mit allen StoneFields
 * ========================================================================== */
(function(){
  'use strict';

  // =========================
  // LOGGING / META
  // =========================

  const TAG  = '[prod-stone]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // =========================
  // KONSTANTEN
  // =========================

  // Mögliche Gebäude-IDs, die ein Steinfeld bekommen sollen.
  // Je nach Registry können 1..n davon tatsächlich vorkommen.
  const STONE_BUILDING_IDS = new Set([
    'b.quarry',       // engl. Steinbruch
    'quarry',
    'b.steinmetz',    // deutsch
    'steinmetz',
    'b.stonecutter',  // ggf. Alternativnamen
    'stonecutter'
  ]);

  // Wie viele Deko-Steine pro Gebäude ungefähr platziert werden.
  const STONES_PER_FIELD = 7;

  // Faktor, wie weit die Steine maximal vom Gebäudezentrum entfernt liegen (in Tiles)
  const STONE_RADIUS_MIN = 1.2;
  const STONE_RADIUS_MAX = 3.0;

  /* ==========================================================================
   * STONE-ATLAS-KONFIGURATION (stones_mega_atlas.*)
   *   → basiert auf stones_mega_atlas.json / stones_mega_phaser.json
   * ========================================================================== */

  const STONE_ATLAS_CFG = {
    // Pfad zu DEINER JSON & PNG – falls du beides woanders hinlegst,
    // hier bitte anpassen.
    urlJson  : 'assets/resources/stones_mega_atlas.json',
    urlImage : 'assets/resources/stones_mega_atlas.png',

    /**
     * Logische Gruppen – reine Bezeichner, um später unterschiedliche
     * Varianten zu nutzen (große Felsen, Geröll, Blöcke, Stapel …).
     * Die Namen leiten sich direkt aus den Frame-IDs in der JSON ab.
     */
    groups : {
      RAW_BIG : Array.from({length:8}, (_,i)=>`e1_rock_big_raw_v0${i+1}`),
      CRACKED : Array.from({length:8}, (_,i)=>`e1_rock_big_cracked_v0${i+1}`),
      RUBBLE_LARGE : Array.from({length:8}, (_,i)=>`e1_rubble_large_v0${i+1}`),
      RUBBLE_SMALL : Array.from({length:8}, (_,i)=>`e1_rubble_small_v0${i+1}`),
      BLOCK_ROUGH  : Array.from({length:8}, (_,i)=>`e1_block_rough_v0${i+1}`),
      BLOCK_CUT    : Array.from({length:8}, (_,i)=>`e1_block_cut_v0${i+1}`),
      STACK_LOW    : Array.from({length:8}, (_,i)=>`e1_block_stack_low_v0${i+1}`),
      STACK_HIGH   : Array.from({length:8}, (_,i)=>`e1_block_stack_high_v0${i+1}`)
    },

    /**
     * Für schnelle Zugriffe aufgelöste Frames:
     *  resolvedFrames[name] = { x,y,w,h,pivotX,pivotY }
     */
    resolvedFrames : null
  };

  // =========================
  // STATE
  // =========================

  /**
   * Map<uid, StoneFieldState>
   *  StoneFieldState:
   *    {
   *      uid, kind, x,y,w,h,
   *      cx, cy,           // Gebäudecenter in Tiles
   *      stones: [
   *        { tx, ty, key, scale }
   *      ]
   *    }
   */
  const StoneFields = new Map();

  /** Atlas-Daten */
  let stoneAtlas        = null;  // Inhalt von stones_mega_atlas.json
  let stoneAtlasImg     = null;  // Image-Objekt
  let stoneAtlasLoaded  = false;
  let stoneAtlasLoading = false;

  // =========================
  // HILFSFUNKTIONEN – GENERELL
  // =========================

  /** einfacher Seed-PRNG, damit ein Steinbruch bei jedem Laden gleich aussieht */
  function makeRng(seedStr){
    let s = 0;
    for (let i=0; i<seedStr.length; i++){
      s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    if (!s) s = 1;
    return function rng(){
      // LCG wie in vielen Game-Engines
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
    // Registry-IDs kommen oft als "b.quarry" – daher beim Aufrufer schon
    // möglichst die richtige ID übergeben. Hier noch ein kleiner Fallback:
    if (!k.startsWith('b.')) return STONE_BUILDING_IDS.has('b.'+k);
    return false;
  }

  // =========================
  // ATLAS-LOADING
  // =========================

  function ensureStoneAtlasLoaded(){
    if (stoneAtlasLoaded || stoneAtlasLoading) return;
    stoneAtlasLoading = true;

    // JSON laden (Frame + Pivot-Daten)
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

  function ensureStoneAtlasReady(){
    if (!stoneAtlasLoaded || !stoneAtlasImg || !stoneAtlas || !stoneAtlas.frames){
      return false;
    }

    if (!STONE_ATLAS_CFG.resolvedFrames){
      const resolved = {};
      const frames = stoneAtlas.frames || {};

      // stones_mega_atlas.json nutzt pro Frame:
      //   { frame:{x,y,w,h}, pivot:{x,y} }
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

    return true;
  }

  /**
   * Einen einzelnen Stein-Sprite zeichnen.
   *  cx,cy = Weltkoordinate in Pixeln, an der der Pivot landen soll
   *  scale  = optionaler Skalierungsfaktor (1 = Originalgröße)
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

  // =========================
  // STEINFELDER ERZEUGEN
  // =========================

  /**
   * Aus einem cb:build:complete-Detail einen neuen StoneField-State erzeugen.
   * Wird nur aufgerufen, wenn isStoneBuildingId(kind) bereits true ist.
   */
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
      stones : []
    };

    // Steine um das Gebäude herum zufällig platzieren
    createRandomLayoutForField(field);

    StoneFields.set(uid, field);
    LOG('StoneField registriert', field);

    ensureStoneAtlasLoaded();
  }

  function createRandomLayoutForField(field){
    const rng = makeRng(field.uid);
    field.stones.length = 0;

    // Kombinierte Liste „natürlicher“ Felsen/Haufen
    const basePool = [
      ...STONE_ATLAS_CFG.groups.RAW_BIG,
      ...STONE_ATLAS_CFG.groups.CRACKED,
      ...STONE_ATLAS_CFG.groups.RUBBLE_LARGE,
      ...STONE_ATLAS_CFG.groups.RUBBLE_SMALL
    ];

    const count = STONES_PER_FIELD;

    for (let i=0; i<count; i++){
      const angle = rng() * Math.PI * 2;
      const radius = STONE_RADIUS_MIN + (STONE_RADIUS_MAX - STONE_RADIUS_MIN) * rng();

      // Position in Tiles relativ zur Gebäudemitte
      const tx = field.cx + Math.cos(angle) * radius;
      const ty = field.cy + Math.sin(angle) * radius;

      // Kleine zufällige Skalierung (±15 %)
      const scale = 0.85 + 0.3 * rng();

      const key = pickRandom(basePool, rng);
      if (!key) continue;

      field.stones.push({
        tx,
        ty,
        key,
        scale
      });
    }
  }

  // =========================
  // OVERLAY-ZEICHNUNG
  // =========================

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
        const tx = s.tx;
        const ty = s.ty;

        // Weltkoordinate in Pixeln:
        //  - x: Mitte der Tile
        //  - y: „Bodenlinie“ der Tile (wir nutzen ty+1, ähnlich wie bei Gebäuden)
        const cxPx = (tx + 0.5) * ts;
        const cyPx = (ty + 1.0) * ts;

        let drawn = false;
        if (atlasReady && s.key){
          drawn = drawStoneFrame(ctx, s.key, cxPx, cyPx, s.scale);
        }

        if (!drawn){
          // Fallback: einfacher grauer Kreis als Platzhalter
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

  // =========================
  // OVERLAY-REGISTRIERUNG
  // =========================

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

  // =========================
  // EVENT-BINDING
  // =========================

  function onBuildComplete(detail){
    try {
      registerStoneFieldFromBuild(detail);
    } catch(e){
      ERR('onBuildComplete Fehler:', e);
    }
  }

  // Direkter cb:build:complete Listener als Fallback
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
        registerStoneFieldFromBuild(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'Direkter cb:build:complete-Listener Fehler:',
          e
        );
      }
    }, { passive:true });
  } catch(e){
    (window.CBLog?.warn || console.warn)(
      TAG,
      'Direkter cb:build:complete-Listener konnte nicht registriert werden:',
      e
    );
  }

  // =========================
  // STUB-TICK (für spätere Erweiterung)
  // =========================

  function tick(dtMs){
    // Aktuell keine zeitabhängige Logik notwendig.
    // Platzhalter, falls wir später Stein-Abbau-Animationen ergänzen.
    void dtMs;
  }

  // =========================
  // REGISTRIERUNG BEIM Production-Manager (optional)
  // =========================

  function registerWithManager(){
    if (!window.Production || typeof window.Production.registerModule !== 'function'){
      return false;
    }
    try {
      window.Production.registerModule({
        id             : 'stone',
        onBuildComplete,
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

  // =========================
  // DEBUG-EXPORT
  // =========================

  window.ProductionStone = {
    fields      : StoneFields,
    STONE_ATLAS_CFG,
    ensureAtlas : ensureStoneAtlasReady,
    /**
     * Debug-Helfer:
     *  - OverlayHooks ruft unsere Zeichenfunktion regulär im Renderloop auf.
     *  - redraw() existiert nur, damit du im Inspector schnell prüfen kannst,
     *    ob das Modul geladen ist – beim Aufruf gibt es ein Log.
     */
    redraw(){
      LOG('redraw(): Stone-Overlay wird vom OverlayManager beim nächsten Frame gezeichnet.');
    }
  };

  LOG('Stein-Modul geladen v25.12.02-stone-quarry-overlay+atlas');

})();
