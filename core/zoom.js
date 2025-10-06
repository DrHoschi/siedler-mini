/* ============================================================================
 * Datei    : core/zoom.js
 * Version  : v1.0.0 (2025-10-06)
 * Zweck    : Zentraler Zoom-Status + Event-Dispatch
 * API      : Zoom.scale (Number), Zoom.set(n)
 * Events   : cb:zoom:change { scale }
 * ============================================================================
 */
(function(root){
  const Z = {
    scale: 1,
    set(n){
      const s = Math.max(0.5, Math.min(3, Number(n)||1));
      if (s === Z.scale) return;
      Z.scale = s;
      window.dispatchEvent(new CustomEvent('cb:zoom:change', { detail:{ scale:s } }));
    }
  };
  root.Zoom = Z;
})(window);
