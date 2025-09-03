/* ============================================================================
 * assets/ui/ui-start.js — v17.7.3
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Start-Hintergrund aktivieren (body.has-start-bg)
 *   - Sichtbares Start-Panel in der Mitte mit Map-Auswahl + Start-Button
 *   - Start triggert Engine (GameBoot.start) inkl. Fallbacks/Logs
 *
 * Events:
 *   - dispatchEvent('cb:ui-ready',   {detail:{module:'ui-start', version:'v17.7.3'}})
 *   - dispatchEvent('cb:game-started', {detail:{mapUrl}})
 *
 * Abhängigkeiten:
 *   - index.html lädt diese Datei nach dem Canvas
 *   - assets/ui/ui-start.css stellt Hintergrund + Panel-Styles bereit
 *
 * Robustheit:
 *   - Panelelement bekommt pointer-events: auto !important (falls frühere CSS-Regeln blockierten)
 *   - Start funktioniert auch, wenn GameBoot nicht existiert (sanfter Fallback)
 *   - Kein Blockieren der FAB-Buttons
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[ui-start]';
  var VERSION = 'v17.7.3';

  // ---- sanfte Logger (CBLog bevorzugt) --------------------------------------
  function logOk(msg)   { try { (window.CBLog?.ok || console.log)(MOD + ' ' + msg); } catch(_) {} }
  function logWarn(msg) { try { (window.CBLog?.warn || console.warn)(MOD + ' ' + msg); } catch(_) {} }
  function logErr(msg)  { try { (window.CBLog?.err || console.error)(MOD + ' ' + msg); } catch(_) {} }

  // ---- kleine Utils ---------------------------------------------------------
  function $(sel) { return document.querySelector(sel); }
  function create(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }

  // Standard-Map aus Canvas-Dataset oder Fallback
  function getDefaultMapUrl() {
    try {
      var cv = $('#game');
      return (cv && cv.dataset.map) ? cv.dataset.map : 'assets/maps/map-mini.json';
    } catch(_) { return 'assets/maps/map-mini.json'; }
  }

  // Bekannte Karten-Liste (optional erweiterbar)
  var MAP_OPTIONS = [
    'assets/maps/map-mini.json',
    'assets/maps/map-demo.json',
    'assets/maps/map-pro.json',
    'assets/maps/map-test-all.json'
  ];

  // ---- Panel erzeugen -------------------------------------------------------
  function buildStartPanel() {
    // Body-Klasse für Hintergrund aktivieren
    document.body.classList.add('has-start-bg');

    // Wrapper
    var panel = create('div', 'ui-start-panel');
    // Interaktivität sicherstellen, auch wenn alte Styles etwas blockieren
    panel.style.pointerEvents = 'auto';
    panel.style.setProperty('pointer-events', 'auto', 'important');

    // Titel
    var title = create('div', 'ui-start-title', 'City-Builder — Start');

    // Map-Select
    var row = create('div', 'ui-start-row');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';

    var sel = create('select', 'ui-start-select');
    sel.style.padding = '8px 10px';
    sel.style.borderRadius = '8px';
    sel.style.border = '1px solid #3a3a3a';
    sel.style.background = '#0f1520';
    sel.style.color = '#e6e6e6';
    sel.style.minWidth = '220px';

    var def = getDefaultMapUrl();
    MAP_OPTIONS.forEach(function (url) {
      var opt = create('option', null, url.split('/').pop());
      opt.value = url;
      if (url === def) opt.selected = true;
      sel.appendChild(opt);
    });

    // Buttons
    var btnStart = create('button', 'ui-start-button', '► Start');
    var btnReset = create('button', 'ui-start-button-alt', '↻ Neu-Start');

    // Alternate Button Style
    btnReset.style.background = '#334155';
    btnReset.style.borderColor = '#475569';

    // Hinweis / Version
    var hint = create('div', 'ui-start-hint', 'OK UI bereit (' + MOD + ' ' + VERSION + ')');

    // Zusammenbauen
    row.appendChild(sel);
    row.appendChild(btnStart);
    row.appendChild(btnReset);

    panel.appendChild(title);
    panel.appendChild(row);
    panel.appendChild(hint);

    // Panel in DOM
    document.body.appendChild(panel);

    // ---- Interaktionen ------------------------------------------------------

    // Start-Vorgang
    btnStart.addEventListener('click', function () {
      var mapUrl = sel.value || def;

      // UI abbauen, Hintergrund weg
      try { panel.remove(); } catch(_) { panel.style.display = 'none'; }
      document.body.classList.remove('has-start-bg');

      // Engine starten
      var started = false;
      try {
        if (window.GameBoot && typeof GameBoot.start === 'function') {
          // Neuer Bootstrapper
          GameBoot.start(mapUrl);
          started = true;
          logOk('Start → ' + mapUrl);
        } else if (window.Game && typeof Game.start === 'function') {
          // Ältere Fassade
          Game.start({ canvas: $('#game'), mapUrl: mapUrl });
          started = true;
          logOk('Start (legacy) → ' + mapUrl);
        }
      } catch (e) {
        logErr('Start-Fehler: ' + (e && e.message));
        console.error(e);
      }

      if (!started) {
        // Sanfter Fallback: Event senden – Bootstrap macht dann weiter
        window.dispatchEvent(new CustomEvent('cb:boot-request', { detail: { mapUrl: mapUrl } }));
        logWarn('GameBoot.start nicht gefunden → cb:boot-request gesendet.');
      }

      // Für UI/Inspector
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail: { mapUrl: mapUrl } }));
    });

    // Neu-Start (Seite „weich“ zurücksetzen)
    btnReset.addEventListener('click', function () {
      try {
        // Panels wegräumen
        panel.remove();
      } catch(_) {}
      document.body.classList.remove('has-start-bg');

      // Cache-freundlicher Reload (ohne Service Worker bleibt leichtgewichtig)
      location.reload();
    });

    // Zugriff nach außen (optional)
    window.__UI_START = {
      version: VERSION,
      open: function () {
        if (!document.body.contains(panel)) document.body.appendChild(panel);
        document.body.classList.add('has-start-bg');
        panel.style.display = 'flex';
      },
      close: function () {
        document.body.classList.remove('has-start-bg');
        panel.style.display = 'none';
      }
    };
  }

  // ---- Bootstrap ------------------------------------------------------------
  function init() {
    try {
      buildStartPanel();
      window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { module: 'ui-start', version: VERSION } }));
      logOk('cb:ui-ready (' + VERSION + ')');
    } catch (e) {
      logErr('Init-Fehler: ' + (e && e.message));
      console.error(e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();
