/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-res-core+jobs-v1
 *
 * Zweck   :
 *   Zentraler Produktions-Manager + einheitliche Ressourcen-Zählung
 *
 *   – Hält eine Liste von Produktions-Modulen (wood, stone, fish, …)
 *   – Verteilt Events (cb:build:complete, cb:workarea:set, cb:prod:output)
 *   – Bietet Production.addResource(...) als EINHEITLICHEN Weg zum Zählen
 *   – Schickt cb:res:change → HUD aktualisiert sich
 *   – OPTIONAL: erzeugt Träger-Jobs für Produktions-Output (type: 'carry')
 *
 * Integration:
 *   – game.tick.js ruft (falls vorhanden) Production.tick() auf
 *   – Produktions-Module registrieren sich via Production.registerModule({ ... })
 *   – Holz-/Stein-/Fisch-Modul rufen Production.addResource('wood'|'stone'|'fish', ...)
 *   – Produktions-Module können zusätzlich cb:prod:output dispatchen:
 *       detail: { bId, uid?, kind, item:'wood'|'stone'|'fish', qty }
 *
 *   Diese Datei erzeugt dann optionale Träger-Jobs (JobEngine + GameUnits),
 *   ohne dass die Module JobEngine kennen müssen.
 *
 * Struktur:
 *   IMPORTS → Konstanten → Hilfsfunktionen → Event-Verteiler → Tick →
 *   Bindings → Export (window.Production)
 * ============================================================================ */
(function(){
  'use strict';

  // ==========================================================================
  // KONSTANTEN & LOGGING
  // ==========================================================================
  const TAG   = '[prod-core]';
  const LOG   = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN  = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR   = (...a) => (window.CBLog?.error?? console.error)(TAG, ...a);

  /** Tick-Dauer (ms) – sollte zu core/game.tick.js::TICK_MS passen */
  const TICK_MS = 200;

  // ==========================================================================
  // LAUFZEIT-STATE
  // ==========================================================================

  /**
   * Liste aller Produktions-Module.
   * Jedes Modul:
   *   {
   *     id: 'wood',
   *     tick?: (dtMs) => void,
   *     onBuildComplete?: (detail) => void,
   *     onWorkAreaSet?: (detail) => void
   *   }
   */
  const MODULES = [];

  /**
   * Globaler Ressourcen-Speicher.
   *   – Wird außerdem vom HUD gelesen (RegistryValues.*)
   *   – addResource() ist der einzige Weg, diesen Store zu ändern.
   */
  const RES_STORE = (window.RegistryValues = window.RegistryValues || {});

  // ==========================================================================
  // HILFSFUNKTIONEN – RESSOURCEN
  // ==========================================================================

  /**
   * Ressource ändern + HUD / andere Systeme informieren.
   *
   * @param {string} resId   – z.B. 'wood' | 'stone' | 'fish'
   * @param {number} delta   – z.B. +1 / -1
   * @param {string} reason  – Kurztext für Logs ('lumberjack-cycle', 'stone-cycle', ...)
   * @param {string} src     – Quelle/Modul ('wood', 'stone', 'fish', 'unit', ...)
   */
  function addResource(resId, delta, reason, src) {
    if (!resId) return;
    if (!delta || !Number.isFinite(delta)) return;

    const key   = String(resId);               // bewusst KEIN 'res.*' Prefix
    const old   = Number(RES_STORE[key] || 0);
    const value = old + delta;

    RES_STORE[key] = value;

    // Debug-Log optional
    LOG('Ressource geändert:', { res: key, old, delta, value, reason, src });

    // HUD / andere Systeme informieren
    try {
      window.dispatchEvent(new CustomEvent('cb:res:change', {
        detail: {
          res   : key,                  // 'wood' | 'stone' | 'fish' ...
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

  /**
   * Aktuellen Wert einer Ressource abfragen.
   * @param {string} resId
   * @returns {number}
   */
  function getResourceValue(resId) {
    if (!resId) return 0;
    return Number(RES_STORE[String(resId)] || 0);
  }

  // ==========================================================================
  // MODUL-REGISTRIERUNG
  // ==========================================================================

  /**
   * Produktions-Modul registrieren (z.B. wood, fish, stone, …)
   *
   * @param {object} mod
   *   - id: string (Pflicht)
   *   - tick?: (dtMs:number) => void
   *   - onBuildComplete?: (detail:object) => void
   *   - onWorkAreaSet?: (detail:object) => void
   */
  function registerModule(mod) {
    if (!mod || !mod.id) {
      WARN('registerModule ohne id aufgerufen', mod);
      return;
    }
    MODULES.push(mod);
    LOG('Modul registriert:', mod.id);
  }

  // ==========================================================================
  // JOB-HELPER (OPTIONAL) – Träger-Jobs für Produktions-Output
  // ==========================================================================

  function getHQPosTiles(Units){
    if (!Units) return null;

    // Alte Variante: Units.hqPos = { x, y }
    if (Units.hqPos &&
        Number.isFinite(Units.hqPos.x) &&
        Number.isFinite(Units.hqPos.y)){
      return { x: Units.hqPos.x, y: Units.hqPos.y };
    }

    // Neue Variante: Units.getHQPos() = { tx, ty }
    if (typeof Units.getHQPos === 'function'){
      try {
        const pos = Units.getHQPos();
        if (pos && Number.isFinite(pos.tx) && Number.isFinite(pos.ty)){
          return { x: pos.tx, y: pos.ty };
        }
      } catch(_){}
    }

    return null;
  }

  function findBuildingInstance(hint){
    const G = window.Game || {};
    let list = [];

    if (Array.isArray(G.buildings)){
      list = G.buildings;
    } else if (typeof G.getBuildings === 'function'){
      try {
        list = G.getBuildings() || [];
      } catch(_){
        list = [];
      }
    }

    if (!Array.isArray(list) || !list.length) return null;

    const uid  = hint?.bId || hint?.uid || hint?.buildingUid;
    const kind = hint?.kind || hint?.id;

    if (uid != null){
      const b = list.find(b => b && (b.uid === uid || b.id === uid));
      if (b) return b;
    }
    if (kind){
      const b = list.find(b => b && b.id === kind);
      if (b) return b;
    }
    return null;
  }

  /**
   * Erzeugt einen Träger-Job "carry" von Gebäude → HQ.
   * Wird aktuell NUR für visuelle Zwecke genutzt (Träger laufen),
   * Ressourcenzählung passiert weiterhin direkt in den Modulen.
   *
   * @param {object} buildingOrHint – Building-Objekt oder detail aus cb:prod:output
   * @param {string} resId          – 'wood' | 'stone' | 'fish' | ...
   * @param {number} qty            – wie viele Einheiten; aktuell 1 Job pro Aufruf
   */
  function enqueueCarryJobFromBuilding(buildingOrHint, resId, qty){
    const JobEngine = window.JobEngine;
    if (!JobEngine || (typeof JobEngine.add !== 'function' && typeof JobEngine.push !== 'function')){
      // Kein Job-System verfügbar → still schweigen
      return null;
    }

    const Units = window.GameUnits || window.Units;
    const hq    = getHQPosTiles(Units);
    if (!hq){
      WARN('enqueueCarryJobFromBuilding ohne HQ-Position – kein Job erzeugt');
      return null;
    }

    let building = buildingOrHint;
    if (!building || !Number.isFinite(building.x) || !Number.isFinite(building.y)){
      building = findBuildingInstance(buildingOrHint || {});
    }
    if (!building){
      WARN('enqueueCarryJobFromBuilding: Building nicht gefunden', buildingOrHint);
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

    for (let i = 0; i < count; i++){
      const job = {
        id   : 'job-carry-' + Date.now().toString(16) + '-' + Math.floor(Math.random() * 1e4),
        type : 'carry',          // GameUnits behandelt ihn wie Deliver-Job, aber
                                 // sendet KEIN cb:build:deliver (siehe game.units.js)
        res  : String(resId || 'wood'),
        from : { x: center.x, y: center.y },  // Quelle = Gebäude-Mitte
        to   : { x: hq.x,     y: hq.y }       // Ziel   = HQ
      };

      try {
        pushFn(job);
        jobs.push(job);
      } catch(e){
        WARN('enqueueCarryJobFromBuilding: JobEngine.add/push Fehler', e);
      }
    }

    if (jobs.length){
      LOG('Carry-Jobs erzeugt', { res: resId, qty: jobs.length, buildingUid: building.uid || building.id });
    }
    return jobs;
  }

  // ==========================================================================
  // EVENT-VERTEILER
  // ==========================================================================

  /**
   * Event-Verteiler für cb:build:complete.
   *   – Wird aufgerufen, wenn ein Gebäude fertig gebaut ist.
   *   – Alle Module, die onBuildComplete haben, bekommen das detail.
   */
  function handleBuildComplete(ev) {
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES) {
      if (typeof mod.onBuildComplete === 'function') {
        try {
          mod.onBuildComplete(d);
        } catch (e) {
          ERR('Fehler in Modul.onBuildComplete:', mod.id, e);
        }
      }
    }
  }

  /**
   * Event-Verteiler für cb:workarea:set.
   *   – Wird aufgerufen, wenn der Arbeitsbereich eines Gebäudes gesetzt/verschoben wird.
   *
   * detail:
   *   { id, uid, cx, cy, radiusTiles, x, y, w, h }
   */
  function handleWorkAreaSet(ev){
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES){
      if (typeof mod.onWorkAreaSet === 'function'){
        try {
          mod.onWorkAreaSet(d);
        } catch(e){
          ERR('Fehler in Modul.onWorkAreaSet:', mod.id, e);
        }
      }
    }
  }

  /**
   * Event-Verteiler für cb:prod:output.
   *   – optionale Verbindung Produktion → Träger:
   *       Module können dieses Event feuern, um
   *       visuelle "Carry"-Jobs von Gebäude → HQ auszulösen.
   *
   *   detail:
   *     { bId, uid?, buildingUid?, kind, item, qty }
   */
  function handleProdOutput(ev){
    const d = ev?.detail || {};
    if (!d) return;

    const item = d.item || d.resource || d.resId;
    const qty  = d.qty  || d.amount  || 1;

    if (!item) return;

    // WICHTIG:
    //  – Ressourcenzählung passiert aktuell in den Modulen (Holz/Stein/Fisch).
    //  – Hier erzeugen wir NUR optionale Träger-Jobs (visuell).
    enqueueCarryJobFromBuilding(d, item, qty);
  }

  // ==========================================================================
  // ZENTRALER TICK (wird von core/game.tick.js aufgerufen)
  // ==========================================================================

  /**
   * Zentraler Tick – wird von core/game.tick.js alle TICK_MS aufgerufen.
   *   – Reicht dtMs an alle Module durch (damit Zyklen funktionieren).
   */
  function tick() {
    for (const mod of MODULES) {
      if (typeof mod.tick === 'function') {
        try {
          mod.tick(TICK_MS);
        } catch (e) {
          ERR('Fehler in Modul.tick:', mod.id, e);
        }
      }
    }
  }

  // ==========================================================================
  // EVENT-BINDINGS (einmalig)
  // ==========================================================================

  // Gebäude fertiggestellt → an Produktions-Module verteilen
  window.addEventListener('cb:build:complete', handleBuildComplete, { passive: true });

  // Arbeitsbereich geändert → an Produktions-Module verteilen
  window.addEventListener('cb:workarea:set', handleWorkAreaSet, { passive: true });

  // Produktions-Output → optionale Träger-Jobs
  window.addEventListener('cb:prod:output', handleProdOutput, { passive: true });

  // ==========================================================================
  // EXPORT / GLOBAL-API
  // ==========================================================================

  const Prod = (window.Production = window.Production || {});

  Prod.registerModule               = registerModule;
  Prod.addResource                  = addResource;
  Prod.getResourceValue             = getResourceValue;
  Prod.tick                         = tick;
  Prod.enqueueCarryJobFromBuilding  = enqueueCarryJobFromBuilding;

  // Debug-/Inspector-Einblick
  Prod._state = {
    MODULES,
    RES_STORE
  };

  LOG('Manager geladen v25.12.11-res-core+jobs-v1');
})();
