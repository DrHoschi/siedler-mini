// ============================================================================
// Datei : core/asset.js
// Projekt : Neue Siedler
// Version : v25.10.19-final
// Zweck : Leichtgewichtiger Asset-Lader (Stub) + Ready-Events
//
// Events (beide Varianten, für maximale Kompatibilität):
//   cb:assets-ready   (Bindestrich)
//   cb:assets:ready   (Doppelpunkt)
// Hinweis: Wenn du später wirklich was vorladen willst, hänge es in loadAll().
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[assets]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[assets]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  async function loadAll() {
    try {
      // TODO: Hier echte Preloads anhängen (Spritesheets, Atlanten, Audio, …)
      // Für jetzt: im nächsten Tick „ready“ melden → Reihenfolge bleibt stabil.
      setTimeout(() => {
        const detail = { ok: true };
        EVT('cb:assets-ready', detail);  // Bindestrich
        EVT('cb:assets:ready', detail);  // Doppelpunkt (Alias)
        log('assets-ready ✓');
      }, 0);
    } catch (e) {
      err('loadAll Fehler:', e);
      EVT('cb:assets-ready', { ok:false, error:String(e) });
    }
  }
// Sofort-Start des Asset-Loaders, damit cb:assets-ready/cb:assets:ready feuern

 // Sofort-Start des Asset-Loaders …
loadAll();              // <— NICHT mehr Assets.loadAll()
window.Assets = { loadAll }; 

})();
