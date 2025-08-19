// map-runtime.js (ES Module) — Siedler 2020 + Sprite-Integration 2025
// ==================================================================
// Lädt JSON aus dem PRO-Editor, lädt Tiles, rendert Layer, stellt
// Kollision/Meta bereit. Zusätzlich: Sprite-Atlas + einfache Animationen.

// ------------------------------------------------------------------
// 1) TILE-MAP (dein bestehender Code **unverändert**, nur doc & helpers)
// ------------------------------------------------------------------
export class SiedlerMap {
  constructor(opts = {}) {
    this.tileSize = 32;
    this.mapW = 0;
    this.mapH = 0;
    this.layers = [];   // [{name, visible, data:Int32Array}]
    this.tiles = [];    // [{name, img:HTMLImageElement}]
    this.collisions = new Uint8Array(0);
    this.meta = {};     // { index:string -> object }
    this.stamps = [];   // optional
    this.camera = { x: 0, y: 0, zoom: 1 }; // Achtung: Werte sind in Pixeln
    this.onReady = opts.onReady || (() => {});
    this.onProgress = opts.onProgress || (() => {});
    this._tileResolver = opts.tileResolver || ((name) => name); // map name->URL
  }

  async loadFromObject(json) {
    this.tileSize = json.tileSize ?? 32;
    this.mapW = json.mapW | 0;
    this.mapH = json.mapH | 0;
    this.layers = (json.layers || []).map(L => ({
      name: String(L.name || ''),
      visible: !!L.visible,
      data: Int32Array.from(L.data || [])
    }));
    this.collisions = Uint8Array.from(json.collisions || new Array(this.mapW * this.mapH).fill(0));
    this.meta = json.meta || {};
    this.stamps = (json.stamps || []).map(s => ({ w: s.w | 0, h: s.h | 0, data: Int32Array.from(s.data || []) }));

    // Tiles laden (jede ID referenziert ein Bild)
    const tileNames = (json.tiles || []).map(t => t.name);
    this.tiles = new Array(tileNames.length);
    let done = 0;
    await Promise.all(tileNames.map((name, i) => new Promise((resolve) => {
      const url = this._tileResolver(name);
      const img = new Image();
      img.onload = () => { this.tiles[i] = { name, img }; done++; this.onProgress(done, tileNames.length); resolve(); };
      img.onerror = () => { console.warn('Tile failed to load', name, url); this.tiles[i] = { name, img: null }; done++; this.onProgress(done, tileNames.length); resolve(); };
      img.src = url;
    })));
    this.onReady();
  }

  index(x, y) { return y * this.mapW + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.mapW && y < this.mapH; }

  isBlocked(x, y) { if (!this.inBounds(x, y)) return true; return !!this.collisions[this.index(x, y)]; }
  getMeta(x, y) { return this.meta[String(this.index(x, y))] || null; }
  getTile(layerIndex, x, y) {
    const L = this.layers[layerIndex]; if (!L) return -1;
    return L.data[this.index(x, y)] ?? -1;
  }
  setTile(layerIndex, x, y, v) {
    const L = this.layers[layerIndex]; if (!L) return;
    if (this.inBounds(x, y)) L.data[this.index(x, y)] = v;
  }

  // Zeichnet sichtbares Fenster basierend auf Kamera
  draw(ctx, view = { x: 0, y: 0, w: 0, h: 0 }, options = {}) {
    const cam = this.camera;
    const ts = this.tileSize * cam.zoom;
    const startX = Math.floor((view.x - cam.x) / ts);
    const startY = Math.floor((view.y - cam.y) / ts);
    const endX = Math.ceil((view.x + view.w - cam.x) / ts);
    const endY = Math.ceil((view.y + view.h - cam.y) / ts);

    ctx.save();
    if (options.clear !== false) { ctx.clearRect(0, 0, view.w, view.h); }

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

// ------------------------------------------------------------------
// 2) SPRITES: Atlas + Renderer + Animator
// ------------------------------------------------------------------

// Lädt sprites.json, hält Frames/Animationen + Bild
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
    for (const fr of (atlas.frames || [])) this.frames.set(fr.name, fr);
    for (const [k, v] of Object.entries(atlas.animations || {})) this.anims.set(k, v);

    const img = new Image();
    img.src = new URL(atlas.image, atlasUrl).toString(); // relativ zur JSON
    await new Promise(res => { img.onload = res; });
    this.image = img;
  }
  getFrame(name) { return this.frames.get(name) || null; }
  hasAnim(name) { return this.anims.has(name); }
  getAnim(name) { return this.anims.get(name) || null; }
}

// Simpler Zeitbasierter Animator (fps, loop)
export class Animator {
  constructor({ frames, fps = 6, loop = true }) {
    this.frames = frames || []; // array of frame names
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

// Zeichnet Frames oder Animationen mit Ankerpunkt
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

// ------------------------------------------------------------------
// 3) OPTIONALE HELFER: Sprite-Objekte (minimal) & Demo-Nutzung
// ------------------------------------------------------------------

// Minimaler Runtime-Sprite (Position in Tile-Koordinaten, optional Animation)
export class SpriteEntity {
  constructor({ col = 0, row = 0, anim = null, frame = null, scale = 1, visible = true } = {}) {
    this.col = col;
    this.row = row;
    this.anim = anim;     // Animator oder null
    this.frame = frame;   // string (Frame-Name) oder null
    this.scale = scale;
    this.visible = visible;
  }
  step(dt) { if (this.anim) this.anim.step(dt); }
  draw(world, sprRenderer) {
    if (!this.visible) return;
    const p = world.tileCenterPx(this.col, this.row);
    if (this.anim) sprRenderer.drawAnim(this.anim, p.x, p.y, this.scale);
    else if (this.frame) sprRenderer.drawFrame(this.frame, p.x, p.y, this.scale);
  }
}

// ------------------------------------------------------------------
// 4) BEISPIEL: Integration in deine Loop (nur Doku)
// ------------------------------------------------------------------
/*
import { SiedlerMap, SpriteAtlas, SpriteRenderer, Animator, SpriteEntity } from './tools/map-runtime.js';

// 1) Map initialisieren
const world = new SiedlerMap({
  tileResolver: (name) => './assets/' + name,
  onReady: () => loop()  // starte Loop, sobald Tiles geladen sind
});

// 2) Map laden (dein PRO-Format)
const mapJson = await (await fetch('./maps/map-pro.json')).json();
await world.loadFromObject(mapJson);

// 3) Sprites laden
const atlas = new SpriteAtlas();
await atlas.load('./assets/sprites.json');

// 4) Renderer & Entities aufsetzen
const cv = document.querySelector('canvas');
const ctx = cv.getContext('2d');
const spr = new SpriteRenderer(ctx, atlas);

// Beispiel-Animatoren aus atlas.animations
const idleAnim = new Animator({ frames: atlas.getAnim('carrier_idle'), fps: 4, loop: true });
const walkAnim = new Animator({ frames: atlas.getAnim('carrier_walk'), fps: 8, loop: true });

// Beispiel-Entities (auf Tile-Koordinaten der Map)
const ents = [
  new SpriteEntity({ col: 7, row: 5, anim: idleAnim, scale: 1 }),
  new SpriteEntity({ col: 6, row: 5, frame: 'select_ring', scale: 1 }),
  new SpriteEntity({ col: 7, row: 4, frame: 'hq_topdown', scale: 1 }),
  new SpriteEntity({ col: 2, row: 5, anim: walkAnim, scale: 1 })
];

// 5) Loop: Map zeichnen, dann Animation tick + Sprites zeichnen
let last = performance.now();
function loop(now = performance.now()) {
  const dt = (now - last) / 1000;
  last = now;

  world.draw(ctx, { x: 0, y: 0, w: cv.width, h: cv.height }, { clear: true });

  for (const e of ents) e.step(dt);
  for (const e of ents) e.draw(world, spr);

  requestAnimationFrame(loop);
}
*/

// ------------------------------------------------------------------
// 5) OPTIONAL: Auto-Draw von Map-Objekten mit sprite-Attribut
//    Wenn du in der Map (json.meta oder eigener Objekt-Layer) Einträge
//    wie { type:"unit", sprite:"carrier_idle", col:7, row:5 } hast,
//    kannst du dir darunter eine einfache Bridge bauen. Das ist bewusst
//    nicht automatisch aktiv, um deine bestehende Struktur nicht zu ändern.
// ------------------------------------------------------------------
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
