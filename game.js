// game.js — v16.1.17
// Initialisiert Canvas/Engine, stellt GameLoader._start(mapUrl) bereit,
// rendert die Map (einfach), lädt Tileset-Atlas, dispatcht cb:engine-ready / cb:game-started,
// loggt alles nach CBLog (falls vorhanden).

(function(){
  const VERSION = 'v16.1.17';
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

  const GL = window.GameLoader = window.GameLoader || {};

  let engineReady = false;
  let canvas = null, ctx = null;

  const TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  const TILESET_JSON = './assets/tiles/tileset.terrain.json';

  let currentMap = null;
  let tilesetImg = null;
  let atlas = null;

  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error('Bild konnte nicht geladen werden: '+src));
      img.src = src;
    });
  }
  async function loadJSON(url){
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP '+r.status+' beim Laden: '+url);
    return await r.json();
  }

  function renderMap(){
    if (!ctx || !currentMap) return;

    // Kein Atlas? -> Fallback-Kacheln
    if (!atlas || !tilesetImg){
      const { width, height, tile } = currentMap;
      const colors = ['#365c2c','#3f6a32','#477739','#50853f'];
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for (let y=0; y<height; y++){
        for (let x=0; x<width; x++){
          ctx.fillStyle = colors[(x+y)%colors.length];
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
      LOG('warn', 'Atlas nicht angegeben → Fallback-Farben');
      return;
    }

    const { width, height, tile, layers } = currentMap;
    const layer = Array.isArray(layers) ? layers[0] : null;
    const data  = layer && Array.isArray(layer.data) ? layer.data : null;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let y=0; y<height; y++){
      for (let x=0; x<width; x++){
        const idx = y*width + x;
        const tileId = data ? data[idx] : 0; // 0 = leer
        const frame = atlas.frames && atlas.frames[tileId];
        if (frame){
          ctx.drawImage(tilesetImg, frame.x, frame.y, frame.w, frame.h, x*tile, y*tile, tile, tile);
        } else {
          ctx.fillStyle = '#6a7';
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
    }
  }

  function fitCanvas(){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    const w = Math.max(320, Math.floor(window.innerWidth));
    const h = Math.max(240, Math.floor(window.innerHeight));
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    LOG('ok', `Canvas ${w}x${h} dpr:${dpr}`);
    if (currentMap) renderMap();
  }

  function initEngine(){
    if (engineReady) return;
    canvas = document.getElementById('game') || (function(){
      const c = document.createElement('canvas'); c.id='game'; document.body.appendChild(c); return c;
    })();
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', fitCanvas, { passive:true });
    fitCanvas();

    engineReady = true;
    LOG('ok', `game.js geladen, game.js ${VERSION}`);
    window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail:{ v: VERSION }}));
  }

  GL._start = async function(mapUrl){
    try{
      if (!engineReady) initEngine();
      LOG('ok', `GameLoader.start ${mapUrl}`);

      // Map laden (kompatibel zu deinen Dateien)
      const map = await loadJSON(mapUrl);
      const width  = map.width  || 16;
      const height = map.height || 10;
      const tile   = map.tile   || map.tileSize || 64;
      const layers = map.layers || [{ name:'ground', data: map.tiles || [] }];

      currentMap = { width, height, tile, layers };

      // Atlas/Tileset laden
      try{
        [atlas, tilesetImg] = await Promise.all([
          loadJSON(TILESET_JSON),
          loadImage(TILESET_PNG)
        ]);
      }catch(e){
        atlas = null; tilesetImg = null;
        LOG('warn', 'Atlas/Textures nicht geladen: ' + e.message);
      }

      renderMap();

      // Events/Logs
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }}));
      try { window.GameUI?.onGameStarted?.(); } catch(_){}
      LOG('ok', `Game gestartet (${mapUrl})`);
      return true;
    }catch(e){
      LOG('err', 'Start fehlgeschlagen: ' + (e?.message||e));
      throw e;
    }
  };

  // Autoinit
  try { initEngine(); } catch(e){ LOG('err','Engine-Init Fehler: '+e.message); }
})();
