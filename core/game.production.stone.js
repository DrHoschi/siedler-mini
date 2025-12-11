/* ============================================================================
 * Datei   : core/game.production.stone.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-stone-workarea-prod-v2
 *
 * Zweck   :
 *   Produktions-/Deko-Logik für STEIN (Steinbruch):
 *     - Reagiert auf cb:build:complete für Steinbruch-Gebäude
 *     - Legt pro Gebäude ein eigenes "Steinfeld" an
 *     - Verteilt Steine IM Arbeitsbereich (WorkArea)
 *     - Zeichnet Steine + "arbeitenden Steinmetz" direkt auf dem HAUPT-CANVAS
 *     - Erzeugt regelmäßig Stein-Ressourcen + optional Träger-Jobs
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *     - cb:workarea:set   { id|buildingId|kind, uid, cx,cy,radiusTiles, x,y,w,h }
 *
 *   OUT :
 *     - Production.addResource('stone', +1, 'stone-cycle', uid)
 *     - optional: Production.enqueueCarryJobFromBuilding(building, 'stone', 1)
 *
 *   API / Debug:
 *     - window.ProductionStone.fields
 *     - window.ProductionStone.drawOnMainCanvas(ctx, cam, tileSize)
 * ========================================================================== */

(function(){
  'use strict';

  /* ========================================================================
   * [Imports / Helper auf globale Systeme]
   * ====================================================================== */

  const TAG  = '[prod-stone]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // Zentraler Produktions-Manager (für Ressourcenzählung + Jobs)
  const Production = window.Production || {};

  const addResource = (typeof Production.addResource === 'function')
    ? Production.addResource.bind(Production)
    : function(res, delta, reason, src){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'addResource-Fallback – Production.addResource fehlt',
          { res, delta, reason, src }
        );
      };

  const enqueueCarryJobFromBuilding =
    (typeof Production.enqueueCarryJobFromBuilding === 'function')
      ? Production.enqueueCarryJobFromBuilding.bind(Production)
      : function(/*building,resId,qty*/){
          // Fallback: noch kein Job-System / nicht wichtig
        };

  /* ========================================================================
   * [Konstanten]
   * ====================================================================== */

  // IDs, unter denen dein Steinbruch in der Registry auftauchen kann
  const STONE_BUILDING_IDS = new Set([
    'b.quarry',
    'b.steinbruch',
    'steinbruch',
    'quarry',
    'b.stone',
    'stone'
  ]);

  const STONES_PER_FIELD   = 9;          // Anzahl Steine pro Steinbruch
  const STONE_CYCLE_MS     = 6000;       // alle X ms wird ein Stein "abgebaut"
  const WORKER_TRAVEL_MS   = 1400;       // Hinweg
  const WORKER_TOTAL_MS    = WORKER_TRAVEL_MS * 2; // Hin + Zurück

  // Default-WorkArea-Radius (falls noch kein expliziter Arbeitsbereich gesetzt)
  const DEFAULT_RADIUS_TILES = 4;

  /* ========================================================================
   * [State]
   * ====================================================================== */

  /**
   * Map uid → Feld:
   *   {
   *     uid,
   *     kind,
   *     x,y,w,h,          // Gebäude-Rechteck in Tiles
   *     cx,cy,            // Zentrum (WorkArea)
   *     workArea:{cx,cy,radiusTiles},
   *     stones:[{tx,ty,active}],
   *     worker:{tMs,fromTx,fromTy,toTx,toTy,tNorm} | null,
   *     cycleMs,          // Timer für Abbau-Zyklus
   *     rng,              // deterministischer Random-Generator
   *     building          // Original-Building-Detail (für Jobs)
   *   }
   */
  const StoneFields = new Map();

  /* ========================================================================
   * [Hilfsfunktionen – Random]
   * ====================================================================== */

  function hashStringToSeed(str){
    let h = 0;
    for (let i = 0; i < str.length; i++){
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  function makeRng(seed){
    let s = (seed >>> 0) || 1;
    return function(){
      // Linear Congruential Generator
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  }

  function pickRandom(arr, rng){
    if (!arr || !arr.length) return null;
    const r = (rng || Math.random)();
    const idx = Math.floor(r * arr.length) % arr.length;
    return arr[idx];
  }

  /* ========================================================================
   * [Feld-Erzeugung / Layout]
   * ====================================================================== */

  function isStoneBuildingId(id){
    if (!id) return false;
    return STONE_BUILDING_IDS.has(String(id).toLowerCase());
  }

  function createRandomLayoutForField(field){
    const rng = field.rng || Math.random;
    const radius = (field.workArea?.radiusTiles) || DEFAULT_RADIUS_TILES;

    const stones = [];
    const cx = field.cx;
    const cy = field.cy;

    // wir verteilen Steine zufällig im Kreis um das WorkArea-Zentrum
    for (let i = 0; i < STONES_PER_FIELD; i++){
      let tx, ty;
      let tries = 0;
      while (tries++ < 20){
        const ang  = rng() * Math.PI * 2;
        const dist = 1.0 + rng() * (radius - 0.5);
        tx = Math.round(cx + Math.cos(ang) * dist);
        ty = Math.round(cy + Math.sin(ang) * dist);

        // einfache Duplikatsvermeidung
        if (!stones.some(s => s.tx === tx && s.ty === ty)){
          break;
        }
      }

      stones.push({
        tx,
        ty,
        active: true  // kann noch abgebaut werden
      });
    }

    field.stones = stones;
  }

  function registerStoneFieldFromBuild(detail){
    if (!detail) return;
    const kind = (detail.id || detail.kind || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const w   = (detail.w | 0) || 3;
    const h   = (detail.h | 0) || 3;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const cx = x + w / 2;
    const cy = y + h / 2;

    const seed = hashStringToSeed(uid);
    const rng  = makeRng(seed);

    const existing = StoneFields.get(uid);
    const field = existing || {
      uid,
      kind,
      x, y, w, h,
      cx, cy,
      workArea: {
        cx,
        cy,
        radiusTiles: DEFAULT_RADIUS_TILES
      },
      stones   : [],
      worker   : null,
      cycleMs  : 0,
      rng,
      building : detail
    };

    // falls es schon ein Field gibt, nur Basisdaten aktualisieren
    field.x = x; field.y = y; field.w = w; field.h = h;
    field.cx = field.workArea?.cx || cx;
    field.cy = field.workArea?.cy || cy;
    field.building = detail;

    createRandomLayoutForField(field);

    StoneFields.set(uid, field);

    LOG('Steinfeld registriert:', field);
  }

  /* ========================================================================
   * [WorkArea-Update]
   * ====================================================================== */

  function updateWorkArea(detail){
    if (!detail) return;

    const kind = (detail.id || detail.buildingId || detail.kind || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const field = StoneFields.get(uid);
    if (!field) return;

    const radius = (typeof detail.radiusTiles === 'number')
      ? detail.radiusTiles
      : (field.workArea?.radiusTiles || DEFAULT_RADIUS_TILES);

    field.workArea = {
      cx         : (typeof detail.cx === 'number') ? detail.cx : field.cx,
      cy         : (typeof detail.cy === 'number') ? detail.cy : field.cy,
      radiusTiles: radius
    };

    // Feld-Zentrum an WorkArea koppeln
    field.cx = field.workArea.cx;
    field.cy = field.workArea.cy;

    // neues Layout innerhalb des (neuen) Arbeitsbereiches
    createRandomLayoutForField(field);

    LOG('Arbeitsbereich (Stein) aktualisiert:', uid, field.workArea);
  }

  /* ========================================================================
   * [Abbau-Logik / Ressourcenerzeugung]
   * ====================================================================== */

  function runStoneCycle(field){
    const stones = field.stones || [];
    const candidates = stones.filter(s => s.active);

    if (!candidates.length){
      // nichts mehr abzubauen → Worker verschwindet, Feld bleibt aber
      field.worker = null;
      return;
    }

    const stone = pickRandom(candidates, field.rng);
    if (!stone) return;

    // Stein "abgebaut" → deaktivieren
    stone.active = false;

    // 1) Ressource zählen (HUD)
    addResource('stone', +1, 'stone-cycle', field.uid);

    // 2) Optional: Träger-Job anlegen (falls Helper vorhanden)
    try {
      enqueueCarryJobFromBuilding(field.building || {
        id : field.kind,
        uid: field.uid,
        x  : field.x,
        y  : field.y,
        w  : field.w,
        h  : field.h
      }, 'stone', 1);
    } catch(e){
      WARN('enqueueCarryJobFromBuilding Fehler:', e);
    }

    // 3) Worker-Animation setzen: vom Gebäudecenter zum Stein und zurück
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
      toTx       : stone.tx,
      toTy       : stone.ty,
      tNorm      : 0,
      targetStone: stone,
      idle       : false
    };
  }

  /* ========================================================================
   * [Tick – Worker-Animation + Abbau-Zyklus]
   * ====================================================================== */

  function tick(dtMs){
    const dt = dtMs || 0;

    for (const field of StoneFields.values()){
      // Abbau-Timer
      field.cycleMs = (field.cycleMs || 0) + dt;
      if (field.cycleMs >= STONE_CYCLE_MS){
        field.cycleMs -= STONE_CYCLE_MS;
        runStoneCycle(field);
      }

      const stones = field.stones || [];
      const visibleStones = stones.filter(s => s.active);

      // Falls gar keine aktiven Steine mehr → Worker zurücksetzen
      if (!visibleStones.length){
        field.worker = null;
      }

      const w = field.worker;
      if (!w) continue;

      w.tMs += dt;

      if (w.tMs >= WORKER_TOTAL_MS){
        // Zyklus vorbei – Worker verschwindet.
        field.worker = null;
        continue;
      }

      const t = w.tMs / WORKER_TOTAL_MS;
      // Hinweg 0..0.5, Rückweg 0.5..1 → Ping-Pong
      const phase = t <= 0.5 ? (t * 2) : (2 - t * 2);
      w.tNorm = Math.max(0, Math.min(1, phase));
    }
  }

  /* ========================================================================
   * [Rendering auf dem Haupt-Canvas]
   * ====================================================================== */

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx || !StoneFields.size) return;
    const ts = tileSize || 64;
    const z  = cam?.zoom || 1;
    const ox = cam?.x    || 0;
    const oy = cam?.y    || 0;

    ctx.save();

    for (const field of StoneFields.values()){
      const stones = field.stones || [];

      // 1) Steine zeichnen
      for (const s of stones){
        if (!s.active) continue;

        const worldX = (s.tx + 0.5) * ts;
        const worldY = (s.ty + 0.75) * ts; // leicht nach unten, damit es "auf" dem Boden liegt

        const sx = (worldX - ox) * z;
        const sy = (worldY - oy) * z;

        const size = ts * 0.45 * z;

        ctx.save();
        ctx.fillStyle = 'rgba(130,130,130,0.95)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // kleine Highlight-Kante
        ctx.beginPath();
        ctx.fillStyle = 'rgba(230,230,230,0.9)';
        ctx.ellipse(sx - size * 0.15, sy - size * 0.15, size * 0.25, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 2) Worker zeichnen (falls aktiv)
      const w = field.worker;
      if (w && w.tNorm >= 0 && w.tNorm <= 1){
        const wxTile = w.fromTx + (w.toTx - w.fromTx) * w.tNorm;
        const wyTile = w.fromTy + (w.toTy - w.fromTy) * w.tNorm;

        const worldX = (wxTile + 0.5) * ts;
        const worldY = (wyTile + 0.8) * ts;

        const sx = (worldX - ox) * z;
        const sy = (worldY - oy) * z;

        const rBody = ts * 0.25 * z;
        const rHead = rBody * 0.45;
        const bob   = Math.sin(w.tNorm * Math.PI * 2) * (ts * 0.06 * z);

        ctx.save();

        // Körper
        ctx.beginPath();
        ctx.fillStyle = 'rgba(230,230,230,1)';
        ctx.ellipse(sx, sy - rBody * 0.2 + bob, rBody * 0.7, rBody, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kopf
        ctx.beginPath();
        ctx.fillStyle = 'rgba(245,245,245,1)';
        ctx.arc(sx, sy - rBody * 1.4 + bob, rHead, 0, Math.PI * 2);
        ctx.fill();

        // kleiner "Hammer" (ein Rechteck)
        ctx.fillStyle = 'rgba(80,80,80,1)';
        ctx.fillRect(
          sx + rBody * 0.6,
          sy - rBody * 0.4 + bob,
          rBody * 0.5,
          rBody * 0.18
        );

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /* ========================================================================
   * [Events & Registrierung]
   * ====================================================================== */

  function onBuildComplete(detail){
    try {
      registerStoneFieldFromBuild(detail);
    } catch(e){
      ERR('onBuildComplete Fehler:', e);
    }
  }

  function onWorkAreaSet(detail){
    try {
      updateWorkArea(detail);
    } catch(e){
      ERR('onWorkAreaSet Fehler:', e);
    }
  }

  // Registrierung beim zentralen Produktions-Manager
  if (window.Production && typeof window.Production.registerModule === 'function'){
    window.Production.registerModule({
      id: 'stone',
      tick,
      onBuildComplete,
      onWorkAreaSet
    });
  } else {
    WARN('Production.registerModule fehlt – Stein-Modul nicht angebunden');
  }

  // Fallback: direkte Browser-Events (falls Production.registerModule noch nicht greift)
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

    window.addEventListener('cb:workarea:set', (ev)=>{
      const detail = ev.detail || {};
      updateWorkArea(detail);
    }, { passive:true });
  } catch(e){
    WARN('Browser-Event-Bindings fehlgeschlagen:', e);
  }

  /* ========================================================================
   * [Export / Debug]
   * ====================================================================== */

  window.ProductionStone = {
    fields : StoneFields,
    drawOnMainCanvas,
    _state : {
      StoneFields
    }
  };

  LOG('Stein-Produktion geladen v25.12.10-stone-workarea-prod-v2');
})();
