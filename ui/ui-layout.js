/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Version : v25.10.19
 * Zweck   : Minimaler Glue für HUD + quadratische Map + Dock
 * Events  : hört auf cb:boot-ready, cb:game-start, cb:path:* (optional)
 * Hinweis : Greift NICHT in bestehende Module ein – nur Container/Bridges
============================================================================ */
(function () {
  const EB = window.EventBus || {
    emit: (n,p)=>window.dispatchEvent(new CustomEvent(n,{detail:p})),
    on:  (n,f)=>window.addEventListener(n, e=>f(e.detail)),
  };

  const LOG = (m)=> (window.CBLog?.info || console.log)(m);

  // Stelle DOM-Gerüst bereit, ohne bestehende Knoten zu zerstören
  function ensureStage() {
    // vorhandenes Canvas + evtl. Dock/HUD einsammeln
    const $canvas = document.getElementById('game-canvas') || document.querySelector('canvas');
    if (!$canvas) { LOG('[layout] Kein Canvas gefunden (#game-canvas).'); return; }

    // Wrapper anlegen, falls noch nicht vorhanden
    let $stage = document.getElementById('game-stage');
    if (!$stage) {
      $stage = document.createElement('div');
      $stage.id = 'game-stage';
      // Map-Wrap + Dock + HUD-Placeholder
      $stage.innerHTML = `
        <div id="hud-bar" aria-label="HUD"></div>
        <div id="map-wrap"><!-- canvas hier hinein --></div>
        <div id="build-dock" aria-label="Build-Dock"></div>
      `;
      document.body.prepend($stage);
    }

    // Canvas ins Map-Wrap hängen (ohne es neu zu erstellen)
    const $wrap = $stage.querySelector('#map-wrap');
    if ($canvas.parentElement !== $wrap) $wrap.appendChild($canvas);
  }

  // Layout beim Boot fertig aufsetzen
  EB.on('cb:boot-ready', () => {
    ensureStage();
    LOG('[layout] Stage bereit.');
  });

  // Wenn das Spiel startet: Body-Flag, HUD/Dock sichtbar (deine Module füllen Inhalt)
  EB.on('cb:game-start', () => {
    document.body.classList.add('is-started');
    LOG('[layout] Spielstart → HUD/Dock sichtbar.');
  });

  // Inspector → PathOverlay (nur falls dein Inspector das nicht schon selbst bridged)
  // Die Event-IDs sind aus deinem Lastenheft: cb:path:overlay:on|off, cb:path:heatmap:on|off
  EB.on('cb:path:overlay:on',  ()=> window.PathOverlay?.toggle(true));
  EB.on('cb:path:overlay:off', ()=> window.PathOverlay?.toggle(false));
  EB.on('cb:path:heatmap:on',  ()=> window.PathOverlay?.setHeatmap?.(true));
  EB.on('cb:path:heatmap:off', ()=> window.PathOverlay?.setHeatmap?.(false));

  LOG('[layout] geladen (v25.10.19)');
})();
