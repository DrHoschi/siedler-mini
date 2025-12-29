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

  /**
   * Carry-Job Meta: jobId -> { res, qty, reason, src, buildingUid, buildingKind }
   *
   * Wird genutzt, um (optional) Ressourcen erst BEI Lieferung am HQ zu zählen.
   * Standard bleibt unverändert: wer enqueueCarryJobFromBuilding ohne Option aufruft,
   * bekommt KEIN Delivery-Accounting (damit es keine Doppelzählung gibt).
   */
  const CARRY_META_BY_JOBID = new Map();


  // ==========================================================================
  // HILFSFUNKTIONEN – RESSOURCEN
  // ==========================================================================

  function addResource(resId, delta, reason, src) {
    if (!resId) return;
    if (!delta || !Number.isFinite(delta)) return;

    const key = String(resId);  // bewusst KEIN 'res.*' Prefix
    const old = Number(RES_STORE[key] || 0);
    let value = old + delta;

    // ----------------------------------------------------------------------
    // Guard: Ressourcen dürfen NICHT negativ werden.
    //
    // Hintergrund: Beim Bauen wird "reserviert" (= abgezogen). Wenn an
    // irgendeiner Stelle doppelt abgezogen wird (oder Events verpasst werden),
    // konnte der Store bisher ins Minus rutschen. Das führt zu wilden Effekten
    // (z. B. HUD zeigt negative Werte oder Build-Checks werden inkonsistent).
    //
    // Für Epoche 1 halten wir es simpel: Minimum ist 0.
    // ----------------------------------------------------------------------
    if (value < 0) value = 0;

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

  // ------------------------------------------------------------------------
  // Baukosten-Helfer (atomar): canAfford + consume
  // ------------------------------------------------------------------------
  // Motivation:
  // - Beim Bauen wollen wir "prüfen -> abziehen" an EINER Stelle bündeln,
  //   damit es keine Doppel-Abzüge oder Race-Conditions gibt.
  // - consume() ist bewusst konservativ: wenn etwas fehlt, wird GAR NICHTS
  //   abgezogen (atomar) und es kommt false zurück.
  function canAfford(needs){
    try{
      if (!needs || typeof needs !== 'object') return true;
      for (const k of Object.keys(needs)){
        const need = (Number(needs[k] || 0) | 0);
        if (need <= 0) continue;
        const have = Number(getResourceValue(k) || 0);
        if (have < need) return false;
      }
      return true;
    }catch(_){
      return false;
    }
  }

  function consume(needs, reason, src){
    if (!canAfford(needs)) return false;
    try{
      for (const k of Object.keys(needs||{})){
        const need = (Number(needs[k] || 0) | 0);
        if (need <= 0) continue;
        addResource(k, -need, reason || 'consume', src);
      }
      return true;
    }catch(e){
      WARN('consume() fehlgeschlagen', e);
      return false;
    }
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
  function enqueueCarryJobFromBuilding(building, resId, qty = 1, opts = null){
    if (!window.JobEngine) return;
    if (!building) return;

    const eng = window.JobEngine;
    const res = String(resId || 'wood');

    const from = computeDropTile(building);

    // Ziel: HQ-Tile (wenn bekannt)
    const hq = getHQTile();
    const to = hq ? { x: hq.x, y: hq.y } : null;

    // Optionen (additiv):
    //   - accountOnDeliver: wenn true → addResource erst bei cb:job:done (carry)
    //   - reason/src: werden als Meta gespeichert und beim Delivery-Accounting genutzt
    const o = opts || {};
    const accountOnDeliver = !!o.accountOnDeliver;

    const job = {
      id   : 'job-carry-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2,6),
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

    // Delivery-Accounting: Meta merken, damit wir bei cb:job:done genau diesen Job
    // sauber verbuchen können (ohne Doppelzählung für "alte" Produktionsmodule).
    if (accountOnDeliver){
      CARRY_META_BY_JOBID.set(job.id, {
        res,
        qty : Number(qty || 1) || 1,
        reason: o.reason || 'carry:deliver',
        src   : o.src    || (building?.kind || building?.uid || TAG),
        buildingUid : building?.uid || null,
        buildingKind: building?.kind || building?.id || null
      });
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
  // DELIVERY-ACCOUNTING (D4)
  // ==========================================================================
  // Optionale Logik: Für bestimmte Carry-Jobs zählen wir Ressourcen NICHT beim
  // Produzieren, sondern erst, wenn der Carrier am Ziel (HQ) abliefert.
  //
  // Aktivierung pro Job: enqueueCarryJobFromBuilding(..., {accountOnDeliver:true})
  //
  // Vorteil:
  //   - Worker-Produktion kann "am Gebäude" entstehen und erst nach Transport
  //     im globalen Store landen (Settlers-Feeling).
  //   - Alte Module bleiben kompatibel (keine Doppelzählung).
  //
  function handleJobDoneCarry(ev){
    const d = ev?.detail || {};
    if (!d || d.type !== 'carry') return;

    const jobId = d.jobId;
    if (!jobId) return;

    const meta = CARRY_META_BY_JOBID.get(jobId);
    if (!meta) return; // Job war nicht für Delivery-Accounting markiert

    // Meta entfernen, damit wir niemals doppelt zählen (auch bei doppelten Events).
    CARRY_META_BY_JOBID.delete(jobId);

    try{
      // Primärressource verbuchen (z.B. wood/stone/fish/meat/pelt)
      addResource(meta.res, meta.qty || 1, meta.reason || 'carry:deliver', meta.src || TAG);

      // --------------------------------------------------------------------
      // Nahrung-Aggregat beim Liefern:
      //   Wunsch: "A: Wenn der Träger es am Lager/HQ abgeliefert hat,
      //   wird es der Nahrung hinzugefügt – Fleisch intern behalten."
      //
      //   Umsetzung:
      //     - meat bleibt als eigene Ressource bestehen
      //     - zusätzlich wird Nahrung erhöht:
      //         * falls Ressource 'food' existiert → +food
      //         * sonst (v4.3a Standard) → +fish (Fish zählt als Nahrung)
      // --------------------------------------------------------------------
      if (String(meta.res) === 'meat'){
        const qty = Number(meta.qty || 1) || 1;

        // Prefer 'food' if defined in Registry, else fallback to 'fish'
        let foodKey = null;
        try{
          const R = window.Registry;
          if (R && typeof R.getResource === 'function' && R.getResource('food')) {
            foodKey = 'food';
          } else if (R && typeof R.getResource === 'function' && R.getResource('fish')) {
            foodKey = 'fish';
          }
        }catch(_e){ /* ignore */ }

        // Ultimate fallback: if registry not ready yet, still try common keys
        if (!foodKey){
          if (Object.prototype.hasOwnProperty.call(RES_STORE, 'food')) foodKey = 'food';
          else if (Object.prototype.hasOwnProperty.call(RES_STORE, 'fish')) foodKey = 'fish';
        }

        if (foodKey){
          addResource(foodKey, qty, 'auto:meat->food', meta.src || TAG);
        }
      }
    }catch(e){
      WARN('Delivery-Accounting addResource fehlgeschlagen', e);
    }
  }

// ==========================================================================
  // EVENT-BINDINGS
  // ==========================================================================

  window.addEventListener('cb:build:complete', handleBuildComplete);
  window.addEventListener('cb:workarea:set', handleWorkAreaSet);
  window.addEventListener('cb:prod:output', handleProdOutput);
  window.addEventListener('cb:job:done', handleJobDoneCarry);

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
      // ------------------------------------------------------------------
      // req:res:add
      //  - Single: {res:'wood', delta:20}  (compat)
      //  - Map   : {wood:+20, stone:+20}  (Inspector-Tab nutzt dieses Format)
      // ------------------------------------------------------------------
      addEventListener('req:res:add', (ev)=>{
        const d = ev?.detail || {};
        const reason = d.reason || 'inspector';
        const src    = d.src    || 'req:res:add';

        // (1) Single-Format
        const res1 = _normResId(d.res || d.id || d.key);
        const delta1 = Number(d.delta ?? d.qty ?? d.amount);
        if (res1 && Number.isFinite(delta1) && delta1 !== 0){
          addResource(res1, delta1, reason, src);
          return;
        }

        // (2) Map-Format
        let did = false;
        for (const k of Object.keys(d)){
          if (k === 'reason' || k === 'src') continue;
          const res = _normResId(k);
          const delta = Number(d[k]);
          if (!res || !Number.isFinite(delta) || delta === 0) continue;
          addResource(res, delta, reason, src);
          did = true;
        }
        if (!did) return;
      });

      // ------------------------------------------------------------------
      // req:res:set
      //  - Single: {res:'wood', value:200}
      //  - Map   : {wood:200, stone:50}
      // ------------------------------------------------------------------
      addEventListener('req:res:set', (ev)=>{
        const d = ev?.detail || {};
        const reason = d.reason || 'inspector';
        const src    = d.src    || 'req:res:set';

        const res1 = _normResId(d.res || d.id || d.key);
        const value1 = Number(d.value);
        if (res1 && Number.isFinite(value1)){
          const old = getResourceValue(res1);
          const delta = value1 - old;
          if (Number.isFinite(delta) && delta !== 0){
            addResource(res1, delta, reason, src);
          }
          return;
        }

        let did = false;
        for (const k of Object.keys(d)){
          if (k === 'reason' || k === 'src') continue;
          const res = _normResId(k);
          const value = Number(d[k]);
          if (!res || !Number.isFinite(value)) continue;
          const old = getResourceValue(res);
          const delta = value - old;
          if (!Number.isFinite(delta) || delta === 0) continue;
          addResource(res, delta, reason, src);
          did = true;
        }
        if (!did) return;
      });

      // ------------------------------------------------------------------
      // req:res:snapshot  → cb:res:snapshot {resources}
      // ------------------------------------------------------------------
      addEventListener('req:res:snapshot', ()=>{
        try{
          const store = getStore();
          // shallow clone, damit UI nicht versehentlich live mutiert
          const snap = Object.assign({}, store);
          window.dispatchEvent(new CustomEvent('cb:res:snapshot', { detail: { resources: snap }}));
        }catch(e){
          WARN('req:res:snapshot fehlgeschlagen', e);
        }
      });

      // ------------------------------------------------------------------
      // req:res:reset  (detail:{value?:20})
      // Setzt DEV-Startwerte auf value (Default 20), Rest 0.
      // ------------------------------------------------------------------
      addEventListener('req:res:reset', (ev)=>{
        try{
          const d = ev?.detail || {};
          const v = Number.isFinite(Number(d.value)) ? Number(d.value) : 20;
          const store = getStore();
          const ids = ['wood','stone','food','gold','fish'];
          // Erst: alle bekannten Keys auf 0
          Object.keys(store).forEach((k)=>{ store[k] = 0; });
          // Dann: Dev-Keys setzen
          ids.forEach((id)=>{ store[id] = v; });
          // UI seed
          ids.forEach((id)=>{
            window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ res:id, value: store[id], reason:'reset', src:'req:res:reset' }}));
          });
          // Snapshot
          window.dispatchEvent(new CustomEvent('cb:res:snapshot', { detail:{ resources: Object.assign({}, store) }}));
        }catch(e){
          WARN('req:res:reset fehlgeschlagen', e);
        }
      });
    }catch(e){
      WARN('Konnte req:res:* nicht binden', e);
    }
  }


  _bindResRequests();


  // EXPORT
  // ==========================================================================

  const ProductionAPI = {
    registerModule,
    addResource,
    canAfford,
    consume,
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
