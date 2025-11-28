/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler
 * Version : v25.11.27-carrier+hud
 * Zweck   : Einfaches, funktionierendes Träger-System
 *           - verwaltet Träger (Units)
 *           - verwaltet Jobs (Bau-/Transportaufträge)
 *           - bewegt Träger sichtbar auf der Map
 *           - liefert Ressourcen ins Lager (Warehouse/HUD)
 *
 * Integration:
 *   - Game (game-v7.js) erzeugt Build- und Carry-Jobs → GameUnits.addJob()
 *   - GameTick / carrier.runtime feuert cb:game:tick → GameUnits.tick()
 *   - unit.overlay.js zeichnet Träger + Icon anhand u.carrying.res
 *   - warehouse.js wandelt req:stock:push in cb:res:change fürs HUD
 * ============================================================================ */

(() => {
  const TAG  = "[units]";
  const LOG  = (...a) => console.info(TAG, ...a);
  const WARN = (...a) => console.warn(TAG, ...a);

  // ---------------------------------------------------------------------------
  //  STATE
  // ---------------------------------------------------------------------------
  const U = {
    units  : [],          // laufende Träger
    jobs   : [],          // Warteschlange von Jobs (Carry/Bau)
    nextId : 1,
    hqPos  : null         // wird gesetzt, wenn b.hq gebaut wurde
  };

  // ---------------------------------------------------------------------------
  //  UNIT-API
  // ---------------------------------------------------------------------------
  function spawnCarrier(x, y) {
    const u = {
      id       : U.nextId++,
      x, y,               // aktuelle Position (Tile-Koordinaten, float erlaubt)
      tx       : x,
      ty       : y,       // Target-Koordinaten
      speed    : 2.5,     // Tiles pro Sekunde
      task     : null,    // aktueller Job (siehe unten)
      carrying : null     // { res, qty }
    };
    U.units.push(u);
    LOG("Carrier gespawnt", JSON.stringify(u));
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
    const safe = {
      type       : job.type       || "carry",
      res        : job.res        || "wood",
      from       : job.from       || { x: 0, y: 0 },
      to         : job.to         || (U.hqPos || { x: 0, y: 0 }),
      buildingId : job.buildingId || null
    };
    U.jobs.push(safe);
    LOG("Neuer Job", JSON.stringify(safe));
  }

  function popJob() {
    return U.jobs.shift() || null;
  }

  function needsJob() {
    if (!U.jobs.length) return false;
    return U.units.some(u => !u.task);
  }

  function assignJob(job) {
    const u = U.units.find(u => !u.task);
    if (!u) {
      if (job) U.jobs.unshift(job);
      return false;
    }
    u.task = {
      ...job,
      phase   : "toSource",  // "toSource" → "toHQ"
      hasLoad : false,
      qty     : 0
    };
    u.tx = job.from.x;
    u.ty = job.from.y;
    return true;
  }

  // ---------------------------------------------------------------------------
  //  QUELLE / LAGER (Dummy-Implementationen)
  // ---------------------------------------------------------------------------
  function takeFromBuilding(tx, ty, resId) {
    // Aktuell: Gebäude liefert immer 1 Stück,
    // später hier echtes Lager/Produktion einhängen.
    return { qty: 1, res: resId };
  }

  function deliverToHQ(resId, qty) {
    if (!resId || !qty) return;
    try {
      // Standard: HQ-Lager
      window.dispatchEvent(new CustomEvent("req:stock:push", {
        detail: { store: "HQ", item: resId, qty }
      }));
    } catch (e) {
      WARN("deliverToHQ Fehler:", e?.message || e);
    }
  }

  // ---------------------------------------------------------------------------
  //  BEWEGUNG
  // ---------------------------------------------------------------------------
  function stepTowards(u, dt) {
    const speed   = u.speed || 2.5;
    const maxStep = speed * dt;

    const dx   = u.tx - u.x;
    const dy   = u.ty - u.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0 || dist <= maxStep) {
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
  //  TICK-LOGIK
  // ---------------------------------------------------------------------------
  function ensureTask(u) {
    if (u.task) return;
    const job = popJob();
    if (!job) return;
    u.task = {
      ...job,
      phase   : "toSource",
      hasLoad : false,
      qty     : 0
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
        // Ziel = Quell-Gebäude
        u.tx = job.from.x;
        u.ty = job.from.y;
        const arrived = stepTowards(u, dtSec);
        if (arrived) {
          const taken = takeFromBuilding(job.from.x, job.from.y, job.res);
          if (taken && taken.qty > 0) {
            job.hasLoad = true;
            job.qty     = taken.qty;
            // WICHTIG: hier setzen wir die „Ladung“ für das Unit-Overlay
            u.carrying  = { res: job.res, qty: taken.qty };
          } else {
            job.hasLoad = false;
            job.qty     = 0;
            u.carrying  = null;
          }

          job.phase = "toHQ";

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
          if (job.hasLoad && job.qty > 0) {
            deliverToHQ(job.res, job.qty);
          }
          // Job abgeschlossen
          u.task     = null;
          u.carrying = null;
        }
      }
    }
  }

  function publicTick(dt) {
    try {
      tickUnits(dt);
    } catch (e) {
      WARN("Tick-Fehler:", e?.message || e);
    }
  }

  // ---------------------------------------------------------------------------
  //  EVENTS
  // ---------------------------------------------------------------------------

  // HQ-Position und erste Carrier
  addEventListener("cb:build:placed", (ev) => {
    const d = ev.detail || {};
    if (d.id !== "b.hq") return;

    U.hqPos = { x: d.x, y: d.y };
    LOG("HQ gesetzt → Carrier werden gespawnt", JSON.stringify(U.hqPos));

    spawnCarrier(U.hqPos.x + 0.2, U.hqPos.y + 0.2);
    spawnCarrier(U.hqPos.x - 0.2, U.hqPos.y + 0.2);
    spawnCarrier(U.hqPos.x,       U.hqPos.y - 0.2);
  });

  // Für andere Listener (z.B. alternative Build-Pipelines) lassen wir
  // die [units] Neuer Job-Logs in addJob().
  // -> Produktionsjobs kommen über game-v7.js → GameUnits.addJob(...)

  // Tick aus dem Game (carrier.runtime / game.tick.js)
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

    // Tick
    tick      : publicTick,
    tickUnits
  };

  LOG("Units-System geladen (v25.11.27-carrier+hud)");
})();
