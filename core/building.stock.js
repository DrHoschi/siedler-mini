/* ==========================================================================
 * Siedler‑Mini – Building Stock (Output‑Puffer)  v25.12.14-stock-v1
 * --------------------------------------------------------------------------
 * Ziel:
 *  - Produktionen (Holz/Stein/Fisch) landen ZUERST als "Stock" am Gebäude.
 *  - Carrier holen die Ware ab (Carry‑Jobs) und liefern zum HQ.
 *  - Das Zählen der Ressource passiert (D4) beim Deliver (cb:job:done).
 *
 * Dieses Modul:
 *  - verwaltet pro Gebäude einen kleinen Puffer (stock[buildingUid][resId]=n)
 *  - erzeugt Carry‑Jobs "pull‑basiert" (max. N parallel pro Gebäude/Resource)
 *  - merkt sich JobId → {bUid,resId} damit wir beim cb:job:done den Stock
 *    abbuchen können (GameUnits sendet im Event nur jobId/res/type).
 *
 * Hinweis:
 *  - Wir zählen HIER absichtlich KEINE Ressourcen hoch, um Doppellogik zu
 *    vermeiden. Das macht bereits dein D4‑Patch (Delivery Accounting).
 * ========================================================================== */
(() => {
  'use strict';

  // ==========================================================================
  // KONSTANTEN
  // ==========================================================================
  const TAG = '[stock]';
  const DEFAULT_MAX_OUTSTANDING = 2;   // pro (building,resId) max parallel Jobs
  const DEFAULT_JOB_QTY = 1;           // v1: 1 Ware pro Job (sauber & einfach)

  // Welche Gebäude-Arten sollen "Stock" nutzen?
  // (kannst du jederzeit erweitern)
  const DEFAULT_KINDS = new Set([
    'b.lumberjack',
    'b.quarry',
    'b.fisher'
  ]);

  // ==========================================================================
  // DEBUG‑HELPER (safe)
  // ==========================================================================
  const LOG  = (...a) => console.log('✅', TAG, ...a);
  const WARN = (...a) => console.warn('⚠️', TAG, ...a);

  // ==========================================================================
  // STATE
  // ==========================================================================
  const STOCK = new Map();             // key: bUid -> Map(resId -> count)
  const OUTSTANDING = new Map();       // key: bUid|resId -> number
  const JOBMETA = new Map();           // key: jobId -> { bUid, resId, qty }

  let enabled = true;                  // globaler Schalter (für Debug/Tests)
  let maxOutstanding = DEFAULT_MAX_OUTSTANDING;

  // ==========================================================================
  // UTILS
  // ==========================================================================
  function keyFor(bUid, resId){ return `${bUid}|${resId}`; }

  function normResId(v){
    const s = String(v || '').trim();
    return s.replace(/^res\./,''); // toleriert alte Prefixe
  }

  function isKindStockable(kind){
    return DEFAULT_KINDS.has(String(kind || '').trim());
  }

  function getBuildingByUid(bUid){
    // Wir versuchen zuerst Production._buildings (falls vorhanden)
    try{
      const P = window.Production;
      const m = P && P._buildings;
      if (m && typeof m.get === 'function' && m.has(bUid)) return m.get(bUid);
    }catch(e){ /* ignore */ }
    return null;
  }

  function computeDoorTile(building){
    const bx = Number(building?.x) || 0;
    const by = Number(building?.y) || 0;
    const bw = Number(building?.w) || 1;
    const bh = Number(building?.h) || 1;

    const e = building?.entrance;
    if (e && Number.isFinite(e.tx) && Number.isFinite(e.ty)){
      return { x: bx + e.tx, y: by + e.ty };
    }
    const es = building?.entrances;
    if (Array.isArray(es) && es[0] && Number.isFinite(es[0].dx) && Number.isFinite(es[0].dy)){
      return { x: bx + es[0].dx, y: by + es[0].dy };
    }
    return { x: bx + bw / 2, y: by + bh };
  }

  function computeDropTile(building){
    if (Number.isFinite(building?.dropTx) && Number.isFinite(building?.dropTy)){
      return { x: building.dropTx, y: building.dropTy };
    }
    const door = computeDoorTile(building);
    return { x: door.x, y: door.y + 1 };
  }

  function getHQTile(){
    try{
      const U = window.GameUnits;
      if (!U || typeof U.getHQPos !== 'function') return null;
      const p = U.getHQPos();
      if (p && Number.isFinite(p.tx) && Number.isFinite(p.ty)){
        return { x: p.tx, y: p.ty };
      }
    }catch(e){ /* ignore */ }
    return null;
  }

  // ==========================================================================
  // STOCK API
  // ==========================================================================
  function addToStock(bUid, resId, delta){
    if (!bUid) return 0;
    const res = normResId(resId);
    const d = Math.max(0, Number(delta) || 0);
    if (d <= 0) return getStock(bUid, res);

    if (!STOCK.has(bUid)) STOCK.set(bUid, new Map());
    const m = STOCK.get(bUid);
    const cur = Number(m.get(res) || 0);
    const next = cur + d;
    m.set(res, next);

    // Debug‑Event (optional für späteren Inspector‑Tab)
    try{
      window.dispatchEvent(new CustomEvent('cb:stock:change', {
        detail: { bUid, res, value: next, delta: d }
      }));
    }catch(e){ /* ignore */ }

    return next;
  }

  function decFromStock(bUid, resId, delta){
    const res = normResId(resId);
    const d = Math.max(0, Number(delta) || 0);
    if (!STOCK.has(bUid)) return 0;
    const m = STOCK.get(bUid);
    const cur = Number(m.get(res) || 0);
    const next = Math.max(0, cur - d);
    m.set(res, next);

    try{
      window.dispatchEvent(new CustomEvent('cb:stock:change', {
        detail: { bUid, res, value: next, delta: -d }
      }));
    }catch(e){ /* ignore */ }

    return next;
  }

  function getStock(bUid, resId){
    const res = normResId(resId);
    const m = STOCK.get(bUid);
    return m ? Number(m.get(res) || 0) : 0;
  }

  function snapshot(){
    const out = [];
    for (const [bUid, m] of STOCK.entries()){
      const row = { bUid };
      for (const [res, cnt] of m.entries()){
        row[res] = cnt;
      }
      out.push(row);
    }
    return out;
  }

  // ==========================================================================
  // JOB‑ERZEUGUNG (PULL)
  // ==========================================================================
  function outstandingCount(bUid, resId){
    return Number(OUTSTANDING.get(keyFor(bUid, normResId(resId))) || 0);
  }

  function setOutstanding(bUid, resId, n){
    OUTSTANDING.set(keyFor(bUid, normResId(resId)), Math.max(0, Number(n) || 0));
  }

  function createCarryJob(bUid, building, resId){
    const res = normResId(resId);

    const hq = getHQTile();
    if (!hq){
      WARN('HQ unbekannt – kann keine Carry‑Jobs erzeugen', { bUid, res });
      return null;
    }

    const src = computeDropTile(building);
    const now = Date.now();

    const job = {
      id   : `job-stock-${res}-${bUid}-${now}`,
      type : 'carry',
      res  : res,
      qty  : DEFAULT_JOB_QTY,
      from : { x: src.x, y: src.y },
      to   : { x: hq.x,  y: hq.y }
    };

    // In JobEngine legen (kompatibel mit add/push)
    const eng = window.JobEngine;
    try{
      if (eng && typeof eng.add === 'function') eng.add(job);
      else if (eng && typeof eng.push === 'function') eng.push(job);
      else {
        WARN('JobEngine fehlt – Job nicht enqueuebar', job);
        return null;
      }
    }catch(e){
      WARN('JobEngine enqueue Fehler', e);
      return null;
    }

    // Mapping jobId -> Stock‑Meta (für cb:job:done)
    JOBMETA.set(job.id, { bUid, resId: res, qty: DEFAULT_JOB_QTY });

    // Outstanding hochzählen
    const o = outstandingCount(bUid, res);
    setOutstanding(bUid, res, o + 1);

    return job;
  }

  function ensurePickupJobs(bUid, resId){
    if (!enabled) return;

    const res = normResId(resId);
    const cnt = getStock(bUid, res);
    if (cnt <= 0) return;

    const building = getBuildingByUid(bUid);
    if (!building){
      WARN('Building nicht bekannt – Stock bleibt liegen', { bUid, res, cnt });
      return;
    }

    const o = outstandingCount(bUid, res);
    const need = Math.min(maxOutstanding, cnt) - o;
    if (need <= 0) return;

    for (let i=0; i<need; i++){
      const job = createCarryJob(bUid, building, res);
      if (!job) break;
    }

    // optionales Debug‑Log
    // LOG('ensurePickupJobs', { bUid, res, stock: cnt, outstanding: outstandingCount(bUid,res) });
  }

  // ==========================================================================
  // EVENT: cb:job:done  → Stock abbuchen + ggf. neue Jobs erzeugen
  // ==========================================================================
  window.addEventListener('cb:job:done', (ev) => {
    const d = ev?.detail || {};
    if (!d || d.type !== 'carry') return;

    const jobId = d.jobId;
    if (!jobId || !JOBMETA.has(jobId)) return;

    const meta = JOBMETA.get(jobId);
    JOBMETA.delete(jobId);

    const bUid = meta.bUid;
    const res  = normResId(meta.resId);

    // Outstanding runterzählen
    const o = outstandingCount(bUid, res);
    setOutstanding(bUid, res, Math.max(0, o - 1));

    // Stock abbuchen
    const left = decFromStock(bUid, res, meta.qty || 1);

    // Wenn noch was da ist: weitere Jobs nachschieben
    ensurePickupJobs(bUid, res);

    // LOG('job done → stock', { jobId, bUid, res, left });
  });

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  window.BuildingStock = {
    // Schalter
    isEnabled(){ return !!enabled; },
    setEnabled(v){ enabled = !!v; LOG('enabled =', enabled); },
    setMaxOutstanding(n){ maxOutstanding = Math.max(1, Number(n)||1); LOG('maxOutstanding =', maxOutstanding); },

    // Heuristik: sollte dieses Building in Stock laufen?
    isKindStockable,

    // Output hinzufügen (vom Prod‑System)
    add(building, resId, qty=1){
      if (!building || !building.uid){
        WARN('add() ohne building.uid', building);
        return;
      }
      const bUid = building.uid;
      const res  = normResId(resId);
      const q    = Math.max(1, Number(qty) || 1);

      addToStock(bUid, res, q);
      ensurePickupJobs(bUid, res);
    },

    // Debug/Inspector
    get(bUid, resId){ return getStock(bUid, resId); },
    snapshot,
    _state: { STOCK, OUTSTANDING, JOBMETA } // nur Debug
  };

  LOG('geladen (v25.12.14-stock-v1)');
})();