/* ============================================================================
 * Siedler-Mini – GAME CORE (game.js)
 * Version: 16.0.4
 * Build date: 2025-08-25
 *
 * Ziel dieser Version:
 *  - Garantiert globales API: window.GameLoader.start(...) ist SOFORT vorhanden
 *  - Robuste Fallbacks (Tileset/Map), damit Start nie „ins Leere“ läuft
 *  - Konsistente Debug-Logs mit Symbolen (OK/⚠️/✖️) – passend zu index v16.0.4
 *  - Minimaler Platzhalter-Render (grüne Fläche), bis Assets da sind
 *  - Keine Seiteneffekte beim Laden: nichts startet automatisch
 *
 * Erwartete Pfade (können aus index.html übergeben werden):
 *  - mapUrl:      "./assets/maps/map-mini.json"  (oder andere)
 *  - tilesetAtlas "./assets/tiles/tileset.terrain.json" (+ .png)
 *  - tilesetImage "./assets/tiles/tileset.terrain.png"
 *
 * Public API:
 *   window.GameLoader.start({ canvas, mapUrl, onReady })
 *   window.GameLoader.stop()
 *   window.Game.version  -> "16.0.4"
 * ============================================================================
 */

/* --------------------------------- LOGGER --------------------------------- */

(function attachLogger(global){
  const LEVELS = {
    ok:   { tag: 'OK',   color: '#7CDE72', icon: '✅' },
    warn: { tag: 'WARN', color: '#FFD166', icon: '⚠️' },
    err:  { tag: 'ERR',  color: '#FF6B6B', icon: '❌' },
    info: { tag: 'INFO', color: '#9EC5FE', icon: '🛈' },
  };

  function time(){
    const d = new Date();
    return `[${d.toTimeString().slice(0,8)}]`;
  }

  function line(level, msg){
    const L = LEVELS[level] || LEVELS.info;
    const s = `${time()} (${L.tag}) ${msg}`;
    try {
      const css = `color:${L.color}; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      console.log(`%c${s}`, css);
    } catch(e){ console.log(s); }
    // zusätzlich: DOM-Logger Signal (optional; index hört darauf)
    try {
      global.dispatchEvent(new CustomEvent('game-log', {
        detail: { level, text: msg, at: new Date().toISOString() }
      }));
    } catch(_) {}
  }

  const Logger = {
    ok:   (m) => line('ok',   m),
    warn: (m) => line('warn', m),
    err:  (m) => line('err',  m),
    info: (m) => line('info', m),
  };

  // global verfügbar machen
  global.GameLog = Logger;
})(window);


/* ------------------------------- UTIL: FETCH ------------------------------- */

const GameUtil = (() => {

  async function fetchJSON(url){
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      const txt = await res.text();
      try {
        return JSON.parse(txt);
      } catch(parseErr){
        GameLog.err(`JSON Parse fail bei "${url}" – ${parseErr.message}`);
        GameLog.info(`Snippet: ${txt.slice(0, 120)}…`);
        return null;
      }
    } catch(err){
      GameLog.err(`fetch fail bei "${url}" – ${String(err)}`);
      return null;
    }
  }

  function loadImage(url){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error(`IMG fail ${url}`));
      img.src = url;
    });
  }

  // Atlas (TexturePacker-ähnlich): erlaubt „image“ im JSON oder Zwangs-Image-Pfad als Fallback
  async function loadTileset({ atlasUrl, fallbackImageUrl }){
    const atlas = await fetchJSON(atlasUrl);
    let imageUrl = null;

    if (atlas && atlas.meta && atlas.meta.image) {
      // Häufige Varianten: "tileset.terrain.png" oder "./tileset.terrain.png"
      const base = new URL(atlasUrl, location.href);
      try {
        imageUrl = new URL(atlas.meta.image, base).toString();
      } catch {
        // relative Auflösung selbst basteln
        const p = atlasUrl.replace(/[^/]+$/, '');
        imageUrl = p + atlas.meta.image.replace(/^\.\//, '');
      }
    } else if (fallbackImageUrl) {
      imageUrl = fallbackImageUrl;
      GameLog.warn(`Atlas JSON ohne/ungültiges image → Fallback IMG ${fallbackImageUrl}`);
    }

    let image = null;
    if (imageUrl){
      try {
        image = await loadImage(imageUrl);
        GameLog.ok(`Tileset (atlas) OK ${image.width}x${image.height}`);
      } catch(e){
        GameLog.err(`Tileset Bild konnte nicht geladen werden: ${e.message}`);
      }
    } else {
      GameLog.warn(`Kein Tileset-Bildpfad ableitbar; Renderer verwendet Platzhalter.`);
    }

    return { atlas, image, imageUrl };
  }

  return { fetchJSON, loadImage, loadTileset };
})();


/* ------------------------------- MAP PARSER ------------------------------- */

function parseMap(json){
  if (!json || typeof json !== 'object'){
    return { ok:false, reason:'Map JSON ist leer/ungültig' };
  }

  // Unterstützt zwei einfache Formen:
  //  A) { width,height,tileSize, tiles: number[][] }
  //  B) { width,height,tileSize, layers:[{name:"ground", tiles:number[][]}, ...] }
  const width  = json.width  || (json.layers && json.layers[0] && json.layers[0].tiles && json.layers[0].tiles[0]?.length) || 0;
  const height = json.height || (json.layers && json.layers[0] && json.layers[0].tiles?.length) || 0;
  const tile   = json.tileSize || 64;

  if (!width || !height){
    return { ok:false, reason:'Map: width/height fehlen oder sind 0' };
  }

  let layers = [];
  if (Array.isArray(json.layers) && json.layers.length){
    layers = json.layers.map(l => ({
      name: l.name || 'layer',
      tiles: Array.isArray(l.tiles) ? l.tiles : [],
    }));
    GameLog.info('Map layers via json.layers');
  } else if (Array.isArray(json.tiles)) {
    layers = [{ name:'ground', tiles: json.tiles }];
    GameLog.info('Map layer via 2D grid/matrix/tiles');
  } else {
    return { ok:false, reason:'Map: layers fehlen/leer' };
  }

  return { ok:true, width, height, tile, layers };
}


/* -------------------------------- RENDERER -------------------------------- */

function createRenderer(canvas, mapInfo, tileset){
  const ctx = canvas.getContext('2d');
  const { width, height, tile } = mapInfo;

  // Canvas dimensionieren (CSS-Unabhängig), einfache DPR-Skalierung
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = width * tile * dpr;
  canvas.height = height * tile * dpr;
  canvas.style.width  = `${width * tile}px`;
  canvas.style.height = `${height * tile}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  function drawPlaceholder(){
    ctx.fillStyle = '#2f5d2f'; // grün
    ctx.fillRect(0, 0, width*tile, height*tile);
    // leichte Schachbrett-Andeutung, damit man Grid sieht
    ctx.globalAlpha = 0.08;
    for (let y=0; y<height; y++){
      for (let x=0; x<width; x++){
        if ((x+y)%2===0){
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Minimaler Tile-Draw; solange Frame-Mapping nicht festgelegt ist,
  // zeichnen wir Tiles als farbige Blöcke; wenn ein Tileset-Bild vorhanden
  // ist, wird die 0-Kachel aus dem Bild verwendet.
  function draw(){
    if (!tileset || !tileset.image){
      drawPlaceholder();
      return;
    }

    // „dummes“ Beispiel: jedes Tile = dieselbe Textur (0,0,64,64)
    const sx=0, sy=0, sw=64, sh=64;

    const ground = mapInfo.layers[0]?.tiles || [];
    for (let y=0; y<ground.length; y++){
      const row = ground[y];
      for (let x=0; x<row.length; x++){
        // spätere Logik kann anhand des Tile-Wertes andere Frames wählen
        ctx.drawImage(tileset.image, sx, sy, sw, sh, x*tile, y*tile, tile, tile);
      }
    }
  }

  return { draw, resize: ()=>{} };
}


/* ----------------------------- GAMELOADER CORE ---------------------------- */

(function attachGameAPI(global){

  const GAME_VERSION = '16.0.4';

  // interne State
  let _running = false;
  let _renderer = null;

  async function start(opts){
    // Pflichtparameter absichern
    const canvas = opts?.canvas || document.getElementById('game-canvas');
    const mapUrl = opts?.mapUrl || './assets/maps/map-mini.json';
    const onReady = typeof opts?.onReady === 'function' ? opts.onReady : () => {};

    if (!canvas){
      GameLog.err('Start abgebrochen: Canvas nicht gefunden (id="game-canvas"?)');
      return false;
    }

    GameLog.info(`GameLoader.start → map: ${mapUrl}`);

    // 1) Map laden & parsen
    const mapJson = await GameUtil.fetchJSON(mapUrl);
    if (!mapJson){
      alert('Karte konnte nicht geladen werden. Öffne Startmenü erneut.');
      return false;
    }
    const mapInfo = parseMap(mapJson);
    if (!mapInfo.ok){
      GameLog.err(`Map LOAD FAIL ${mapInfo.reason}`);
      alert('Karte konnte nicht geladen werden. Öffne Startmenü erneut.');
      return false;
    }
    GameLog.ok(`Map OK size ${mapInfo.width}x${mapInfo.height} tile ${mapInfo.tile}`);

    // 2) Tileset/Atlas versuchen (ohne hart zu scheitern)
    const atlasUrl = './assets/tiles/tileset.terrain.json';
    const imageUrl = './assets/tiles/tileset.terrain.png';
    const tileset = await GameUtil.loadTileset({ atlasUrl, fallbackImageUrl: imageUrl });

    // 3) Renderer
    _renderer = createRenderer(canvas, mapInfo, tileset);
    _renderer.draw();

    // 4) Running-Flag & Callback
    _running = true;
    GameLog.ok('Game started');
    try { onReady(); } catch(_) {}

    return true;
  }

  function stop(){
    _running = false;
    _renderer = null;
    GameLog.warn('Game stopped');
  }

  // GLOBALS bereitstellen — WICHTIG: sofort, ohne async
  global.Game = Object.freeze({ version: GAME_VERSION });
  global.GameLoader = {
    start, stop,
    get running(){ return _running; }
  };

  // Für Umgebungen, die auf „startGame“ hören:
  global.startGame = start;

  GameLog.ok(`script load ok game.js ${GAME_VERSION}`);

})(window);

/* ============================== END OF FILE =============================== */
