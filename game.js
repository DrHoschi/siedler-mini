<!-- game.js v16.1.1 -->
<script>
(() => {
  const VERSION = '16.1.1';

  // ---- Utils --------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const logEl = $('#logText') || {appendChild(){},scrollTop:0,scrollHeight:0};

  const stamp = () => new Date().toTimeString().split(' ')[0];
  const ICON = {
    ok: '✅',
    warn: '⚠️',
    err: '❌',
    info: 'ℹ️',
  };
  function log(level, msg) {
    const line = `[${stamp()}] ${ICON[level]||''} (${level}) ${msg}\n`;
    if (logEl && logEl.textContent !== undefined) {
      logEl.textContent += line;
      logEl.scrollTop = logEl.scrollHeight;
    }
    // console mirror
    (level==='err' ? console.error : level==='warn' ? console.warn : console.log)(msg);
  }

  // ---- Canvas bootstrap ---------------------------------------------------
  const canvas = $('#game');
  const ctx = canvas?.getContext?.('2d') || null;

  function setCanvasSize() {
    if (!canvas) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.floor(canvas.clientWidth);
    const h = Math.floor(canvas.clientHeight);
    canvas.width  = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    log('ok', `Canvas ${canvas.width/dpr|0}x${canvas.height/dpr|0} dpr:${dpr}`);
  }

  // initial canvas paint (placeholder)
  function placeholder(text='PLACEHOLDER-RENDER') {
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#2e5a2e';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`${text} (game.js)`, 10, 18);
  }

  // ---- Game namespace -----------------------------------------------------
  const Game = {
    version: VERSION,
    state: { started:false, map:null, atlas:null },
    setStarted(v) { this.state.started = v; },
  };
  window.Game = Game; // for inspector/editor hooks

  // ---- Robust resource helpers -------------------------------------------
  async function fetchJson(url) {
    let res;
    try {
      res = await fetch(url, {cache:'no-store'});
    } catch (e) {
      throw new Error(`NET_FAIL ${url} – ${e?.message||e}`);
    }
    if (!res.ok) {
      throw new Error(`HTTP_${res.status} ${url}`);
    }
    try {
      return await res.json();
    } catch (e) {
      throw new Error(`JSON_PARSE_FAIL ${url} – ${e?.message||e}`);
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`IMG_FAIL ${url}`));
      img.src = url + (url.includes('?') ? '&' : '?') + `cb=${Date.now()}`;
    });
  }

  // ---- Map validation -----------------------------------------------------
  function validateMap(map) {
    if (!map || typeof map !== 'object') return 'MAP_EMPTY';
    const {width, height, tileSize, tileset} = map;
    if (!width || !height) return 'MAP_DIM_ZERO';
    if (!tileSize) return 'TILESIZE_MISSING';
    if (!tileset || !tileset.image) return 'TILESET_MISSING';
    return null;
  }

  // ---- Start pipeline -----------------------------------------------------
  async function start(mapPath) {
    const labelPath = mapPath || './assets/maps/map-mini.json';
    log('ok', `Start gedrückt → ${labelPath}`);

    try {
      // load map
      const map = await fetchJson(labelPath);
      const vErr = validateMap(map);
      if (vErr) throw new Error(vErr);

      // load tileset image
      const img = await loadImage(map.tileset.image);

      // announce what we have
      log('ok', `Tileset (atlas) OK ${img.width}x${img.height}`);
      log('ok', `Map OK size ${map.width}x${map.height} tile ${map.tileSize}`);

      // simple render
      placeholder('RENDER');
      // (demo) draw grid
      if (ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        for (let x=0;x<=map.width;x++) {
          ctx.beginPath();
          ctx.moveTo(x*map.tileSize, 0);
          ctx.lineTo(x*map.tileSize, map.height*map.tileSize);
          ctx.stroke();
        }
        for (let y=0;y<=map.height;y++) {
          ctx.beginPath();
          ctx.moveTo(0, y*map.tileSize);
          ctx.lineTo(map.width*map.tileSize, y*map.tileSize);
          ctx.stroke();
        }
        ctx.restore();
      }

      Game.state.map = map;
      Game.state.atlas = img;
      Game.setStarted(true);
      log('ok', 'Game started');
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      // map specific friendly messages
      if (msg.startsWith('HTTP_') || msg.startsWith('NET_FAIL')) {
        log('err', `Start fehlgeschlagen: Ressourcenfehler (${msg})`);
      } else if (msg.startsWith('JSON_PARSE_FAIL')) {
        log('err', `Start fehlgeschlagen: Defekte JSON (${msg})`);
      } else if (msg === 'MAP_DIM_ZERO' || msg === 'MAP_EMPTY' || msg === 'TILESIZE_MISSING' || msg === 'TILESET_MISSING') {
        const friendly = {
          MAP_EMPTY: 'Map leer/ungültig',
          MAP_DIM_ZERO: 'Map: width/height fehlen oder sind 0',
          TILESIZE_MISSING: 'Map: tileSize fehlt',
          TILESET_MISSING: 'Map: tileset.image fehlt',
        }[msg];
        log('err', `Start fehlgeschlagen: ${friendly}`);
      } else {
        log('err', `Start fehlgeschlagen: Unbekannter Fehler (${msg})`);
      }
      Game.setStarted(false);
      throw e; // rethrow for dev console
    }
  }

  // ---- Loader facade (exposed) -------------------------------------------
  const GameLoader = {
    version: VERSION,
    async start(path) {
      return start(path);
    }
  };
  window.GameLoader = GameLoader;

  // ---- Editor/Inspector dummies (until real modules are wired) -----------
  if (!window.GameEditor) {
    window.GameEditor = {
      open() { log('warn', '(Dummy) Editor.open() – echtes Modul noch nicht eingebunden.'); }
    };
  }
  if (!window.GameInspector) {
    window.GameInspector = {
      toggle() {
        const on = !document.body.classList.contains('inspector-on');
        document.body.classList.toggle('inspector-on', on);
        log('ok', `Inspector: ${on ? 'an' : 'aus'}`);
      }
    };
  }

  // ---- Boot ---------------------------------------------------------------
  window.addEventListener('resize', setCanvasSize);
  window.addEventListener('orientationchange', setCanvasSize);

  window.addEventListener('load', () => {
    setCanvasSize();
    placeholder();
    // self-report versions so der Log immer beide sieht
    log('ok', `game.js initialisiert (Index meldet v${(window.__UI_VERSION__||'unbekannt')})`);
    log('ok', `game.js geladen (v${VERSION})`);
    // optional: auto-start map if URL has ?map=...
    const params = new URLSearchParams(location.search);
    const map = params.get('map');
    if (map) {
      GameLoader.start(map).catch(()=>{ /* already logged */ });
    }
  });

  // expose for index buttons
  window.__GameStart__ = (path) => GameLoader.start(path).catch(()=>{});
  window.__GameVersion__ = VERSION;
})();
</script>
