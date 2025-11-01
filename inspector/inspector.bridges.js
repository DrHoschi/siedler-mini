/* ============================================================================
 * Datei   : inspector/inspector.bridges.js
 * Version : v1.1.0 (2025-11-01)
 * Zweck   : Zentrale Bridge Inspector ↔ Spiel
 *            – Pfad-Overlay-Buttons durchreichen
 *            – Ressourcen-/Build-Snapshots beantworten (falls APIs vorhanden;
 *              sonst neutrale Antwort, damit Tabs sauber „keine Daten“ zeigen)
 *            – Optional: console.* → 'cb:log' an Logs-Tab spiegeln
 *
 * Inspector fragt   : 'req:res:snapshot', 'req:build:snapshot'
 * Inspector Buttons : 'cb:path:overlay:on/off', 'cb:path:heatmap:on/off'
 * Spiel antwortet   : 'cb:res:snapshot', 'cb:build:snapshot'
 *
 * Lade-Reihenfolge  : NACH registry.js / ui-build.js einbinden.
 * Idempotenz        : Mehrfaches Laden wird verhindert.
 * ========================================================================== */

(function(){
  // Doppel-Load verhindern
  if (window.__INSPECTOR_BRIDGE_V110__) return;
  window.__INSPECTOR_BRIDGE_V110__ = true;

  /* ------------------------------------------------------------------------
   * [1] PFAD-OVERLAY BRÜCKE
   * --------------------------------------------------------------------- */
  const on      = () => window.PathOverlay?.toggle?.(true);
  const off     = () => window.PathOverlay?.toggle?.(false);
  const heatOn  = () => window.PathOverlay?.setHeatmap?.(true);
  const heatOff = () => window.PathOverlay?.setHeatmap?.(false);

  window.addEventListener('cb:path:overlay:on',  on);
  window.addEventListener('cb:path:overlay:off', off);
  window.addEventListener('cb:path:heatmap:on',  heatOn);
  window.addEventListener('cb:path:heatmap:off', heatOff);

  /* ------------------------------------------------------------------------
   * [2] RESSOURCEN-SNAPSHOT
   *  - Inspector sendet:  'req:res:snapshot'
   *  - Wir antworten   :  'cb:res:snapshot' {detail:{...}}
   *  - Falls deine Spiel-API (z. B. Res.snapshot()) existiert, nutzen wir die.
   *  - Sonst senden wir eine neutrale, leere Struktur zurück.
   * --------------------------------------------------------------------- */
  window.addEventListener('req:res:snapshot', () => {
    try{
      const snap = (typeof window.Res?.snapshot === 'function')
        ? window.Res.snapshot()
        : null;

      window.dispatchEvent(new CustomEvent('cb:res:snapshot', {
        detail: snap || {} // leer = Tab zeigt „keine Daten“
      }));
    }catch(err){
      window.dispatchEvent(new CustomEvent('cb:res:snapshot', {
        detail: { error: String(err) }
      }));
    }
  });

  /* ------------------------------------------------------------------------
   * [3] BUILD-SNAPSHOT
   *  - Inspector sendet:  'req:build:snapshot'
   *  - Wir antworten   :  'cb:build:snapshot' {detail:{list, byCategory, total, queues?}}
   *  - Bevorzugt echte API (UIBuild.snapshot), sonst defensiver Fallback aus Registry.
   * --------------------------------------------------------------------- */
  function normalizeFromRegistry(reg){
    const arr = Array.isArray(reg) ? reg : Object.values(reg || {});
    return arr.map((b, i) => ({
      id      : b.id ?? b.key ?? b.name ?? `b${i}`,
      name    : b.name ?? b.id ?? b.key ?? `b${i}`,
      type    : b.type ?? 'building',
      category: b.category ?? b.type ?? 'building',
      state   : 'registry'
    }));
  }

  function summarizeByCategory(list){
    const out = Object.create(null);
    for (const it of (list || [])) {
      const k = it.category || it.type || 'Unbekannt';
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }

  function makeBuildSnapshot(){
    // 3.1 – Offizielle API vorhanden?
    if (typeof window.UIBuild?.snapshot === 'function') {
      return window.UIBuild.snapshot();
    }

    // 3.2 – Defensiver Fallback (Registry/aktive Liste zusammensuchen)
    const registry =
      window.Registry?.data?.buildings ||
      window.Registry?.buildings ||
      window.UIBuild?.registry ||
      window.Build?.registry ||
      [];

    const active =
      window.Build?.active ||
      window.UIBuild?.active ||
      null;

    const list = Array.isArray(active) ? active : normalizeFromRegistry(registry);
    const byCategory = summarizeByCategory(list);
    const total = Array.isArray(list) ? list.length :
                  (typeof window.Build?.total === 'number' ? window.Build.total : 0);

    const queues = window.UIBuild?.queues || window.BuildQueue?.queues || undefined;

    return { list, byCategory, total, queues };
  }

  window.addEventListener('req:build:snapshot', () => {
    try{
      const snap = makeBuildSnapshot();
      window.dispatchEvent(new CustomEvent('cb:build:snapshot', { detail: snap }));
    }catch(err){
      console.warn('[bridge:build] snapshot failed:', err);
      window.dispatchEvent(new CustomEvent('cb:build:snapshot', {
        detail: { list: [], byCategory: {}, total: 0, error: String(err) }
      }));
    }
  });

  // Komfort: Wenn Registry signalisiert, dass sie bereit ist, einmal initial senden
  window.addEventListener('cb:registry:ready', () => {
    try{
      const snap = makeBuildSnapshot();
      window.dispatchEvent(new CustomEvent('cb:build:snapshot', { detail: snap }));
    }catch(_){}
  });

  /* ------------------------------------------------------------------------
   * [4] INSPECTOR OPEN/CLOSE (für Tests-Tab-Buttons)
   * --------------------------------------------------------------------- */
  window.addEventListener('req:insp:open',  () => window.Inspector?.open?.());
  window.addEventListener('req:insp:close', () => window.Inspector?.close?.());

  /* ------------------------------------------------------------------------
   * [5] OPTIONAL: Konsole → Logs-Tab spiegeln
   *  - Jede console.log/info/warn/error/debug feuert 'cb:log' mit {level,msg}.
   *  - Nicht invasiv: Originalkonsole bleibt erhalten.
   * --------------------------------------------------------------------- */
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
        // Für einfache Darstellung Objekte zu String (JSON) konvertieren
        const msg = args.map(a => {
          try{
            return (typeof a === 'string') ? a : JSON.stringify(a);
          }catch{ return String(a); }
        }).join(' ');
        window.dispatchEvent(new CustomEvent('cb:log', { detail: { level, msg }}));
      }
      c.log   = (...a)=>{ emit('log',   a); orig.log?.(...a);   };
      c.info  = (...a)=>{ emit('info',  a); orig.info?.(...a);  };
      c.warn  = (...a)=>{ emit('warn',  a); orig.warn?.(...a);  };
      c.error = (...a)=>{ emit('error', a); orig.error?.(...a); };
      c.debug = (...a)=>{ emit('debug', a); orig.debug?.(...a); };
    }catch(e){
      // Falls der Hook Probleme macht, niemals blockieren
      console?.warn?.('[bridge] console hook disabled:', e);
    }
  })();

})();
