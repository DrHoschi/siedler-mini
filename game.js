// game.js — v16.1.16
// ---------------------------------------------------------
// Ziel:
// - Engine initialisieren
// - GameLoader.start(mapUrl) zuverlässig bereitstellen (Queue, falls früh aufgerufen)
// - Map + Tileset-Atlas laden und Boden rendern (Fallback-Farben falls Atlas fehlt)
// - Nach Start: Event 'cb:game-started' dispatchen + GameUI.onGameStarted() hook
// - Detailliertes Logging via CBLog (falls vorhanden)
// ---------------------------------------------------------

(function(){
  const VERSION = 'v16.1.16';
  const LOG = (lvl, msg)=> {
    try{
      if (window.CBLog) {
        if (lvl==='ok')      window.CBLog.ok(msg);
        else if (lvl==='warn') window.CBLog.warn(msg);
        else if (lvl==='err')  window.CBLog.err(msg);
        else window.CBLog.push(lvl||'log', msg);
      } else {
        console[lvl==='err'?'error':lvl==='warn'?'warn':'log'](msg);
      }
    }catch(_){}
  };

  // Public Namespace
  const GL = window.GameLoader = window.GameLoader || {};

  // ------ Engine State ------
  let engineReady = false;
  let canvas = null, ctx = null;

  // Tileset / Atlas (Pfad gemäß deiner Struktur)
  const TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  const TILESET_JSON = './assets/tiles/tileset.terrain.json';

  // aktuelle Map-Daten / Layer
  let currentMap = null;
  let tilesetImg = null;
  let atlas = null;

  // Utility: Image laden
  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error('Bild konnte nicht geladen werden: '+src));
      img.src = src;
    });
  }

  // Utility: JSON laden
  async function loadJSON(url){
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP '+r.status+' beim Laden: '+url);
    return await r.json();
  }

  // ---- Minimal-Renderer (Hintergrund-Kacheln) ----
  function renderMap(){
    if (!ctx || !currentMap) return;

    // Falls kein Atlas: Fallback einfärben
    if (!atlas || !tilesetImg){
      const { width, height, tile } = currentMap;
      const colors = ['#5a7a39','#6b8f3e','#7aa346','#90b45a'];
      for (let y=0; y<height; y++){
        for (let x=0; x<width; x++){
          ctx.fillStyle = colors[(x+y)%colors.length];
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
      LOG('warn', 'Atlas nicht angegeben → Fallback-Farben');
      return;
    }

    // Mit Atlas (vereinfachter Renderer; nimmt first-layer / tileIndex)
    const { width, height, tile, layers } = currentMap;
    const layer = Array.isArray(layers) ? layers[0] : null;
    const data = layer && Array.isArray(layer.data) ? layer.data : null;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    for (let y=0; y<height; y++){
      for (let x=0; x<width; x++){
        const idx = y*width + x;
        const tileId = data ? data[idx] : 0; // 0 = leer
        const frame = atlas.frames && atlas.frames[tileId];
        if (frame){
          ctx.drawImage(tilesetImg, frame.x, frame.y, frame.w, frame.h, x*tile, y*tile, tile, tile);
        } else {
          ctx.fillStyle = '#889';
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
    }
  }

  // ---- Engine-Aufbau ----
  function initEngine(){
    if (engineReady) return;

    // Canvas holen/anlegen (bestehend nutzen)
    canvas = document.getElementById('game') || (function(){
      const c = document.createElement('canvas');
      c.id = 'game';
      document.body.appendChild(c);
      return c;
    })();
    ctx = canvas.getContext('2d');

    // Canvas Größe dynamisch
    function fit(){
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
      const w = Math.max(320, Math.floor(window.innerWidth));
      const h = Math.max(240, Math.floor(window.innerHeight*0.7));
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      LOG('ok', `Canvas ${w}x${h} dpr:${dpr}`);
      if (currentMap) renderMap();
    }
    window.addEventListener('resize', fit);
    fit();

    engineReady = true;
    LOG('ok', `game.js geladen, game.js ${VERSION}`);
    window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail:{ v: VERSION }}));

    // WICHTIG: evtl. gepufferte Starts abarbeiten
    if (GL._flush) GL._flush();
  }

  // ---- Start-Queue (falls Index früher aufruft) ----
  const startQueue = [];
  GL.start = function(mapUrl){
    // öffentliche API
    if (!engineReady) {
      startQueue.push(mapUrl);
      LOG('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
    } else {
      return _start(mapUrl);
    }
  };
  GL._flush = function(){
    while (engineReady && startQueue.length){
      const url = startQueue.shift();
      _start(url);
    }
  };

  // ---- Eigentliche Start-Implementierung ----
  async function _start(mapUrl){
    try{
      if (!engineReady) initEngine();

      LOG('ok', `GameLoader.start ${mapUrl}`);

      // 1) Map laden
      const map = await loadJSON(mapUrl);
      const width  = map.width  || 16;
      const height = map.height || 10;
      const tile   = map.tile   || map.tileSize || 64;

      currentMap = {
        width, height, tile,
        layers: map.layers || [{ name:'ground', data: map.tiles || [] }]
      };

      // 2) Atlas + Tileset laden (wenn vorhanden)
      try{
        [atlas, tilesetImg] = await Promise.all([
          loadJSON(TILESET_JSON),
          loadImage(TILESET_PNG)
        ]);
      }catch(e){
        atlas = null; tilesetImg = null;
        LOG('warn', 'Atlas/Textures nicht geladen: '+e.message);
      }

      // 3) Rendern
      renderMap();

      // 4) Events/Logs
      LOG('ok', `Game gestartet (${mapUrl})`);
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }}));
      try{ window.GameUI?.onGameStarted?.(); }catch(_){}

      return true;
    }catch(e){
      LOG('err', 'Start fehlgeschlagen: '+e.message);
      throw e;
    }
  }

  // Auto-Init
  try { initEngine(); } catch(e){ LOG('err','Engine-Init Fehler: '+e.message); }
})();
