/* ============================================================================
 * Datei   : core/asset.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.13-builder-atlas-safe-preload
 *
 * Zweck   :
 *   Zentrale Asset-Schicht:
 *   - Lädt Bilder & JSON
 *   - Lädt "Mega-Atlas" (JSON + PNG) für Ressourcen (Bäume/Steine/Fisch)
 *   - Bietet drawAtlasFrame(ctx, atlasName, frameName, worldX, worldY, opts)
 *
 * WICHTIG:
 *   - Debug/Checker bleibt drin
 *   - Robust gegen 404 / kaputte Images (Safari)
 * ========================================================================== */

(function(){
  'use strict';

  // =========================================================================
  // LOGGING
  // =========================================================================
  const TAG  = '[assets]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // =========================================================================
  // HELPERS
  // =========================================================================
  function isDrawableImage(img){
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  function fetchJson(url){
    return fetch(url, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        return r.json();
      });
  }

  function loadImage(url){
    return new Promise((resolve, reject)=>{
      try{
        const img = new Image();
        img.onload = ()=> resolve(img);
        img.onerror = (e)=> reject(new Error(`Image load failed: ${url}`));
        img.src = url;
      }catch(e){
        reject(e);
      }
    });
  }

  function dirOf(url){
    const s = String(url || '');
    const i = s.lastIndexOf('/');
    return (i >= 0) ? s.slice(0, i+1) : '';
  }

  // Normalisiert Frame-Daten aus verschiedenen Atlas-Formaten auf:
  // {x,y,w,h,pivotX,pivotY,anchorX,anchorY,scale}
  function normalizeFrames(atlasJson){
    const framesRaw = atlasJson?.frames || {};
    const resolved  = {};
    const names     = [];

    // Default tileSize (falls ein Atlas nur [cx,cy] Koords nutzt)
    const defW = atlasJson?.tileW || atlasJson?.meta?.tileSize?.w || 128;
    const defH = atlasJson?.tileH || atlasJson?.meta?.tileSize?.h || 128;

    for (const [name, info] of Object.entries(framesRaw)){
      let x=0,y=0,w=defW,h=defH;
      let pivotX = w/2, pivotY = h; // default: "Fußpunkt unten"
      let anchorX = 0.5, anchorY = 1.0;
      let scale = 1;

      // Format A: trees_mega_atlas-style: info = [cx,cy]
      if (Array.isArray(info)){
        const cx = info[0] | 0;
        const cy = info[1] | 0;
        w = defW; h = defH;
        x = cx * w; y = cy * h;
        pivotX = w/2; pivotY = h;
        anchorX = 0.5; anchorY = 1.0;
      }
      // Format B: stones/fish-style: info.frame / info.pivot / info.anchor
      else {
        const f = info.frame || info;
        x = (f.x|0) || 0;
        y = (f.y|0) || 0;
        w = (f.w|0) || defW;
        h = (f.h|0) || defH;

        if (info.pivot && typeof info.pivot.x === 'number') pivotX = info.pivot.x;
        if (info.pivot && typeof info.pivot.y === 'number') pivotY = info.pivot.y;

        if (info.anchor && typeof info.anchor.x === 'number') anchorX = info.anchor.x;
        if (info.anchor && typeof info.anchor.y === 'number') anchorY = info.anchor.y;

        if (typeof info.scale === 'number') scale = info.scale;
        // ------------------------------------------------------------
        // Zusätzliche Atlas-Formate (Exporter / Preview-Tool):
        // 1) pivotX/pivotY direkt am Frame-Objekt (Pixel, lokal im Frame)
        if (typeof info.pivotX === 'number') pivotX = info.pivotX;
        if (typeof info.pivotY === 'number') pivotY = info.pivotY;

        // 2) anchorX/anchorY als "globaler Pivot" in Sheet-Koordinaten.
        //    Viele Preview-Exporter speichern den Fußpunkt absolut im Sheet
        //    (z.B. anchorX = x + pivotX, anchorY = y + pivotY).
        //    Wir erkennen das daran, dass anchorX/anchorY deutlich > 1 sind.
        if (typeof info.anchorX === 'number' && typeof info.anchorY === 'number') {
          const ax = info.anchorX;
          const ay = info.anchorY;

          if (ax > 1 || ay > 1) {
            // Global → lokal: pivot = anchor - (frame top-left)
            pivotX = ax - x;
            pivotY = ay - y;
          } else {
            // Normalisiert (0..1) → Anchor-Align möglich
            anchorX = ax;
            anchorY = ay;
          }
        }

      }

      resolved[name] = { x,y,w,h,pivotX,pivotY,anchorX,anchorY,scale };
      names.push(name);
    }

    return { resolved, names };
  }

  // =========================================================================
  // ASSETS SINGLETON
  // =========================================================================
  const Assets = {
    version: 'v25.12.13-atlas+char-support',

    // Einfache Image-Caches (z. B. building-icons)
    images: new Map(),

    // Atlas: name -> { jsonUrl, imageUrl, json, img, frames, names, ok }
    atlases: new Map(),

    // Debug-Status
    state: {
      ready: false,
      errors: []
    },

    // --------------------------------------------------------------
    // Image API
    // --------------------------------------------------------------
    getImage(key){ return this.images.get(key) || null; },

    async loadImage(key, url){
      try{
        const img = await loadImage(url);
        this.images.set(key, img);
        LOG('Image geladen:', key, url, img.naturalWidth+'x'+img.naturalHeight);
        return img;
      }catch(e){
        this.state.errors.push(String(e?.message || e));
        WARN('Image Fehler:', key, url, e?.message || e);
        return null;
      }
    },

    // --------------------------------------------------------------
    // Atlas API
    // --------------------------------------------------------------
    hasAtlas(name){ return this.atlases.has(name); },
    getAtlas(name){ return this.atlases.get(name) || null; },

    /**
     * Lädt einen Mega-Atlas.
     * - jsonUrl MUSS stimmen (deine Pfade)
     * - imageUrl ist OPTIONAL:
     *   - wenn meta.image im JSON falsch ist, kannst du hier override setzen
     */
    async loadAtlas(name, jsonUrl, imageUrlOverride){
      const entry = {
        name,
        jsonUrl,
        imageUrl: imageUrlOverride || null,
        json: null,
        img: null,
        frames: null,
        names: null,
        ok: false
      };
      this.atlases.set(name, entry);

      try{
        const json = await fetchJson(jsonUrl);
        entry.json = json;

        // Wichtig: meta.image kann bei dir abweichen → override gewinnt!
        const imageUrl = imageUrlOverride
          || json?.meta?.image
          || (dirOf(jsonUrl) + `${name}.png`);

        entry.imageUrl = imageUrl;

        const img = await loadImage(imageUrl);
        entry.img = img;

        const norm = normalizeFrames(json);
        entry.frames = norm.resolved;
        entry.names  = norm.names;
        entry.ok = true;

        LOG('Atlas geladen:', name, {
          jsonUrl,
          imageUrl,
          frames: entry.names.length
        });

        return entry;
      }catch(e){
        entry.ok = false;
        this.state.errors.push(String(e?.message || e));
        WARN('Atlas Fehler:', name, jsonUrl, e?.message || e);
        return entry;
      }
    },

    /**
     * Zeichnet einen Atlas-Frame im WORLD-Space.
     *
     * opts:
     *   - scale     : number (default 1)
     *   - align     : 'anchor' | 'pivot' (default 'pivot')
     *   - useAnchor : boolean (legacy alias für align)
     */
    drawAtlasFrame(ctx, atlasName, frameName, worldX, worldY, opts={}){
      const a = this.getAtlas(atlasName);
      if (!a || !a.ok || !isDrawableImage(a.img)) return false;

      const fr = a.frames?.[frameName];
      if (!fr) return false;

      const scale = (typeof opts.scale === 'number') ? opts.scale : 1;
      const align = opts.align || (opts.useAnchor ? 'anchor' : 'pivot');

      const dw = fr.w * scale;
      const dh = fr.h * scale;

      // worldX/worldY sollen der "Fußpunkt" sein (ähnlich wie buildings),
      // daher nutzen wir standardmäßig PIVOT (oder Anchor, wenn gewünscht).
      let dx = worldX;
      let dy = worldY;

      if (align === 'anchor'){
        dx = worldX - (fr.anchorX * dw);
        dy = worldY - (fr.anchorY * dh);
      } else {
        dx = worldX - (fr.pivotX * scale);
        dy = worldY - (fr.pivotY * scale);
      }

      try{
        ctx.drawImage(a.img, fr.x, fr.y, fr.w, fr.h, dx, dy, dw, dh);
        return true;
      }catch(e){
        WARN('drawAtlasFrame failed:', atlasName, frameName, e?.message || e);
        return false;
      }
    },

    /**
     * Hilfsfunktion: gib alle Frame-Namen zurück (optional Prefix-Filter)
     */
    listFrames(atlasName, prefix=''){
      const a = this.getAtlas(atlasName);
      if (!a || !a.names) return [];
      if (!prefix) return a.names.slice();
      return a.names.filter(n => String(n).startsWith(prefix));
    },

    pickRandomFrame(atlasName, prefix=''){
      const list = this.listFrames(atlasName, prefix);
      if (!list.length) return null;
      return list[(Math.random() * list.length) | 0];
    },

    // --------------------------------------------------------------
    // BOOT / PRELOAD
    // --------------------------------------------------------------
    async preload(){
      // Deine Pfade aus der Nachricht:
      // assets/resources/wood/trees_mega_atlas.json
      // assets/resources/stone/stones_mega_atlas.json
      // assets/resources/fish/fish_mega_atlas.json
      //
      // WICHTIG: fish-json liegt bei dir im Repo als .json (bei Upload hier .txt),
      // wir laden im Spiel natürlich den .json Pfad.
      const tasks = [];

      // Trees: wir setzen imageUrl OVERRIDE passend zum gleichen Ordner,
      // falls meta.image mal abweicht.
      tasks.push(this.loadAtlas(
        'trees_mega_atlas',
        'assets/resources/wood/trees_mega_atlas.json',
        'assets/resources/wood/trees_mega_atlas.png'
      ));

      // Stones: meta.image ist bereits korrekt im JSON  [oai_citation:1‡stones_mega_atlas.json](sediment://file_00000000cb30720aafc246ea388e8c07)
      tasks.push(this.loadAtlas(
        'stones_mega_atlas',
        'assets/resources/stone/stones_mega_atlas.json',
        'assets/resources/stone/stones_mega_atlas.png'
      ));

      // Fish: meta.image ist korrekt im JSON  [oai_citation:2‡fish_mega_atlas.json.txt](sediment://file_000000007ed8720abe7ae44d1239f904)
      tasks.push(this.loadAtlas(
        'fish_mega_atlas',
        'assets/resources/fish/fish_mega_atlas.json',
        'assets/resources/fish/fish_mega_atlas.png'
      ));


      // Characters / Units: Carrier (Träger)
      // Hinweis: JSON kann meta.image="carrier.png" enthalten, deshalb geben wir
      // imageUrl explizit mit an, damit es immer stimmt.
      tasks.push(this.loadAtlas(
        'carrier_atlas',
        'assets/characters/carrier_atlas.json',
        'assets/characters/carrier.png'
      ));

tasks.push(this.loadAtlas(
        'builder_atlas',
        'assets/characters/builder_atlas.json',
        'assets/characters/builder.png'
      ));

      await Promise.allSettled(tasks);

      this.state.ready = true;

      // Debug-Event wie gehabt
      window.dispatchEvent(new CustomEvent('cb:assets-ready', {
        detail: {
          ok: this.state.errors.length === 0,
          errors: this.state.errors.slice(),
          atlases: Array.from(this.atlases.values()).map(a => ({
            name: a.name, ok: a.ok, frames: a.names?.length || 0, jsonUrl: a.jsonUrl, imageUrl: a.imageUrl
          }))
        }
      }));

      LOG('preload fertig:', {
        ok: this.state.errors.length === 0,
        errors: this.state.errors.length,
        atlases: this.atlases.size
      });
    }
  };

  // Global verfügbar machen
  window.Assets = Assets;

  // Sofort preload starten (wie bisher: keine "Warte-UI" entfernen)
  Assets.preload().catch(e=>{
    ERR('preload crash:', e?.message || e);
  });

})();
