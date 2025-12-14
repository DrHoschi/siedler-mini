/* ============================================================================
 * Datei   : core/worker.production.js
 * Projekt : Siedler‑Mini v4.1
 * Version : v25.12.14-worker-prod-d3
 *
 * Zweck:
 *   Minimaler Produktions‑Loop für Worker (Holzfäller/Steinmetz/Fischer),
 *   der an das zentrale Production‑System (window.Production) andockt.
 *
 * Motivation:
 *   - Worker laufen bereits am Gebäude & im WorkArea herum.
 *   - Jetzt soll "arbeiten" echten Output erzeugen und einen Carrier‑Job
 *     erzeugen, OHNE das ganze Job‑System umzubauen.
 *
 * Funktionsweise (robust / additiv):
 *   - Lauscht auf cb:build:complete und merkt Gebäude in einem internen Cache
 *     (uid/kind/x/y/w/h + optional entrance).
 *   - Pollt in einem kurzen Intervall die Worker‑Units via GameUnits.getUnits().
 *   - Wenn ein Worker in den State "__animState = 'work'" geht, läuft ein kurzer
 *     Timer (WORK_MS). Danach wird 1 Output erzeugt:
 *       b.lumberjack -> wood
 *       b.quarry     -> stone
 *       b.fisher     -> fish
 *     und es wird (wenn vorhanden) window.Production.enqueueCarryJobFromBuilding(...)
 *     aufgerufen.
 *
 * Integration:
 *   - Diese Datei muss in index.html per <script defer ...> eingebunden werden,
 *     NACH core/registry.js und NACH core/game.units.js, damit GameUnits existiert.
 *
 * Hinweise:
 *   - 8‑Dir Animation (B3) nutzt u.__animState / vx/vy. Dieser Patch setzt nur
 *     work‑done Events / Produktion, er ändert NICHT das Movement.
 * ========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // IMPORTS / SHORTCUTS
  // ---------------------------------------------------------------------------

  const TAG = '[worker-prod]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // KONSTANTEN
  // ---------------------------------------------------------------------------

  // Dauer, wie lange ein Worker "arbeiten" muss, bevor 1 Output erzeugt wird.
  const WORK_MS = 1200;

  // Cooldown zwischen zwei Outputs (pro Worker), damit es nicht zu schnell wird.
  const COOLDOWN_MS = 2500;

  // Poll‑Intervall: oft genug, aber nicht zu teuer.
  const TICK_MS = 200;

  // Zuordnung Building‑Kind -> Item
  const BUILDING_KIND_TO_ITEM = [
    { match: /(^|\.|_)lumberjack\b/i, item: 'wood' },
    { match: /(^|\.|_)quarry\b/i,     item: 'stone' },
    { match: /(^|\.|_)fisher\b/i,     item: 'fish' }
  ];

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /** Gebäude‑Cache: uid -> buildingStub */
  const buildingsByUid = new Map();

  /** Optional: kind -> last buildingStub (für Fallback) */
  const buildingsByKind = new Map();

  let started = false;
  let timerId = null;

  // ---------------------------------------------------------------------------
  // HELFER
  // ---------------------------------------------------------------------------

  function _kindOf(detail) {
    return detail?.kind || detail?.id || detail?.buildingId || detail?.buildingKind || null;
  }

  function rememberBuilding(detail) {
    if (!detail) return;

    const kind = _kindOf(detail) || null;
    const uid  = detail.uid || detail.bId || detail.id || (kind ? `${kind}@${detail.x},${detail.y}` : null);
    if (!uid) return;

    const b = {
      uid,
      kind: kind || detail.id || null,
      id: detail.id || kind || null,
      x: Number(detail.x) || 0,
      y: Number(detail.y) || 0,
      w: Number(detail.w) || 1,
      h: Number(detail.h) || 1,
      entrance: detail.entrance || detail.door || null,
      entrances: detail.entrances || null,
      dropTx: detail.dropTx ?? null,
      dropTy: detail.dropTy ?? null
    };

    buildingsByUid.set(uid, b);
    if (b.kind) buildingsByKind.set(String(b.kind), b);

    // Nicht zu spammy loggen – nur bei Start sinnvoll:
    // LOG('Building gemerkt', uid, b.kind);
  }

  function normalizeUnitKind(k) {
    k = String(k || '').trim();
    if (!k) return '';
    if (!k.startsWith('u.')) k = 'u.' + k;
    return k.replace(/_/g, '.').toLowerCase();
  }

  function findItemForBuildingKind(kind) {
    if (!kind) return null;
    const s = String(kind);
    for (const rule of BUILDING_KIND_TO_ITEM) {
      if (rule.match.test(s)) return rule.item;
    }
    return null;
  }

  function getWorkers() {
    const gu = window.GameUnits;
    if (!gu || typeof gu.getUnits !== 'function') return [];
    try {
      const all = gu.getUnits() || [];
      return all.filter(u => (u?.type === 'worker') || (String(u?.kind||'').includes('woodcutter') || String(u?.kind||'').includes('stonecutter') || String(u?.kind||'').includes('fisherman')) && u?.type !== 'carrier');
    } catch (e) {
      WARN('getWorkers Fehler', e);
      return [];
    }
  }

  function resolveHomeBuilding(worker) {
    const uid = worker?.homeUid || worker?.homeBuildingUid || worker?.home || null;
    if (uid && buildingsByUid.has(uid)) return buildingsByUid.get(uid);

    // Manche Stände setzen homeKind statt uid:
    const hk = worker?.homeKind || worker?.homeBuildingKind || null;
    if (hk && buildingsByKind.has(String(hk))) return buildingsByKind.get(String(hk));

    // Notfall: nimm das nächste bekannte Gebäude in der Nähe (Tile-Distanz)
    const wx = Number(worker?.x ?? NaN);
    const wy = Number(worker?.y ?? NaN);
    if (!Number.isFinite(wx) || !Number.isFinite(wy)) return null;

    let best = null, bestD = 1e9;
    for (const b of buildingsByUid.values()) {
      const dx = (b.x + b.w/2) - wx;
      const dy = (b.y + b.h/2) - wy;
      const d = dx*dx + dy*dy;
      if (d < bestD) { bestD = d; best = b; }
    }
    // Wenn das nächste sehr weit weg ist, lieber null:
    return bestD < 200 ? best : null; // 200 ~ sqrt(200)=14 tiles
  }

  function getAction(worker) {
    // Priorität: explicit anim state
    if (worker?.__animState) return String(worker.__animState);
    // Fallback: task.type
    const t = worker?.task?.type;
    if (t) return String(t);
    return 'idle';
  }

  function canProduceNow(worker, nowMs) {
    const until = Number(worker?.__prodCooldownUntil || 0);
    return nowMs >= until;
  }

  function markCooldown(worker, nowMs) {
    worker.__prodCooldownUntil = nowMs + COOLDOWN_MS;
  }

  function produceOnce(worker, building, item) {
    if (!item || !building) return;

    // Zentrales Production-System bevorzugen
    if (window.Production && typeof window.Production.enqueueCarryJobFromBuilding === 'function') {
      try {
        window.Production.enqueueCarryJobFromBuilding(building, item, 1, {
        accountOnDeliver: true,
        reason: 'worker:prod',
        src: building?.kind || building?.uid || 'worker'
      });
        LOG('Output erzeugt → Carry-Job enqueued', { item, b: building.kind || building.uid, worker: worker.kind || worker.id });
        return;
      } catch (e) {
        WARN('enqueueCarryJobFromBuilding Fehler', e);
      }
    }

    // Fallback: Event (falls du später wieder Listener hast)
    try {
      window.dispatchEvent(new CustomEvent('cb:prod:output', { detail: {
        bId: building.uid,
        kind: building.kind,
        x: building.x, y: building.y, w: building.w, h: building.h,
        item, qty: 1
      }}));
      LOG('Fallback cb:prod:output gesendet', { item, b: building.kind || building.uid });
    } catch (e) {
      WARN('Fallback cb:prod:output Fehler', e);
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN TICK LOOP
  // ---------------------------------------------------------------------------

  function tick() {
    const now = performance.now();

    const workers = getWorkers();
    for (const w of workers) {
      const action = getAction(w);

      if (action === 'work') {
        // Startzeit merken
        if (!w.__workStartMs) w.__workStartMs = now;

        // Einmal pro "work"-Phase produzieren (mit cooldown)
        const elapsed = now - w.__workStartMs;
        if (elapsed >= WORK_MS && !w.__workProducedThisCycle && canProduceNow(w, now)) {
          const b = resolveHomeBuilding(w);
          const item = findItemForBuildingKind(b?.kind || b?.id || w?.homeKind || '');
          if (b && item) {
            produceOnce(w, b, item);
            w.__workProducedThisCycle = true;
            markCooldown(w, now);
          } else {
            // nicht zu spammy – aber hilfreich wenn Home-Bindung fehlt
            WARN('Kann nicht produzieren (building/item fehlt)', { worker: w.kind||w.id, homeUid: w.homeUid, bKind: b?.kind, item });
            w.__workProducedThisCycle = true; // damit wir nicht jede 200ms warnen
            markCooldown(w, now);
          }
        }
      } else {
        // sobald Worker nicht mehr arbeitet, Phase resetten
        w.__workStartMs = 0;
        w.__workProducedThisCycle = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // STARTUP / EVENTS
  // ---------------------------------------------------------------------------

  function start() {
    if (started) return;
    started = true;

    // Gebäude merken, damit wir Production sauber callen können
    window.addEventListener('cb:build:complete', (ev) => {
      try { rememberBuilding(ev.detail || {}); } catch (e) { WARN('cb:build:complete Fehler', e); }
    });

    // Falls Buildings schon früher gebaut wurden, haben wir sie nicht im Cache.
    // Das ist ok: resolveHomeBuilding() kann notfalls "nearest" nehmen.
    timerId = setInterval(tick, TICK_MS);

    LOG('aktiv', { WORK_MS, COOLDOWN_MS, TICK_MS });
  }

  // Start, sobald GameUnits existiert (nicht blockieren)
  const bootTry = setInterval(() => {
    if (window.GameUnits && typeof window.GameUnits.getUnits === 'function') {
      clearInterval(bootTry);
      start();
    }
  }, 50);

  // Debug export
  window.WorkerProduction = {
    start,
    getBuildings: () => buildingsByUid,
    _tickOnce: tick
  };

})();
