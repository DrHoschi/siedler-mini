<!-- assets/ui/ui-build.data-bridge.js -->
<script>
/* Neue Siedler – UI-Build Daten-Bridge
 * Zweck: Gebäude-/Kategorien-Daten an UIBuild liefern (robust, ohne Endlosschleife)
 * Quellen:
 *  1) Registry (assets/core/registry.js + assets/core/build.categories.js)
 *  2) Fallback: assets/data/buildings.json
 */

(function () {
  const LOG = (...a)=> (window.CBLog?.info||console.log)('[ui-build.bridge]', ...a);

  let delivered = false;
  let retryCount = 0;
  const MAX_RETRY = 12;      // ~ einige Sekunden, ohne Spam
  const RETRY_MS   = 180;    // kleiner Backoff, fühlt sich flott an

  function fromRegistry() {
    try {
      const cats = (window.Registry?.categories) || (window.BuildCategories?.categories) || [];
      const items = (window.Registry?.buildings) || [];
      if (Array.isArray(cats) && cats.length && Array.isArray(items) && items.length) {
        return { cats, items };
      }
    } catch { /* ignore */ }
    return null;
  }

  async function fromFallbackJSON() {
    try {
      const res = await fetch('assets/data/buildings.json', { cache:'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      // erwartet: { categories:[...], items:[...] }
      if (json && Array.isArray(json.categories) && Array.isArray(json.items)) {
        return { cats: json.categories, items: json.items };
      }
    } catch (e) {
      // still silent; wir versuchen später erneut
    }
    return null;
  }

  function deliver(cats, items) {
    if (delivered) return true;
    if (!window.UIBuild || typeof window.UIBuild.setItems !== 'function') {
      LOG('UIBuild.setItems nicht verfügbar – versuche später erneut');
      return false;
    }
    try {
      window.UIBuild.setItems(items, cats);
      LOG(`Items gesetzt (${items.length} / ${cats.length})`);
      delivered = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  async function tryDeliverOnce() {
    if (delivered) return;

    // 1) Registry
    const reg = fromRegistry();
    if (reg) {
      LOG(`Items gesetzt (via Registry) (${reg.items.length} / ${reg.cats.length})`);
      if (deliver(reg.cats, reg.items)) return;
    }

    // 2) Fallback JSON
    const fb = await fromFallbackJSON();
    if (fb) {
      (window.CBLog?.info||console.log)('[ui-build.bridge]', `Fallback JSON erkannt (cats:${fb.cats.length} / items:${fb.items.length})`);
      if (deliver(fb.cats, fb.items)) return;
    }
  }

  function scheduleRetry() {
    if (delivered) return;
    if (retryCount >= MAX_RETRY) return; // kein Spam
    retryCount++;
    setTimeout(() => { void tryDeliverOnce().then(() => { if (!delivered) scheduleRetry(); }); }, RETRY_MS);
  }

  // Events, bei denen Daten bereit sein können:
  window.addEventListener('cb:assets-ready', () => { void tryDeliverOnce().then(() => { if (!delivered) scheduleRetry(); }); });
  window.addEventListener('cb:game-start',   () => { void tryDeliverOnce().then(() => { if (!delivered) scheduleRetry(); }); });

  // Fallback: nach DOM ready gleich versuchen
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    void tryDeliverOnce().then(() => { if (!delivered) scheduleRetry(); });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      void tryDeliverOnce().then(() => { if (!delivered) scheduleRetry(); });
    });
  }
})();
</script>
