/* ============================================================================
 * Datei    : core/layout.js
 * Version  : v1.0.0 (2025-10-10)
 * Zweck    : Portrait/Landscape verankern + Canvas quadratisch und zentriert
 * Autor    : Projekt "Neue Siedler"
 *
 * Erwartet:
 *   <div id="app-layout">
 *     <div id="hud-top"> ... </div>
 *     <div id="play-area"><canvas id="game"></canvas></div>
 *     <div id="build-panel"> ... </div>
 *   </div>
 *
 * Verhalten:
 *   - Liest aktuelle Orientierung (matchMedia).
 *   - Ermittelt freie Fläche im #play-area (Viewport minus HUD/BUILD).
 *   - Setzt #game Breite/Höhe = min(availableWidth, availableHeight).
 *   - Zentriert #game im #play-area.
 *   - Reagiert auf resize/orientationchange.
 * ========================================================================== */

(() => {
  const $ = (s, r=document)=>r.querySelector(s);

  const layout = {
    el: {
      root: $('#app-layout'),
      hud:  $('#hud-top'),
      play: $('#play-area'),
      game: $('#game'),
      build: $('#build-panel'),
    },
    isPortrait: () => window.matchMedia('(orientation: portrait)').matches,
  };

  function sizeOf(el){
    if (!el) return {w:0,h:0};
    const r = el.getBoundingClientRect();
    return { w: r.width|0, h: r.height|0 };
  }

  function applyPlaySquare(){
    const { root, hud, play, game, build } = layout.el;
    if (!root || !play || !game) return;

    // verfügbare Fläche innerhalb play
    const pr = play.getBoundingClientRect();
    let availW = pr.width;
    let availH = pr.height;

    // Sicherheit: wenn aus irgendeinem Grund HUD/BUILD „in“ der Play-Area liegen
    // (altes Markup), korrigieren wir die sichtbare Höhe/Breite
    if (layout.isPortrait()){
      // oben HUD, unten BUILD sind außerhalb der Play-Area -> ok
    } else {
      // links HUD, rechts BUILD
    }

    // Quadratische Kante: kleinste Kante nutzen
    const edge = Math.max(64, Math.floor(Math.min(availW, availH)));

    // Canvas setzen
    game.style.width  = edge + 'px';
    game.style.height = edge + 'px';

    // Zentrieren (falls Canvas nicht ganz „mittig“ steht, zwingen wir grid centering)
    play.style.display = 'grid';
    play.style.placeItems = 'center';
  }

  // Robuste Resize-Schleife (mit rAF entprellt)
  let rafId = 0;
  function scheduleResize(){
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(applyPlaySquare);
  }

  // Init
  function init(){
    scheduleResize();
    window.addEventListener('resize', scheduleResize, { passive:true });
    window.addEventListener('orientationchange', scheduleResize,
