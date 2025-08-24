/* =====================================================================
   game.js  •  v1.14
   - Robuster Map-Loader (CSV ODER Array, Strings werden zu Zahlen)
   - Sichere Canvas/Context-Erzeugung (kein c.width-Null mehr)
   - Platzhalter-Renderer (zeigt sofort Grid/Layer)
   - Ausführliche BootUI-Logs (Spiel / Fehler / Warnungen)
   - Signal an Backdrop über Asset.markTexturesReady(true)
   ===================================================================== */
(function () {
  'use strict';

  // ---- Kurz-Helfer ----------------------------------------------------
  const BootUI = (window.BootUI = window.BootUI || {});
  const logOK   = (...a) => BootUI.logOK ? BootUI.logOK(...a)   : console.log('[OK]', ...a);
  const logWarn = (...a) => BootUI.logWarn ? BootUI.logWarn(...a) : console.warn('[WARN]', ...a);
  const logErr  = (...a) => BootUI.logErr ? BootUI.logErr(...a)  : console.error('[ERR]', ...a);

  // Globale Game-State-Objekte
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

  // ---- Canvas & Context sicher erzeugen --------------------------------
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

  // ---- Utility: Zahl/Array/CSV robust parsen ---------------------------
  function toInt(x, fallback = 0) {
    const n = (typeof x === 'string') ? parseInt(x, 10) : (typeof x === 'number' ? x : NaN);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseLayerData(raw) {
    // Akzeptiert:
    // - CSV-String: "1,2,3"
    // - Array aus Zahlen oder String-Zahlen: [1,"2","3"]
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw.map(v => toInt(v, 0));
    }
    if (typeof raw === 'string') {
      // CSV oder whitespace-getrennt
      const parts = raw.split(/[\s,;]+/).filter(Boolean);
      return parts.map(v => toInt(v, 0));
    }
    // Unerwartet: versuche JSON-String zu parsen
    try {
      const maybe = JSON.parse(String(raw));
      if (Array.isArray(maybe)) return maybe.map(v => toInt(v, 0));
    } catch (_) {}
    logWarn('Layer data: unbekanntes Format → wird leer gesetzt');
    return [];
  }

  // ---- Assets (Tileset optional) ---------------------------------------
  async function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('IMG load fail ' + url));
      img.src = url;
    });
  }

  async function loadTilesetIfPresent(map) {
    // Tolerant: Wir lesen gängige Felder
    const ts =
      map.tileSize || map.tilesize || map.tile || (map.meta && (map.meta.tile || map.meta.tileSize)) || 64;
    Game.state.tileSize = toInt(ts, 64);

    const tilesetUrl =
      map.tileset || (map.meta && map.meta.tileset) || (map.atlas && map.atlas.image) || './assets/tiles/tileset.terrain.png';

    try {
      const img = await loadImage(tilesetUrl);
      Game.state.tilesetImg = img;
      logOK('Tileset OK', tilesetUrl, `${img.naturalWidth}x${img.naturalHeight}`);
    } catch (e) {
      Game.state.tilesetImg = null;
      logWarn('Tileset fehlt/optional', tilesetUrl);
    }
  }

  // ---- Map laden & validieren ------------------------------------------
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json();
  }

  function normalizeMap(json) {
    // Erwartete Kernfelder: width, height, layers[]
    const w = toInt(json.width, 0);
    const h = toInt(json.height, 0);
    if (!w || !h) throw new Error('Map: width/height fehlen oder sind 0');

    const layers = Array.isArray(json.layers) ? json.layers : (json.map || json.data || []);
    if (!Array.isArray(layers) || !layers.length) {
      throw new Error('Map: layers fehlen/leer');
    }

    // Jede Ebene normalisieren
    const normLayers = layers.map((L, idx) => {
      const name = L.name || `layer${idx}`;
      const kind = (L.type || L.kind || 'tiles').toLowerCase();
      const raw = L.data != null ? L.data : (L.csv != null ? L.csv : L.values);
      const data = parseLayerData(raw);

      // Falls Größe nicht passt, auffüllen/kürzen
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

  // ---- Minimaler Renderer (zeigt sofort was) ----------------------------
  function renderMapPlaceholder(map) {
    const ctx = Stage.ctx;
    const { width: tw, height: th } = map;
    const ts = Game.state.tileSize;

    Stage.clear();

    // Hintergrund
    ctx.fillStyle = '#0f1a10';
    ctx.fillRect(0, 0, Stage.cvs.width, Stage.cvs.height);

    // erstes Layer (falls vorhanden) grob zeichnen
    const L0 = map.layers[0];
    if (L0 && L0.data) {
      for (let ty = 0; ty < th; ty++) {
        for (let tx = 0; tx < tw; tx++) {
          const i = ty * tw + tx;
          const v = L0.data[i] | 0;
          if (v !== 0) {
            // einfache farbliche Kodierung
            const c = 100 + (v % 100);
            ctx.fillStyle = `rgb(${c},${120},${90})`;
          } else {
            ctx.fillStyle = 'rgb(24,38,24)';
          }
          ctx.fillRect(tx * ts, ty * ts, ts, ts);
        }
      }
    }

    // Grid drüber (dezent)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for (let x = 0; x <= tw; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ts, 0);
      ctx.lineTo(x * ts, th * ts);
      ctx.stroke();
    }
    for (let y = 0; y <= th; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ts);
      ctx.lineTo(tw * ts, y * ts);
      ctx.stroke();
    }
  }

  // ---- Public API -------------------------------------------------------
  GameLoader.start = async function start(mapUrl) {
    logOK('GameLoader.start', mapUrl);

    // Canvas sicher initialisieren
    Stage.init();

    // Map laden
    const raw = await fetchJson(mapUrl).catch((e) => {
      logErr('Map fetch FAIL', e.message || String(e));
      throw e;
    });

    // Tileset optional laden (versucht Standardpfad)
    await loadTilesetIfPresent(raw).catch(() => { /* bereits geloggt */ });

    // Map normalisieren (tolerant)
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

    // Signal an Backdrop: Texturen i. O. (wir haben alles Nötige)
    try { window.Asset && window.Asset.markTexturesReady && window.Asset.markTexturesReady(true); } catch (_) {}

    // Erste Darstellung
    try {
      renderMapPlaceholder(map);
      logOK('Render PLACEHOLDER');
    } catch (e) {
      logErr('Render FAIL', e.message || String(e));
      throw e;
    }

    // (Optional) Game Loop – hier nur einfaches Redraw bei Resize
    // → bereits via Stage.resize() erledigt.
  };

  // ---- minimale Build-Kosten & Tool-API (für UI-Buttons) ---------------
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

  logOK('script load ok','game.js v1.14');
})();
