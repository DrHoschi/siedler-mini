/* ============================================================================
 * Datei    : core/ui-build.data-bridge.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.25-final
 * Zweck    : Registry → Build-UI Bridge (Kategorien + Items ins Build-Panel)
 *
 * Erwartet:
 *   - window.Registry (core/registry.js)   – liefert buildings + categories
 *   - window.UIBuild  (deine UI-Komponente) – API: mount(el), setCategories(arr), setItems(arr), rerender()
 *   - #build-panel im DOM
 *
 * Verhalten:
 *   - Wartet robust auf Registry-Ready und UI-Mount
 *   - Kategorien: bevorzugt window.BUILD_CATEGORIES, sonst Registry.categories()
 *   - Items: Registry.list('buildings'), gefiltert auf enabled !== false
 *   - Aktualisiert bei cb:registry:ready und (optional) cb:registry:update
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[ui-bridge]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  let mounted = false;
  let mountTries = 0;

  function regReady(cb){
    const R = window.Registry;
    if (!R) { WARN('Registry fehlt'); return; }
    if (typeof R.onReady === 'function') return R.onReady(cb);
    // Fallback auf Event
    if (R.isReady && R.isReady()) { try{ cb(); }catch(_){}; return; }
    const fn = ()=>{ try{ cb(); }catch(_){}; window.removeEventListener('cb:registry:ready', fn); };
    window.addEventListener('cb:registry:ready', fn);
  }

  function ensureMount(){
    if (mounted) return true;
    const U = window.UIBuild;
    const host = document.querySelector('#build-panel');
    if (!U || typeof U.mount !== 'function' || !host) {
      if (++mountTries < 40) { setTimeout(ensureMount, 100); }
      else WARN('Mount fehlgeschlagen – UIBuild oder #build-panel fehlt.');
      return false;
    }
    try { U.mount(host); mounted = true; LOG('mount ok'); }
    catch(e){ WARN('mount failed:', e?.message||e); }
    return mounted;
  }

  function getCategories(){
    if (Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length){
      return window.BUILD_CATEGORIES;
    }
    try {
      // Neue Registry-API bevorzugt
      if (typeof window.Registry?.categories === 'function') {
        return window.Registry.categories() || [];
      }
      // Alias-Layer unterstützt auch list('categories')
      return window.Registry?.list?.('categories') || [];
    } catch(e){
      WARN('getCategories:', e?.message||e); return [];
    }
  }

  function getItems(){
    try{
      // Kanonisch: 'buildings' (Alias-Layer würde auch 'building' abfangen)
      const arr = window.Registry?.list?.('buildings') || [];
      return Array.isArray(arr) ? arr.filter(b => b && b.enabled !== false) : [];
    }catch(e){
      WARN('getItems:', e?.message||e); return [];
    }
  }

  function refresh(tag){
    if (!ensureMount()) return; // beim nächsten Tick erneut versuchen
    const cats  = getCategories();
    const items = getItems();

    try { window.UIBuild?.setCategories?.(cats); } catch(e){ WARN('setCategories:', e?.message||e); }
    try { window.UIBuild?.setItems?.(items); }     catch(e){ WARN('setItems:', e?.message||e); }
    try { window.UIBuild?.rerender?.(); }          catch(_){}

    LOG(`set ${cats.length} cats / ${items.length} items (${tag||'refresh'})`);
  }

  // --- Lifecycle -------------------------------------------------------------
  // 1) Bei Registry-Ready initial befüllen
  regReady(()=> refresh('ready'));

  // 2) Optionales Update-Event (falls du es irgendwo emitest)
  window.addEventListener('cb:registry:update', ()=> refresh('update'));

  // 3) Boot-Refresh (falls Registry schon fertig ist / oder UI später kommt)
  setTimeout(()=> refresh('boot'), 80);
})();
