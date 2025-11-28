/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler
 * Version : v25.11.27-final-trager
 * Zweck   : Einfaches, funktionierendes Träger-System
 *           - verwaltet Träger (Units)
 *           - verwaltet Jobs (Bau-/Transportaufträge)
 *           - bewegt Träger sichtbar auf der Map
 *
 * Integration:
 *   - Game (game-v7.js) feuert cb:build:placed → hier werden Jobs erzeugt
 *   - GameTick (core/game.tick.js) + frame() feuern cb:game:tick
 *   - unit-overlay.js zeichnet die Träger-Positionen (getUnits())
 * ============================================================================
 */

(() => {
  const TAG  = "[units]";
  const LOG  = (...a) => console.info(TAG, ...a);
  const WRN  = (...a) => console.warn(TAG, ...a);
  const ERR  = (...a) => console.error(TAG, ...a);

  // ---------------------------------------------------------------------------
  //  STATE
  // ---------------------------------------------------------------------------
  const U = {
    units   : [],          // laufende Träger
    jobs    : [],          // Warteschlange von Jobs
    nextId  : 1,
    hqPos   : null         // wird gesetzt, wenn b.hq gebaut wurde
  };

  // ---------------------------------------------------------------------------
  //  UNIT-API
  // ---------------------------------------------------------------------------
  function spawnCarrier(x, y) {
    const u = {
      id   : U.nextId++,
      x, y,              // aktuelle Position (in Tile-Koordinaten, float erlaubt)
      tx  : x,           // Ziel-X
      ty  : y,           // Ziel-Y
      speed : 2.5,       // Tiles pro Sekunde
      task  : null,      // aktueller Job (siehe unten)
      carrying : null    // { res, qty }
    };
    U.units.push(u);
    LOG("Carrier gespawnt", u);
    return u;
  }

  function getUnits() {
    return U.units;
  }

  // ---------------------------------------------------------------------------
  //  JOB-API
  // ---------------------------------------------------------------------------
  function addJob(job) {
    if (!job) return;
    // defensiv normalisieren
    const safe = {
      type       : job.type       || "build",
      res        : job.res        || "res.wood",
      from       : job.from       || { x: 0, y: 0 },
      to         : job.to         || (U.hqPos || { x: 0, y: 0 }),
      buildingId : job.buildingId || null
    };
    U.jobs.push(safe);
    LOG("Neuer Job", safe);
  }

  function popJob() {
    return U.jobs.shift() || null;
  }

  // Wird von CarrierRuntime/GameTick gefragt, ob Jobs & freie Träger vorhanden sind
  function needsJob() {
    if (!U.jobs.length) return false;
    return U.units.some(u => !u.task);
  }

  // Verteilt einen Job aktiv auf einen freien Träger
  function assignJob(job) {
    const u = U.units.find(u => !u.task);
    if (!u) {
      // kein freier Träger → Job wieder in Queue legen
      if (job) U.jobs.unshift(job);
      return false;
    }
    u.task = {
      ...job,
      phase   : "toSource",  // "toSource" → "toHQ"
      hasLoad : false
    };
    u.tx = job.from.x;
    u.ty = job.from.y;
    return true;
  }

  // ---------------------------------------------------------------------------
  //  BAU-/LAGERHILFEN (Dummy / einfache Variante)
  // ---------------------------------------------------------------------------
  // Gebäude gibt Material aus → später echtes Lager-/Produktionssystem
  function takeFromBuilding(tx, ty, res) {
    // Aktuell: Gebäude liefert einfach 1 Stück
    return { qty: 1 };
  }

  // Lieferung ins HQ → an warehouse.js gekoppelt
  function deliverToHQ(res, qty) {
    // Über Warehouse-Event an das HQ-Lager schicken
    try {
      window.dispatchEvent(new CustomEvent("req:stock:push", {
        detail: { store: "HQ", item: res, qty }
      }));
    } catch (e) {
      WRN("deliverToHQ Fehler", e);
    }
  }

  // ---------------------------------------------------------------------------
  //  BEWEGUNGSHELFER
  // ---------------------------------------------------------------------------
  function stepTowards(u, dt) {
    const speed   = u.speed || 2.5;
    const maxStep = speed * dt;

    const dx   = u.tx - u.x;
    const dy   = u.ty - u.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxStep || dist === 0) {
      u.x = u.tx;
      u.y = u.ty;
      return true; // angekommen
    }

    const f = maxStep / dist;
    u.x += dx * f;
    u.y += dy * f;
    return false;
  }

  // ---------------------------------------------------------------------------
  //  TICK-LOGIK (einfach, aber sichtbar)
  // ---------------------------------------------------------------------------
  function ensureTask(u) {
    if (u.task) return;
    const job = popJob();
    if (!job) return;
    u.task = {
      ...job,
      phase   : "toSource",
      hasLoad : false
    };
    u.tx = job.from.x;
    u.ty = job.from.y;
  }

  function tickUnits(dt) {
    const dtSec = (typeof dt === "number" && dt > 0) ? dt : 0.2;

    for (const u of U.units) {
      // 1) Falls kein Job → versuche einen zu holen
      ensureTask(u);
      if (!u.task) continue;

      const job = u.task;

      if (job.phase === "toSource") {
        // Ziel: Quell-Gebäude
        u.tx = job.from.x;
        u.ty = job.from.y;
        const arrived = stepTowards(u, dtSec);
        if (arrived) {
          const taken = takeFromBuilding(job.from.x, job.from.y, job.res);
          job.hasLoad = !!(taken && taken.qty > 0);
          job.phase   = "toHQ";

          // HQ-Ziel setzen
          const hq = U.hqPos || job.to || { x: u.x, y: u.y };
          u.tx = hq.x;
          u.ty = hq.y;
        }
      } else if (job.phase === "toHQ") {
        const dest = U.hqPos || job.to || { x: u.tx, y: u.ty };
        u.tx = dest.x;
        u.ty = dest.y;
        const arrived = stepTowards(u, dtSec);
        if (arrived) {
          if (job.hasLoad) {
            deliverToHQ(job.res, 1);
          }
          u.task     = null;
          u.carrying = null;
        }
      }
    }
  }

  // Öffentliche Tick-Funktion (für game.tick.js)
  function publicTick(dt) {
    try {
      tickUnits(dt);
    } catch (e) {
      ERR("Tick-Fehler:", e);
    }
  }

  // ---------------------------------------------------------------------------
  //  EVENTS
  // ---------------------------------------------------------------------------

  // Gebäude platziert → Baujob erzeugen
  addEventListener("cb:build:placed", (ev) => {
    const d = ev.detail || {};
    addJob({
      type       : "build",
      res        : "res.wood",
      from       : { x: d.x, y: d.y },
      to         : U.hqPos || { x: 0, y: 0 },
      buildingId : d.id
    });
  });

  // HQ Position setzen (wenn HQ gebaut wurde) + Carrier spawnen
  addEventListener("cb:build:placed", (ev) => {
    const d = ev.detail || {};
    if (d.id !== "b.hq") return;

    U.hqPos = { x: d.x, y: d.y };
    LOG("HQ gesetzt → Carrier werden gespawnt", U.hqPos);

    // Standard: 3 Carrier am HQ
    spawnCarrier(U.hqPos.x + 0.2, U.hqPos.y + 0.2);
    spawnCarrier(U.hqPos.x - 0.2, U.hqPos.y + 0.2);
    spawnCarrier(U.hqPos.x,       U.hqPos.y - 0.2);
  });

  // Frame-Tick vom Spiel → Units updaten
  addEventListener("cb:game:tick", (ev) => {
    const dt = ev?.detail?.dt ?? 0.0;
    publicTick(dt);
  });

  // ---------------------------------------------------------------------------
  //  EXPORT
  // ---------------------------------------------------------------------------
  window.GameUnits = {
    // Units
    spawnCarrier,
    getUnits,

    // Jobs
    addJob,
    popJob,
    needsJob,
    assignJob,

    // Tick (für GameTick / Tests)
    tick      : publicTick,
    tickUnits
  };

  LOG("Units-System geladen (v25.11.27-final-trager)");
})();
