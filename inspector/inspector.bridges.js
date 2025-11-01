/* ============================================================================
 * Datei   : inspector/inspector.bridges.js
 * Version : v1.2.0 (2025-11-01)
 * Zweck   : Zentrale Bridge Inspector ↔ Spiel
 *            – Pfad-Overlay-Buttons
 *            – Ressourcen-/Build-Snapshots (aus echter API oder Registry)
 *            – Konsole → 'cb:log' spiegeln (für Logs-Tab)
 * Lade-Reihenfolge: NACH registry.js / ui-build.js einbinden.
 * Idempotenz      : Mehrfaches Laden wird verhindert.
 * ========================================================================== */

(function(){
  if (window.__INSPECTOR_BRIDGE_V120__) return;
  window.__INSPECTOR_BRIDGE_V120__ = true;

  /* ------------------------------------------------------------------ */
  /* [A] Pfad-Overlay Durchleitung                                      */
  /* ------------------------------------------------------------------ */
  const on      = () => window.PathOverlay?.toggle?.(true);
  const off     = () => window.PathOverlay?.toggle?.(false);
  const heatOn  = () => window.PathOverlay?.setHeatmap?.(true);
  const heatOff = () => window.PathOverlay?.setHeatmap?.(false);
  window.addEventListener('cb:path:overlay:on',  on);
  window.addEventListener('cb:path:overlay:off', off);
  window.addEventListener('cb:path:heatmap:on',  heatOn);
  window.addEventListener('cb:path:heatmap:off', heatOff);

  /* ------------------------------------------------------------------ */
  /* [B] Ressourcen-Snapshot                                            */
  /* ------------------------------------------------------------------ */
  window.addEventListener('req:res:snapshot', () => {
    try{
      const snap = (typeof window.Res?.snapshot === 'function')
        ? window.Res.snapshot()
        : {};
      window.dispatchEvent(new CustomEvent('cb:res:snapshot', { detail: snap }));
    }catch(err){
      window.dispatchEvent(new CustomEvent('cb:res:snapshot', { detail: { error:String(err) }}));
    }
  });

  /* ------------------------------------------------------------------ */
  /* [C] Build-Snapshot – Normalisierung aus deiner Registry             */
  /*    Erwartete/geduldete Felder je Gebäude-Objekt (alles optional):  *
   *    id, name, type/category,                                        *
   *    cost|costs|price (Objekt),                                      *
   *    resources|needs|consumes (Objekt/Array),                        *
   *    buildTime|time|cycleTime (ms/s),                                *
   *    size|tiles|{w,h}|{width,height},                                *
   *    door|entrance|doorTile|entranceTile (z.B. [x,y] oder {x,y}),    *
   *    icon|image|texture|preview (Pfad/URL).                           *
   * ------------------------------------------------------------------ */
  function val(v, ...keys){
    for (const k of keys){
      if (v && v[k] != null) return v[k];
    }
    return undefined;
  }
  function normSize(b){
    const s = b.size || b.tiles || b.dim || null;
    if (Array.isArray(s))             return {w:+s[0]||1, h:+s[1]||1};
    if (s && typeof s==='object')     return {w:+(s.w||s.width||1), h:+(s.h||s.height||1)};
    if (Number.isFinite(b.w)||Number.isFinite(b.h)) return {w:+(b.w||1), h:+(b.h||1)};
    return null;
  }
  function normDoor(b){
    const d = b.door || b.entrance || b.doorTile || b.entranceTile || null;
    if (Array.isArray(d))         return {x:+d[0]||0, y:+d[1]||0};
    if (d && typeof d==='object') return {x:+(d.x||0), y:+(d.y||0)};
    return null;
  }
  function normTime(b){
    const t = b.buildTime ?? b.time ?? b.cycleTime ?? null;
    if (t == null) return null;
    // ms/s tolerant: Zahlen <= 1000 vermutlich Sekunden → in ms umrechnen
    if (typeof t === 'number') return (t <= 1000 ? t*1000 : t);
    return Number(t) || null;
  }
  function normImg(b){
    return b.icon || b.image || b.texture || b.preview || null;
  }
  function normCost(b){
    return b.cost || b.costs || b.price || null; // Objekt {holz:2,stein:1,…}
  }
  function normRes(b){
    return b.resources || b.needs || b.consumes || null; // Objekt/Array
  }
  function normalizeFromRegistry(reg){
    const arr = Array.isArray(reg) ? reg : Object.values(reg || {});
    return arr.map((b, i) => ({
      id      : b.id ?? b.key ?? b.name ?? `b${i}`,
      name    : b.name ?? b.id ?? b.key ?? `b${i}`,
      category: b.category ?? b.type ?? 'building',
      cost    : normCost(b),
      res     : normRes(b),
      timeMs  : normTime(b),
      size    : normSize(b),
      door    : normDoor(b),
      image   : normImg(b),
      raw     : b
    }));
  }
  function summarizeByCategory(list){
    const out = Object.create(null);
    for (const it of (list || [])) {
      const k = it.category || 'building';
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }
  function makeBuildSnapshot(){
    if (typeof window.UIBuild?.snapshot === 'function') {
      // Deine eigene API darf natürlich auch schon alle Felder liefern
      return window.UIBuild.snapshot();
    }
    const registry =
      window.Registry?.data?.buildings ||
      window.Registry?.buildings ||
      window.UIBuild?.registry ||
      window.Build?.registry || [];
    const list = normalizeFromRegistry(registry);
    return {
      list,
      byCategory: summarizeByCategory(list),
      total: list.length
    };
  }
  window.addEventListener('req:build:snapshot', () => {
    try{
      const snap = makeBuildSnapshot();
      window.dispatchEvent(new CustomEvent('cb:build:snapshot', { detail: snap }));
    }catch(err){
      window.dispatchEvent(new CustomEvent('cb:build:snapshot', {
        detail: { list:[], byCategory:{}, total:0, error:String(err) }
      }));
    }
  });
  // einmal automatisch nach Registry-Ready feuern (bequem)
  window.addEventListener('cb:registry:ready', () => {
    try{
      const snap = makeBuildSnapshot();
      window.dispatchEvent(new CustomEvent('cb:build:snapshot', { detail: snap }));
    }catch(_){}
  });

  /* ------------------------------------------------------------------ */
  /* [D] Inspector open/close (Tests-Tab)                               */
  /* ------------------------------------------------------------------ */
  window.addEventListener('req:insp:open',  () => window.Inspector?.open?.());
  window.addEventListener('req:insp:close', () => window.Inspector?.close?.());

  /* ------------------------------------------------------------------ */
  /* [E] Optional: Konsole → Logs-Tab                                   */
  /* ------------------------------------------------------------------ */
  (function hookConsoleOnce(){
    if (window.__INSPECTOR_CONSOLE_HOOKED__) return;
    window.__INSPECTOR_CONSOLE_HOOKED__ = true;
    try{
      const c = console;
      const orig = {
        log:   c.log?.bind(c),
        info:  c.info?.bind(c),
        warn:  c.warn?.bind(c),
        error: c.error?.bind(c),
        debug: c.debug?.bind(c)
      };
      function emit(level, args){
        const msg = args.map(a=>{
          try{ return (typeof a === 'string') ? a : JSON.stringify(a); }
          catch{ return String(a); }
        }).join(' ');
        window.dispatchEvent(new CustomEvent('cb:log', { detail:{level, msg} }));
      }
      c.log   = (...a)=>{ emit('log',   a); orig.log?.(...a);   };
      c.info  = (...a)=>{ emit('info',  a); orig.info?.(...a);  };
      c.warn  = (...a)=>{ emit('warn',  a); orig.warn?.(...a);  };
      c.error = (...a)=>{ emit('error', a); orig.error?.(...a); };
      c.debug = (...a)=>{ emit('debug', a); orig.debug?.(...a); };
    }catch(e){ /* niemals blockieren */ }
  })();
})();
