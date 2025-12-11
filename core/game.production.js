/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-prod-core+jobs-v2
 *
 * Zweck   :
 *   Zentraler Produktions-Kern für Epoche 1:
 *     - verwaltet Produktions-Module (Holz / Stein / Fisch / ...)
 *     - zählt Ressourcen (HUD via cb:res:change)
 *     - verteilt Events cb:build:complete / cb:workarea:set an Module
 *     - hört auf cb:prod:output der Module und:
 *         → addResource(res, qty, reason, src)
 *         → erzeugt optional einen "carry"-Job für Carrier/Träger
 *
 * Ereignisse:
 *   IN :
 *     - cb:build:complete { id, x,y,w,h, ... }
 *     - cb:workarea:set   { id|kind, uid, cx,cy,radiusTiles, x,y,w,h }
 *     - cb:prod:output    { bId, kind, item, qty, x?,y?,w?,h? }
 *     - cb:game:tick      { dtMs }   (optional, falls genutzt)
 *
 *   OUT:
 *     - cb:res:change { res, old, value, delta, reason, src }
 *
 * API (window.Production):
 *   - registerModule(mod)
 *   - addResource(resId, delta, reason, src)
 *   - getResourceValue(resId)
 *   - getStore()
 *   - tick(dtMs?)
 *   - enqueueCarryJobFromBuilding(building, resId, qty?)
 * ============================================================================ */

(function(){
  'use strict';

  // ==========================================================================
  // LOGGING / META
  // ==========================================================================

  const TAG  = '[game.production]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  /** Tick-Dauer (ms) – sollte grob zu core/game.tick.js passen */
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

  // Für optionale Zuordnung bId → Gebäude-Info (für Jobs)
  const BUILDINGS_BY_UID = new Map();

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

    const key = String(resId);  // bewusst KEIN 'res.*' Prefix
    const old = Number(RES_STORE[key] || 0);
    const value = old + delta;

    RES_STORE[key] = value;

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

  /**
   * Gesamten Store zurückgeben (z.B. für Debug / Inspector).
   */
  function getStore(){
    return RES_STORE;
  }

  // ==========================================================================
  // HILFSFUNKTION – CARRY-JOB
  // ==========================================================================

  /**
   * Erzeugt einen "carry"-Job: Ware von einem Gebäude zum HQ bringen.
   * Holz/Stein/Fisch-Module müssen dann NICHT wissen,
   * wie genau JobEngine/CarrierRuntime ticken.
   *
   * @param {object} building – { id, kind, x,y,w,h }
   * @param {string} resId    – 'wood' | 'stone' | 'fish'
   * @param {number} qty      – Anzahl (aktuell eher kosmetisch)
   */
  function enqueueCarryJobFromBuilding(building, resId, qty = 1){
    if (!window.JobEngine) return;
    if (!building) return;

    const eng = window.JobEngine;
    const res = String(resId || 'wood');

    // "from" = Gebäudecenter in Tile-Koordinaten
    const bx = Number(building.x ?? 0);
    const by = Number(building.y ?? 0);
    const bw = Number(building.w ?? 1);
    const bh = Number(building.h ?? 1);

    const from = {
      x : bx + bw / 2,
      y : by + bh / 2
    };

    // "to" wird aktuell von CarrierRuntime / HQ ermittelt → null = später setzen
    const to = null;

    const job = {
      id   : 'job-carry-' + Date.now().toString(16),
      type : 'carry',     // wird in carrier.runtime.js bereits verstanden
      res  : res,
      qty  : qty,
      from,
      to
    };

    if (typeof eng.push === 'function'){
      eng.push(job);
    } else if (typeof eng.add === 'function'){
      eng.add(job);
    }

    LOG('carry-job erzeugt', job);
    return job;
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
  function registerModule(mod){
    if (!mod || !mod.id) {
      WARN('registerModule ohne id aufgerufen', mod);
      return;
    }
    MODULES.push(mod);
    LOG('Modul registriert:', mod.id);
  }

  // ==========================================================================
  // EVENT-VERTEILER – BUILD / WORKAREA
  // ==========================================================================

  /**
   * Event-Verteiler für cb:build:complete.
   *   – Wird aufgerufen, wenn ein Gebäude fertig gebaut ist.
   *   – Alle Module, die onBuildComplete haben, bekommen das detail.
   *   – Zusätzlich merken wir uns die Gebäude-Geometrie unter einer uid.
   */
  function handleBuildComplete(ev){
    const d = ev?.detail || {};
    if (!d) return;

    const kind = d.id || d.kind || d.buildingId;
    const uid  = d.uid || `${kind || 'b'}@${d.x},${d.y}`;

    // Gebäude-Info für spätere carry-Jobs merken
    BUILDINGS_BY_UID.set(uid, {
      uid,
      id   : kind,
      kind : kind,
      x    : d.x,
      y    : d.y,
      w    : d.w,
      h    : d.h
    });

    for (const mod of MODULES){
      if (typeof mod.onBuildComplete === 'function'){
        try {
          mod.onBuildComplete(d);
        } catch(e){
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

  // ==========================================================================
  // EVENT-VERTEILER – PROD-OUTPUT → RES + JOB
  // ==========================================================================

  /**
   * Reagiert auf cb:prod:output der Module.
   * detail:
   *   {
   *     bId,          // uid des Gebäudes (wie im Holz-Modul erzeugt)
   *     kind,         // 'b.lumberjack' | 'b.quarry' | ...
   *     item,         // 'wood' | 'stone' | 'fish'
   *     qty,          // Menge (z.B. 1)
   *     x?,y?,w?,h?   // optional Geometrie direkt mitgegeben
   *   }
   *
   * Schritte:
   *   1) Ressource zählen → addResource(...)
   *   2) passenden Building-Stub bestimmen
   *   3) carry-Job erzeugen → Carrier/Träger laufen los
   */
  function handleProdOutput(ev){
    const d = ev?.detail || {};
    if (!d) return;

    const item = d.item || d.res || d.resource;
    const qty  = Number(d.qty || 1) || 1;
    const kind = d.kind || d.buildingKind || d.id;

    if (!item){
      WARN('cb:prod:output ohne item erhalten', d);
      return;
    }

    // 1) Ressource zählen
    addResource(item, qty, `${item}-cycle`, kind || TAG);

    // 2) Gebäude bestimmen → zuerst über bId/uid
    let building = null;

    if (d.bId && BUILDINGS_BY_UID.has(d.bId)){
      building = BUILDINGS_BY_UID.get(d.bId);
    } else if (d.uid && BUILDINGS_BY_UID.has(d.uid)){
      building = BUILDINGS_BY_UID.get(d.uid);
    } else if (
      typeof d.x === 'number' &&
      typeof d.y === 'number'
    ){
      // Fallback: Geometrie direkt aus dem Event nehmen
      building = {
        uid  : d.bId || d.uid || `${kind || 'b'}@${d.x},${d.y}`,
        id   : kind,
        kind : kind,
        x    : d.x,
        y    : d.y,
        w    : d.w || 1,
        h    : d.h || 1
      };
    }

    if (!building){
      // Keine Geometrie → Ressource wird trotzdem gezählt, aber kein Job
      LOG('cb:prod:output ohne bekannte Building-Geometrie (kein Job)', d);
      return;
    }

    // 3) Carry-Job erzeugen
    enqueueCarryJobFromBuilding(building, item, qty);
  }

  // ==========================================================================
  // ZENTRALER TICK
  // ==========================================================================

  /**
   * Zentraler Tick – wird von core/game.tick.js aufgerufen ODER
   * optional über cb:game:tick getriggert.
   *
   * @param {number} dtMs – Delta-Zeit in ms (optional; fallback TICK_MS)
   */
  function tick(dtMs){
    const step = Number.isFinite(dtMs) ? dtMs : TICK_MS;

    for (const mod of MODULES){
      if (typeof mod.tick === 'function'){
        try {
          mod.tick(step);
        } catch (e){
          ERR('Fehler in Modul.tick:', mod.id, e);
        }
      }
    }
  }

  // ==========================================================================
  // EVENT-BINDINGS
  // ==========================================================================

  // Gebäude fertig → Module + Building-Cache
  window.addEventListener('cb:build:complete', handleBuildComplete);

  // Arbeitsbereich gesetzt → Module
  window.addEventListener('cb:workarea:set', handleWorkAreaSet);

  // Produktions-Output → Ressource zählen + Carry-Jobs
  window.addEventListener('cb:prod:output', handleProdOutput);

  // Optional: wenn irgendwo cb:game:tick gefeuert wird → Ticks verteilen
  window.addEventListener('cb:game:tick', (ev)=>{
    const dtMs = ev?.detail?.dtMs;
    tick(dtMs);
  });

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  const ProductionAPI = {
    registerModule,
    addResource,
    getResourceValue,
    getStore,
    tick,
    enqueueCarryJobFromBuilding
  };

  window.Production = ProductionAPI;

  LOG('bereit (v25.12.11-prod-core+jobs-v2)');
})();
