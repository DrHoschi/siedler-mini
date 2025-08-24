/* =====================================================================
   game.js  •  v1.16
   - JSONC-Unterstützung (Kommentare strippen, ohne Strings zu zerstören)
   - Tileset: .png ODER .json (Atlas) wird erkannt und geladen
   - Toleranter Map-Parser (CSV ODER Array; Strings → Zahlen)
   - Sichere Canvas/Context-Erzeugung
   - Platzhalter-Renderer
   - Ausführliche BootUI-Logs
   - Asset.markTexturesReady(true) nach erfolgreichem Setup
   ===================================================================== */
(function () {
  'use strict';

  const BootUI = (window.BootUI = window.BootUI || {});
  const logOK   = (...a) => BootUI.logOK ? BootUI.logOK(...a)   : console.log('[OK]', ...a);
  const logWarn = (...a) => BootUI.logWarn ? BootUI.logWarn(...a) : console.warn('[WARN]', ...a);
  const logErr  = (...a) => BootUI.logErr ? BootUI.logErr(...a)  : console.error('[ERR]', ...a);

  const Game = (window.Game = window.Game || {});
  const GameLoader = (window.GameLoader = window.GameLoader || {});
  Game.state = {
    map: null,
    tilesetImg: null,
    tileSize: 64,
    width: 0,
    height: 0,
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
  };

  // ---------- Canvas/Stage ----------
  const Stage = {
    cvs: null,
    ctx: null,
    resize() {
      if (!this.cvs) return;
      const dpr = Game.state.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const w = Math.max(1, Math.floor(window.innerWidth));
      const h = Math.max(1, Math.floor(window.innerHeight));
      this.cvs.width  = Math.floor(w * dpr);
      this.cvs.height = Math.floor(h * dpr);
      this.cvs.style.width  = w + 'px';
      this.cvs.style.height = h + 'px';
      if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      logOK('Canvas', `${w}x${h}`, 'dpr:' + dpr);
    },
    init() {
      this.cvs = document.getElementById('stage');
      if (!this.cvs) throw new Error('Canvas #stage nicht gefunden');
      const ctx = this.cvs.getContext('2d');
      if (!ctx) throw new Error('2D-Context null');
      this.ctx = ctx;
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    },
    clear() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
    }
  };

  // ---------- Utils ----------
  function toInt(x, fallback = 0) {
    const n = (typeof x === 'string') ? parseInt(x, 10) : (typeof x === 'number' ? x : NaN);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseLayerData(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw.map(v => toInt(v, 0));
    if (typeof raw === 'string') {
      const parts = raw.split(/[\s,;]+/).filter(Boolean);
      return parts.map(v => toInt(v, 0));
    }
    try {
      const maybe = JSON.parse(String(raw));
      if (Array.isArray(maybe)) return maybe.map(v => toInt(v, 0));
    } catch (_) {}
    logWarn('Layer data: unbekanntes Format → leer');
    return [];
  }

  async function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('IMG load fail ' + url));
      img.src = url;
    });
  }

  // ---------- JSONC: Kommentare strippen (ohne Strings zu zerstören) ----------
  function stripJsonComments(source) {
    let out = '';
    let i = 0;
    const n = source.length;
    let inStr = false, strChar = '';
    let inLine = false, inBlock = false;
    while (i < n) {
      const c = source[i];
      const c2 = source[i+1];

      // String-Start/-Ende
      if (!inLine && !inBlock) {
        if (!inStr && (c === '"' || c === "'")) {
          inStr = true; strChar = c; out += c; i++; continue;
        } else if (inStr) {
          // escape?
          if (c === '\\') { out += c; if (i+1 < n) { out += source[i+1]; i+=2; continue; } }
          if (c === strChar) { inStr = false; strChar = ''; out += c; i++; continue; }
          out += c; i++; continue;
        }
      }

      // Kommentare
      if (!inStr) {
        // Block-Kommentar /* ... */
        if (!inBlock && !inLine && c === '/' && c2 === '*') { inBlock = true; i += 2; continue; }
        if (inBlock) { if (c === '*' && c2 === '/') { inBlock = false; i += 2; } else { i++; } continue; }

        // Zeilen-Kommentar // ...
        if (!inLine && c === '/' && c2 === '/') { inLine = true; i += 2; continue; }
        if (inLine) { if (c === '\n' || c === '\r') { inLine = false; out += c; } i++; continue; }
      }

      // normaler Durchlauf
      out += c; i++;
    }
    return out;
  }

  // ---------- JSON laden (robust) ----------
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    const clean = stripJsonComments(text.replace(/^\uFEFF/, ''));
    try {
      return JSON.parse(clean);
    } catch (e) {
      const snippet = clean.slice(0, 200).replace(/\s+/g,' ').trim();
      logErr('Map fetch FAIL', e.message || String(e), 'snippet:', snippet);
      throw new Error(e.message || 'JSON parse error');
    }
  }

  // ---------- Tileset laden (png oder atlas.json) ----------
  async function loadTilesetFromUrlLike(urlLike, baseFallback) {
    if (!urlLike) return null;

    // Absolute/relative Pfade normalisieren
    const url = String(urlLike);

    // JSON-Atlas?
    if (url.toLowerCase().endsWith('.json')) {
      try {
        const atlas = await fetchJson(url);
        // Häufige Felder:
        //  - TexturePacker: { meta:{ image:"foo.png" }, frames:{...} }
        //  - Tiled: { meta:{image:"..."}} oder { image:"..." }
        const imgRel =
          (atlas.meta && (atlas.meta.image || atlas.meta.imagePath)) ||
          atlas.image ||
          (atlas.atlas && atlas.atlas.image) ||
          null;

        if (imgRel) {
          // URL für Bild relativ zur Atlas-JSON auflösen
          const abs = new URL(imgRel, url).toString();
          const img = await loadImage(abs);
          logOK('Tileset (atlas) OK', url, '→', abs, `${img.naturalWidth}x${img.naturalHeight}`);
          return img;
        } else {
          logWarn('Atlas JSON ohne image-Feld', url);
          return null;
        }
      } catch (e) {
        logWarn('Atlas JSON load fail', url, e.message || String(e));
        return null;
      }
    }

    // Direktes Bild
    try {
      const img = await loadImage(url);
      logOK('Tileset OK', url, `${img.naturalWidth}x${img.naturalHeight}`);
      return img;
    } catch (e) {
      logWarn('Tileset IMG fail', url);
      // Fallback
      if (baseFallback) {
        try {
          const img = await loadImage(baseFallback);
          logOK('Tileset Fallback OK', baseFallback, `${img.naturalWidth}x${img.naturalHeight}`);
          return img;
        } catch (_) {}
      }
      return null;
    }
  }

  async function loadTilesetIfPresent(map) {
    const ts =
      map.tileSize || map.tilesize || map.tile || (map.meta && (map.meta.tile || map.meta.tileSize)) || 64;
    Game.state.tileSize = toInt(ts, 64);

    const tilesetUrl =
      map.tileset || (map.meta && map.meta.tileset) || (map.atlas && map.atlas.image) || './assets/tiles/tileset.terrain.png';

    Game.state.tilesetImg = await loadTilesetFromUrlLike(tilesetUrl, './assets/tiles/tileset.terrain.png');
    if (!Game.state.tilesetImg) {
      logWarn('Tileset fehlt/optional', tilesetUrl);
    }
  }

  // ---------- Map normalisieren ----------
  function normalizeMap(json) {
    const w = toInt(json.width, 0);
    const h = toInt(json.height, 0);
    if (!w || !h) throw new Error('Map: width/height fehlen oder sind 0');

    const layers = Array.isArray(json.layers) ? json.layers : (json.map || json.data || []);
    if (!Array.isArray(layers) || !layers.length) {
      throw new Error('Map: layers fehlen/leer');
    }

    const normLayers = layers.map((L, idx) => {
      const name = L.name || `layer${idx}`;
      const kind = (L.type || L.kind || 'tiles').toLowerCase();
      const raw = L.data != null ? L.data : (L.csv != null ? L.csv : L.values);
      const data = parseLayerData(raw);

      const needed = w * h;
      if (data.length < needed) {
        data.push(...new Array(needed - data.length).fill(0));
      } else if (data.length > needed) {
        data.length = needed;
      }

      return { name, type: kind, data };
    });

    return {
      width: w,
      height: h,
      tileSize: Game.state.tileSize,
      layers: normLayers
    };
  }

  // ---------- Platzhalter-Renderer ----------
  function renderMapPlaceholder(map) {
    const ctx = Stage.ctx;
    const { width: tw, height: th } = map;
    const ts = Game.state.tileSize;

    Stage.clear();

    ctx.fillStyle = '#0f1a10';
    ctx.fillRect(0, 0, Stage.cvs.width, Stage.cvs.height);

    const L0 = map.layers[0];
    if (L0 && L0.data) {
      for (let ty = 0; ty < th; ty++) {
        for (let tx = 0; tx < tw; tx++) {
          const i = ty * tw + tx;
          const v = L0.data[i] | 0;
          if (v !== 0) {
            const c = 100 + (v % 100);
            ctx.fillStyle = `rgb(${c},${120},${90})`;
          } else {
            ctx.fillStyle = 'rgb(24,38,24)';
          }
          ctx.fillRect(tx * ts, ty * ts, ts, ts);
        }
      }
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for (let x = 0; x <= tw; x++) {
      ctx.beginPath(); ctx.moveTo(x * ts, 0); ctx.lineTo(x * ts, th * ts); ctx.stroke();
    }
    for (let y = 0; y <= th; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * ts); ctx.lineTo(tw * ts, y * ts); ctx.stroke();
    }
  }

  // ---------- Public API ----------
  GameLoader.start = async function start(mapUrl) {
    logOK('GameLoader.start', mapUrl);

    Stage.init();

    const raw = await fetchJson(mapUrl); // JSONC ok

    await loadTilesetIfPresent(raw).catch(()=>{ /* bereits geloggt */ });

    let map;
    try {
      map = normalizeMap(raw);
      Game.state.map = map;
      Game.state.width = map.width;
      Game.state.height = map.height;
      Game.state.tileSize = map.tileSize || Game.state.tileSize;
      logOK('Map OK', `size ${map.width}x${map.height}`, `tile ${Game.state.tileSize}`);
    } catch (e) {
      logErr('Map parse FAIL', e.message || String(e));
      throw e;
    }

    try { window.Asset && window.Asset.markTexturesReady && window.Asset.markTexturesReady(true); } catch (_) {}

    try {
      renderMapPlaceholder(map);
      logOK('Render PLACEHOLDER');
    } catch (e) {
      logErr('Render FAIL', e.message || String(e));
      throw e;
    }
  };

  // ---------- (Minimal) Build-Costs & Tool ----------
  Game.buildCosts = Game.buildCosts || {
    road:  { wood: 1, stone: 0, food: 0, pop: 0 },
    hut:   { wood:10, stone: 2, food: 0, pop: 1 },
    lumberjack_wood: { wood:12, stone: 0, food:0, pop:1 },
    stonebraker_wood:{ wood: 6, stone: 6, food:0, pop:1 },
    farm_wood:       { wood: 8, stone: 2, food:0, pop:1 },
    baeckerei_wood:  { wood: 6, stone: 4, food:0, pop:1 },
    fischer_wood1:   { wood: 6, stone: 2, food:0, pop:1 },
    wassermuehle_wood:{wood:12, stone: 6, food:0, pop:2 },
    windmuehle_wood: { wood:10, stone: 8, food:0, pop:2 },
    depot_wood:      { wood:14, stone: 6, food:0, pop:0 },
    depot_wood_ug:   { wood:18, stone:10, food:0, pop:0 },
    hq_wood:         { wood:20, stone:12, food:0, pop:2 },
    hq_wood_ug1:     { wood:26, stone:16, food:0, pop:2 },
    haeuser_wood1:   { wood:12, stone: 4, food:0, pop:0 },
    haeuser_wood1_ug1:{wood:16, stone: 8, food:0, pop:0 },
    haeuser_wood2:   { wood:14, stone: 6, food:0, pop:0 }
  };

  Game.setActiveTool = function(tool) {
    logOK('Active tool', tool);
    Game.state.activeTool = tool;
  };

  logOK('script load ok','game.js v1.16');
})();
