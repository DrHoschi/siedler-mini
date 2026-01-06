/* ============================================================================
 * core/unit.anim-resolver.js
 * v4.7-unitanimresolver-1
 * ----------------------------------------------------------------------------
 * Ziel:
 *  - EIN Resolver für Tiere (8×8) + Menschen (8×4 / gemischte States)
 *  - Liefert konsistente Infos für:
 *      - Frame-Key (wie UnitAnim.getFrameForUnit)
 *      - Frame-Index (wichtig für Marker/Attachments)
 *      - Frame-Liste (für Debug/Inspector/SpriteTest)
 *
 * WICHTIG:
 *  - Standalone, keine Imports (wie unit.anim.js)
 *  - Greift NUR auf die neuen read-only Hooks von UnitAnim zu.
 *  - Debug/Checker bleibt drin.
 * ========================================================================== */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const DIR8 = ["N","NE","E","SE","S","SW","W","NW"];

  function _safeStr(v, d="") { return (typeof v === "string" && v) ? v : d; }
  function _safeObj(v) { return (v && typeof v === "object") ? v : null; }
  function _clampInt(n, a, b) {
    const x = Math.floor(Number.isFinite(n) ? n : a);
    return Math.max(a, Math.min(b, x));
  }

  // ---------------------------------------------------------------------------
  // Resolver API
  // ---------------------------------------------------------------------------

  const UnitAnimResolver = {
    /**
     * Haupt-Funktion:
     *  - Gibt den Frame-Key zurück, den die Unit JETZT verwenden soll.
     *  - Funktioniert für Tiere & Menschen (prefixed keys).
     */
    getFrameKey(u, nowMs = performance.now()) {
      if (!window.UnitAnim?.getFrameForUnit) return null;
      return window.UnitAnim.getFrameForUnit(u, nowMs);
    },

    /**
     * Liefert den aktuellen Frame-Index (0..n-1) passend zur internen FPS-Auswahl.
     * Das ist ideal, um pro-Frame Marker/Attachments sauber zu matchen.
     */
    getFrameIndex(u, nowMs = performance.now()) {
      if (!window.UnitAnim?.getFrameIndexForUnit) return 0;
      return window.UnitAnim.getFrameIndexForUnit(u, nowMs);
    },

    /**
     * Liefert die komplette Frame-Liste für (atlasKey, action, dir).
     * Damit kann man im Inspector/SpriteTest auch "8×8 vs 8×4" transparent machen.
     */
    getFrameList(atlasKey, action, dirTok) {
      if (!window.UnitAnim?.resolveFrameList) return [];
      const a = _safeStr(action, "walk");
      const d = _safeStr(dirTok, "S");
      return window.UnitAnim.resolveFrameList(atlasKey, a, d) || [];
    },

    /**
     * Liefert Meta-Infos, wenn prefixed-Atlas erkannt wurde.
     * -> z.B. welche Actions wirklich existieren (walk, idle, work, carry)
     */
    getAtlasInfo(atlasKey) {
      if (!window.UnitAnim?.resolveAtlasInfo) return null;
      return window.UnitAnim.resolveAtlasInfo(atlasKey);
    },

    /**
     * Convenience:
     *  - Versucht für ein (atlasKey, action) für ALLE 8 Richtungen zu ermitteln,
     *    wie viele Frames verfügbar sind.
     * Returns: { N:4, NE:4, ... } (missing -> 0)
     */
    getDirFrameCounts(atlasKey, action="walk") {
      const out = {};
      for (const d of DIR8) {
        const list = this.getFrameList(atlasKey, action, d);
        out[d] = (list && list.length) ? list.length : 0;
      }
      return out;
    },

    /**
     * Pick aus einer Frame-Liste einen Key anhand frameIndex.
     * (Wenn du z.B. eigene Marker-Logik pro Frame bauen willst.)
     */
    pickFromList(list, frameIndex=0) {
      if (!Array.isArray(list) || !list.length) return null;
      const i = _clampInt(frameIndex, 0, list.length - 1);
      return list[i];
    },
  };

  window.UnitAnimResolver = UnitAnimResolver;

  // Komfort für Konsole (wie bei UnitAnim)
  try { window.UAR = UnitAnimResolver; } catch (e) {}
})();
