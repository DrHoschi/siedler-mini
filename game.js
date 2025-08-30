// game.js — v16.1.20
// ---------------------------------------------------------
// Aufgaben dieses Moduls:
//  - Engine initialisieren (Canvas, Resize, DPR)
//  - Karten/Atlas laden und rendern
//  - Öffentliche Start-Funktion bereitstellen: GameLoader.start(mapUrl)
//  - Events & Logging:
//      * 'cb:engine-ready'  sobald Engine steht
//      * 'cb:game-started'  sobald Map gerendert ist
//      * optionale Hooks:   GameUI.onEngineReady(), GameUI.onGameStarted()
//  - Kompatibel zu deinem Inspector-Log (CBLog), ohne Layout zu beeinflussen
// ---------------------------------------------------------

(function(){
  // ===== Version/Logging =====================================================
  const VERSION = 'v16.1.20';

  // LOG-Helfer: nutzt CBLog (falls vorhanden), sonst Console
  const LOG = (lvl, msg) => {
    try {
      if (window.CBLog) {
        if (lvl === 'ok')        window.CBLog.ok(msg);
        else if (lvl === 'warn') window.CBLog.warn(msg);
        else if (lvl === 'err')  window.CBLog.err(msg);
        else                     window.CBLog.push(lvl || 'log', msg);
      } else {
        console[lvl === 'err' ? 'error' : (lvl === 'warn' ? 'warn' : 'log')](msg);
      }
    } catch(_){}
  };

  // ===== Öffentlicher Namespace =============================================
  const GL = window.GameLoader = window.GameLoader || {};
  // Für alte Aufrufer (Index/Inspector): sorge dafür, dass .start existiert
  if (!GL.start) GL.start = (...args) => GL._start?.(...args);

  // ===== Engine-State ========================================================
  let engineReady = false;
  let canvas = null, ctx = null;

  // Tileset/Atlas – belasse deine Pfade
  const TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  const TILESET_JSON = './assets/tiles/tileset.terrain.json';

  // Aktuelle Map/Assets
  let currentMap = null;
  let tilesetImg = null;
  let atlas = null;

  // ===== Hilfsfunktionen (Loader) ===========================================
  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden: '+src));
      img.src = src;
    });
  }

  async function loadJSON(url){
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP '+r.status+' beim Laden: '+url);
    return await r.json();
  }

  // ===== Renderer (minimal) ==================================================
  function renderMap(){
    if (!ctx || !currentMap) return;

    // Fallback-Farben, falls kein Atlas geladen werden konnte
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

    // Einfacher Kachel-Renderer: nutzt ersten Layer und map/layers[].data (Tile-IDs)
    const { width, height, tile, layers } = currentMap;
    const layer = Array.isArray(layers) ? layers[0] : null;
    const data  = layer && Array.isArray(layer.data) ? layer.data : null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y=0; y<height; y++){
      for (let x=0; x<width; x++){
        const idx = y*width + x;
        const tileId = data ? data[idx] : 0;          // 0 = leer
        const frame  = atlas?.frames?.[tileId];       // erwartet {x,y,w,h}
        if (frame){
          ctx.drawImage(
            tilesetImg,
            frame.x, frame.y, frame.w, frame.h,
            x*tile,  y*tile,  tile,   tile
          );
        } else {
          // unbekannte ID → neutraler Platzhalter
          ctx.fillStyle = '#889';
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
    }
  }

  // ===== Engine-Initialisierung =============================================
  function initEngine(){
    if (engineReady) return;

    // Nimm vorhandenes Canvas, falls vorhanden – ansonsten anlegen
    canvas = document.getElementById('game') || (function(){
      const c = document.createElement('canvas');
      c.id = 'game';
      document.body.appendChild(c);
      return c;
    })();
    ctx = canvas.getContext('2d');

    // Responsive Größe (bewahrt dein Layout; greift nur aufs Canvas zu)
    function fit(){
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const w = Math.max(320, Math.floor(window.innerWidth));
      const h = Math.max(240, Math.floor(window.innerHeight * 0.7));
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      LOG('ok', `Canvas ${w}x${h} dpr:${dpr}`);
      if (currentMap) renderMap();
    }
    window.addEventListener('resize', fit, { passive:true });
    fit();

    engineReady = true;
    LOG('ok', `game.js geladen, ${VERSION}`);

    // Event + optionaler Hook für die UI
    window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail:{ v: VERSION }}));
    try { window.GameUI?.onEngineReady?.(); } catch(_){}

    // Falls der Index/Inspector einen Start-Klick vor Engine-Init gepuffert hat:
    try { GL._flush?.(); } catch(_){}
  }

  // ===== Öffentliche Start-Funktion =========================================
  GL._start = async function(mapUrl){
    try{
      if (!engineReady) initEngine();

      LOG('ok', `GameLoader.start ${mapUrl}`);

      // 1) Map laden – robuste Defaults
      const map = await loadJSON(mapUrl);
      const width  = map.width  || 16;
      const height = map.height || 10;
      const tile   = map.tile   || map.tileSize || 64;

      // Map-Daten ins interne Format überführen
      currentMap = {
        width, height, tile,
        // Erlaubt: map.layers[].data ODER map.tiles[]
        layers: map.layers || [{ name:'ground', data: map.tiles || [] }]
      };

      // 2) Atlas + Tileset laden
      try{
        const [json, img] = await Promise.all([
          loadJSON(TILESET_JSON),
          loadImage(TILESET_PNG)
        ]);
        atlas = json;
        tilesetImg = img;
      }catch(e){
        atlas = null;
        tilesetImg = null;
        LOG('warn', 'Atlas/Textures nicht geladen: '+e.message);
      }

      // 3) Rendern
      renderMap();

      // 4) Events/Logs  ---------------------------------------------
      LOG('ok', `Game gestartet (${mapUrl})`);

      // >>> GENAU HIER: Deine gewünschten Events/Hooks <<<
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }}));
      window.GameUI?.onGameStarted?.();   // optionaler Hook

      return true;
    }catch(e){
      LOG('err', 'Start fehlgeschlagen: '+e.message);
      throw e;
    }
  };

  // Stelle sicher, dass auch GL.start existiert (Alias für _start)
  GL.start = GL._start;

  // ===== Auto-Init ===========================================================
  try {
    initEngine();
  } catch(e){
    LOG('err', 'Engine-Init Fehler: '+e.message);
  }

  // ===== Optionale, harmlose Fallback-API für den Inspector ==================
  // (Falls dein Inspector ein globales Objekt erwartet. Nicht layoutrelevant.)
  window.GameInspector = window.GameInspector || {
    // Kein echtes Panel hier – dein inspector.js kümmert sich darum.
    // Diese Stub-Funktion verhindert nur Fallback-Alerts im Notfall.
    toggle(){ window.dispatchEvent(new CustomEvent('cb:inspector-toggle')); }
  };
})();
