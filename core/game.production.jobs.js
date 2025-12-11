/* ============================================================================
 * Datei   : core/game.production.jobs.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-prod-jobs-bridge-v1
 *
 * Zweck   : BRÜCKE zwischen Produktion und Trägern
 *
 *   - merkt sich Gebäude aus cb:build:complete
 *   - reagiert auf cb:prod:output { bId, kind, item, qty }
 *   - erzeugt dafür Jobs in JobEngine (type:'carry')
 *   - Quelle = Ablage-Ort vor der Tür (Türkachel-ähnlich)
 *   - Ziel   = HQ-Position aus GameUnits.getHQPos()
 *
 * Vorteile:
 *   - Holz-/Stein-/Fisch-Module bleiben unverändert
 *   - vorhandenes Carrier-/Job-System wird weiterverwendet
 *   - Träger laufen sichtbar vom Gebäude zum HQ
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

  // ------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ------------------------------------------------------------------------

  function normalizeResId(item) {
    if (!item) return 'res.unknown';
    const key = String(item).toLowerCase();
    return RES_MAP[key] || `res.${key}`;
  }

  function rememberBuilding(detail) {
    if (!detail) return;
    const uid = detail.uid || detail.bId || detail.id;
    if (!uid) return;

    const b = {
      uid,
      id   : detail.id   ?? null,
      kind : detail.kind ?? detail.id ?? null,
      x    : Number(detail.x) || 0,
      y    : Number(detail.y) || 0,
      w    : Number(detail.w) || 1,
      h    : Number(detail.h) || 1,
      // Türkachel-Info, falls vorhanden (aus Registry/RegistryPatch)
      entrance : detail.entrance || detail.door || null
    };

    _buildingsByUid.set(uid, b);
    LOG('Building gespeichert', uid, b);
  }

  /**
   * Versucht, das zugehörige Gebäude zu einer Produktion zu finden.
   */
  function findBuildingForProd(detail) {
    if (!detail) return null;
    const uid = detail.bId || detail.uid || detail.id;
    if (uid && _buildingsByUid.has(uid)) {
      return _buildingsByUid.get(uid);
    }
    return null;
  }

  /**
   * Türkachel bestimmen:
   *  - wenn building.entrance vorhanden → relativ zu (x,y)
   *  - sonst Fallback: Mitte unten des Gebäudes
   */
  function getDoorTile(b) {
    if (!b) return { x: 0, y: 0 };

    if (b.entrance &&
        Number.isFinite(b.entrance.tx) &&
        Number.isFinite(b.entrance.ty)) {

      return {
        x: b.x + b.entrance.tx,
        y: b.y + b.entrance.ty
      };
    }

    return {
      x: b.x + (b.w || 1) / 2,
      y: b.y + (b.h || 1)
    };
  }

  /**
   * Ablage-Ort (Drop-Tile) vor der Tür:
   *  - exakt EIN Tile vor der Türkachel nach "außen" (y+1)
   *  - Das entspricht deinem Wunsch "ähnlich wie Türkachel".
   */
  function getDropTile(b) {
    const door = getDoorTile(b);
    return {
      x: door.x,
      y: door.y + 1
    };
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
   * Erzeugt tatsächlich Jobs in der JobQueue.
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
        type : 'carry',           // GameUnits unterscheidet aktuell nicht – Info nur für Debug
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
  // EVENTS
  // ------------------------------------------------------------------------

  // Gebäude merken (damit wir später beim Prod-Output Koordinaten haben)
  window.addEventListener('cb:build:complete', (ev) => {
    try {
      rememberBuilding(ev.detail || {});
    } catch (e) {
      WARN('cb:build:complete-Handler Fehler', e);
    }
  });

  // Produktions-Output → Carry-Jobs erzeugen
  window.addEventListener('cb:prod:output', (ev) => {
    try {
      enqueueCarryJobsForOutput(ev.detail || {});
    } catch (e) {
      WARN('cb:prod:output-Handler Fehler', e);
    }
  });

  // ------------------------------------------------------------------------
  // EXPORT (Debug)
  // ------------------------------------------------------------------------

  window.ProductionJobsBridge = {
    getBuildings() {
      return _buildingsByUid;
    },
    simulate(detail) {
      // für Inspector/Debug nutzbar
      enqueueCarryJobsForOutput(detail);
    }
  };

  LOG('Produktions-Job-Brücke geladen (v25.12.11-prod-jobs-bridge-v1)');

})();
