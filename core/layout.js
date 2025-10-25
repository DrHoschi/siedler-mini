/* ============================================================================
 * Datei   : core/layout.js
 * Version : v25.10.25-final
 * Zweck   : Portrait/Landscape verankern + Canvas quadratisch und zentriert
 * Erwartet DOM:
 *   <div id="app-layout">
 *     <div id="hud-top">...</div>
 *     <div id="play-area"><canvas id="game"></canvas></div>
 *     <div id="build-panel">...</div>
 *   </div>
 * Hinweise:
 *   – DPR-neutral: Canvas-Auflösung == CSS-Pixel (kein doppeltes Skalieren).
 *   – Nach jeder Größenänderung: cb:request-repaint (ein Frame zeichnen).
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[layout]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const $ = (s, r=document)=> r.querySelector(s);

  const layout = {
    el: {
      root:  $('#app-layout'),
      hud:   $('#hud-top'),
      play:  $('#play-area'),
      game:  $('#game'),
      build: $('#build-panel'),
    },
    isPortrait: () => window.matchMedia?.('(orientation: portrait)')?.matches ?? (window.innerHeight >= window.innerWidth),
  };

  function sizeOf(el){
    if (!el) return { w:0, h:0 };
    const r = el.getBoundingClientRect();
    return { w: r.width|0, h: r.height|0 };
  }

  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  }

  /** Wählt die größte Quadratkante, die in #play-area hineinpasst. */
  function computeSquareEdge(){
    const { play } = layout.el;
    if (!play){
      // Fallback: gesamter Viewport
      return Math.max(64, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
    }
    const r = play.getBoundingClientRect();
    const availW = Math.max(0, r.width|0);
    const availH = Math.max(0, r.height|0);
    return Math.max(64, Math.floor(Math.min(availW, availH)));
  }

  /** Setzt Canvas auf quadratische, zentrierte Größe (CSS + Auflösung identisch). */
  function applyPlaySquare(){
    const { play, game } = layout.el;
    if (!game){
      WARN('Kein #game Canvas gefunden.');
      return;
    }

    // Sicherstellen, dass play existiert (zentrieren per grid)
    if (play){
      play.style.display = 'grid';
      play.style.placeItems = 'center';
    }

    const edge = computeSquareEdge();

    // CSS-Größe
    game.style.width  = edge + 'px';
    game.style.height = edge + 'px';

    // WICHTIG: Canvas-Auflösung == CSS-Pixel (DPR-neutral, wie Map/Render erwarten)
    if (game.width  !== edge) game.width  = edge;
    if (game.height !== edge) game.height = edge;

    // Repaint anfordern (MapRuntime/Render zeichnen genau einen Frame)
    emit('cb:request-repaint');

    LOG('Canvas sized', { edge, portrait: layout.isPortrait() });
  }

  // rAF-entprellt
  let rafId = 0;
  function scheduleResize(){
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(()=>{ rafId = 0; applyPlaySquare(); });
  }

  function initObservers(){
    // Window-Events
    window.addEventListener('resize', scheduleResize, { passive:true });
    window.addEventListener('orientationchange', scheduleResize, { passive:true });

    // Container-Resize (Root/Play)
    try {
      const ro = new ResizeObserver(()=> scheduleResize());
      if (layout.el.root) ro.observe(layout.el.root);
      if (layout.el.play) ro.observe(layout.el.play);
      // HUD/Build optional, falls deren Größe das Play-Area beeinflusst
      if (layout.el.hud)  ro.observe(layout.el.hud);
      if (layout.el.build)ro.observe(layout.el.build);
      layout._ro = ro;
    } catch(e){
      // ältere Browser ohne ResizeObserver – Window-Resize reicht dann
      WARN('ResizeObserver fehlt/fehlerhaft:', e?.message||e);
    }
  }

  function init(){
    // Falls Canvas noch nicht im DOM ist, nach DOMContentLoaded erneut probieren
    if (!layout.el.game){
      layout.el.root  = $('#app-layout');
      layout.el.hud   = $('#hud-top');
      layout.el.play  = $('#play-area');
      layout.el.game  = $('#game');
      layout.el.build = $('#build-panel');
    }
    applyPlaySquare();
    initObservers();
    LOG('bereit');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
