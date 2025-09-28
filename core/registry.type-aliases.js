<!-- assets/core/registry.type-aliases.js -->
<script>
/* ============================================================================
 * Registry Type Aliases – v1.0.0
 * Fix für "building" vs. "buildings" / "category" vs. "categories"
 * Greift zentral auf window.Registry ein, ohne bestehende API zu brechen.
 * ========================================================================== */
(function(){
  'use strict';
  if (!window.Registry) {
    console.warn('[registry.type-aliases] window.Registry fehlt – lade zuerst assets/core/registry.js');
    return;
  }

  const mapType = (t)=>{
    const x = (t||'').toString().toLowerCase().trim();
    if (x === 'building')   return 'buildings';
    if (x === 'buildings')  return 'buildings';
    if (x === 'category')   return 'categories';
    if (x === 'categories') return 'categories';
    return x;
  };

  // Originale sichern
  const _register = window.Registry.register?.bind(window.Registry);
  const _list     = window.Registry.list?.bind(window.Registry);
  const _get      = window.Registry.get?.bind(window.Registry);
  const _set      = window.Registry.set?.bind(window.Registry);

  // Safe-Guards: falls Registry minimalistisch ist
  if (!_register || !_list) {
    console.warn('[registry.type-aliases] Registry API unvollständig. Erwartet: register(), list(), (optional get/set).');
  }

  // Wrapper
  if (_register) {
    window.Registry.register = function(type, payload){
      const t = mapType(type);
      try { return _register(t, payload); }
      finally {
        const log = (window.CBLog?.ok || console.log);
        log(`[registry.alias] register(${type}→${t}) ok: ${(Array.isArray(payload)?payload.length:0)} items`);
      }
    };
  }

  if (_list) {
    window.Registry.list = function(type){
      const t = mapType(type);
      const res = _list(t);
      const n = Array.isArray(res) ? res.length : (res? 1 : 0);
      (window.CBLog?.info || console.log)(`[registry.alias] list(${type}→${t}) → ${n}`);
      return res;
    };
  }

  if (_get) {
    window.Registry.get = function(type, id){
      return _get(mapType(type), id);
    };
  }

  if (_set) {
    window.Registry.set = function(type, data){
      return _set(mapType(type), data);
    };
  }

  // Optional: einmal konsolidierte Zählung loggen
  try {
    const cats = window.Registry.list('categories')?.length || 0;
    const blds = window.Registry.list('buildings') ?.length || 0;
    (window.CBLog?.info || console.log)(`[registry.alias] konsolidiert → Kategorien: ${cats}, Gebäude: ${blds}`);
  } catch(e){ /* ignore */ }
})();
</script>
