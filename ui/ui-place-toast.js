/* =============================================================================
 * Datei   : ui/ui-place-toast.js
 * Projekt : Neue Siedler (Siedler‑Mini) – v4.3
 * Zweck   : Toast sichtbar machen (Placement/Build deny), ohne Placement zu ändern
 *
 * v3 Fix:
 *   - Toast bekommt ALLE Styles inline (funktioniert auch ohne CSS-Load).
 *   - Sehr hoher z-index + fixed → sichtbar über Canvas/UI.
 *   - Bottom wird über #build-dock berechnet und auf Viewport geklemmt.
 *   - Lauscht auf window+document.
 *   - Smoke-Test: window.__placeToastShow('Test ✅')
 * =============================================================================
 */
(() => {
  'use strict';

  if (window.__NS_PLACE_TOAST_SEPARATE_V3__) return;
  window.__NS_PLACE_TOAST_SEPARATE_V3__ = true;

  const TOAST_ID = 'place-toast';
  let hideHandle = null;
  let lastPreview = null;

  const log = (m) => (window.CBLog?.info || console.log)(`[place-toast] ${m}`);

  function pickHost() {
    return document.querySelector('#ui-root') ||
           document.querySelector('#ui-layer') ||
           document.body;
  }

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el && el.isConnected) return el;

    el = document.createElement('div');
    el.id = TOAST_ID;

    // INLINE Styles
    el.style.position = 'fixed';
    el.style.left = '12px';
    el.style.right = '12px';
    el.style.bottom = '14px';
    el.style.zIndex = '2147483647';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '12px';
    el.style.fontWeight = '800';
    el.style.textAlign = 'center';
    el.style.background = 'rgba(20, 14, 10, 0.90)';
    el.style.color = '#fff';
    el.style.border = '2px solid rgba(255,255,255,0.25)';
    el.style.backdropFilter = 'blur(3px)';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
    el.style.pointerEvents = 'none';
    el.style.display = 'none';

    pickHost().appendChild(el);
    return el;
  }

  function computeBottomOffsetPx() {
    let bottom = 14;

    const dock = document.querySelector('#build-dock');
    if (dock) {
      const cs = window.getComputedStyle(dock);
      const isHidden = (cs.display === 'none' || cs.visibility === 'hidden' || dock.offsetParent === null);
      if (!isHidden) {
        const rect = dock.getBoundingClientRect();
        const h = Math.max(0, Math.round(rect.height || 0));
        bottom = Math.max(14, h + 10);
      }
    }

    const maxBottom = Math.max(14, Math.round(window.innerHeight - 60));
    if (bottom > maxBottom) bottom = maxBottom;

    return bottom;
  }

  function showToast(msg, ms = 1800) {
    const el = ensureToast();
    el.textContent = String(msg || '');
    el.style.bottom = `${computeBottomOffsetPx()}px`;
    el.style.display = 'block';

    clearTimeout(hideHandle);
    hideHandle = setTimeout(() => {
      el.style.display = 'none';
    }, ms);
  }

  function labelRes(res) {
    switch (String(res)) {
      case 'wood':  return 'Holz';
      case 'stone': return 'Stein';
      case 'food':  return 'Nahrung';
      case 'gold':  return 'Gold';
      default:      return String(res);
    }
  }

  function formatMissing(detail) {
    const missing = detail?.missing || {};
    const parts = [];
    for (const [res, m] of Object.entries(missing)) {
      const need = Number(m?.need ?? 0);
      const have = Number(m?.have ?? 0);
      const miss = Number(m?.missing ?? Math.max(0, need - have));
      if (miss > 0) parts.push(`${labelRes(res)} (fehlt ${miss})`);
    }
    return parts.length ? parts.join(', ') : '';
  }

  function reasonToText(detail) {
    const reason = String(detail?.reason || '').trim();

    if (reason === 'notenough') {
      const missTxt = formatMissing(detail);
      return missTxt ? `Nicht genug: ${missTxt}` : 'Nicht genug Ressourcen';
    }

    if (reason === 'water' || reason === 'blocked_water') return 'Auf Wasser kannst du nicht bauen.';
    if (reason === 'outsideMap' || reason === 'outside_map') return 'Außerhalb der Karte kannst du nicht bauen.';
    if (reason === 'occupied' || reason === 'blocked_building') return 'Hier steht bereits etwas im Weg.';
    if (reason === 'blockedTerrain' || reason === 'blocked_terrain') return 'Dieses Gelände ist blockiert.';
    if (reason === 'minMargin' || reason === 'too_close') return 'Zu nah an einem anderen Objekt.';
    if (reason === 'blocked_resource' || reason === 'resource') return 'Ressource im Weg (ggf. erst Holzfäller bauen).';

    return reason ? `Bauen nicht möglich (${reason})` : 'Bauen nicht möglich.';
  }

  function onPreview(ev) {
    try { lastPreview = ev.detail || null; } catch { lastPreview = null; }
  }

  function onDeny(ev) {
    const d = ev?.detail || {};
    const merged = (d && Object.keys(d).length) ? d : (lastPreview || {});
    showToast(reasonToText(merged));
  }

  window.addEventListener('cb:place:preview', onPreview, { passive: true });
  document.addEventListener('cb:place:preview', onPreview, { passive: true });

  window.addEventListener('cb:build:deny', onDeny, { passive: true });
  document.addEventListener('cb:build:deny', onDeny, { passive: true });

  window.__placeToastShow = (m='Toast Test ✅') => showToast(m, 2500);

  log('ready (v3 inline-styled)');
})();
