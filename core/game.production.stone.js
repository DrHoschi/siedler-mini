/* ============================================================================
 * Datei   : core/game.production.stone.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-stone-workarea-maincanvas-depth-worker-v3
 *
 * Zweck   :
 *   - Deko- und Abbau-Logik für Stein (Steinbruch / Steinmetz)
 *   - Für jedes Stein-Gebäude wird ein zufälliges "Steinfeld" erzeugt:
 *       große Felsen, Geröll, kleine Haufen ...
 *   - Später: Bei jeder produzierten stone-Ressource wird EIN Fels degradert:
 *
 *       RAW_BIG → CRACKED → RUBBLE_LARGE → RUBBLE_SMALL → entfernt
 *
 * Darstellung:
 *   - Zeichnet die Steine direkt auf dem HAUPT-CANVAS in Weltkoordinaten
 *   - KEIN OverlayHooks / kein eigenes Overlay-Canvas für Steine
 *   - Datenbasis: stones_mega_atlas.json + stones_mega_atlas.png
 *
 * Extra:
 *   - Einfacher "Steinmetz"-Marker (graue Blase), die zwischen Gebäude
 *     und einem Stein hin- und herläuft (Ping-Pong).
 *   - Läuft auch OHNE echte Produktion (cb:prod:output), damit man sofort
 *     etwas "arbeiten" sieht.
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *     - cb:prod:output    { bId, kind, item:'stone', qty }   (optional)
 *     - cb:workarea:set   { id, uid, cx, cy, radiusTiles, x,y,w,h }
 *
 *   OUT :
 *     - keine (nur visuelle Darstellung + interner Abbau-Status)
 *
 * Debug / API:
 *   - window.ProductionStone.fields
 *   - window.ProductionStone.drawOnMainCanvas(ctx, cam, tileSize)
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[prod-stone]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ========================================================================
  // KONSTANTEN
  // ========================================================================

  const STONE_BUILDING_IDS = new Set([
    'b.quarry',
    'quarry',
    'b.steinmetz',
    'steinmetz',
    'b.stonecutter',
    'stonecutter'
  ]);

  // Anzahl Felsen pro Feld
  const STONES_PER_FIELD = 7;

  // Radius-Bereich um das Gebäude / den WorkArea-Mittelpunkt
  const STONE_RADIUS_MIN = 1.2;
  const STONE_RADIUS_MAX = 3.0;

  // Abbau-Stufen (Index 0 → "voll", 3 → "fast weg", -1 → unsichtbar)
  const STONE_STAGE = [
    'RAW_BIG',
    'CRACKED',
    'RUBBLE_LARGE',
    'RUBBLE_SMALL'
  ];

  const STONE_ATLAS_CFG = {
    urlJson  : 'assets/resources/stone/stones_mega_atlas.json',
    urlImage : 'assets/resources/stone/stones_mega_atlas.png',

    groups   : {
      RAW_BIG      : 'e1_rock_big_raw_',
      CRACKED      : 'e1_rock_big_cracked_',
      RUBBLE_LARGE : 'e1_rubble_large_',
      RUBBLE_SMALL : 'e1_rubble_small_',
      BLOCK_ROUGH  : 'e1_block_rough_',
      BLOCK_CUT    : 'e1_block_cut_',
      STACK_LOW    : 'e1_block_stack_low_',
      STACK_HIGH   : 'e1_block_stack_high_'
    },

    resolvedFrames : null,
    groupFrames    : null
  };

  // ========================================================================
  // STATE
  // ========================================================================

  /** Map<uid, StoneFieldState> */
  const StoneFields = new Map();

  let stoneAtlas        = null;
  let stoneAtlasImg     = null;
  let stoneAtlasLoaded  = false;
  let stoneAtlasLoading = false;

  // ========================================================================
  // HILFSFUNKTIONEN – GENERELL
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

  function isStoneBuildingId(kind){
    if (!kind) return false;
    const k = String(kind).toLowerCase();
    if (STONE_BUILDING_IDS.has(k)) return true;
    if (!k.startsWith('b.')) return STONE_BUILDING_IDS.has('b.'+k);
    return false;
  }

  // ========================================================================
  // ATLAS-LADEN + AUFBEREITEN
  // ========================================================================

  function ensureStoneAtlasLoaded(){
    if (stoneAtlasLoaded || stoneAtlasLoading) return;
    stoneAtlasLoading = true;

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

    // 1) Einzel-Frames mit Pivot auflösen
    if (!STONE_ATLAS_CFG.resolvedFrames){
      const resolved = {};
      const frames   = stoneAtlas.frames || {};

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

    // 2) Gruppen (RAW_BIG, RUBBLE_...) aus Präfixen auflösen
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
  // STEINFELDER ERZEUGEN
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
      stones : [],
      worker : null
    };

    createRandomLayoutForField(field);
    StoneFields.set(uid, field);

    LOG('StoneField registriert', field);
    ensureStoneAtlasLoaded();
  }

  function createRandomLayoutForField(field){
    const rng = makeRng(field.uid);
    field.stones.length = 0;

    const count = STONES_PER_FIELD;

    // Gebäudefläche in Tile-Koordinaten – damit keine Steine IM Gebäude liegen
    const bx0 = field.x | 0;
    const by0 = field.y | 0;
    const bw  = (field.w | 0) || 3;
    const bh  = (field.h | 0) || 3;
    const bx1 = bx0 + bw;
    const by1 = by0 + bh;

    for (let i=0; i<count; i++){
      let tx = 0;
      let ty = 0;
      let placed = false;

      // Versuche, einen Punkt im Ring um den Mittelpunkt zu finden,
      // der NICHT im Gebäude liegt.
      for (let tries=0; tries<20 && !placed; tries++){
        const angle  = rng() * Math.PI * 2;
        const radius = STONE_RADIUS_MIN + (STONE_RADIUS_MAX - STONE_RADIUS_MIN) * rng();

        tx = field.cx + Math.cos(angle) * radius;
        ty = field.cy + Math.sin(angle) * radius;

        // Liegt die Position im Gebäude-Rechteck? → überspringen
        if (tx >= bx0-0.1 && tx <= bx1+0.1 &&
            ty >= by0-0.1 && ty <= by1+0.1){
          continue;
        }

        placed = true;
      }

      if (!placed){
        continue;
      }

      const scale = 0.85 + 0.3 * rng();

      let stageIndex;
      const rStage = rng();
      if (rStage < 0.5)       stageIndex = 0;
      else if (rStage < 0.8)  stageIndex = 1;
      else if (rStage < 0.95) stageIndex = 2;
      else                    stageIndex = 3;

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
  // HAUPT-CANVAS-ZEICHNUNG (Steine + Steinmetz-Blase)
  // ========================================================================

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;
    if (!StoneFields.size) return;

    const Game = window.Game || {};
    const ts =
      (tileSize) ||
      (Game.map && Game.map.tileSize) ||
      (window.GameMap && window.GameMap._state && window.GameMap._state.map && window.GameMap._state.map.tileSize) ||
      Game.tileSize ||
      64;

    const atlasReady = ensureStoneAtlasReady();

    ctx.save();

    for (const field of StoneFields.values()){
      const stonesRaw = field.stones || [];
      if (!stonesRaw.length) continue;

      // Gebäudefläche in Tile-Koordinaten
      const bx0 = field.x | 0;
      const by0 = field.y | 0;
      const bw  = (field.w | 0) || 3;
      const bh  = (field.h | 0) || 3;
      const bx1 = bx0 + bw;
      const by1 = by0 + bh;

      // alles oberhalb dieser Linie und im x-Bereich des Gebäudes
      // wird als "hinter dem Gebäude" betrachtet
      const frontY = by1 - 0.2;

      // Y-Sort: von oben nach unten, damit vorn/hinten bei Steinen stimmt
      const stones = stonesRaw.slice().sort((a,b)=> (a.ty - b.ty));

      for (const s of stones){
        if (s.stageIndex == null || s.stageIndex < 0) continue;

        const tx = s.tx;
        const ty = s.ty;

        // Steine, die im "Schatten" des Gebäudes liegen, nicht zeichnen:
        // → sie sind "hinter" dem Gebäude und würden sonst auf der Wand kleben.
        const behindBuilding =
          ty < frontY &&
          tx >= bx0 - 0.5 && tx <= bx1 + 0.5;

        if (behindBuilding){
          continue;
        }

        // Weltkoordinaten in Pixel (ctx ist bereits mit Kamera-Transform belegt)
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
          // Fallback-Kreis
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

      // Optionaler "Steinmetz": graue Blase zwischen Gebäudezentrum und Ziel-Stein
      if (field.worker){
        const w = field.worker;
        const tNorm = Math.max(0, Math.min(1, w.tNorm || 0));

        const fromTx = w.fromTx;
        const fromTy = w.fromTy;
        const toTx   = w.toTx;
        const toTy   = w.toTy;

        const curTx = fromTx + (toTx - fromTx) * tNorm;
        const curTy = fromTy + (toTy - fromTy) * tNorm;

        const wx = (curTx + 0.5) * ts;
        const wy = (curTy + 1.0) * ts;

        const rr = ts * 0.25;

        ctx.beginPath();
        ctx.fillStyle   = 'rgba(160,160,160,0.9)';
        ctx.strokeStyle = 'rgba(40,40,40,0.9)';
        ctx.lineWidth   = Math.max(1, ts * 0.03);
        ctx.arc(wx, wy - rr * 1.2, rr, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ========================================================================
  // ABBAU-LOGIK
  // ========================================================================

  function pickStoneForDegrade(field){
    const stones = field.stones || [];
    if (!stones.length) return null;

    // immer zuerst "vollere" Stufen abbauen (RAW → CRACKED → ...)
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

  function degradeSingleStone(field){
    const sel = pickStoneForDegrade(field);
    if (!sel) return null;

    const stone = sel.stone;
    if (stone.stageIndex == null || stone.stageIndex < 0) return null;

    // Eine Stufe weiter degradieren
    stone.stageIndex += 1;

    if (stone.stageIndex >= STONE_STAGE.length){
      // komplett abgetragen → nicht mehr zeichnen
      stone.stageIndex = -1;
    }

    return sel;
  }

  function degradeFieldByStone(field, qty){
    let remaining = (qty|0) || 1;
    if (remaining < 1) remaining = 1;

    let lastSel = null;

    while (remaining-- > 0){
      const sel = degradeSingleStone(field);
      if (!sel) break;
      lastSel = sel;
    }

    function handleStoneHit(field) {
  // 1) Visuelle Degradation
  degradeStoneField(field);    // dein vorhandener Code

  // 2) NEU: Ressource zählen
  if (window.Production?.addResource) {
    window.Production.addResource('stone', 1, 'stone-cycle', 'stone');
  }
}
    
// -----------------------------------------------------------
// RESSOURCEN-ZÄHLUNG: Stein hinzufügen (Schritt A)
// -----------------------------------------------------------
if (window.Production && typeof window.Production.addResource === 'function') {
  // Menge kannst du anpassen: 1, 2, oder abh. von Feld-Stufe
  const qty    = 1;
  const reason = 'stone-cycle';
  const src    = 'stone';

  window.Production.addResource('stone', qty, reason, src);
}
    
    // Wenn mindestens ein Stein abgetragen wurde, einfachen
    // "Steinmetz"-Laufzyklus starten.
    if (lastSel){
      const bx0 = field.x | 0;
      const by0 = field.y | 0;
      const bw  = (field.w | 0) || 3;
      const bh  = (field.h | 0) || 3;
      const centerTx = bx0 + bw / 2;
      const centerTy = by0 + bh / 2;

      field.worker = {
        tMs        : 0,
        fromTx     : centerTx,
        fromTy     : centerTy,
        toTx       : lastSel.stone.tx,
        toTy       : lastSel.stone.ty,
        tNorm      : 0,
        targetStone: lastSel.stone,
        idle       : false
      };
    }
  }

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
  // EVENT-BINDING (build/production/workarea)
  // ========================================================================

  function onBuildComplete(detail){
    try {
      registerStoneFieldFromBuild(detail);
    } catch(e){
      ERR('onBuildComplete Fehler:', e);
    }
  }

  function onWorkAreaSet(detail){
    if (!detail) return;
    const kind = (detail.id || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const field = StoneFields.get(uid);
    if (!field){
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

    field.cx = field.workArea.cx;
    field.cy = field.workArea.cy;

    // neues Layout innerhalb des (neuen) Arbeitsbereiches
    createRandomLayoutForField(field);

    LOG(TAG, 'Arbeitsbereich aktualisiert:', uid, field.workArea);
  }

  function tick(dtMs){
    // Einfache Animation für den "Steinmetz"-Marker:
    // läuft vom Gebäudezentrum zum aktiven Stein und wieder zurück.
    const WORKER_TRAVEL_MS = 1400;          // Hinweg
    const WORKER_TOTAL_MS  = WORKER_TRAVEL_MS * 2; // Hin + Zurück

    for (const field of StoneFields.values()){
      const stones = field.stones || [];

      // Falls es überhaupt keine sichtbaren Steine gibt → kein Worker
      const visibleStones = stones.filter(s => s.stageIndex != null && s.stageIndex >= 0);

      if (!visibleStones.length){
        field.worker = null;
        continue;
      }

      // Wenn noch kein Worker gesetzt ist → einfachen Idle-Worker
      // (damit man Bewegung sieht, auch ohne echte Produktion).
      if (!field.worker){
        const target = pickRandom(visibleStones);
        const bx0 = field.x | 0;
        const by0 = field.y | 0;
        const bw  = (field.w | 0) || 3;
        const bh  = (field.h | 0) || 3;
        const centerTx = bx0 + bw / 2;
        const centerTy = by0 + bh / 2;

        field.worker = {
          tMs        : 0,
          fromTx     : centerTx,
          fromTy     : centerTy,
          toTx       : target.tx,
          toTy       : target.ty,
          tNorm      : 0,
          targetStone: target,
          idle       : true    // Idle-Modus (kein echtes Abbauen)
        };
      }

      const w = field.worker;
      if (!w) continue;

      w.tMs += dtMs || 0;

      if (w.tMs >= WORKER_TOTAL_MS){
        // Idle-/Produktions-Zyklus fertig → Worker verschwindet kurz,
        // und wird in der nächsten Tick-Runde neu erzeugt (oder bei
        // echter Produktion per degradeFieldByStone gesetzt).
        field.worker = null;
        continue;
      }

      const t = w.tMs / WORKER_TOTAL_MS;
      // Hinweg 0..0.5, Rückweg 0.5..1 → Ping-Pong
      const phase = t <= 0.5 ? (t * 2) : (2 - t * 2);
      w.tNorm = Math.max(0, Math.min(1, phase));
    }
  }

  // Browser-Events
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
        id             : 'stone',
        onBuildComplete,
        onWorkAreaSet,
        tick,
        drawOnMainCanvas   // <-- Main-Canvas-Zeichner
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
    fields        : StoneFields,
    STONE_ATLAS_CFG,
    STONE_STAGE,
    drawOnMainCanvas,
    ensureAtlas   : ensureStoneAtlasReady,
    _degradeOne   : degradeSingleStone,
    _degradeField : degradeFieldByStone
  };

  LOG('Stein-Modul geladen v25.12.10-stone-workarea-maincanvas-depth-worker-v3');

})();
