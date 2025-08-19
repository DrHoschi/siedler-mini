// map-runtime.js (ES Module)
// ===================================================================
// 🚀 Features:
// 1) Tile-Map Renderer (dein Code, sachlich beibehalten)
// 2) Sprite-System (Atlas-Lader, Animator, Renderer)
// 3) Auto-Draw von Map-Objekten (objects[] aus map-pro.json)
//
// Erwartete Assets (relativ zu index.html):
//  - ./maps/map-pro.json         (deine Karte mit objects[])
//  - ./assets/sprites.json       (Atlas-Beschreibung)
//  - ./assets/sprites.png        (Sprite-Bild)
//
// Beispiel-Verwendung siehe Abschnitt "INTEGRATION" ganz unten.
// ===================================================================


// -------------------------------------------------------------------
// 1) TILE-MAP (dein bestehender Code, nur kommentiert + kleine Helper)
// -------------------------------------------------------------------
export class SiedlerMap {
  constructor(opts = {}) {
    // Basiseinstellungen
    this.tileSize = 32;               // Logische Tile-Größe (unskaliert)
    this.mapW = 0;                    // Tiles in X
    this.mapH = 0;                    // Tiles in Y
    this.layers = [];                 // [{name, visible, data:Int32Array}]
    this.tiles = [];                  // [{name, img:HTMLImageElement}]
    this.collisions = new Uint8Array(0);
    this.meta = {};                   // Optionaler Meta-Index je Tile
    this.stamps = [];                 // Optional

    // Kamera in Pixelkoordinaten (wird beim Zeichnen angewendet)
    this.camera = { x: 0, y: 0, zoom: 1 };

    // Events / Resolver
    this.onReady = opts.onReady || (() => {});
    this.onProgress = opts.onProgress || (() => {});
    this._tileResolver = opts.tileResolver || ((name) => name); // name -> URL

    // NEW: Objekte aus der Map (z. B. Buildings, Spawns, Units)
    this.objects = []; // Array aus map-pro.json -> objects[]
  }

  async loadFromObject(json) {
    // Basiswerte
    this.tileSize = json.tileSize ?? 32;
    this.mapW = json.mapW | 0;
    this.mapH = json.mapH | 0;

    // Layer
    this.layers = (json.layers || []).map(L => ({
      name: String(L.name || ''),
      visible: !!L.visible,
      data: Int32Array.from(L.data || [])
    }));

    // Kollisionsraster & Meta
    this.collisions = Uint8Array.from(json.collisions || new Array(this.mapW * this.mapH).fill(0));
    this.meta = json.meta || {};

    // Stamps (optional)
    this.stamps = (json.stamps || []).map(s => ({
      w: s.w | 0, h: s.h | 0, data: Int32Array.from(s.data || [])
    }));

    // NEW: Objekte (werden später von ObjectSpriteSystem gerendert)
    this.objects = Array.isArray(json.objects) ? json.objects : [];

    // Tiles laden (jede Tile-ID referenziert ein Bild)
    const tileNames = (json.tiles || []).map(t => t.name);
    this.tiles = new Array(tileNames.length);

    let done = 0;
    await Promise.all(tileNames.map((name, i) => new Promise((resolve) => {
      const url = this._tileResolver(name);
      const img = new Image();
      img.onload = () => {
        this.tiles[i] = { name, img };
        done++; this.onProgress(done, tileNames.length);
        resolve();
      };
      img.onerror = () => {
        console.warn('Tile failed to load', name, url);
        this.tiles[i] = { name, img: null };
        done++; this.onProgress(done, tileNames.length);
        resolve();
      };
      img.src = url;
    })));

    this.onReady();
  }

  // Tile-Index & Bounds
  index(x, y)   { return y * this.mapW + x; }
  inBounds(x,y) { return x>=0 && y>=0 && x<this.mapW && y<this.mapH; }

  // Kollision / Meta / Tiles bearbeiten
  isBlocked(x, y) { if (!this.inBounds(x, y)) return true; return !!this.collisions[this.index(x, y)]; }
  getMeta(x, y)   { return this.meta[String(this.index(x, y))] || null; }
  getTile(layerIndex, x, y) {
    const L = this.layers[layerIndex]; if (!L) return -1;
    return L.data[this.index(x, y)] ?? -1;
  }
  setTile(layerIndex, x, y, v) {
    const L = this.layers[layerIndex]; if (!L) return;
    if (this.inBounds(x, y)) L.data[this.index(x, y)] = v;
  }

  // Zeichnet sichtbaren Kartenausschnitt (alle sichtbaren Layer)
  draw(ctx, view = { x: 0, y: 0, w: 0, h: 0 }, options = {}) {
    const cam = this.camera;
    const ts = this.tileSize * cam.zoom;

    // Sichtfenster in Tile-Koordinaten bestimmen
    const startX = Math.floor((view.x - cam.x) / ts);
    const startY = Math.floor((view.y - cam.y) / ts);
    const endX   = Math.ceil ((view.x + view.w - cam.x) / ts);
    const endY   = Math.ceil ((view.y + view.h - cam.y) / ts);

    ctx.save();
    if (options.clear !== false) { ctx.clearRect(0, 0, view.w, view.h); }

    // Layer zeichnen
    for (let li = 0; li < this.layers.length; li++) {
      const L = this.layers[li];
      if (!L.visible) continue;
      for (let y = startY; y < endY; y++) {
        if (y < 0 || y >= this.mapH) continue;
        for (let x = startX; x < endX; x++) {
          if (x < 0 || x >= this.mapW) continue;
          const v = L.data[this.index(x, y)];
          if (v >= 0) {
            const t = this.tiles[v];
            if (t && t.img) {
              const sx = cam.x + x * ts;
              const sy = cam.y + y * ts;
              ctx.drawImage(t.img, sx, sy, ts, ts);
            }
          }
        }
      }
    }

    // Optional: Kollisionsraster einblenden
    if (options.drawCollisions) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ff5757';
      for (let y = startY; y < endY; y++) {
        if (y < 0 || y >= this.mapH) continue;
        for (let x = startX; x < endX; x++) {
          if (x < 0 || x >= this.mapW) continue;
          if (this.collisions[this.index(x, y)]) {
            const sx = cam.x + x * ts;
            const sy = cam.y + y * ts;
            ctx.fillRect(sx, sy, ts, ts);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ---------- Hilfsfunktionen für Sprite-Rendering ----------
  // Mittelpunkt einer Tile in Pixeln (inkl. Kamera & Zoom)
  tileCenterPx(col, row) {
    const ts = this.tileSize * this.camera.zoom;
    return {
      x: this.camera.x + col * ts + ts / 2,
      y: this.camera.y + row * ts + ts / 2
    };
  }
  // Linke obere Ecke einer Tile in Pixeln
  tileTopLeftPx(col, row) {
    const ts = this.tileSize * this.camera.zoom;
    return { x: this.camera.x + col * ts, y: this.camera.y + row * ts };
  }
}


// ---------------------------------------------------------------
// 2) SPRITES: Atlas + Animator + Renderer
// ---------------------------------------------------------------
export class SpriteAtlas {
  constructor() {
    this.image = null;                 // HTMLImageElement
    this.frames = new Map();           // name -> {x,y,w,h,anchor}
    this.anims = new Map();            // name -> [frameNames]
    this.tileSize = 64;
  }
  async load(atlasUrl) {
    const atlas = await (await fetch(atlasUrl)).json();
    this.tileSize = atlas.tileSize ?? 64;

    // Frames & Animationen in Maps ablegen
    for (const fr of (atlas.frames || [])) this.frames.set(fr.name, fr);
    for (const [k, v] of Object.entries(atlas.animations || {})) this.anims.set(k, v);

    // Bild laden (Pfad relativ zur JSON)
    const img = new Image();
    img.src = new URL(atlas.image, atlasUrl).toString();
    await new Promise(res => { img.onload = res; });
    this.image = img;
  }
  getFrame(name) { return this.frames.get(name) || null; }
  hasAnim(name)  { return this.anims.has(name); }
  getAnim(name)  { return this.anims.get(name) || null; }
}

export class Animator {
  constructor({ frames, fps = 6, loop = true }) {
    this.frames = frames || []; // Namen der Frames
    this.fps = fps;
    this.loop = loop;
    this.time = 0;
  }
  reset() { this.time = 0; }
  // dt in Sekunden
  step(dt) { this.time += dt; }
  currentFrameName() {
    if (!this.frames.length) return null;
    const idx = Math.floor(this.time * this.fps);
    return this.loop ? this.frames[idx % this.frames.length]
                     : this.frames[Math.min(idx, this.frames.length - 1)];
  }
}

export class SpriteRenderer {
  constructor(ctx, atlas) {
    this.ctx = ctx;
    this.atlas = atlas;
  }
  drawFrame(frameName, x, y, scale = 1) {
    const fr = this.atlas.getFrame(frameName);
    if (!fr || !this.atlas.image) return;
    const { x: sx, y: sy, w, h, anchor } = fr;
    const ax = (anchor?.x ?? 0.5), ay = (anchor?.y ?? 0.75);
    const dx = Math.round(x - w * ax * scale);
    const dy = Math.round(y - h * ay * scale);
    this.ctx.drawImage(this.atlas.image, sx, sy, w, h, dx, dy, w * scale, h * scale);
  }
  drawAnim(animator, x, y, scale = 1) {
    const name = animator.currentFrameName();
    if (!name) return;
    this.drawFrame(name, x, y, scale);
  }
}


// ---------------------------------------------------------------------
// 3) OBJECTS → SPRITES: Automatisches Rendering aus map-pro.json
// ---------------------------------------------------------------------
// Lies objects[] aus der Map und zeichne sie (pro Objekt: Sprite oder Anim).
// Regeln:
//  - explizites Feld "sprite": nutzt diesen Frame-Namen
//  - explizites Feld "anim":   nutzt diese Animation (aus sprites.json)
//  - ansonsten Mapping auf Basis von type/kind
//
// Beispiel-Objekt in map-pro.json:
//   { "type":"building", "kind":"stone_fort", "pos":{"col":7,"row":4} }
//
// Du kannst auch überschreiben:
//   { "type":"building", "sprite":"stone_fort", "pos":{"col":7,"row":4} }
export class ObjectSpriteSystem {
  constructor(world, atlas) {
    this.world = world;
    this.atlas = atlas;
    this._animCache = new Map(); // key -> Animator
  }

  // Zuordnung von (type, kind) -> Sprite/Anim
  resolveSpriteRef(obj) {
    // Harte Overrides zuerst
    if (obj.sprite) return { frame: obj.sprite };
    if (obj.anim && this.atlas.hasAnim(obj.anim)) return { anim: obj.anim };

    // Heuristisches Mapping
    const t = (obj.type || '').toLowerCase();
    const k = (obj.kind || '').toLowerCase();

    // Buildings
    if (t === 'building') {
      // Falls der kind-Name schon direkt im Atlas existiert, nutze ihn
      if (this.atlas.getFrame(k)) return { frame: k };

      // Bekannte Aliase
      const map = {
        hq: 'hq_wood',
        hq_upgraded: 'hq_upgraded',
        market: 'market',
        farm: 'farm',
        stone_fort: 'stone_fort',
        stone_keep: 'stone_keep',
        smithy: 'smithy',
        warehouse: 'warehouse',
        lumberjack: 'lumberjack',
        barracks: 'barracks',
        tower: 'tower',
        well: 'well',
        windmill: 'windmill',
        stable: 'stable',
        church: 'church',
        dock: 'dock',
        quarry: 'quarry',
        mine: 'mine',
        bakery: 'bakery',
        mill: 'mill',
        house_small: 'house_small',
        house_medium: 'house_medium',
        house_large: 'house_large'
      };
      if (map[k] && this.atlas.getFrame(map[k])) return { frame: map[k] };
    }

    // Spawns / Marker
    if (t === 'spawn' || k === 'spawn') {
      if (this.atlas.getFrame('marker_spawn')) return { frame: 'marker_spawn' };
    }

    // Units
    if (t === 'unit' || t === 'carrier') {
      if (this.atlas.hasAnim('carrier_idle')) return { anim: 'carrier_idle' };
      if (this.atlas.getFrame('carrier_idle_0')) return { frame: 'carrier_idle_0' };
    }

    // Fallback: nichts
    return null;
  }

  // Zeichnet alle world.objects; dt in Sekunden
  drawAll(ctx, dt) {
    if (!Array.isArray(this.world.objects)) return;

    for (const obj of this.world.objects) {
      const pos = obj.pos || obj.position || obj; // tolerant: {col,row} oder direkt
      const col = (pos.col ?? pos.x) | 0;
      const row = (pos.row ?? pos.y) | 0;

      const ref = this.resolveSpriteRef(obj);
      if (!ref) continue;

      const p = this.world.tileCenterPx(col, row);

      if (ref.anim) {
        // Animator cachen pro Objekt-ID oder pro Kombination
        const key = obj.id ? `id:${obj.id}` : `t:${obj.type}|k:${obj.kind}|c:${col}|r:${row}|a:${ref.anim}`;
        let an = this._animCache.get(key);
        if (!an) {
          an = new Animator({ frames: this.atlas.getAnim(ref.anim), fps: obj.fps || 6, loop: obj.loop !== false });
          this._animCache.set(key, an);
        }
        an.step(dt);
        new SpriteRenderer(ctx, this.atlas).drawAnim(an, p.x, p.y, obj.scale || 1);
      } else if (ref.frame) {
        new SpriteRenderer(ctx, this.atlas).drawFrame(ref.frame, p.x, p.y, obj.scale || 1);
      }
    }
  }
}


// ---------------------------------------------------------------
// 4) INTEGRATION (Beispiel – kann direkt so in dein <script type="module">)
// ---------------------------------------------------------------
/*
import { SiedlerMap, SpriteAtlas, ObjectSpriteSystem } from './tools/map-runtime.js';

const world = new SiedlerMap({
  tileResolver: (name) => './assets/' + name,
  onReady: () => loop()
});

// 1) Map laden
const mapJson = await (await fetch('./maps/map-pro.json')).json();
await world.loadFromObject(mapJson);

// 2) Sprite-Atlas laden
const atlas = new SpriteAtlas();
await atlas.load('./assets/sprites.json');

// 3) Object->Sprite System
const objSprites = new ObjectSpriteSystem(world, atlas);

// 4) Canvas/Context und Loop starten
const cv = document.querySelector('canvas');
const ctx = cv.getContext('2d');

let last = performance.now();
function loop(now = performance.now()) {
  const dt = (now - last) / 1000;
  last = now;

  // Map zuerst
  world.draw(ctx, { x: 0, y: 0, w: cv.width, h: cv.height }, { clear: true });

  // Danach Objekte (Sprites/Animationen)
  objSprites.drawAll(ctx, dt);

  requestAnimationFrame(loop);
}
*/


// ---------------------------------------------------------------
// 5) NÜTZLICHE HILFSMETHODEN (falls du sie separat nutzen willst)
// ---------------------------------------------------------------

// Zeichnet eine Liste vorbereiteter Einträge (falls du außerhalb von objects[] rendern willst)
export function drawSpritesFromList(world, sprRenderer, atlas, list = [], dt = 0) {
  // list: [{col,row, anim:'carrier_walk' | null, frame:'hq_topdown'|null, fps:8, scale:1}, ...]
  for (const it of list) {
    if (it.anim && atlas.hasAnim(it.anim)) {
      it._animator = it._animator || new Animator({ frames: atlas.getAnim(it.anim), fps: it.fps || 6, loop: it.loop !== false });
      it._animator.step(dt);
      const p = world.tileCenterPx(it.col | 0, it.row | 0);
      sprRenderer.drawAnim(it._animator, p.x, p.y, it.scale || 1);
    } else if (it.frame) {
      const p = world.tileCenterPx(it.col | 0, it.row | 0);
      sprRenderer.drawFrame(it.frame, p.x, p.y, it.scale || 1);
    }
  }
}
