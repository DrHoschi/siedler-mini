/* ============================================================================
 * Datei   : core/game.production.jobs.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.14-prod-jobs-bridge-v2-autodisable+geoFallback
 *
 * Zweck   : (LEGACY) BRÜCKE zwischen Produktion und Trägern
 *
 * WICHTIG / WARUM DIESE DATEI EXISTIERT:
 *   In neueren Ständen übernimmt core/game.production.js (window.Production)
 *   bereits zentral:
 *     - Ressourcen zählen
 *     - Carry-Jobs erzeugen (from=DropTile, to=HQ)
 *
 *   Diese Datei war früher eine separate Brücke und wurde deshalb in v4.1
 *   noch mitgeladen. Dadurch entstanden Warnungen wie:
 *     "[prod-jobs] Kein Building zu cb:prod:output gefunden ..."
 *
 *   => v2 behebt das robust:
 *      1) AUTO-DISABLE: Sobald window.Production aktiv ist, deaktiviert sich
 *         diese Legacy-Brücke selbst (unhook der Event-Listener).
 *      2) GEO-FALLBACK: Falls sie doch genutzt wird, kann sie aus
 *         cb:prod:output direkt (x,y,w,h) ein Building-Stub bauen.
 *      3) KIND-INDEX: Zusätzlich merkt sie Gebäude auch nach "kind"/"id".
 *
 * Struktur: IMPORTS → KONSTANTEN → STATE → HELFER → EVENTS → EXPORT
 * ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // IMPORTS / SHORTCUTS
  // ------------------------------------------------------------------------

  const TAG  = '[prod-jobs]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const JobEngine = window.JobEngine || null;

  // ------------------------------------------------------------------------
  // KONSTANTEN
  // ------------------------------------------------------------------------

  // Welche Ressourcen-Namen aus der Produktion unterstützen wir?
  const RES_MAP = {
    wood   : 'res.wood',
    holz   : 'res.wood',
    'res.wood': 'res.wood',

    stone  : 'res.stone',
    stein  : 'res.stone',
    'res.stone': 'res.stone',

    fish   : 'res.fish',
    fisch  : 'res.fish',
    'res.fish': 'res.fish'
  };

  const DEFAULT_JOBS_PER_OUTPUT = 1;  // pro Ressourceneinheit ein Job

  // ------------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------------

  /**
   * Merkt sich Gebäude (aus cb:build:complete) nach uid:
   *   _buildingsByUid: Map<string, {uid,kind,x,y,w,h,entrance?,...}>
   */
  const _buildingsByUid = new Map();

  /**
   * Zusatz-Index nach "kind"/"id" (z.B. 'b.quarry'):
   *   _buildingsByKind: Map<string, BuildingStub>
   *
   * Hinweis: Wenn du mehrere gleiche Gebäude hast, steht hier immer das
   * zuletzt gemerkte. Für Epoche 1 reicht das fürs Debug meist aus.
   */
  const _buildingsByKind = new Map();

  // AUTO-DISABLE Flag (damit wir nicht zigmal loggen/unhooken)
  let _disabled = false;

  // ------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ------------------------------------------------------------------------

  /**
   * In v4.1 macht window.Production (core/game.production.js) bereits Jobs.
   * Wenn das aktiv ist, wird diese Legacy-Brücke deaktiviert.
   */
  function _centralProductionIsActive() {
    return !!(
      window.Production &&
      typeof window.Production.enqueueCarryJobFromBuilding === 'function'
    );
  }

  function normalizeResId(item) {
    if (!item) return 'res.unknown';
    const key = String(item).toLowerCase();
    return RES_MAP[key] || `res.${key}`;
  }

  function _kindOf(detail){
    return detail?.kind || detail?.id || detail?.buildingId || detail?.buildingKind || null;
  }

  function rememberBuilding(detail) {
    if (!detail) return;

    // "uid" ist in einigen Modulen nicht eindeutig – wir nehmen was da ist
    const kind = _kindOf(detail);
    const uid  = detail.uid || detail.bId || detail.id || (kind ? `${kind}@${detail.x},${detail.y}` : null);
    if (!uid) return;

    const b = {
      uid,
      id   : detail.id   ?? kind ?? null,
      kind : kind ?? detail.id ?? null,
      x    : Number(detail.x) || 0,
      y    : Number(detail.y) || 0,
      w    : Number(detail.w) || 1,
      h    : Number(detail.h) || 1,
      // Türkachel-Info, falls vorhanden (aus Registry/RegistryPatch)
      entrance : detail.entrance || detail.door || null,
      entrances: detail.entrances || null,
      dropTx   : detail.dropTx ?? null,
      dropTy   : detail.dropTy ?? null
    };

    _buildingsByUid.set(uid, b);
    if (b.kind) _buildingsByKind.set(String(b.kind), b);

    LOG('Building gespeichert', uid, b);
  }

  /**
   * Versucht, das zugehörige Gebäude zu einer Produktion zu finden.
   *
   * Unterstützte Formen des Output-Events (aus deinen Modulen):
   *   - { bId:'b.quarry', item:'stone', qty:1, x,y,w,h }
   *   - { uid:'b.quarry@10,7', ... }
   *   - { kind:'b.quarry', ... }
   */
  function findBuildingForProd(detail) {
    if (!detail) return null;

    // 1) Direkter uid-Match
    const uid = detail.bId || detail.uid || detail.id;
    if (uid && _buildingsByUid.has(uid)) {
      return _buildingsByUid.get(uid);
    }

    // 2) kind-Match
    const kind = _kindOf(detail) || detail.bId;
    if (kind && _buildingsByKind.has(String(kind))) {
      return _buildingsByKind.get(String(kind));
    }

    // 3) Geo-Fallback: Gebäude-Geometrie ist im Output-Event enthalten
    if (Number.isFinite(detail.x) && Number.isFinite(detail.y)) {
      return {
        uid      : uid || (kind ? `${kind}@${detail.x},${detail.y}` : `b@${detail.x},${detail.y}`),
        id       : kind || null,
        kind     : kind || null,
        x        : Number(detail.x),
        y        : Number(detail.y),
        w        : Number.isFinite(detail.w) ? Number(detail.w) : 1,
        h        : Number.isFinite(detail.h) ? Number(detail.h) : 1,
        entrance : detail.entrance || null,
        entrances: detail.entrances || null,
        dropTx   : detail.dropTx ?? null,
        dropTy   : detail.dropTy ?? null
      };
    }

    return null;
  }

  /**
   * Tür-/Eingangstile bestimmen:
   * Unterstützt:
   *  A) entrance {tx,ty} relativ
   *  B) entrances[0] {dx,dy} relativ
   *  Fallback: Mitte unten
   */
  function getDoorTile(b) {
    if (!b) return { x: 0, y: 0 };

    const bx = Number(b.x ?? 0);
    const by = Number(b.y ?? 0);
    const bw = Number(b.w ?? 1);
    const bh = Number(b.h ?? 1);

    // A) entrance {tx,ty}
    const e = b.entrance;
    if (e && Number.isFinite(e.tx) && Number.isFinite(e.ty)) {
      return { x: bx + e.tx, y: by + e.ty };
    }

    // B) entrances[0] {dx,dy}
    const es = b.entrances;
    if (Array.isArray(es) && es[0] && Number.isFinite(es[0].dx) && Number.isFinite(es[0].dy)) {
      return { x: bx + es[0].dx, y: by + es[0].dy };
    }

    // Fallback: Mitte unten
    return { x: bx + bw / 2, y: by + bh };
  }

  /**
   * DropTile vor der Tür:
   *  - wenn dropTx/dropTy explizit gesetzt ist → direkt nutzen
   *  - sonst: 1 Tile "unten" der Türkachel (y+1)
   */
  function getDropTile(b) {
    if (Number.isFinite(b?.dropTx) && Number.isFinite(b?.dropTy)) {
      return { x: b.dropTx, y: b.dropTy };
    }
    const door = getDoorTile(b);
    return { x: door.x, y: door.y + 1 };
  }

  /**
   * HQ-Position aus GameUnits holen (Tile-Koordinaten).
   */
  function getHQPosTiles() {
    const Units = window.GameUnits;
    if (!Units || typeof Units.getHQPos !== 'function') return null;

    try {
      const p = Units.getHQPos();
      if (p && Number.isFinite(p.tx) && Number.isFinite(p.ty)) {
        return { x: p.tx, y: p.ty };
      }
    } catch (e) {
      WARN('getHQPosTiles Fehler', e);
    }
    return null;
  }

  /**
   * Erzeugt Jobs in der JobQueue.
   */
  function enqueueCarryJobsForOutput(detail) {
    if (!JobEngine || typeof JobEngine.add !== 'function') {
      WARN('JobEngine.add fehlt – keine Carry-Jobs möglich');
      return;
    }

    const resId = normalizeResId(detail.item || detail.res || detail.type);
    const qty   = Math.max(1, Number(detail.qty) || 1);

    const building = findBuildingForProd(detail);
    if (!building) {
      // v2: nur warnen, wenn wir wirklich NICHTS haben – vorher war das Spam
      WARN('Kein Building zu cb:prod:output gefunden – ignoriere', detail);
      return;
    }

    const src = getDropTile(building);   // Quelle = Ablage-Ort vor der Tür
    const hq  = getHQPosTiles();         // Ziel   = HQ

    if (!hq) {
      WARN('HQ-Position unbekannt – keine Carry-Jobs', { detail, src });
      return;
    }

    const jobCount = DEFAULT_JOBS_PER_OUTPUT * qty;

    for (let i = 0; i < jobCount; i++) {
      const job = {
        id   : `job-prod-${resId}-${building.uid}-${Date.now()}-${i}`,
        type : 'carry',
        res  : resId,
        from : { x: src.x, y: src.y },   // Tiles
        to   : { x: hq.x,  y: hq.y  }    // Tiles (HQ)
      };
      JobEngine.add(job);
    }

    LOG('Carry-Jobs aus Produktion erzeugt', {
      resId,
      qty,
      jobs : jobCount,
      from : src,
      to   : hq,
      bUid : building.uid
    });
  }

  // ------------------------------------------------------------------------
  // AUTO-DISABLE / UNHOOK
  // ------------------------------------------------------------------------

  // Wir brauchen stabile Handler-Referenzen, um sie wieder entfernen zu können.
  function _onBuildComplete(ev) {
    // Sobald zentrale Production aktiv ist: still sein & unhooken.
    if (_centralProductionIsActive()) return _disableAndUnhook();
    try { rememberBuilding(ev.detail || {}); } catch (e) { WARN('cb:build:complete Fehler', e); }
  }

  function _onProdOutput(ev) {
    // Sobald zentrale Production aktiv ist: still sein & unhooken.
    if (_centralProductionIsActive()) return _disableAndUnhook();
    try { enqueueCarryJobsForOutput(ev.detail || {}); } catch (e) { WARN('cb:prod:output Fehler', e); }
  }

  function _disableAndUnhook(){
    if (_disabled) return;
    _disabled = true;

    try{
      window.removeEventListener('cb:build:complete', _onBuildComplete);
      window.removeEventListener('cb:prod:output',  _onProdOutput);
    }catch(e){
      // egal – wir wollen auf keinen Fall crashen
    }

    LOG('Legacy-Prod-Bridge deaktiviert: window.Production ist aktiv (Jobs laufen zentral).');
  }

  // ------------------------------------------------------------------------
  // EVENTS (nur solange nicht disabled)
  // ------------------------------------------------------------------------

  window.addEventListener('cb:build:complete', _onBuildComplete);
  window.addEventListener('cb:prod:output',  _onProdOutput);

  // Zusätzlich: nach dem Load einmal checken (falls Reihenfolge mal anders ist)
  setTimeout(() => {
    if (_centralProductionIsActive()) _disableAndUnhook();
  }, 0);

  // ------------------------------------------------------------------------
  // EXPORT (Debug)
  // ------------------------------------------------------------------------

  window.ProductionJobsBridge = {
    /** Gibt den internen Cache zurück (für Inspector/Debug). */
    getBuildings() {
      return _buildingsByUid;
    },

    /** True, wenn diese Legacy-Brücke deaktiviert wurde. */
    isDisabled(){
      return _disabled;
    },

    /** Simuliere einen Output (z.B. im Inspector). */
    simulate(detail) {
      // Wenn zentrale Production aktiv ist, delegieren wir.
      if (_centralProductionIsActive()){
        // minimaler Stub für central enqueue
        const item = detail?.item || detail?.res || 'wood';
        const qty  = Number(detail?.qty || 1) || 1;
        const b = findBuildingForProd(detail) || null;
        if (b) window.Production.enqueueCarryJobFromBuilding(b, item, qty);
        return;
      }
      enqueueCarryJobsForOutput(detail);
    }
  };

  LOG('geladen (v25.12.14-prod-jobs-bridge-v2-autodisable+geoFallback)');

})();
