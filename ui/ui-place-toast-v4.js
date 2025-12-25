/* =============================================================================
 * Datei   : ui/ui-place-toast-v4.js
 * Projekt : Neue Siedler (Siedler‑Mini) – v4.3
 *
 * Ziel:
 *   - Toast sichtbar machen (INLINE-Styling, max z-index)
 *   - Cache-Buster durch neuen Dateinamen (v4)
 *   - Hookt an mehrere Events, weil dein Projekt derzeit NICHT cb:build:deny loggt:
 *       cb:build:deny
 *       cb:build:place        (wenn {ok:false|valid:false|reason:...})
 *       cb:place:deny / cb:place:invalid (falls vorhanden)
 *       cb:res:deny           (falls vorhanden)
 *
 * Smoke-Test:
 *   window.__placeToastShow('Test ✅')
 * =============================================================================
 */
(() => {
  'use strict';

  if (window.__NS_PLACE_TOAST_V4__) return;
  window.__NS_PLACE_TOAST_V4__ = true;

  const TOAST_ID = 'place-toast';
  let hideHandle = null;
  let lastDetail = null;

  const log = (m) => (window.CBLog?.info || console.log)(`[place-toast] ${m}`);

  function host() {
    return document.querySelector('#ui-root') ||
           document.querySelector('#ui-layer') ||
           document.body;
  }

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el && el.isConnected) return el;

    el = document.createElement('div');
    el.id = TOAST_ID;

    // INLINE styles => unabhängig von CSS-Dateien/Stapel-Kontexten
    el.style.position = 'fixed';
    el.style.left = '12px';
    el.style.right = '12px';
    el.style.bottom = '14px';
    el.style.zIndex = '2147483647';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '12px';
    el.style.fontWeight = '800';
    el.style.textAlign = 'center';
    el.style.background = 'rgba(20, 14, 10, 0.92)';
    el.style.color = '#fff';
    el.style.border = '2px solid rgba(255,255,255,0.25)';
    el.style.backdropFilter = 'blur(3px)';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
    el.style.pointerEvents = 'none';
    el.style.display = 'none';

    host().appendChild(el);
    return el;
  }

  function bottomPx() {
    let bottom = 14;
    const dock = document.querySelector('#build-dock');
    if (dock) {
      const cs = window.getComputedStyle(dock);
      const hidden = (cs.display === 'none' || cs.visibility === 'hidden' || dock.offsetParent === null);
      if (!hidden) {
        const r = dock.getBoundingClientRect();
        const h = Math.max(0, Math.round(r.height || 0));
        bottom = Math.max(14, h + 10);
      }
    }
    const clamp = Math.max(14, Math.round(window.innerHeight - 60));
    return Math.min(bottom, clamp);
  }

  function showToast(msg, ms = 1800) {
    const el = ensureToast();
    el.textContent = String(msg || '');
    el.style.bottom = `${bottomPx()}px`;
    el.style.display = 'block';
    clearTimeout(hideHandle);
    hideHandle = setTimeout(() => { el.style.display = 'none'; }, ms);
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
    const reason = String(detail?.reason || detail?.code || '').trim();

    if (reason === 'notenough' || reason === 'not_enough' || reason === 'insufficient') {
      const missTxt = formatMissing(detail);
      return missTxt ? `Nicht genug: ${missTxt}` : 'Nicht genug Ressourcen';
    }

    if (reason === 'water' || reason === 'blocked_water') return 'Auf Wasser kannst du nicht bauen.';
    if (reason === 'outsideMap' || reason === 'outside_map') return 'Außerhalb der Karte kannst du nicht bauen.';
    if (reason === 'occupied' || reason === 'blocked_building') return 'Hier steht bereits etwas im Weg.';
    if (reason === 'blockedTerrain' || reason === 'blocked_terrain') return 'Dieses Gelände ist blockiert.';
    if (reason === 'minMargin' || reason === 'too_close') return 'Zu nah an einem anderen Objekt.';
    if (reason === 'blocked_resource' || reason === 'resource') return 'Ressource im Weg (ggf. erst Holzfäller bauen).';

    // Falls der Sender schon eine Message liefert
    if (detail?.message) return String(detail.message);

    return reason ? `Bauen nicht möglich (${reason})` : 'Bauen nicht möglich.';
  }

  // Heuristik: wann ist ein Event ein "Deny"?
  function looksDeny(detail) {
    if (!detail || typeof detail !== 'object') return false;
    if ('ok' in detail && detail.ok === false) return true;
    if ('valid' in detail && detail.valid === false) return true;
    if ('allowed' in detail && detail.allowed === false) return true;
    if ('canBuild' in detail && detail.canBuild === false) return true;
    if ('reason' in detail && detail.reason) return true;
    if ('code' in detail && detail.code) return true;
    return false;
  }

  function handle(ev) {
    const d = ev?.detail || null;
    if (d) lastDetail = d;

    // Bei "place" Events nur reagieren, wenn es nach deny aussieht.
    if (looksDeny(d)) showToast(reasonToText(d));
  }

  // Listener auf window+document
  const targets = [window, document];
  const events = [
    'cb:build:deny',
    'cb:build:place',
    'cb:place:deny',
    'cb:place:invalid',
    'cb:res:deny'
  ];
  for (const t of targets) for (const e of events) t.addEventListener(e, handle, { passive:true });

  // Smoke-Test
  window.__placeToastShow = (m='Toast Test ✅') => showToast(m, 2500);

  log('ready v4 (cache-bust filename + multi-event hooks)');
})();
