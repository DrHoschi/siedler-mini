// game.js — v16.1.16
// ---------------------------------------------------------
// Ziel:
// - Engine initialisieren
// - GameLoader._start(mapUrl) bereitstellen
// - Nach Init: GameLoader._flush() aufrufen (damit index-Queue startet)
// - Bei erfolgreichem Start: Event 'cb:game-started' dispatchen
// - Logging via CBLog (falls vorhanden)
// ---------------------------------------------------------

(function(){
  const VERSION = 'v16.1.16';
  const LOG = (lvl, msg)=> {
    try{
      if (window.CBLog) {
        if (lvl==='ok')   window.CBLog.ok(msg);
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

  // Tileset / Atlas (behalte deine Pfade)
  const TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  const TILESET_JSON = './assets/tiles/tileset.terrain.json';

  // aktuelle Map-Daten / Layer
  let currentMap = null;
  let tilesetImg = null;
  let atlas = null;

  // Utility: Image laden als Promise
  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = (e)=> reject(new Error('Bild konnte nicht geladen werden: '+src));
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
      // einfache Fallback-Farben
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
          // unbekannte ID → neutral
          ctx.fillStyle = '#889';
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
    }
  }

  // ---- Engine-Aufbau ----
  function initEngine(){
    if (engineReady) return;

    // Canvas holen/anlegen (dein Canvas beibehalten, falls vorhanden)
    canvas = document.getElementById('game') || (function(){
      const c = document.createElement('canvas');
      c.id = 'game';
      document.body.appendChild(c);
      return c;
    })();
    ctx = canvas.getContext('2d');

    // Canvas Größe dynamisch (einfacher Fit; du hast eigene Logik? Lass sie bestehen.)
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

  // ---- Öffentliche Start-Implementierung ----
  GL._start = async function(mapUrl){
    try{
      if (!engineReady) initEngine();

      LOG('ok', `GameLoader.start ${mapUrl}`);

      // 1) Map laden
      const map = await loadJSON(mapUrl);
      // Erwartete Felder absichern
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
      // Optionaler Hook (dein Wunsch)
      try{ window.GameUI?.onGameStarted?.(); }catch(_){}

      return true;
    }catch(e){
      LOG('err', 'Start fehlgeschlagen: '+e.message);
      throw e;
    }
  };

  // Auto-Init der Engine, wenn Script geladen
  try { initEngine(); } catch(e){ LOG('err','Engine-Init Fehler: '+e.message); }
})();
