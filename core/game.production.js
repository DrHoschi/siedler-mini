/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-res-core+jobs-v1
 *
 * Zweck   :
 *   Zentraler Produktions-Manager + einheitliche Ressourcen-Zählung
 *
 *   – Hält eine Liste von Produktions-Modulen (wood, stone, fish, …)
 *   – Verteilt Events (cb:build:complete, cb:workarea:set) an die Module
 *   – Ruft pro Tick alle Module auf
 *   – Stellt Production.addResource(...) als EINHEITLICHEN Weg zum Zählen bereit
 *   – Hört auf cb:prod:output und erzeugt optionale Träger-Jobs ("carry")
 *
 * WICHTIG:
 *   – KEINE Holz-/Stein-/Fisch-Logik hier drin.
 *     Das bleibt in game.production.wood.js / .stone.js / .fish.js.
 * ========================================================================== */
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // LOGGING / META
  // --------------------------------------------------------------------------
  const TAG  = '[prod-core]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error?? console.error)(TAG, ...a);

  /** Tick-Dauer (ms) – sollte zu core/game.tick.js::TICK_MS passen */
  const TICK_MS = 200;

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  /**
   * Registrierte Produktions-Module.
   * Jedes Modul:
   *   {
   *     id: 'wood',
   *     tick?: (dtMs:number) => void,
   *     onBuildComplete?: (detail:object) => void,
   *     onWorkAreaSet?: (detail:object) => void
   *   }
   */
  const MODULES = [];

  /**
   * Globaler Ressourcen-Speicher.
   * Wird auch vom HUD (RegistryValues.*) benutzt.
   */
  const RES_STORE = (window.RegistryValues = window.RegistryValues || {});

  // --------------------------------------------------------------------------
  // RESSOURCEN-API
  // --------------------------------------------------------------------------

  /**
   * Ressource ändern + HUD / andere Systeme informieren.
   *
   * @param {string} resId   – z.B. 'wood' | 'stone' | 'fish'
   * @param {number} delta   – Änderung (+1 / -1 / …)
   * @param {string} reason  – z.B. 'lumberjack-cycle', 'stone-cycle', …
   * @param {string} src     – Modulname, z.B. 'wood'
   */
  function addResource(resId, delta, reason, src) {
    if (!resId) return;
    if (!delta || !Number.isFinite(delta)) return;

    const key   = String(resId);
    const old   = Number(RES_STORE[key] || 0);
    const value = old + delta;
    RES_STORE[key] = value;

    LOG('Ressource geändert', { res: key, old, delta, value, reason, src });

    try {
      window.dispatchEvent(new CustomEvent('cb:res:change', {
        detail: {
          res   : key,
          old,
          value,
          delta,
          reason: reason || 'prod',
          src   : src    || TAG
        }
      }));
    } catch (e) {
      WARN('cb:res:change dispatch fehlgeschlagen', e);
    }
  }

  function getResourceValue(resId) {
    if (!resId) return 0;
    const key = String(resId);
    return Number(RES_STORE[key] || 0);
  }

  // --------------------------------------------------------------------------
  // MODUL-REGISTRIERUNG
  // --------------------------------------------------------------------------

  function registerModule(mod) {
    if (!mod || !mod.id) {
      WARN('registerModule ohne id', mod);
      return;
    }
    MODULES.push(mod);
    LOG('Produktionsmodul registriert:', mod.id);
  }

  // --------------------------------------------------------------------------
  // JOB-HELPER: Produktion → Träger-Jobs
  // --------------------------------------------------------------------------

  // HQ-Position aus GameUnits lesen (alte + neue Variante)
  function getHQPosTiles(Units) {
    if (!Units) return null;

    // alte Variante: Units.hqPos = { x, y }
    if (Units.hqPos &&
        Number.isFinite(Units.hqPos.x) &&
        Number.isFinite(Units.hqPos.y)) {
      return { x: Units.hqPos.x, y: Units.hqPos.y };
    }

    // neue Variante: Units.getHQPos() = { tx, ty }
    if (typeof Units.getHQPos === 'function') {
      try {
        const pos = Units.getHQPos();
        if (pos && Number.isFinite(pos.tx) && Number.isFinite(pos.ty)) {
          return { x: pos.tx, y: pos.ty };
        }
      } catch (_) {}
    }

    return null;
  }

  // Building-Instanz aus Game.buildings suchen
  function findBuildingInstance(hint) {
    const G = window.Game || {};
    let list = [];

    if (Array.isArray(G.buildings)) {
      list = G.buildings;
    } else if (typeof G.getBuildings === 'function') {
      try {
        list = G.getBuildings() || [];
      } catch (_) {
        list = [];
      }
    }

    if (!Array.isArray(list) || !list.length) return null;

    const uid  = hint?.bId || hint?.uid || hint?.buildingUid;
    const kind = hint?.kind || hint?.id;

    if (uid != null) {
      const b = list.find(b => b && (b.uid === uid || b.id === uid));
      if (b) return b;
    }
    if (kind) {
      const b = list.find(b => b && b.id === kind);
      if (b) return b;
    }
    return null;
  }

  /**
   * Erzeugt einen Trage-Job "carry" von Gebäude → HQ.
   * Wird aktuell nur für visuellen Transport (Trampelpfade, Carrier-Bewegung)
   * benutzt – die eigentliche Ressourcenzählung passiert weiter im Modul.
   *
   * @param {object} buildingOrHint – Buildingobjekt oder detail aus cb:prod:output
   * @param {string} resId          – 'wood' | 'stone' | 'fish' | ...
   * @param {number} qty            – Anzahl (aktuell 1 = 1 Job)
   */
  function enqueueCarryJobFromBuilding(buildingOrHint, resId, qty) {
    const JobEngine = window.JobEngine;
    if (!JobEngine ||
        (typeof JobEngine.add !== 'function' &&
         typeof JobEngine.push !== 'function')) {
      // Kein Job-System → still schweigen
      return null;
    }

    const Units = window.GameUnits || window.Units;
    const hq    = getHQPosTiles(Units);
    if (!hq) {
      WARN('enqueueCarryJobFromBuilding ohne HQ-Position');
      return null;
    }

    let building = buildingOrHint;
    if (!building || !Number.isFinite(building.x) || !Number.isFinite(building.y)) {
      building = findBuildingInstance(buildingOrHint || {});
    }
    if (!building) {
      WARN('Building für Carry-Job nicht gefunden', buildingOrHint);
      return null;
    }

    const bw = Number.isFinite(building.w) ? building.w : 1;
    const bh = Number.isFinite(building.h) ? building.h : 1;
    const bx = Number.isFinite(building.x) ? building.x : 0;
    const by = Number.isFinite(building.y) ? building.y : 0;

    const center = {
      x: bx + bw / 2,
      y: by + bh / 2
    };

    const engine = JobEngine;
    const pushFn = typeof engine.add === 'function'
      ? engine.add.bind(engine)
      : engine.push.bind(engine);

    const jobs  = [];
    const count = Math.max(1, qty | 0);

    for (let i = 0; i < count; i++) {
      const job = {
        id   : 'job-carry-' + Date.now().toString(16) + '-' + Math.floor(Math.random() * 1e4),
        type : 'carry',                   // wird in game.units.js NICHT als Baujob behandelt
        res  : String(resId || 'wood'),
        from : { x: center.x, y: center.y }, // Quelle = Gebäude-Mitte
        to   : { x: hq.x,     y: hq.y }      // Ziel   = HQ
      };

      try {
        pushFn(job);
        jobs.push(job);
      } catch (e) {
        WARN('JobEngine.add/push Fehler', e);
      }
    }

    if (jobs.length) {
      LOG('Carry-Jobs erzeugt', {
        res: resId,
        qty: jobs.length,
        buildingUid: building.uid || building.id
      });
    }
    return jobs;
  }

  // --------------------------------------------------------------------------
  // EVENT-VERTEILER
  // --------------------------------------------------------------------------

  // Gebäude fertig → an alle Module weiterreichen
  function handleBuildComplete(ev) {
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES) {
      if (typeof mod.onBuildComplete === 'function') {
        try {
          mod.onBuildComplete(d);
        } catch (e) {
          ERR('Fehler in Modul.onBuildComplete', mod.id, e);
        }
      }
    }
  }

  // Arbeitsbereich gesetzt/verschoben → an alle Module
  function handleWorkAreaSet(ev) {
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES) {
      if (typeof mod.onWorkAreaSet === 'function') {
        try {
          mod.onWorkAreaSet(d);
        } catch (e) {
          ERR('Fehler in Modul.onWorkAreaSet', mod.id, e);
        }
      }
    }
  }

  /**
   * Produktions-Output:
   *   – von Modulen als cb:prod:output gesendet:
   *       detail: { bId, uid?, buildingUid?, kind, item, qty }
   *   – hier: optional Carrier-Jobs erzeugen (Gebäude → HQ)
   *   – Ressourcenzählung bleibt im Modul (Holz/Stein/Fisch)
   */
  function handleProdOutput(ev) {
    const d = ev?.detail || {};
    if (!d) return;

    const item = d.item || d.resource || d.resId;
    const qty  = d.qty  || d.amount  || 1;
    if (!item) return;

    enqueueCarryJobFromBuilding(d, item, qty);
  }

  // --------------------------------------------------------------------------
  // ZENTRALER TICK
  // --------------------------------------------------------------------------

  function tick() {
    for (const mod of MODULES) {
      if (typeof mod.tick === 'function') {
        try {
          mod.tick(TICK_MS);
        } catch (e) {
          ERR('Fehler in Modul.tick', mod.id, e);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // EVENT-BINDINGS EINRICHTEN
  // --------------------------------------------------------------------------
  window.addEventListener('cb:build:complete', handleBuildComplete, { passive: true });
  window.addEventListener('cb:workarea:set',   handleWorkAreaSet,   { passive: true });
  window.addEventListener('cb:prod:output',    handleProdOutput,    { passive: true });

  // --------------------------------------------------------------------------
  // EXPORT
  // --------------------------------------------------------------------------
  const Prod = (window.Production = window.Production || {});

  Prod.registerModule              = registerModule;
  Prod.addResource                 = addResource;
  Prod.getResourceValue            = getResourceValue;
  Prod.tick                        = tick;
  Prod.enqueueCarryJobFromBuilding = enqueueCarryJobFromBuilding;

  // Debug für Inspector
  Prod._state = {
    MODULES,
    RES_STORE
  };

  LOG('Manager geladen v25.12.11-res-core+jobs-v1');
})();
