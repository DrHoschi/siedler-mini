/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-prod-core+jobs-v3-dropTile+HQto
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
 * NEU in v3:
 *   ✅ carry-job "from" = DropTile vor der Türkachel (statt Gebäudecenter)
 *   ✅ carry-job "to"   = HQ-Tile, falls GameUnits.getHQPos() verfügbar
 *   ✅ BUILDINGS_BY_UID speichert entrance/entrances wenn vorhanden (cb:build:complete)
 *
 * Hinweis:
 *   - Die Module (wood/stone/fish) feuern NUR cb:prod:output.
 *   - Zählen + Jobs passieren NUR hier (zentral).
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

  const MODULES = [];

  /**
   * Globaler Ressourcen-Speicher.
   * addResource() ist der einzige Weg, diesen Store zu ändern.
   */
  const RES_STORE = (window.RegistryValues = window.RegistryValues || {});

  /**
   * Cache: uid → Gebäude-Stub
   * Wir speichern hier bewusst mehr als früher:
   *   - entrance / entrances (für DropTile)
   *   - optional: dropTx/dropTy (wenn du es später irgendwo direkt setzt)
   */
  const BUILDINGS_BY_UID = new Map();

  // ==========================================================================
  // HILFSFUNKTIONEN – RESSOURCEN
  // ==========================================================================

  function addResource(resId, delta, reason, src) {
    if (!resId) return;
    if (!delta || !Number.isFinite(delta)) return;

    const key = String(resId);  // bewusst KEIN 'res.*' Prefix
    const old = Number(RES_STORE[key] || 0);
    const value = old + delta;

    RES_STORE[key] = value;

    LOG('Ressource geändert:', { res: key, old, delta, value, reason, src });

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
    return Number(RES_STORE[String(resId)] || 0);
  }

  function getStore(){
    return RES_STORE;
  }

  // ==========================================================================
  // HILFSFUNKTIONEN – TILES (DOOR / DROP / HQ)
  // ==========================================================================

  /**
   * Tür-/Eingangstile bestimmen:
   * Unterstützte Formen:
   *  A) building.entrance = { tx, ty } (RELATIV zum Gebäude!)
   *  B) building.entrances[0] = { dx, dy } (RELATIV zum Gebäude!)
   *  Fallback: Mitte unten
   */
  function computeDoorTile(building){
    const bx = Number(building?.x ?? 0);
    const by = Number(building?.y ?? 0);
    const bw = Number(building?.w ?? 1);
    const bh = Number(building?.h ?? 1);

    // A) entrance {tx,ty} relativ
    const e = building?.entrance;
    if (e && Number.isFinite(e.tx) && Number.isFinite(e.ty)){
      return { x: bx + e.tx, y: by + e.ty };
    }

    // B) entrances[0] {dx,dy} relativ
    const es = building?.entrances;
    if (Array.isArray(es) && es[0] && Number.isFinite(es[0].dx) && Number.isFinite(es[0].dy)){
      return { x: bx + es[0].dx, y: by + es[0].dy };
    }

    // Fallback: Mitte unten (eine Kachel unter Gebäude)
    return { x: bx + bw / 2, y: by + bh };
  }

  /**
   * DropTile = 1 Tile "vor" der Tür.
   * Im Moment nehmen wir simpel y+1 (unten), weil das zu deinem Layout passt.
   * Wenn du später Gebäuderotation einführst, drehen wir diese Logik sauber mit.
   */
  function computeDropTile(building){
    // Wenn explizit gesetzt, nutzen wir es direkt
    if (Number.isFinite(building?.dropTx) && Number.isFinite(building?.dropTy)){
      return { x: building.dropTx, y: building.dropTy };
    }

    const door = computeDoorTile(building);
    return { x: door.x, y: door.y + 1 };
  }

  /**
   * HQ-Position (Tile) – kommt aus GameUnits.
   * Erwartet: GameUnits.getHQPos() → { tx, ty }
   */
  function getHQTile(){
    try{
      const U = window.GameUnits;
      if (!U || typeof U.getHQPos !== 'function') return null;
      const p = U.getHQPos();
      if (p && Number.isFinite(p.tx) && Number.isFinite(p.ty)){
        return { x: p.tx, y: p.ty };
      }
    }catch(e){
      // still ok
    }
    return null;
  }

  // ==========================================================================
  // HILFSFUNKTION – CARRY-JOB
  // ==========================================================================

  /**
   * Erzeugt einen "carry"-Job:
   *   from = DropTile (vor der Tür)
   *   to   = HQ tile (falls verfügbar), sonst null (CarrierRuntime kann ggf. fallbacken)
   */
  function enqueueCarryJobFromBuilding(building, resId, qty = 1){
    if (!window.JobEngine) return;
    if (!building) return;

    const eng = window.JobEngine;
    const res = String(resId || 'wood');

    const from = computeDropTile(building);

    // Ziel: HQ-Tile (wenn bekannt)
    const hq = getHQTile();
    const to = hq ? { x: hq.x, y: hq.y } : null;

    const job = {
      id   : 'job-carry-' + Date.now().toString(16),
      type : 'carry',
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

  function handleBuildComplete(ev){
    const d = ev?.detail || {};
    if (!d) return;

    const kind = d.id || d.kind || d.buildingId;
    const uid  = d.uid || `${kind || 'b'}@${d.x},${d.y}`;

    // Gebäude-Info für spätere carry-Jobs merken (inkl. entrance/entrances)
    BUILDINGS_BY_UID.set(uid, {
      uid,
      id       : kind,
      kind     : kind,
      x        : d.x,
      y        : d.y,
      w        : d.w,
      h        : d.h,
      entrance : d.entrance || null,
      entrances: d.entrances || null,
      dropTx   : d.dropTx ?? null,
      dropTy   : d.dropTy ?? null
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

    // 1) Ressource zählen (NUR zentral!)
    addResource(item, qty, `${item}-cycle`, kind || TAG);

    // 2) Gebäude bestimmen
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
        uid      : d.bId || d.uid || `${kind || 'b'}@${d.x},${d.y}`,
        id       : kind,
        kind     : kind,
        x        : d.x,
        y        : d.y,
        w        : d.w || 1,
        h        : d.h || 1,
        entrance : d.entrance || null,
        entrances: d.entrances || null,
        dropTx   : d.dropTx ?? null,
        dropTy   : d.dropTy ?? null
      };
    }

    if (!building){
      LOG('cb:prod:output ohne bekannte Building-Geometrie (kein Job)', d);
      return;
    }

    // 3) Carry-Job erzeugen (from=DropTile, to=HQ)
    enqueueCarryJobFromBuilding(building, item, qty);
  }

  // ==========================================================================
  // ZENTRALER TICK
  // ==========================================================================

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

  window.addEventListener('cb:build:complete', handleBuildComplete);
  window.addEventListener('cb:workarea:set', handleWorkAreaSet);
  window.addEventListener('cb:prod:output', handleProdOutput);

  window.addEventListener('cb:game:tick', (ev)=>{
    const dtMs = ev?.detail?.dtMs;
    tick(dtMs);
  });

  // ==========================================================================
  
  // ==========================================================================
  // DEV/INSPECTOR-REQUESTS (Ressourcen manipulieren)
  // ==========================================================================
  // Damit du im Inspector Ressourcen „dazubuchen“ kannst, ohne ein zweites
  // Warenhaus-System zu brauchen, unterstützen wir zwei Requests:
  //   - req:res:add { res, delta, reason?, src? }
  //   - req:res:set { res, value, reason?, src? }
  //
  // Beide schreiben AUSSCHLIESSLICH in den selben Store (RegistryValues) über
  // addResource(), sodass HUD/Inspector/Engine immer konsistent bleiben.

  function _normResId(v){
    const s = String(v || '').trim();
    return s.replace(/^res\./,''); // toleriert alte Prefixe
  }

  function _bindResRequests(){
    try{
      addEventListener('req:res:add', (ev)=>{
        const d = ev?.detail || {};
        const res = _normResId(d.res || d.id || d.key);
        const delta = Number(d.delta ?? d.qty ?? d.amount ?? 0);
        if (!res || !Number.isFinite(delta) || delta === 0) return;
        addResource(res, delta, d.reason || 'inspector', d.src || 'req:res:add');
      });

      addEventListener('req:res:set', (ev)=>{
        const d = ev?.detail || {};
        const res = _normResId(d.res || d.id || d.key);
        const value = Number(d.value);
        if (!res || !Number.isFinite(value)) return;
        const old = getResourceValue(res);
        const delta = value - old;
        if (!Number.isFinite(delta) || delta === 0) return;
        addResource(res, delta, d.reason || 'inspector', d.src || 'req:res:set');
      });
    }catch(e){
      WARN('Konnte req:res:add/set nicht binden', e);
    }
  }

  _bindResRequests();


  // EXPORT
  // ==========================================================================

  const ProductionAPI = {
    registerModule,
    addResource,
    getResourceValue,
    getStore,
    tick,
    enqueueCarryJobFromBuilding,

    // Debug-Exports (praktisch für Inspector)
    _modules   : MODULES,
    _buildings : BUILDINGS_BY_UID
  };

  window.Production = ProductionAPI;

  LOG('bereit (v25.12.12-prod-core+jobs-v3-dropTile+HQto)');
})();
