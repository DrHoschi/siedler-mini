/* game.js v1.18 — Siedler-mini
 * Ziel:
 * - Volle Debug-Ausgabe mit OK/WARN/ERR Icons + Filter + Copy
 * - Robust: Map-Parser (grid ODER layers) + Tileset-Atlas (relatives meta.image)
 * - Öffentliche API (BootAPI.*) fürs Startmenü/Inspektor
 * - Platzhalter-Renderer, bis echte Tiles/Assets integriert sind
 *
 * WICHTIG: Erwartete DOM-Struktur (IDs):
 *   #game-canvas (Canvas), #backdrop (div), #menu (Startpanel)
 *   #inspector (Container), #inspector-log (ul/ol/div für Zeilen),
 *   #inspector-filter (select|buttons mit values all|ok|warn|err),
 *   #copy-log (Button).
 */

(() => {
  'use strict';

  // -----------------------------
  // Utilities
  // -----------------------------
  const VERSION = 'game.js v1.18';
  const TAG = '(game)';
  const nowTS = () => {
    const d = new Date();
    return `[${d.toTimeString().slice(0,8)}]`;
  };

  const $ = (sel) => document.querySelector(sel);

  // Kleine URL-Helfer für relative Pfade (z.B. meta.image im Atlas)
  const toAbsURL = (maybeRel, baseUrl) => {
    try {
      return new URL(maybeRel, baseUrl).href;
    } catch (e) {
      // Fallback: wenn baseUrl selbst relativ war, gegen location.href auflösen
      try {
        const absBase = new URL(baseUrl, location.href).href;
        return new URL(maybeRel, absBase).href;
      } catch (e2) {
        return maybeRel; // Letzte Chance: unverändert zurück
      }
    }
  };

  // -----------------------------
  // BootUI / Debug-Logger
  // -----------------------------
  const BootUI = {
    els: {
      insp: null,
      list: null,
      filter: null,
      copyBtn: null
    },
    buffer: [],      // Rohdaten für Copy/Filter
    filter: 'all',   // 'all'|'ok'|'warn'|'err'

    init() {
      this.els.insp = $('#inspector');
      this.els.list = $('#inspector-log');
      this.els.filter = $('#inspector-filter');
      this.els.copyBtn = $('#copy-log');

      // Event: Filter
      if (this.els.filter) {
        this.els.filter.addEventListener('change', (e) => {
          this.filter = e.target.value || 'all';
          this.render();
        });
      }

      // Event: Copy
      if (this.els.copyBtn) {
        this.els.copyBtn.addEventListener('click', () => this.copyToClipboard());
      }

      this.logOK(`UI ready (${getIndexVersion()})`);
      this.logOK(`script load ok ${VERSION}`);
    },

    // Öffentliche Log-Funktionen (mit Symbolen)
    logOK(msg, scope='')  { this._push('ok', msg, scope); }
    ,
    logWarn(msg, scope='') { this._push('warn', msg, scope); }
    ,
    logErr(msg, scope='')  { this._push('err', msg, scope); }
    ,
    log(msg, scope='')     { this._push('ok', msg, scope); } // default=ok

    _push(type, msg, scope) {
      const line = {
        ts: nowTS(),
        type, // ok|warn|err
        scope: scope || TAG,
        text: msg
      };
      this.buffer.push(line);
      // Direkt in Konsole mit typisiertem Prefix
      const prefix = `${line.ts} ${line.scope}`;
      if (type === 'err') console.error(prefix, msg);
      else if (type === 'warn') console.warn(prefix, msg);
      else console.log(prefix, msg);

      // versuchen, in DOM zu zeichnen
      this._appendDOM(line);
    },

    _icon(type) {
      if (type === 'ok')   return '✅';
      if (type === 'warn') return '⚠️';
      return '❌';
    },

    _appendDOM(line) {
      if (!this.els.list) return;
      if (this.filter !== 'all' && this.filter !== line.type) return; // inaktiv

      const el = document.createElement('div');
      el.className = `log ${line.type}`;
      el.textContent = `${line.ts} ${line.scope} ${line.text}`;
      const ico = document.createElement('span');
      ico.className = 'ico';
      ico.textContent = this._icon(line.type);
      el.prepend(ico);
      this.els.list.appendChild(el);

      // Scroll ans Ende
      this.els.list.scrollTop = this.els.list.scrollHeight;
    },

    render() {
      if (!this.els.list) return;
      this.els.list.innerHTML = '';
      for (const line of this.buffer) {
        if (this.filter !== 'all' && this.filter !== line.type) continue;
        this._appendDOM(line);
      }
    },

    copyToClipboard() {
      const text = this.buffer.map(l =>
        `${l.ts} ${l.scope} ${l.text}`
      ).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        this.logOK('Log in Zwischenablage kopiert', 'copy');
      }).catch(err => {
        this.logErr(`Copy fehlgeschlagen: ${err}`, 'copy');
      });
    },

    // Panel-Helpers
    showBackdropFadeOutSoon() {
      const bd = $('#backdrop');
      if (!bd) return;
      // 10s Fail-Safe wie vorher
      setTimeout(() => {
        this.logWarn('Backdrop fail-safe 10s → fade');
        bd.classList.add('faded'); // CSS: opacity 0 + transition
        // nach Übergang entfernen
        setTimeout(() => { bd.style.display = 'none'; }, 1500);
      }, 10000);
    },
    hideBackdropNow() {
      const bd = $('#backdrop');
      if (!bd) return;
      bd.classList.add('faded');
      setTimeout(() => { bd.style.display = 'none'; }, 1500);
      this.logOK('Backdrop hidden');
    }
  };

  // Hilfsfunktion: Index-Version aus Datenattribut (falls gesetzt)
  function getIndexVersion() {
    const root = document.documentElement;
    return root?.dataset?.indexVersion || 'index v?';
  }

  // -----------------------------
  // Canvas / Renderer (sehr einfach)
  // -----------------------------
  const Gfx = {
    canvas: null,
    ctx: null,
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),

    init() {
      this.canvas = $('#game-canvas');
      if (!this.canvas) {
        BootUI.logErr('#game-canvas fehlt!');
        return;
      }
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      const cssW = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 400;
      const cssH = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 300;
      const w = Math.floor(cssW * this.dpr);
      const h = Math.floor(cssH * this.dpr);
      this.canvas.width = w;
      this.canvas.height = h;
      BootUI.logOK(`Canvas ${cssW}x${cssH} dpr:${this.dpr}`);
      this.clear();
    },

    clear() {
      if (!this.ctx) return;
      this.ctx.fillStyle = '#1d2a22';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    // Einfacher Placeholder: kariertes Muster
    placeholder() {
      const ctx = this.ctx; if (!ctx) return;
      const size = 32 * this.dpr;
      for (let y = 0; y < this.canvas.height; y += size) {
        for (let x = 0; x < this.canvas.width; x += size) {
          ctx.fillStyle = ((x/size + y/size) % 2 === 0) ? '#244133' : '#2b4d3b';
          ctx.fillRect(x, y, size, size);
        }
      }
    },

    // Sehr vereinfachtes Tile-Rendern aus numeric grid (nur Demo)
    drawTileGrid(grid, tileSize, atlasImg, frames, idToKey) {
      const ctx = this.ctx; if (!ctx) return;
      const px = tileSize * this.dpr;
      for (let ty = 0; ty < grid.length; ty++) {
        const row = grid[ty];
        for (let tx = 0; tx < row.length; tx++) {
          const id = row[tx];
          // Mapping numeric -> frame key
          const key = idToKey ? idToKey(id) : null;
          const f = key && frames ? frames[key] : null;

          const dx = Math.floor(tx * px);
          const dy = Math.floor(ty * px);

          if (atlasImg && f) {
            ctx.drawImage(
              atlasImg,
              f.x, f.y, f.w, f.h,
              dx, dy, px, px
            );
          } else {
            // Fallback: Platzhalter-Feld
            ctx.fillStyle = (id % 2 === 0) ? '#4f7a5f' : '#5e8d6e';
            ctx.fillRect(dx, dy, px, px);
          }
        }
      }
    }
  };

  // -----------------------------
  // AssetLoader (Bilder + JSON)
  // -----------------------------
  const Assets = {
    images: new Map(), // url -> HTMLImageElement
    atlases: new Map(), // url -> { json, image, frames }

    IMG_PLACEHOLDER: './assets/tex/placeholder64.PNG',

    loadJSON(url) {
      BootUI.log(`${TAG} fetch ${url}`);
      return fetch(url).then(async (res) => {
        BootUI.log(`${TAG} fetch-res ${res.status}  ${url}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    },

    loadImage(url) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          BootUI.logOK(`IMG ok ${url} ${img.naturalWidth}x${img.naturalHeight}`);
          this.images.set(url, img);
          resolve(img);
        };
        img.onerror = () => {
          BootUI.logErr(`IMG fail ${url}`);
          resolve(null);
        };
        BootUI.log(`${TAG} IMG set ${url}`);
        img.src = url;
      });
    },

    async loadAtlas(atlasUrl) {
      try {
        const json = await this.loadJSON(atlasUrl);
        // Bild-URL ermitteln:
        // 1) meta.image (häufig in TexturePacker/LDtk)
        // 2) Fallback: gleichnamige PNG
        let imgUrl = json?.meta?.image;
        if (!imgUrl) {
          BootUI.logWarn(`Atlas JSON ohne image-Feld ${atlasUrl} → fallback ./assets/tiles/tileset.terrain.png`);
          imgUrl = './assets/tiles/tileset.terrain.png';
        }
        // Relativ gegen das Atlas-JSON auflösen:
        const absImg = toAbsURL(imgUrl, atlasUrl);

        const img = await this.loadImage(absImg);
        if (!img) throw new Error('Atlas-Image konnte nicht geladen werden');

        const frames = json.frames || {};
        this.atlases.set(atlasUrl, { json, image: img, frames });
        BootUI.logOK(`Tileset (atlas) OK ${atlasUrl} → ${absImg} ${img.naturalWidth}x${img.naturalHeight}`);
        return { json, image: img, frames };
      } catch (e) {
        BootUI.logErr(`Atlas JSON load fail ${atlasUrl} ${e.message}`);
        // Kein Hard-Fail: gib null zurück, damit Renderer Platzhalter zeigt
        return null;
      }
    }
  };

  // -----------------------------
  // Map-Loader/Parser
  // -----------------------------
  const MapLoader = {
    current: null, // { width, height, tileSize, layers|grid, atlas }
    atlas: null,

    // Numerisches ID->FrameKey Mapping (sehr simpel: 16x16 Raster rX_cY)
    idToFrameKey(id) {
      // id erwartet 0..255 (oder größer, wir modden).
      if (id == null || isNaN(id)) return null;
      const cols = 16;
      const r = Math.floor(id / cols);
      const c = id % cols;
      return `terrain_r${r}_c${c}`;
    },

    async load(mapUrl) {
      // Map JSON laden
      const map = await Assets.loadJSON(mapUrl).catch((e) => {
        BootUI.logErr(`Map fetch FAIL ${e.message}`);
        return null;
      });
      if (!map) {
        BootUI.logErr('Map LOAD FAIL fetch');
        return null;
      }

      // Tileset (Atlas) optional laden
      let atlas = null;
      if (map.tileset) {
        atlas = await Assets.loadAtlas(map.tileset);
        if (!atlas) BootUI.logWarn(`Tileset fehlt/optional ${map.tileset}`);
      }

      // Map-Struktur erkennen
      let width = map.width|0;
      let height = map.height|0;
      let tileSize = map.tileSize|0;
      let grid = null;
      let layers = null;

      if (Array.isArray(map.layers) && map.layers.length > 0) {
        BootUI.logOK('Map layers via json.layers');
        layers = map.layers;
        // Fallback für width/height, falls nur layers vorliegen
        if (!width || !height) {
          const l0 = layers[0];
          if (l0 && Array.isArray(l0.data)) {
            height = l0.height || Math.sqrt(l0.data.length)|0;
            width = l0.width || (height ? (l0.data.length/height)|0 : 0);
          }
        }
      } else if (Array.isArray(map.grid) && map.grid.length > 0) {
        BootUI.logOK('Map layer via 2D grid/matrix/tiles');
        grid = map.grid;
        if (!width) width = grid[0]?.length|0;
        if (!height) height = grid.length|0;
      }

      if (!width || !height) {
        BootUI.logErr('Map parse FAIL Map: width/height fehlen oder sind 0');
        return null;
      }
      if (!tileSize) {
        tileSize = 64; // default
      }

      this.current = { width, height, tileSize, grid, layers, atlas };
      BootUI.logOK(`Map OK size ${width}x${height} tile ${tileSize}`);
      return this.current;
    }
  };

  // -----------------------------
  // Game-Loop (minimal)
  // -----------------------------
  const Game = {
    running: false,

    async start(mapUrl) {
      BootUI.logOK(`GameLoader.start ${mapUrl}`);
      Gfx.init();

      // Backdrop auto-fade (Failsafe)
      BootUI.showBackdropFadeOutSoon();

      const m = await MapLoader.load(mapUrl);
      if (!m) {
        BootUI.logErr('Game cannot start (map load failed)');
        return;
      }

      this.running = true;
      // Backdrop gezielt ausblenden (Assets gemeldet ready)
      BootUI.logOK('Textures READY → fade');
      BootUI.hideBackdropNow();

      // Erste Szene rendern
      this.render();
      BootUI.logOK('Game started');
    },

    render() {
      if (!this.running) return;
      Gfx.clear();

      const m = MapLoader.current;
      if (!m) {
        Gfx.placeholder();
        BootUI.logWarn('Render PLACEHOLDER (no map)');
        return;
      }

      // Einfacher Renderer: wenn grid vorhanden → zeichnen
      // (layers ignorieren wir hier minimal; Platz für spätere Erweiterung)
      if (m.grid) {
        const atlas = m.atlas;
        const img = atlas?.image || null;
        const frames = atlas?.frames || null;
        Gfx.drawTileGrid(m.grid, m.tileSize, img, frames, (id)=>MapLoader.idToFrameKey(id));
      } else {
        // Kein grid? Platzhalter
        Gfx.placeholder();
        BootUI.logWarn('Render PLACEHOLDER (no grid renderer)');
      }
    }
  };

  // -----------------------------
  // Öffentliche API fürs Startmenü/Inspektor
  // -----------------------------
  const BootAPI = {
    startNew(mapUrl) {
      BootUI.logOK(`NewGame start ${mapUrl}`);
      // Menü einklappen, falls vorhanden
      const menu = $('#menu');
      if (menu) menu.style.display = 'none';
      Game.start(mapUrl);
    },
    resume() {
      BootUI.logWarn('Resume: noch nicht implementiert (lade letzten Save später)');
    },
    resetAll() {
      localStorage.clear();
      BootUI.logOK('Reset OK (localStorage cleared)');
    },
    toggleInspector() {
      const insp = $('#inspector');
      if (!insp) return;
      const vis = getComputedStyle(insp).display !== 'none';
      insp.style.display = vis ? 'none' : 'block';
    },
    openEditor() {
      BootUI.logWarn('Editor öffnen: Hook noch nicht verdrahtet');
    }
  };

  // -----------------------------
  // Global machen
  // -----------------------------
  window.BootUI = BootUI;
  window.BootAPI = BootAPI;

  // -----------------------------
  // DOM Ready
  // -----------------------------
  function onReady() {
    try {
      BootUI.init();
    } catch (e) {
      // Falls index.html noch alte Aufrufe macht:
      console.error(nowTS(), TAG, 'window.onerror', e, location.href);
      // alte Seiten könnten BootUI.logOK(...) direkt aufrufen → Defensiv:
      if (!window.BootUI.logOK) {
        window.BootUI.logOK = (...args) => console.log(nowTS(), TAG, ...args);
        window.BootUI.logWarn = (...args) => console.warn(nowTS(), TAG, ...args);
        window.BootUI.logErr = (...args) => console.error(nowTS(), TAG, ...args);
      }
    }

    BootUI.logOK('DOM ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

})();
