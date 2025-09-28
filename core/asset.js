// ============================================================================
// Datei : core/asset.js
// Zweck : Leichtgewichtiger Asset-Lader (Stub) + Ready-Events
// Events: cb:assets-ready  (+ Alias cb:assets:ready)
// Hinweis: Wenn du später wirklich was vorladen willst, häng' es in loadAll() rein.
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[assets]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[assets]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  async function loadAll() {
    try {
      // TODO: Hier echte Preloads anhängen (Spritesheets, Atlanten, Audio, …)
      // Für jetzt: sofort "ready" melden (nächstes Tick, damit Reihenfolge stabil bleibt)
      setTimeout(() => {
        const detail = { ok: true };
        EVT('cb:assets-ready', detail);
        EVT('cb:assets:ready', detail); // Alias
        log('assets-ready ✓');
      }, 0);
    } catch (e) {
      err('loadAll Fehler:', e);
      EVT('cb:assets-ready', { ok:false, error:String(e) });
    }
  }

  window.Assets = { loadAll };
})();
