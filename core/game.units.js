/* ============================================================================
 * Datei   : core/game.units.js
 * Version : v25.11.20
 * Zweck   : Träger-System Integration (Units + Jobs + Tick)
 * ============================================================================ */

(() => {
  const TAG = "[units]";
  const log = (...a)=>console.info(TAG, ...a);

  // ---------------------------------------------------------------------------
  //  STATE
  // ---------------------------------------------------------------------------
  const U = {
    units: [],        // laufende Träger
    jobs: [],         // Transport-, Bau-, Lieferjobs
    nextId: 1,
    hqPos: { x: 0, y: 0 }, // später automatisch setzen
  };

  // ---------------------------------------------------------------------------
  //  API: Units
  // ---------------------------------------------------------------------------
  function spawnCarrier(x, y) {
    const u = {
      id: U.nextId++,
      x, y,
      tx: x, ty: y,          // Target-Koordinaten
      speed: 2.5,            // Tiles / Sekunde (kann später abhängig vom Terrain)
      task: null,            // aktueller Job
      carrying: null,        // {res, qty}
      _path: null,           // Pfad aus dem Pfadfinder
      _pathIndex: 0
    };
    U.units.push(u);
    return u;
  }

  function getUnits() {
    return U.units;
  }

  // ---------------------------------------------------------------------------
  //  API: Job-System
  // ---------------------------------------------------------------------------
  function addJob(job) {
    U.jobs.push(job);
    log("Neuer Job", job);
  }

  function popJob() {
    return U.jobs.shift() || null;
  }

  // ---------------------------------------------------------------------------
  //  API: Materialtransport
  // ---------------------------------------------------------------------------

  // Gebäude gibt Material aus → später Produktionssystem anschließen
  function takeFromBuilding(tx, ty, res) {
    // Dummy: Gebäude liefert immer 1
    return { qty: 1 };
  }

  // Lieferung ins HQ → an warehouse.js koppeln
  function deliverToHQ(res, qty) {
    window.dispatchEvent(new CustomEvent("req:stock:push", {
      detail: { store: "HQ", item: res, qty }
    }));
  }

  // ---------------------------------------------------------------------------
  //  CARRIER TICK
  // ---------------------------------------------------------------------------
  function tickUnits(dt) {
    for (const u of U.units) {
      CarrierRuntime.tick(u, dt, {
        popJob,
        takeFromBuilding,
        deliverToHQ,
        isBlocked: () => false // später Terrain-Blocker
      });
    }
  }

  // ---------------------------------------------------------------------------
  //  EVENTS
  // ---------------------------------------------------------------------------
  // Gebäude platziert → Baujob erzeugen
  addEventListener("cb:build:placed", (ev) => {
    const d = ev.detail;

    addJob({
      type: "build",
      res: "res.wood",
      from: { x: d.x, y: d.y },
      to: U.hqPos,
      buildingId: d.id
    });
  });

  // HQ Position setzen (wenn HQ gebaut wurde)
  addEventListener("cb:build:placed", (ev) => {
    if (ev.detail.id === "b.hq") {
      U.hqPos = { x: ev.detail.x, y: ev.detail.y };
      // Standard-Spawn: 3 Carrier am HQ
      spawnCarrier(U.hqPos.x, U.hqPos.y);
      spawnCarrier(U.hqPos.x, U.hqPos.y);
      spawnCarrier(U.hqPos.x, U.hqPos.y);
      log("HQ gesetzt → Carrier gespawnt", U.hqPos);
    }
  });

// Frame-Tick vom Spiel → Units updaten
addEventListener("cb:game:tick", (ev) => {
  const dt = ev?.detail?.dt ?? 0;

  // TEMP zum Testen:
  // console.info("[units] tick", dt);

  try {
    tickUnits(dt);
  } catch (e) {
    console.error("[units] Tick-Fehler:", e);
  }
});
  
  // ---------------------------------------------------------------------------
  //  EXPORT
  // ---------------------------------------------------------------------------
  window.GameUnits = {
    spawnCarrier,
    addJob,
    popJob,
    tickUnits,
    getUnits
  };

})();
