/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler
 * Version : v25.11.27-final-carrier+build+hud
 * Zweck   : Einfaches, funktionierendes Träger-System
 *           - verwaltet Träger (Units)
 *           - verwaltet Jobs (Bau- / Transportaufträge)
 *           - bewegt Träger sichtbar auf der Map
 *           - liefert Ressourcen ins Lager (Warehouse/HUD)
 *
 * Job-Typen:
 *   type: "carry"
 *     - Produktionsjobs: Gebäude → HQ
 *     - Ressource wird aus Gebäude-Lager genommen (später echt)
 *     - bei Ankunft im HQ: req:stock:push (Warehouse → HUD)
 *
 *   type: "build"
 *     - Baujobs: HQ → Baustelle (nur optisch)
 *     - Ressource wird aktuell NICHT vom HQ-Bestand abgezogen
 *       (das machen wir später, wenn Baukosten-Logik aktiv ist)
 *     - bei Ankunft am Gebäude nur Log + ggf. später Baufortschritt
 *
 * Integration:
 *   - game-v7.js
 *       • erzeugt bei Produktion Jobs type:"carry"
 *       • erzeugt bei Platzieren eines Gebäudes einen Job type:"build"
 *   - carrier.runtime / game.tick.js
 *       • feuert cb:game:tick → Units laufen im Takt
 *   - unit.overlay.js
 *       • zeichnet Träger + Icon anhand u.carrying.res
 *   - warehouse.js
 *       • wandelt req:stock:push in cb:res:change fürs HUD
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
      type       : job.type       || "carry",       // "carry" | "build"
      res        : job.res        || "wood",
      from       : job.from       || (U.hqPos || { x: 0, y: 0 }),
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
      phase   : "toSource",  // "toSource" → "toHQOrTarget"
      hasLoad : false,
      qty     : 0
    };
    u.tx = job.from.x;
    u.ty = job.from.y;
    return true;
  }

  // ---------------------------------------------------------------------------
  //  QUELLEN / LAGER
  // ---------------------------------------------------------------------------

  // Quelle für Produktionsjobs (Gebäude)
  function takeFromBuilding(tx, ty, resId) {
    // Aktuell Dummy:
    // - Das eigentliche Gebäude-Lager wird noch im Game-Modul gepflegt
    // - Hier nur "1 Einheit vorhanden" simulieren
    return { qty: 1, res: resId };
  }

  // Dummy-Quelle für Baujobs (HQ → Baustelle)
  // Später: hier wirklich aus Warehouse/HQ ziehen
  function takeForBuildFromHQ(resId) {
    // Noch ohne echten Bestand → später: req:stock:pull + Rückkanal
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

  // Lieferung für Baujobs: HQ → Gebäude (optisch)
  function deliverToBuilding(tx, ty, resId, qty) {
    // Aktuell nur Log – später kann man hier
    // - Baufortschritt erhöhen
    // - Baukosten herunterzählen etc.
    LOG("Baumaterial geliefert", JSON.stringify({
      res: resId,
      qty,
      x: tx,
      y: ty
    }));
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
        // Ziel = Quelle
        u.tx = job.from.x;
        u.ty = job.from.y;
        const arrived = stepTowards(u, dtSec);
        if (arrived) {
          let taken = null;

          if (job.type === "build") {
            // Baujob: Holz "aus HQ" holen (aktuell noch Dummy)
            taken = takeForBuildFromHQ(job.res);
          } else {
            // Produktionsjob: Ware aus Gebäude-Lager holen
            taken = takeFromBuilding(job.from.x, job.from.y, job.res);
          }

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

          job.phase = "toHQOrTarget";

          const target = U.hqPos || job.to || { x: u.x, y: u.y };
          u.tx = target.x;
          u.ty = target.y;
        }
      } else if (job.phase === "toHQOrTarget") {
        const dest = U.hqPos || job.to || { x: u.tx, y: u.ty };
        u.tx = dest.x;
        u.ty = dest.y;
        const arrived = stepTowards(u, dtSec);
        if (arrived) {
          if (job.hasLoad && job.qty > 0) {
            if (job.type === "build") {
              // Holz zur Baustelle liefern (rein optisch)
              deliverToBuilding(dest.x, dest.y, job.res, job.qty);
            } else {
              // Produktions-Transport → ins HQ-Lager
              deliverToHQ(job.res, job.qty);
            }
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

  LOG("Units-System geladen (v25.11.27-final-carrier+build+hud)");
})();
