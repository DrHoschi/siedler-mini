/* =============================================================================
 * Datei   : ui/ui-place.js
 * Projekt : Neue Siedler (Siedler‑Mini)
 * Patch   : v4.3 – Step1 Placement-Feedback (Toast) – v3
 *
 * Ziel:
 *   - KEIN Eingriff in Core/Boot/Map.
 *   - Rein UI-seitig eine sichtbare Meldung ausgeben, wenn Platzierung
 *     nicht möglich ist (Reason-Codes).
 *
 * Hinweis:
 *   Dieses Modul ist defensiv implementiert:
 *   - Es hängt sich nur an Events (cb:build:deny / cb:place:preview),
 *     ohne deine vorhandene Placement-Logik zu ersetzen.
 * =============================================================================
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Guard: nicht doppelt registrieren
  // ---------------------------------------------------------------------------
  if (window.__NS_PLACE_TOAST_V3__) return;
  window.__NS_PLACE_TOAST_V3__ = true;

  // ---------------------------------------------------------------------------
  // Toast DOM
  // ---------------------------------------------------------------------------
  const TOAST_ID = 'place-toast';

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el && el.isConnected) return el;

    el = document.createElement('div');
    el.id = TOAST_ID;
    el.className = 'place-toast';
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  let hideHandle = null;

  function showToast(msg, ms = 1800) {
    const el = ensureToast();
    el.textContent = String(msg || '');
    el.style.display = 'block';

    // kleine "pop" Animation (optional)
    el.classList.remove('is-show');
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight; // reflow
    el.classList.add('is-show');

    clearTimeout(hideHandle);
    hideHandle = setTimeout(() => {
      el.style.display = 'none';
      el.classList.remove('is-show');
    }, ms);
  }

  // ---------------------------------------------------------------------------
  // Reason → Text (Deutsch)
  // ---------------------------------------------------------------------------
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

    // Spezieller Fall: nicht genug Ressourcen
    if (reason === 'notenough') {
      const missTxt = formatMissing(detail);
      return missTxt ? `Nicht genug: ${missTxt}` : 'Nicht genug Ressourcen';
    }

    // Allgemeine Placement-Reasons (je nach Projektstand)
    if (reason === 'water' || reason === 'blocked_water') return 'Auf Wasser kannst du nicht bauen.';
    if (reason === 'outsideMap' || reason === 'outside_map') return 'Außerhalb der Karte kannst du nicht bauen.';
    if (reason === 'occupied' || reason === 'blocked_building') return 'Hier steht bereits etwas im Weg.';
    if (reason === 'blockedTerrain' || reason === 'blocked_terrain') return 'Dieses Gelände ist blockiert.';
    if (reason === 'minMargin' || reason === 'too_close') return 'Zu nah an einem anderen Objekt.';
    if (reason === 'blocked_resource' || reason === 'resource') return 'Ressource im Weg (ggf. erst Holzfäller bauen).';

    // Fallback
    return reason ? `Bauen nicht möglich (${reason})` : 'Bauen nicht möglich.';
  }

  // ---------------------------------------------------------------------------
  // Optional: Preview-State merken (für den Fall, dass deny kein Detail trägt)
  // ---------------------------------------------------------------------------
  let lastPreview = null;

  window.addEventListener('cb:place:preview', (ev) => {
    try { lastPreview = ev.detail || null; } catch { lastPreview = null; }
  }, { passive: true });

  // ---------------------------------------------------------------------------
  // Haupt-Event: Build deny → Toast anzeigen
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:build:deny', (ev) => {
    const d = ev?.detail || {};
    // Wenn Detail leer ist, versuche aus Preview zu helfen
    const merged = (d && Object.keys(d).length) ? d : (lastPreview || {});
    showToast(reasonToText(merged));
  }, { passive: true });

  // ---------------------------------------------------------------------------
  // Debug/Smoke-Test (optional): in Console window.__placeToastShow('Test')
  // ---------------------------------------------------------------------------
  window.__placeToastShow = showToast;

})();
