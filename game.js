// game.js — v16.1.18
// ---------------------------------------------------------
// Initialisiert die Engine, registriert GameLoader._start(mapUrl)
// und sendet Events ('cb:engine-ready', 'cb:game-started').
// Zeigt ausführliche Logs über CBLog (falls vorhanden).
// ---------------------------------------------------------

(function(){
  'use strict';
  const VERSION = 'v16.1.18';

  // ---- Logging Helper -------------------------------------------------------
  const log = {
    ok:   (m)=> (window.CBLog?.ok ?? console.log)(m),
    warn: (m)=> (window.CBLog?.warn ?? console.warn)(m),
    err:  (m)=> (window.CBLog?.err ?? console.error)(m),
    raw:  (m)=> (window.CBLog?.push ?? console.log)('LOG', m),
  };

  // Public Namespace
  const GL = (window.GameLoader = window.GameLoader || {});

  // Engine State
  let engineReady = false;
  let canvas = null, ctx = null;

  // Tileset / Atlas – deine Pfade
  const TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  const TILESET_JSON = './assets/tiles/tileset.terrain.json';

  // aktuelle Map & Assets
  let currentMap = null;
  let tilesetImg = null;
  let atlas = null;

  // -- Utils ------------------------------------------------------------------
  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload  = ()=> resolve(img);
      img.onerror = ()=> reject(new Error('Bild konnte nicht geladen werden: '+src));
      img.src = src;
    });
  }
  async function loadJSON(url){
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP '+r.status+' beim Laden: '+url);
    return await r.json();
  }

  // -- Minimal-Renderer (Kacheln) --------------------------------------------
  function renderMap(){
    if(!ctx || !currentMap) return;

    const { width, height, tile } = currentMap;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(!atlas || !tilesetImg){
      // Fallback: einfache Farbkacheln
      const colors = ['#5a7a39','#6b8f3e','#7aa346','#90b45a'];
      for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
          ctx.fillStyle = colors[(x+y)%colors.length];
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
      log.warn('Atlas nicht angegeben → Fallback-Farben');
      return;
    }

    const layer = Array.isArray(currentMap.layers) ? currentMap.layers[0] : null;
    const data  = layer && Array.isArray(layer.data) ? layer.data : null;

    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        const idx = y*width + x;
        const tileId = data ? data[idx] : 0;
        const frame = atlas.frames && atlas.frames[tileId];
        if(frame){
          ctx.drawImage(tilesetImg, frame.x, frame.y, frame.w, frame.h,
                        x*tile, y*tile, tile, tile);
        }else{
          ctx.fillStyle = '#889';
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
    }
  }

  // -- Engine Init ------------------------------------------------------------
  function initEngine(){
    if(engineReady) return;

    canvas = document.getElementById('game') || (()=>{
      const c = document.createElement('canvas');
      c.id='game';
      document.body.appendChild(c);
      return c;
    })();
    ctx = canvas.getContext('2d');

    function fit(){
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
      const w = Math.max(320, Math.floor(window.innerWidth));
      const h = Math.max(240, Math.floor(window.innerHeight*0.7));
      canvas.width  = Math.floor(w*dpr);
      canvas.height = Math.floor(h*dpr);
      canvas.style.width  = w+'px';
      canvas.style.height = h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      if(currentMap) renderMap();
    }
    window.addEventListener('resize', fit);
    fit();

    engineReady = true;
    log.ok(`game.js geladen, game.js ${VERSION}`);
    window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail:{ v: VERSION }}));

    // Flush evtl. gepufferte Start-Befehle
    try{ GL._flush?.(); }catch(_){}
  }

  // -- Public Start -----------------------------------------------------------
  GL._start = async function(mapUrl){
    try{
      if(!engineReady) initEngine();

      log.ok(`GameLoader.start ${mapUrl}`);

      // 1) Map laden/normalisieren
      const map = await loadJSON(mapUrl);
      const width  = map.width  ?? 16;
      const height = map.height ?? 10;
      const tile   = map.tile   ?? map.tileSize ?? 64;

      currentMap = {
        width, height, tile,
        layers: map.layers || [{ name:'ground', data: map.tiles || [] }]
      };

      // 2) Atlas + Tileset
      try{
        [atlas, tilesetImg] = await Promise.all([
          loadJSON(TILESET_JSON),
          loadImage(TILESET_PNG)
        ]);
      }catch(e){
        atlas=null; tilesetImg=null;
        log.warn('Atlas/Textures nicht geladen: '+e.message);
      }

      // 3) Render
      renderMap();

      // 4) Events/Logs
      log.ok(`Game gestartet (${mapUrl})`);
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }}));
      try{ window.GameUI?.onGameStarted?.(); }catch(_){}

      return true;
    }catch(e){
      log.err('Start fehlgeschlagen: '+e.message);
      throw e;
    }
  };

  // Auto-Init sofort beim Laden der Datei
  try{ initEngine(); }catch(e){ log.err('Engine-Init Fehler: '+e.message); }

  // Globale Version sichtbar machen (optional)
  GL.version = VERSION;
})();
