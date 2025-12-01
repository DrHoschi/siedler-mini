/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.01-lumberjack2-atlas
 *
 * Zweck   : Produktionslogik
 *           – Generischer Produktions-Skeleton (für später)
 *           – Spezieller Förster/Holzfäller:
 *               * registriert sich bei cb:build:complete (b.lumberjack)
 *               * Pflanz-/Wachstums-/Fäll-Zyklus
 *               * erzeugt Holz (cb:res:change → HUD)
 *               * cb:prod:output-Events zur Diagnose
 *               * VISUELL: Bäume über MEGA-Atlas (trees_mega_atlas)
 *                 + Fallback: einfache Kreise
 *
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 *
 * Ereignisse:
 *   IN :
 *     – cb:build:complete { id, x,y,w,h }       (von game.construction.js)
 *
 *   OUT:
 *     – cb:prod:start   { bId, kind }
 *     – cb:prod:output  { bId, kind, item, qty }
 *     – cb:prod:blocked { bId, reason }
 *     – cb:res:change   { res, old, value, delta, reason, src }
 * ========================================================================== */

(function(){
  'use strict';

  // =========================
  // IMPORT-/LOGGING-HILFEN
  // =========================
  const TAG  = '[prod]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // =========================
  // KONSTANTEN
  // =========================

  // Tick-Zeitbasis – passend zu core/game.tick.js (TICK_MS = 200)
  const TICK_MS = 200;

  // Spezieller Gebäudetyp für Förster/Holzfäller
  const LUMBERJACK_ID = 'b.lumberjack';

  // Phasen des Förster-Zyklus
  const LJ_PHASE = {
    IDLE  : 'idle',   // (Reserve – aktuell nicht genutzt)
    PLANT : 'plant',  // Setzling setzen
    GROW  : 'grow',   // Baum wächst
    READY : 'ready',  // Baum ausgewachsen, bereit zum Fällen
    CUT   : 'cut'     // Baum wird gefällt
  };

  // Dauer der Phasen (Millisekunden)
  const LJ_TIMES = {
    PLANT : 2000,   // 2 s Setzling pflanzen
    GROW  : 8000,   // 8 s Baum wächst
    CUT   : 2000,   // 2 s fällen
    REST  : 1000    // 1 s Zwischenpause vor neuem Pflanz-Zyklus
  };

  // =========================
  // GENERISCHER SKELETON (für andere Gebäude später)
  // =========================

  class ProductionBuilding {
    /**
     * @param {string} id  – interne ID (z.B. 'baker#1')
     * @param {object} io  – { input:{}, output:{}, time:ms }
     */
    constructor(id, io) {
      this.id = id;
      this.io = io || {};
      this.busy = false;
    }

    async startCycle() {
      if (this.busy) return;
      this.busy = true;

      try {
        dispatchEvent(new CustomEvent('cb:prod:start', {
          detail:{ bId:this.id, kind:this.io.kind || 'generic' }
        }));
      } catch(e){
        WARN('cb:prod:start dispatch fehlgeschlagen', e);
      }

      // Sehr einfacher Zeitablauf – später gern durch Tick-basierte Logik ersetzen
      const time = this.io.time || 3000;
      await new Promise(r => setTimeout(r, time));

      const out = this.io.output || {};
      for (const [item, qty] of Object.entries(out)) {
        const q = Number(qty) || 0;
        if (!q) continue;

        try {
          dispatchEvent(new CustomEvent('cb:prod:output', {
            detail:{ bId:this.id, kind:this.io.kind || 'generic', item, qty:q }
          }));
        } catch(e){
          WARN('cb:prod:output dispatch fehlgeschlagen', e);
        }
      }

      this.busy = false;
    }
  }

  /** Generische Production-Buildings (noch kaum genutzt, aber vorbereitet) */
  const GenericBuildings = new Map(); // id → ProductionBuilding

  function registerGeneric(id, io){
    if (!id) return;
    GenericBuildings.set(id, new ProductionBuilding(id, io || {}));
  }

  function tickGeneric(){
    for (const b of GenericBuildings.values()){
      // Fire & forget – internes Busy-Flag schützt vor Doppelstart
      try { b.startCycle(); } catch(e){ ERR('Generic-Production Fehler:', e); }
    }
  }

  // ======================================================
  // SPEZIAL: FÖRSTER/HOLZFÄLLER – BAUM-PLANTAGE PRO GEBÄUDE
  // ======================================================

  /**
   * Interner Zustand pro Förster-Gebäude.
   * Wir koppeln die Instanz an Position + Gebäudetyp, damit mehrere
   * Holzfäller parallel funktionieren.
   */
  const Lumberjacks = new Map(); // key = `${id}@${x},${y}` → state

  /**
   * @typedef {Object} LumberjackState
   * @property {string} uid
   * @property {string} kind     // 'b.lumberjack'
   * @property {number} x        // Tile-Koordinaten
   * @property {number} y
   * @property {number} w
   * @property {number} h
   * @property {string} phase    // siehe LJ_PHASE
   * @property {number} timer    // ms in aktueller Phase
   * @property {number} cycle    // Anzahl abgeschlossener Baum-Zyklen
   * @property {number} treeProg // 0..1 – wächst mit
   */

  /**
   * Ressourcenwert ändern + HUD informieren.
   * @param {string} resId
   * @param {number} delta
   * @param {string} reason
   * @param {string} src
   */
  function addResource(resId, delta, reason, src){
    if (!resId || !delta) return;

    const store = (window.RegistryValues = window.RegistryValues || {});
    const old   = Number(store[resId] || 0);
    const value = old + delta;
    store[resId] = value;

    try {
      dispatchEvent(new CustomEvent('cb:res:change', {
        detail:{
          res   : resId,
          old,
          value,
          delta,
          reason: reason || 'prod',
          src   : src || TAG
        }
      }));
    } catch(e){
      WARN('cb:res:change dispatch fehlgeschlagen', e);
    }
  }

  /**
   * Förster-Instanz aus cb:build:complete registrieren.
   * @param {object} detail  – { id, x,y,w,h }
   */
  function registerLumberjackFromBuild(detail){
    if (!detail) return;
    const kind = detail.id || detail.buildingId || detail.kind;
    if (kind !== LUMBERJACK_ID) return;

    const x = detail.x|0;
    const y = detail.y|0;
    const w = (detail.w|0) || 3;
    const h = (detail.h|0) || 3;

    const uid = `${kind}@${x},${y}`;
    if (Lumberjacks.has(uid)) {
      // Doppelte Events (z.B. Reload) ignorieren
      return;
    }

    /** @type {LumberjackState} */
    const state = {
      uid,
      kind,
      x, y, w, h,
      phase   : LJ_PHASE.PLANT,
      timer   : 0,
      cycle   : 0,
      treeProg: 0
    };

    Lumberjacks.set(uid, state);

    try {
      dispatchEvent(new CustomEvent('cb:prod:start', {
        detail:{ bId:uid, kind }
      }));
    } catch(e){
      WARN('cb:prod:start (lumberjack) dispatch fehlgeschlagen', e);
    }

    LOG('Lumberjack registriert', state);
  }

  /**
   * Einen einzelnen Förster-Zyklus weiter ticken.
   * @param {LumberjackState} lj
   */
  function tickLumberjack(lj){
    lj.timer += TICK_MS;

    switch (lj.phase) {
      case LJ_PHASE.PLANT: {
        if (lj.timer >= LJ_TIMES.PLANT){
          lj.timer    = 0;
          lj.phase    = LJ_PHASE.GROW;
          lj.treeProg = 0;
        }
        break;
      }
      case LJ_PHASE.GROW: {
        const p = Math.min(1, lj.timer / LJ_TIMES.GROW);
        lj.treeProg = p;
        if (lj.timer >= LJ_TIMES.GROW){
          lj.timer = 0;
          lj.phase = LJ_PHASE.READY;
        }
        break;
      }
      case LJ_PHASE.READY: {
        // Simple Version: sofort mit dem Fällen beginnen
        lj.phase = LJ_PHASE.CUT;
        lj.timer = 0;
        break;
      }
      case LJ_PHASE.CUT: {
        if (lj.timer >= LJ_TIMES.CUT){
          lj.timer = 0;
          lj.cycle++;

          // Holz-Ertrag – hier sehr einfach: 1 Holz pro Zyklus
          const qty = 1;
          addResource('wood', qty, 'lumberjack-cycle', lj.uid);

          try {
            dispatchEvent(new CustomEvent('cb:prod:output', {
              detail:{
                bId  : lj.uid,
                kind : lj.kind,
                item : 'wood',
                qty  : qty
              }
            }));
          } catch(e){
            WARN('cb:prod:output (lumberjack) dispatch fehlgeschlagen', e);
          }

          // Direkt neuer Pflanz-Zyklus (REST-Phase kann man später einbauen)
          lj.phase    = LJ_PHASE.PLANT;
          lj.treeProg = 0;
        }
        break;
      }
      case LJ_PHASE.IDLE:
      default:
        // Für zukünftige Spezialfälle – aktuell ungenutzt
        break;
    }
  }

  /** Alle Förster ticken lassen (wird von Production.tick() aufgerufen). */
  function tickAllLumberjacks(){
    if (!Lumberjacks.size) return;
    for (const lj of Lumberjacks.values()){
      try { tickLumberjack(lj); }
      catch(e){ ERR('Lumberjack-Tick Fehler:', e); }
    }
  }

  // ======================================================
  // GRAFIK: BAUM-OVERLAY mit MEGA-ATLAS + Fallback
  // ======================================================

  /**
   * Atlas-Konfiguration:
   *  – JSON:  assets/tex/deco/trees_mega_atlas.json  (8x8 Slots à 256x256)
   *  – Bild:  assets/tex/deco/trees_mega_atlas.png
   *
   * Die Zuordnung der Phasen → Slots kannst du bei Bedarf anpassen.
   * Aktuell sind das nur sinnvolle Default-Schätzungen.
   */
  const TREE_ATLAS_CFG = {
    urlJson:  'assets/tex/deco/trees_mega_atlas.json',
    urlImage: 'assets/tex/deco/trees_mega_atlas.png',
    // Phasen → Frame-Schlüssel aus dem JSON ("reserved_X")
    frameMap: {
      PLANT: 'reserved_32',  // kleiner Busch / Setzling
      GROW : 'reserved_24',  // mittlere Wuchs-Stufe
      READY: 'reserved_0',   // ausgewachsener Baum
      CUT  : 'reserved_40'   // Stumpf / gefällter Baum
    }
  };

  let treeAtlas       = null;   // JSON-Daten
  let treeAtlasImg    = null;   // Image-Objekt
  let treeAtlasLoaded = false;  // Bild fertig?
  let treeAtlasLoading= false;  // Ladeversuch läuft?

  /**
   * Startet (einmalig) das Laden von JSON + Bild.
   * Gibt true zurück, wenn beide verfügbar sind, sonst false.
   */
  function ensureTreeAtlasReady(){
    // Schon alles da?
    if (treeAtlas && treeAtlasLoaded) return true;

    // Lädt bereits im Hintergrund?
    if (treeAtlasLoading) return false;
    treeAtlasLoading = true;

    // JSON laden (einfache fetch-Variante)
    try {
      fetch(TREE_ATLAS_CFG.urlJson)
        .then(r => r.json())
        .then(data => {
          treeAtlas = data;
        })
        .catch(err => {
          WARN('Tree-Atlas JSON konnte nicht geladen werden:', err);
        });
    } catch(e){
      WARN('fetch für Tree-Atlas JSON nicht verfügbar:', e);
    }

    // Bild laden
    try {
      const img = new Image();
      img.onload = function(){
        treeAtlasImg    = img;
        treeAtlasLoaded = true;
      };
      img.onerror = function(err){
        WARN('Tree-Atlas Bild konnte nicht geladen werden:', err);
      };
      img.src = TREE_ATLAS_CFG.urlImage;
    } catch(e){
      WARN('Tree-Atlas Bild-Ladevorgang fehlgeschlagen:', e);
    }

    return false;
  }

  /**
   * Draw-Helfer: Einen einzelnen Atlas-Frame zeichnen.
   */
  function drawTreeFrame(ctx, frameKey, x, y, size){
    if (!treeAtlas || !treeAtlasImg || !treeAtlas.frames) return false;

    const frameDef = treeAtlas.frames[frameKey];
    if (!frameDef) return false;

    // Variante 1: unser JSON mit [col,row]
    let col, row, tileW, tileH;
    if (Array.isArray(frameDef)) {
      col   = frameDef[0];
      row   = frameDef[1];
      tileW = treeAtlas.tileW || 256;
      tileH = treeAtlas.tileH || 256;
    } else if (frameDef.frame) {
      // Fallback: Phaser-JSON (x,y,w,h)
      tileW = frameDef.frame.w;
      tileH = frameDef.frame.h;
      col   = (frameDef.frame.x / tileW)|0;
      row   = (frameDef.frame.y / tileH)|0;
    } else {
      return false;
    }

    const sx = col * (tileW);
    const sy = row * (tileH);
    const sw = tileW;
    const sh = tileH;

    ctx.drawImage(
      treeAtlasImg,
      sx, sy, sw, sh,
      x - size / 2,
      y - size * 0.9, // etwas nach oben versetzt
      size,
      size
    );
    return true;
  }

  /**
   * Zeichnet Bäume vor den Holzfäller-Gebäuden.
   * – Wenn Atlas schon geladen → hübsche Sprite-Version.
   * – Sonst Fallback: einfache Kreise (wie vorher).
   */
  function drawLumberjackOverlay(ctx, cam){
    if (!ctx) return;
    if (!Lumberjacks.size) return;

    const zoom = cam?.zoom ?? 1;
    const ox   = cam?.x    ?? 0;
    const oy   = cam?.y    ?? 0;

    // Tile-Größe aus Map holen, Fallback 64px
    const ts =
      (window.Game?.map?.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      64;

    ctx.save();
    // Welt → Screen: wir nutzen dieselbe Logik wie path-traces.overlay
    ctx.translate(-ox * ts * zoom, -oy * ts * zoom);
    ctx.scale(zoom, zoom);

    // Prüfen, ob Atlas verfügbar – wenn nicht, Ladevorgang anstoßen
    const atlasReady = ensureTreeAtlasReady();

    for (const lj of Lumberjacks.values()){
      const bx = lj.x;
      const by = lj.y;
      const bw = lj.w || 3;
      const bh = lj.h || 3;

      // Baum-Position: ungefähr Mitte unten vor dem Gebäude
      const cx = (bx + bw / 2) * ts;
      const cy = (by + bh) * ts;

      // ==========================
      // 1) Versuch: Atlas-Sprite
      // ==========================
      if (atlasReady) {
        let key = null;
        if (lj.phase === LJ_PHASE.PLANT) key = TREE_ATLAS_CFG.frameMap.PLANT;
        else if (lj.phase === LJ_PHASE.GROW) key = TREE_ATLAS_CFG.frameMap.GROW;
        else if (lj.phase === LJ_PHASE.READY) key = TREE_ATLAS_CFG.frameMap.READY;
        else if (lj.phase === LJ_PHASE.CUT) key = TREE_ATLAS_CFG.frameMap.CUT;

        if (key) {
          const size = ts * 2.0; // Baum etwas größer als ein Tile
          const ok = drawTreeFrame(ctx, key, cx, cy, size);
          if (ok) {
            // Wachstumsring (nur in GROW-Phase, über dem Baum)
            if (lj.phase === LJ_PHASE.GROW){
              ctx.beginPath();
              ctx.lineWidth   = Math.max(1.5, ts * 0.04);
              ctx.strokeStyle = 'rgba(255,255,255,0.9)';
              const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
              const r    = size * 0.35;
              ctx.arc(cx, cy - size * 0.9, r, -Math.PI/2, -Math.PI/2 + prog * Math.PI*2);
              ctx.stroke();
            }
            // Wir haben erfolgreich gezeichnet → kein Fallback nötig
            continue;
          }
        }
      }

      // ==========================
      // 2) Fallback: einfache Kreise
      // ==========================
      let fill = '#228B22'; // Standard-Grün
      if (lj.phase === LJ_PHASE.PLANT) fill = '#8BC34A';   // hellgrün
      if (lj.phase === LJ_PHASE.GROW)  fill = '#4CAF50';   // sattes Grün
      if (lj.phase === LJ_PHASE.READY) fill = '#2E7D32';   // dunkelgrün
      if (lj.phase === LJ_PHASE.CUT)   fill = '#A0522D';   // braun (Stamm/Fällen)

      const r = ts * 0.45;

      // Baumkörper
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(cx, cy - r * 0.2, r, 0, Math.PI * 2);
      ctx.fill();

      // Wachstumsring (nur in GROW-Phase)
      if (lj.phase === LJ_PHASE.GROW){
        ctx.beginPath();
        ctx.lineWidth   = Math.max(1.5, ts * 0.04);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
        ctx.arc(cx, cy - r * 0.2, r * 0.8, -Math.PI/2, -Math.PI/2 + prog * Math.PI*2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /** OverlayHooks registrieren (ähnliches Muster wie path-traces.overlay.js). */
  (function registerTreeOverlay(){
    function tryRegister(){
      if (!window.OverlayHooks?.register) return false;
      try {
        window.OverlayHooks.register('trees', (ctx)=>{
          const cam = window.GameCamera?.getState?.() || { x:0, y:0, zoom:1 };
          drawLumberjackOverlay(ctx, cam);
        });
        LOG('Tree-Overlay an OverlayHooks registriert.');
        return true;
      } catch(e){
        WARN('Tree-Overlay Registrierung fehlgeschlagen:', e);
        return true; // nicht neu versuchen
      }
    }

    if (tryRegister()) return;
    // Falls OverlayHooks noch nicht da ist → ein paar Mal später versuchen
    let tries = 0;
    const t = setInterval(()=>{
      if (tryRegister() || ++tries > 20) clearInterval(t);
    }, 200);
  })();

  // ======================================================
  // HAUPT-TICK & EVENT-BINDINGS
  // ======================================================

  /**
   * Zentraler Production-Tick – wird aus core/game.tick.js aufgerufen.
   */
  function tick(){
    // 1) Generische Produktionsgebäude (Skeleton)
    tickGeneric();

    // 2) Spezial: Förster/Holzfäller
    tickAllLumberjacks();
  }

  // cb:build:complete aus game.construction.js → Förster registrieren
  window.addEventListener('cb:build:complete', (ev)=>{
    try {
      const d = ev?.detail || {};
      registerLumberjackFromBuild(d);
    } catch(e){
      ERR('Fehler im cb:build:complete-Handler:', e);
    }
  }, { passive:true });

  // =========================
  // EXPORT / GLOBAL-API
  // =========================

  /**
   * Zentrale Production-API.
   * – register(id, io) kannst du später für generische Produktionsgebäude nutzen,
   *   z.B. Bäckerei, Fischerei, Steinmetz usw.
   */
  window.Production = window.Production || {};
  window.Production.register = registerGeneric;  // generisch (für spätere Typen)
  window.Production.tick     = tick;
  window.Production._debug   = {
    Lumberjacks,
    GenericBuildings,
    LJ_PHASE,
    LJ_TIMES,
    TREE_ATLAS_CFG
  };

  LOG('Modul geladen v25.12.01-lumberjack2-atlas');

})();
