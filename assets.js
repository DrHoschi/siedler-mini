/* assets.js — Loader/Atlas-Manager für Bilder & Terrain
   - Lädt Einzeltexturen (PNG/JPG, Case-sensitiv zur Datei!)
   - Optionaler Texture-Atlas (terrain_atlas.PNG + JSON)
   - Liefert get(key) bzw. getTile("prefix","variant") zurück.
*/
export class Assets {
  constructor() {
    /** @type {Map<string, HTMLImageElement>} */
    this.images = new Map();
    /** @type {Object<string, {img:HTMLImageElement, frames:Object<string,{x,y,w,h}>}>} */
    this.atlases = {};
    this.basePaths = {
      terrain: "assets/tex/terrain/",  // <- hier liegen deine neuen Shapes
      tex:     "assets/tex/",
      misc:    "assets/"
    };
    this.logMissing = true;
  }

  /** Einzelbild laden */
  loadImage(key, url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); resolve({key, ok:true}); };
      img.onerror = () => { if (this.logMissing) console.warn("[Assets] missing:", url); resolve({key, ok:false}); };
      img.src = url;
    });
  }

  /** Viele Kandidaten probieren (z. B. grass_0.PNG / grass_0.png) */
  async tryLoadFirst(key, candidates) {
    for (const c of candidates) {
      const res = await this.loadImage(key, c);
      if (res.ok) return true;
    }
    return false;
  }

  /** Atlas laden: PNG + JSON (TexturePacker-Style: frames:{name:{frame:{x,y,w,h}}}) */
  async loadAtlas(name, pngUrl, jsonUrl) {
    const ok = await this.loadImage(name, pngUrl);
    if (!ok.ok) return false;
    const img = this.images.get(name);
    try {
      const txt = await fetch(jsonUrl).then(r => r.ok ? r.text() : "");
      if (!txt) throw new Error("atlas json missing");
      const data = JSON.parse(txt);
      const frames = {};
      // unterstützt zwei gängige Strukturen
      if (Array.isArray(data.frames)) {
        for (const f of data.frames) {
          const n = f.filename || f.name;
          const r = f.frame || f.sourceRect || f;
          frames[n] = { x:r.x, y:r.y, w:r.w, h:r.h };
        }
      } else if (data.frames && typeof data.frames === "object") {
        for (const [n, f] of Object.entries(data.frames)) {
          const r = f.frame || f.sourceRect || f;
          frames[n] = { x:r.x, y:r.y, w:r.w, h:r.h };
        }
      } else {
        throw new Error("atlas json unknown format");
      }
      this.atlases[name] = { img, frames };
      return true;
    } catch (e) {
      console.warn("[Assets] atlas parse failed:", jsonUrl, e);
      return false;
    }
  }

  /** Terrain-Set registrieren: versucht Varianten (z. B. grass_0..3) zu laden */
  async loadTerrainSet(prefix, maxVariants = 4) {
    const promises = [];
    for (let i=0; i<maxVariants; i++) {
      const key = `terrain/${prefix}_${i}`;
      const p = this.tryLoadFirst(
        key,
        [
          `${this.basePaths.terrain}${prefix}_${i}.PNG`,
          `${this.basePaths.terrain}${prefix}_${i}.png`,
          `${this.basePaths.terrain}${prefix}_${i}.JPG`,
          `${this.basePaths.terrain}${prefix}_${i}.jpg`
        ]
      );
      promises.push(p);
    }
    await Promise.all(promises);
  }

  /** Schneller Getter (Einzelbilder) */
  get(key) { return this.images.get(key) || null; }

  /** Atlas‑Frame holen: atlasName + frameName */
  getFrame(atlasName, frameName) {
    const a = this.atlases[atlasName];
    if (!a) return null;
    const f = a.frames[frameName];
    if (!f) return null;
    return { img:a.img, x:f.x, y:f.y, w:f.w, h:f.h };
  }

  /** Terrain-Kachel finden:
      1) Atlas "terrain_atlas": frame `${prefix}_${variant}`
      2) Einzelbild `terrain/${prefix}_${variant}`
      3) Fallback: `terrain/${prefix}_0` */
  getTerrain(prefix, variant = 0) {
    // Atlas zuerst:
    const atlasFrame = this.getFrame("terrain_atlas", `${prefix}_${variant}`);
    if (atlasFrame) return atlasFrame;

    // Einzelbilder:
    const img = this.get(`terrain/${prefix}_${variant}`) || this.get(`terrain/${prefix}_0`);
    if (img) return { img, x:0, y:0, w:img.width, h:img.height };

    return null;
  }

  /** Komplettes Terrain laden: Atlas optional + gängige Prefixe */
  async loadTerrainAll() {
    // Optionaler Atlas (nur wenn beide Dateien vorhanden)
    await this.loadAtlas(
      "terrain_atlas",
      `${this.basePaths.terrain}terrain_atlas.PNG`,
      `${this.basePaths.terrain}terrain_atlas.json`
    );

    // Häufige Prefixe – kannst du beliebig erweitern
    const prefixes = [
      "grass", "dirt", "rock", "sand", "water",
      "path",          // dein getretener Pfad
      "shore",         // Küstenübergänge, falls vorhanden
      "forest"         // Walddecke
    ];
    for (const p of prefixes) {
      await this.loadTerrainSet(p, 8); // bis zu _0.._7
    }
  }
}

// Singleton (optional)
export const ASSETS = new Assets();
