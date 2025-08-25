/* Siedler‑Mini — game.js — v16.0.2
   - Stellt global window.startGame bereit (Fix für "startGame is not a function")
   - Leichtgewichtiger Loader (Map + optionales Tileset) + Logging in Inspector
   - Robuste URL-Auflösung (Safari) + JSONC-Support + Placeholder-Fallback
*/

(() => {
  // --------------------------------------------------------------------------
  // Version & Globals
  // --------------------------------------------------------------------------
  const APP = { NAME: 'Siedler‑Mini', VERSION: '16.0.2' };
  window.APP = APP;

  // --------------------------------------------------------------------------
  // Mini‑Inspector/BootUI
  // --------------------------------------------------------------------------
  const insp = {
    box: document.getElementById('insp-log'),
    count: document.getElementById('insp-count'),
    _buffer: [],
    push(line) {
      const stamp = new Date().toTimeString().slice(0,8);
      const s = `[${stamp}] ${line}`;
      this._buffer.push(s);
      if (this.box) {
        const div = document.createElement('div');
        div.textContent = s;
        this.box.appendChild(div);
        this.box.scrollTop = this.box.scrollHeight;
      }
      if (this.count) this.count.textContent = String(this._buffer.length);
      console.log(line);
    },
    raw() { return `# GAME-LOG — ${new Date().toISOString()}\n` + this._buffer.join('\n'); },
    clear() {
      this._buffer = [];
      if (this.box) this.box.textContent = '';
      if (this.count) this.count.textContent = '0';
    }
  };

  window.BootUI = {
    log: (m)=>insp.push(m),
    logOK: (m,extra='')=>insp.push(`(game) ${m}${extra?(' '+extra):''}`),
    logWarn: (m,extra='')=>insp.push(`(game) WARN ${m}${extra?(' '+extra):''}`),
    logErr: (m,extra='')=>insp.push(`(game) ERROR ${m}${extra?(' '+extra):''}`),
    raw: ()=>insp.raw(),
    clear: ()=>insp.clear(),
  };

  BootUI.log(`(game) script load ok game.js ${APP.VERSION}`);

  // --------------------------------------------------------------------------
  // Utils: JSONC, URL, fetch
  // --------------------------------------------------------------------------
  function stripJsonComments(text) {
    return text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  }

  function toAbsoluteURL(pathOrUrl, baseHref = location.href) {
    try {
      return new URL(pathOrUrl, new URL(baseHref, location.href)).toString();
    } catch {
      return new URL(pathOrUrl, location.href).toString();
    }
  }

  async function fetchJson(jsonUrl) {
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`fetch ${jsonUrl} → ${res.status}`);
    let txt = await res.text();
    try { return JSON.parse(txt); }
    catch {
      const clean = stripJsonComments(txt);
      return JSON.parse(clean);
    }
  }

  // --------------------------------------------------------------------------
  // Loader: Map + (optional) Tileset‑Atlas
  // --------------------------------------------------------------------------
  async function loadAtlas(atlasUrl) {
    const atlas = await fetchJson(atlasUrl);
    const name = atlas?.meta?.image || atlas?.image || 'tileset.terrain.png';
    const imgUrl = toAbsoluteURL(name, toAbsoluteURL(atlasUrl));
    const img = await loadImageSafe(imgUrl, './assets/tex/placeholder64.PNG');
    if (!img) throw new Error('Atlas-Bild konnte nicht geladen werden');
    BootUI.logOK('Tileset (atlas) OK', `${img.naturalWidth}x${img.naturalHeight}`);
    return { atlas, image: img };
  }

  function loadImageSafe(src, fallbackSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = ()=>resolve(img);
      img.onerror = ()=>{
        if (!fallbackSrc) return resolve(null);
        const fb = new Image();
        fb.onload = ()=>resolve(fb);
        fb.onerror = ()=>resolve(null);
        fb.src = fallbackSrc;
      };
      img.src = toAbsoluteURL(src);
    });
  }

  async function loadMap(mapUrl) {
    const map = await fetchJson(mapUrl);
    const width  = map.width  || map.size?.w || 0;
    const height = map.height || map.size?.h || 0;
    const tile   = map.tileSize || 64;
    if (!width || !height) throw new Error('Map: width/height fehlen oder sind 0');

    let tiles = null;
    if (map.tileset) {
      try {
        tiles = await loadAtlas(map.tileset);
      } catch (e) {
        BootUI.logWarn('Tileset fehlgeschlagen → Placeholder', e.message||e);
      }
    }
    return { map, width, height, tile, tiles };
  }

  // --------------------------------------------------------------------------
  // Renderer (Minimal – zeigt etwas & beweist Startkette)
  // --------------------------------------------------------------------------
  function startRenderLoop(ctx) {
    let t0 = performance.now();
    function frame(t) {
      const dt = (t - t0) / 1000; t0 = t;
      // einfache Puls‑Animation im Hintergrund, damit man „Leben“ sieht
      const w = ctx.canvas.width, h = ctx.canvas.height;
      const p = (Math.sin(t/500)+1)/2;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = `rgba(30,45,60,${0.25 + p*0.15})`;
      ctx.fillRect(0,0,w,h);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // --------------------------------------------------------------------------
  // PUBLIC API: startGame (global)
  // --------------------------------------------------------------------------
  async function startGame(opts) {
    const { canvas, mapUrl, onReady } = Object.assign({ mapUrl:'./assets/maps/map-mini.json' }, opts||{});
    if (!canvas) throw new Error('kein Canvas übergeben');

    // Canvas DPI
    const dpr = Math.max(1, Math.min(3, (window.devicePixelRatio||1)));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width  * dpr);
    canvas.height= Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');

    BootUI.log(`(game) GameLoader.start ${mapUrl}`);
    // Map + Tileset laden
    const world = await loadMap(mapUrl);
    BootUI.logOK(`Map OK size ${world.width}x${world.height} tile ${world.tile}`);

    // (hier würdest du dein echtes Zeichnen machen – ich starte nur eine Loop)
    startRenderLoop(ctx);

    // Callback
    onReady && onReady();
    BootUI.logOK('Game started');
  }

  // global machen → Fix für „startGame is not a function“
  window.startGame = startGame;

  // Reflow/Resize: Canvas-Dimensionen aktuell halten
  window.addEventListener('resize', () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(3, (window.devicePixelRatio||1)));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width  * dpr);
    canvas.height= Math.round(rect.height * dpr);
    BootUI.log(`(game) Canvas ${canvas.width}x${canvas.height} dpr:${dpr}`);
  }, { passive:true });

})();
