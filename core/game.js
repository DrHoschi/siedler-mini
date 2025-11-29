/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-split1
 * Zweck   : Zentrale Spielsteuerung (Director) nach Split
 * --------------------------------------------------------------------------
 *  - Hält den globalen Game-State
 *  - Startet Kamera, Map, Units
 *  - Startet eigenen Render-Loop
 *  - Units-Tick kommt AUS der job.engine.js (nicht doppelt!)
 * ========================================================================= */

(function () {
  'use strict';

  const TAG = '[game]';
  const LOG = (...a) => (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const ERR = (...a) => (window.CBLog?.error ?? console.error)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  STATE
  // -------------------------------------------------------------------------
  const Game = {
    ctx      : null,
    tileSize : 64,
    buildings: [],     // wird auf Buildings.list gemappt
    units    : [],
    map      : null,
    camera   : null,

    getUnits () { return this.units; },
    getTileSize () { return this.tileSize; }
  };
  window.Game = Game;

  // -------------------------------------------------------------------------
  //  INIT
  // -------------------------------------------------------------------------
  function init () {
    LOG('init() startet');

    // Canvas holen
    const canvas = document.querySelector('#game');
    if (!canvas) {
      ERR('Canvas #game nicht gefunden!');
      return;
    }
    Game.ctx = canvas.getContext('2d');

    // Kamera
    try {
      if (window.Camera?.init) {
        const cam = Camera.init(Game);
        if (cam) Game.camera = cam;
      }
    } catch (e) {
      ERR('Camera.init Fehler:', e);
    }

    // Map
    try {
      if (window.GameMap?.init) {
        Game.map = GameMap.init(Game) || Game.map;
      }
    } catch (e) {
      ERR('GameMap.init Fehler:', e);
    }

    // Units
    try {
      if (window.GameUnits?.init) {
        GameUnits.init(Game);
      }
    } catch (e) {
      ERR('GameUnits.init Fehler:', e);
    }

    // Buildings-Liste an Game spiegeln (gemeinsame Quelle)
    try {
      if (window.Buildings?.getAll) {
        Game.buildings = Buildings.getAll();
      }
    } catch (e) {
      ERR('Buildings-Bridge Fehler:', e);
    }

    // Renderer initialisieren (nachdem ctx + map + camera verfügbar sind)
    try {
      if (window.Renderer?.init) {
        Renderer.init(Game);
      }
    } catch (e) {
      ERR('Renderer.init Fehler:', e);
    }

    // JobEngine startet über eigenen cb:game:start Listener (job.engine.js)
    // → NICHT hier starten

    // Render-Loop starten
    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  TICK – Nur Spielspezifisches, KEINE Units (die macht job.engine)
  // -------------------------------------------------------------------------
  function tick (dt) {
    if (window.GameConstruction?.tick) {
      try {
        GameConstruction.tick(dt);
      } catch (e) {
        ERR('GameConstruction.tick Fehler:', e);
      }
    }
    // Produktion folgt später separat (GameProduction.tick etc.)
  }

  // -------------------------------------------------------------------------
  //  RENDER
  // -------------------------------------------------------------------------
  function render () {
    if (window.Renderer?.draw) {
      try {
        Renderer.draw();
      } catch (e) {
        ERR('Renderer.draw Fehler:', e);
      }
    }
  }

  function loop (_ts) {
    const dt = 1 / 60;  // einfacher Fix-Timestep
    tick(dt);
    render();
    requestAnimationFrame(loop);
  }

  // -------------------------------------------------------------------------
  //  EVENTS
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', () => {
    LOG('registry ready → warte auf cb:game:start');
  });

  window.addEventListener('cb:game:start', () => {
    LOG('cb:game:start empfangen → init()');
    init();
  });
})();
