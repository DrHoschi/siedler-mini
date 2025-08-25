/* ========================================================================
 * Siedler-Mini — game.js
 * Version: 16.0.3  (Loader: Atlas + Fallback + Debug)
 * ========================================================================
 *
 * Was ist neu?
 * - Robuste Atlas-Ladung (JSON + Bild) mit relativer Pfadauflösung
 * - Fallback-Platzhalter bei fehlenden Frames/Bildern
 * - Ausführliche Debug-Logs (OK/Warn/Fehler) + Hooks für Inspector
 * - Map-Parser akzeptiert 'layers' ODER 'tiles'-Matrix
 *
 * Öffentliche API:
 *   window.startGame({
 *     canvas: HTMLCanvasElement,
 *     mapUrl: 'assets/maps/map-mini.json',
 *     onReady: () => {}
 *   })
 * ===================================================================== */
(() => {
  const VERSION = '16.0.3';

  /* ----------------------------- Logging ----------------------------- */
  const Log = (() => {
    const buf = [];
    const fmtTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      const ss = String(d.getSeconds()).padStart(2,'0');
      return `${hh}:${mm}:${ss}`;
    };
    const push = (level, msg) => {
      const line = `[${fmtTime()}] (game) ${msg}`;
      buf.push({ level, line });
      // Console
      if (level === 'err') console.error(line);
      else if (level === 'warn') console.warn(line);
      else console.log(line);

      // Inspector-Hook (falls vorhanden)
      try {
        if (window.BootUI && typeof window.BootUI.logCustom === 'function') {
          window.BootUI.logCustom(level, line);
        }
      } catch {}
      // Global Buffer für „Log kopieren“
      window.__gameLog = buf;
      // DOM-Buttons optional verdrahten (falls vorhanden)
      wireLogButtons();
    };
    const wireLogButtons = () => {
      const copyBtn = document.getElementById('log-copy');
      const clearBtn = document.getElementById('log-clear');
      const countBadge = document.getElementById('log-count');
      if (countBadge) countBadge.textContent = String(buf.length);

      if (copyBtn && !copyBtn.__wired) {
        copyBtn.__wired = true;
        copyBtn.addEventListener('click', async () => {
          const text = buf.map(x => x.line).join('\n');
          try {
            await navigator.clipboard.writeText(text);
            push('ok', 'Log in Zwischenablage');
          } catch (e) {
            push('warn', 'Konnte Log nicht in Zwischenablage kopieren.');
          }
        });
      }
      if (clearBtn && !clearBtn.__wired) {
        clearBtn.__wired = true;
        clearBtn.addEventListener('click', () => {
          buf.length = 0;
          if (countBadge) countBadge.textContent = '0';
          push('ok', 'Log geleert');
        });
      }
    };
    return {
      ok:  (m) => push('ok',   m),
      warn:(m) => push('warn', m),
      err: (m) => push('err',  m),
    };
  })();

  Log.ok(`script load ok game.js ${VERSION}`);

  /* -------------------------- Fetch/Assets --------------------------- */
  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`IMG fail ${url}`));
      img.src = url;
    });
  }

  function resolveRelative(baseUrl, maybeRel) {
    try {
      return new URL(maybeRel, new URL(baseUrl, location.href)).toString();
    } catch {
      // Fallback: im Zweifel unverändert zurück (Engine loggt das)
      return maybeRel;
    }
  }

  /* ------------------------- Atlas/ Tileset -------------------------- */
  /**
   * Lädt Atlas-JSON + Bild. Erwartet Schema:
   * {
   *   frames:{ key:{x,y,w,h}, ... },
   *   meta:{ image:"./assets/tiles/tileset.terrain.png", ... },
   *   fallback?: { image:"./assets/tex/placeholder64.PNG", w:64, h:64 }
   * }
   */
  async function loadTileset(atlasUrl) {
    try {
      const atlas = await fetchJSON(atlasUrl);

      if (!atlas || !atlas.frames || !atlas.meta) {
        Log.warn(`Atlas JSON ohne frames/meta ${atlasUrl}`);
        return null;
      }

      const imgUrl = atlas.meta?.image
        ? resolveRelative(atlasUrl, atlas.meta.image)
        : null;

      if (!imgUrl) {
        Log.warn(`Atlas JSON ohne image-Feld ${atlasUrl}`);
        return null;
      }

      const img = await loadImage(imgUrl);
      Log.ok(`Tileset (atlas) OK ${img.width}x${img.height}`);

      // Fallback-Info (optional)
      let fallback = null;
      if (atlas.fallback?.image) {
        fallback = {
          url: resolveRelative(atlasUrl, atlas.fallback.image),
          w: atlas.fallback.w || 64,
          h: atlas.fallback.h || 64
        };
      }

      return { atlas, img, fallback };
    } catch (e) {
      Log.warn(`Atlas JSON load fail ${atlasUrl} ${e.message || e}`);
      return null;
    }
  }

  /* ------------------------------ Map -------------------------------- */
  /**
   * Unterstützte Map-Formate:
   * A) { width, height, tileSize, layers:[{data:number[][]}] }
   * B) { width, height, tileSize, tiles:number[][] }
   */
  async function loadMap(mapUrl) {
    const json = await fetchJSON(mapUrl);

    // Normalisieren
    let width = json.width|0;
    let height = json.height|0;
    const tileSize = json.tileSize|0 || 64;

    let layers = null;
    if (Array.isArray(json.layers) && json.layers.length > 0) {
      layers = json.layers;
      if (!width || !height) {
        // versuche aus Layer zu lesen
        const d0 = json.layers[0]?.data;
        if (Array.isArray(d0) && d0.length) {
          height = d0.length;
          width = Array.isArray(d0[0]) ? d0[0].length : 0;
        }
      }
      Log.ok('Map layers via json.layers');
    } else if (Array.isArray(json.tiles)) {
      layers = [{ name:'ground', data: json.tiles }];
      if (!width || !height) {
        height = json.tiles.length;
        width  = Array.isArray(json.tiles[0]) ? json.tiles[0].length : 0;
      }
      Log.ok('Map layer via 2D grid/matrix/tiles');
    }

    if (!width || !height) {
      throw new Error('Map: width/height fehlen oder sind 0');
    }
    if (!layers || !layers[0] || !Array.isArray(layers[0].data)) {
      throw new Error('Map: layers fehlen/leer');
    }

    Log.ok(`Map OK size ${width}x${height} tile ${tileSize}`);
    return { width, height, tileSize, layers };
  }

  /* ---------------------------- Renderer ----------------------------- */
  function makeRenderer(canvas, tileset) {
    const ctx = canvas.getContext('2d');

    function drawTile(tx, ty, tileIdx, tileSize) {
      // Kein Tileset? Platzhalter-Farbe
      if (!tileset) {
        ctx.fillStyle = '#385a2a';
        ctx.fillRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
        return;
      }

      // Frame-Key-Konvention: terrain_r{row}_c{col}
      // Standard: 16x16 Raster (64px)
      const COLS = (tileset.atlas?.meta?.grid?.cols)|0 || 16;
      const row = Math.floor(tileIdx / COLS);
      const col = tileIdx % COLS;
      const key = `terrain_r${row}_c${col}`;
      const f = tileset.atlas.frames[key];

      if (f) {
        ctx.drawImage(
          tileset.img,
          f.x, f.y, f.w, f.h,
          tx*tileSize, ty*tileSize, tileSize, tileSize
        );
        return;
      }

      // Fallback: einzelnes Platzhalterbild laden/cachen
      if (tileset.fallback && !tileset.__fallbackImg) {
        tileset.__fallbackImg = new Image();
        tileset.__fallbackImg.src = tileset.fallback.url;
        tileset.__fallbackImg.onload = () => {
          Log.ok('Fallback geladen');
        };
        tileset.__fallbackImg.onerror = () => {
          Log.warn('Fallback konnte nicht geladen werden');
        };
      }

      if (tileset.__fallbackImg && tileset.__fallbackImg.complete) {
        ctx.drawImage(
          tileset.__fallbackImg,
          0, 0, tileset.fallback.w, tileset.fallback.h,
          tx*tileSize, ty*tileSize, tileSize, tileSize
        );
      } else {
        // Notnagel: kariertes Muster
        ctx.fillStyle = '#3c3c3c';
        ctx.fillRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
        ctx.strokeStyle = '#202020';
        ctx.strokeRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
      }
    }

    function renderMap(map) {
      const { width, height, tileSize, layers } = map;
      canvas.width  = width  * tileSize;
      canvas.height = height * tileSize;

      const data = layers[0].data;
      for (let y = 0; y < height; y++) {
        const row = data[y];
        for (let x = 0; x < width; x++) {
          const idx = row[x]|0;
          drawTile(x, y, idx, tileSize);
        }
      }
    }

    return { renderMap };
  }

  /* ---------------------------- Game Loop ---------------------------- */
  async function startGame(opts) {
    try {
      const canvas = opts.canvas;
      const mapUrl = opts.mapUrl;
      const onReady = typeof opts.onReady === 'function' ? opts.onReady : () => {};

      // Tileset/Atlas laden (optional)
      const tileset = await loadTileset('./assets/tiles/tileset.terrain.json');

      // Map laden
      const map = await loadMap(mapUrl);

      // Renderer
      const r = makeRenderer(canvas, tileset);

      // Rendern
      r.renderMap(map);

      Log.ok('Game started');
      onReady();
    } catch (e) {
      Log.err(`Start FAIL ${e.message || e}`);
      alert(`Fehler beim Start: ${e.message || e}`);
      throw e;
    }
  }

  // Public API
  window.startGame = startGame;
})();
