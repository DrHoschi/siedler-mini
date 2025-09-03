/* ============================================================================
 * assets/core/game.bootstrap.js — v17.4.0
 * Startet das Spiel GENAU EINMAL.
 * Wenn keine neue Engine vorhanden ist, stellt dieses Modul
 * einen kompatiblen Minimal-Fallback bereit, damit:
 *   - die Map geladen und gezeichnet wird,
 *   - Events (cb:game-started) sicher feuern,
 *   - Inspector/Overlays wieder funktionieren.
 * ============================================================================ */
(function(ns){
  'use strict';
  if (!ns) ns = (window.GameCore = window.GameCore || {});
  var LOG = {
    ok:   (window.CBLog?.ok   || console.log).bind(console),
    warn: (window.CBLog?.warn || console.warn).bind(console),
    err:  (window.CBLog?.err  || console.error).bind(console),
    log:  (window.CBLog?.push || console.log).bind(console)
  };

  // ---------------------------------------------------------------------------
  // 1) Boot-Guard
  // ---------------------------------------------------------------------------
  if (window.__CB_BOOT_LOCK__) { LOG.warn('[bootstrap] bereits gestartet'); return; }
  var started = false;
  window.__CB_BOOT_LOCK__ = true;

  // ---------------------------------------------------------------------------
  // 2) Minimal-Engine, falls keine vorhanden ist
  // ---------------------------------------------------------------------------
  (function ensureMinimalEngine(){
    if (ns.Engine && typeof ns.Engine.start === 'function') return; // neue Engine vorhanden

    // State-Grundstruktur sicherstellen
    ns.state = ns.state || {
      cam: { x:0, y:0, zoom:1 },
      map: null,
      entities: [],
      obstacles: null, obstW:0, obstH:0,
      atlas: null, tilesetImg: null
    };
    ns.util = ns.util || {};
    // kleines Event-Bus-Utility (falls nicht vorhanden)
    if (typeof ns.util.on !== 'function' || typeof ns.util.emit !== 'function'){
      var _e = {};
      ns.util.on = function(type, fn){ (_e[type] = _e[type] || []).push(fn); };
      ns.util.emit = function(type, detail){ (_e[type]||[]).forEach(fn=>{ try{ fn(detail); }catch(_){} }); };
    }

    // Minimal-Renderer sicher initialisieren (nutzt core.render.js)
    function initRenderer(){
      try{
        var cvs = document.getElementById('game');
        if (!cvs){ LOG.warn('[engine] Canvas #game fehlt'); return; }
        if (!ns.Render || typeof ns.Render.init!=='function'){ LOG.warn('[engine] Render.init fehlt'); return; }
        ns.Render.init(cvs, cvs.getContext('2d'));
      }catch(e){ LOG.warn('[engine] Render-Init Fehler: '+(e?.message||e)); }
    }

    // Mini-Loader fürs Tileset (optional)
    async function loadTilesetIfPresent(){
      try{
        // Tileset optional (wenn vorhanden → schöner als Fallback-Farben)
        const res = await fetch('assets/tiles/tileset.json');
        if (!res.ok) return;
        ns.state.atlas = await res.json();
        const img = new Image(); img.decoding = 'async'; img.loading = 'eager';
        await new Promise((resolve,reject)=>{
          img.onload=resolve; img.onerror=reject; img.src='assets/tiles/tileset.png';
        });
        ns.state.tilesetImg = img;
      }catch(_){}
    }

    // Minimal-Engine: lädt Map & bereitet State vor
    async function startMinimalEngine(mapUrl){
      try{
        LOG.ok('[engine] Minimal-Engine aktiv (v17.4.0)');
        const cvs = document.getElementById('game');
        if (!cvs){ LOG.warn('[engine] Kein #game Canvas gefunden'); return; }

        // 1) Map laden
        const url = mapUrl || cvs.getAttribute('data-map') || 'assets/maps/map-mini.json';
        LOG.ok('GameLoader.start '+url);
        const r = await fetch(url);
        if (!r.ok) { LOG.warn('[engine] Map-Load fehlgeschlagen: '+url); return; }
        const map = await r.json();

        // 2) Map in State übernehmen
        var tile = (map.tile|0) || 64;
        ns.state.map = {
          width:  map.width|0,
          height: map.height|0,
          tile:   tile,
          layers: map.layers || []
        };
        // Kamera: Mittelpunkt
        ns.state.cam.x = Math.max(0, (ns.state.map.width*tile - cvs.clientWidth)/(2*ns.state.cam.zoom));
        ns.state.cam.y = Math.max(0, (ns.state.map.height*tile - cvs.clientHeight)/(2*ns.state.cam.zoom));

        // 3) Tileset optional
        await loadTilesetIfPresent();

        // 4) Renderer initialisieren & ersten Draw anstoßen
        initRenderer();
        window.dispatchEvent(new CustomEvent('cb:game-started'));
        window.dispatchEvent(new Event('cb:request-repaint'));
        LOG.ok('Map geladen: '+ns.state.map.width+'×'+ns.state.map.height+' · Tile '+tile);
        LOG.ok('Game gestartet');
      }catch(e){
        LOG.warn('[engine] Start-Fehler: '+(e?.message||e));
      }
    }

    ns.Engine = {
      start: startMinimalEngine
    };
  })();

  // ---------------------------------------------------------------------------
  // 3) Öffentliche Boot-API
  // ---------------------------------------------------------------------------
  window.GameBoot = window.GameBoot || {};
  GameBoot.start = function(mapUrl){
    if (started){ LOG.warn('[bootstrap] bereits gestartet'); return; }
    started = true;
    LOG.ok('[boot] Start via GameBoot.start');
    try{
      // neue Engine?
      if (ns.Engine && typeof ns.Engine.start==='function'){
        const cvs = document.getElementById('game');
        const url = mapUrl || cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
        LOG.ok('[boot.compat] Start: '+url);
        ns.Engine.start(url);
      } else if (window.Game && typeof Game.start==='function'){
        // Legacy-Fassade
        const cvs = document.getElementById('game');
        const url = mapUrl || cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
        LOG.ok('[boot.compat] Start (legacy): '+url);
        Game.start(url);
      } else if (window.GameLoader && typeof GameLoader.start==='function'){
        // ganz alter Pfad
        const cvs = document.getElementById('game');
        const url = mapUrl || cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
        LOG.ok('[boot.compat] Start (GameLoader): '+url);
        GameLoader.start(url);
      } else {
        LOG.warn('[boot] Keine Start-Implementierung gefunden');
      }
    }catch(e){ LOG.warn('[boot] Fehler: '+(e?.message||e)); }
  };

  // Auto-Start, sobald UI ready
  window.addEventListener('cb:ui-ready', function(){
    if (!started) GameBoot.start();
  });

  LOG.ok('[engine] ready (v17.4.0)');
})(window.GameCore = window.GameCore || {});
