/* ============================================================================
 * Datei   : core/asset.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.14-assets-status+inspector
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
  // TIMEOUTS (wichtig gegen „hängt 2 Minuten“ / Safari+iOS Fetch- oder Image-Hänger)
  // =========================================================================
  const TIMEOUT = {
    JSON_MS: 15000,   // fetch(json) max 15s
    IMG_MS : 15000,   // image load max 15s
  };


  // --------------------------------------------------------------------------
  // Globaler Asset-Status (für Inspector/Debug)
  // --------------------------------------------------------------------------
  function ensureAssetStatus(){
    // Wird vom Inspector-Tab "Assets" gelesen, um ok:true/false anzuzeigen.
    // Struktur:
    //   window.AssetStatus.atlas[atlasKey] = { ok, frames, jsonUrl, imageUrl, err? }
    window.AssetStatus = window.AssetStatus || {};
    window.AssetStatus.atlas = window.AssetStatus.atlas || {};
    return window.AssetStatus;
  }


  // =========================================================================
  // HELPERS
  // =========================================================================
  function isDrawableImage(img){
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  function fetchJson(url, timeoutMs = TIMEOUT.JSON_MS){
    // iOS/Safari: fetch kann „hängen“ ohne Fehler → wir brechen hart ab
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const sig  = ctrl ? ctrl.signal : undefined;

    let t = null;
    if (ctrl){
      t = setTimeout(()=>{ try{ ctrl.abort(); }catch(_e){} }, timeoutMs);
    }

    return fetch(url, { cache: 'no-store', signal: sig })
      .then(r => {
        if (t) clearTimeout(t);
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        return r.json();
      })
      .catch(e=>{
        if (t) clearTimeout(t);
        // AbortError normalisieren (damit wir im Asset-Status ein sauberes msg haben)
        const msg = (e && (e.name === 'AbortError'))
          ? `TIMEOUT fetchJson(${timeoutMs}ms): ${url}`
          : (e?.message || String(e));
        throw new Error(msg);
      });
  }

  function loadImage(url, timeoutMs = TIMEOUT.IMG_MS){
    // iOS/Safari: Image kann selten „ewig pending“ bleiben → Timeout + klare Logs
    return new Promise((resolve, reject)=>{
      try{
        const img = new Image();

        let done = false;
        const finishOk = ()=>{
          if (done) return; done = true;
          clearTimeout(timer);
          resolve(img);
        };
        const finishErr = (msg)=>{
          if (done) return; done = true;
          clearTimeout(timer);
          reject(new Error(msg));
        };

        const timer = setTimeout(()=>{
          // Wichtig: Handler lösen und SRC leeren, damit nichts weiter hängt
          try{ img.onload = null; img.onerror = null; img.src = ''; }catch(_e){}
          finishErr(`TIMEOUT loadImage(${timeoutMs}ms): ${url}`);
        }, timeoutMs);

        // Hint: decode() ist nice-to-have, aber nicht überall stabil → wir nutzen onload/onerror
        img.onload  = ()=> finishOk();
        img.onerror = ()=> finishErr(`Image load failed: ${url}`);

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

      
      // ------------------------------------------------------------
      // Grid-Trim-Fix (ohne Atlas-Offsets):
      // Viele unserer "Grid"-Atlanten (z.B. woodcutter) sind visuell in Zellen
      // (meta.cell.w/h) organisiert, aber werden als "trimmed" exportiert, wobei
      // spriteSourceSize.x/y oft 0 bleiben. Das führt zu "Teleport/Jitter", weil
      // sich der Fußpunkt (Pivot) pro Frame verschiebt.
      //
      // Wenn meta.cell vorhanden ist und der Frame-Name eine Richtung + Spaltenindex
      // enthält (…_<DIR>_…_<COLIDX>), können wir den Zell-Offset aus fr.x/fr.y
      // rückrechnen und einen stabilen Pivot (Bottom-Center/Baseline) setzen.
      const cell = atlasJson?.meta?.cell;
      const rows = atlasJson?.meta?.rows;
      if (cell && typeof cell.w === 'number' && typeof cell.h === 'number') {
        // COLIDX = letzte Zahl im Namen (…_0, …_1, …_2 …)
        const parts = String(name).split('_');
        const last = parts[parts.length - 1];
        if (/^\d+$/.test(last)) {
          const colIdx = parseInt(last, 10);
          // DIR Token: erstes Token, das in meta.rows enthalten ist (z.B. N, NE, E, …)
          let dirTok = null;
          if (Array.isArray(rows) && rows.length) {
            for (const p of parts) { if (rows.includes(p)) { dirTok = p; break; } }
          }
          // Fallback-Reihenfolge, falls meta.rows fehlt
          const fallbackRows = ['N','NE','E','SE','S','SW','W','NW'];
          const rowList = (Array.isArray(rows) && rows.length) ? rows : fallbackRows;
          if (!dirTok) {
            for (const p of parts) { if (rowList.includes(p)) { dirTok = p; break; } }
          }
          if (dirTok) {
            const rowIdx = rowList.indexOf(dirTok);
            if (rowIdx >= 0) {
              const cellX = colIdx * cell.w;
              const cellY = rowIdx * cell.h;
              const offX = x - cellX;
              const offY = y - cellY;

              // Nur anwenden, wenn der Frame plausibel in dieser Zelle liegt.
              if (offX > -2 && offX < cell.w + 2 && offY > -2 && offY < cell.h + 2) {
                const baseline = (typeof cell.baseline_margin === 'number') ? cell.baseline_margin : 0;
                const anchorCellX = cell.w / 2;
                const anchorCellY = cell.h - baseline;

                // Pivot in lokalen Frame-Koordinaten (getrimmt)
                pivotX = anchorCellX - offX;
                pivotY = anchorCellY - offY;

                // Anchor (0..1) auf Zellfußpunkt, falls jemand align:'anchor' nutzt
                // (wichtig: bezieht sich dann auf *Frame*, nicht Zell – wir lassen es als Hinweis drin)
                anchorX = 0.5;
                anchorY = 1.0;
              }
            }
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
    async loadAtlas(name, jsonUrlOrList, imageUrlOverride){
      // jsonUrlOrList kann string ODER Array sein (Candidate-Loading)
      // Beispiel: 'data/characters/woodcutter_sprite_atlas.json'
      const candidates = Array.isArray(jsonUrlOrList) ? jsonUrlOrList : [jsonUrlOrList];

      const entry = {
        name,
        jsonUrl: candidates[0] || '',
        jsonUrlTried: candidates.slice(),
        imageUrl: imageUrlOverride || null,
        json: null,
        img: null,
        frames: null,
        names: null,
        ok: false
      };
      this.atlases.set(name, entry);

      let lastErr = null;

      // Wir probieren die Kandidaten nacheinander, bis einer klappt.
      for (const jsonUrl of candidates){
        if (!jsonUrl) continue;
        entry.jsonUrl = jsonUrl;

        try{
          const json = await fetchJson(jsonUrl);
          entry.json = json;

          // Wichtig: meta.image kann abweichen → override gewinnt!
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
            jsonUrl: entry.jsonUrl,
            imageUrl: entry.imageUrl,
            frames: entry.names.length
          });

          // Inspector/Debug: Atlas-Ladezustand persistieren
          try{
            const st = ensureAssetStatus();
            st.atlas[name] = {
              ok: true,
              frames: entry.names?.length || 0,
              jsonUrl: entry.jsonUrl,
              jsonTried: candidates.slice(),
              imageUrl: entry.imageUrl,
              err: ''
            };
          }catch(_e){}

          return entry;
        }catch(e){
          lastErr = e;
          // Nächsten Kandidaten versuchen (wichtig für "unkaputtbar" bei umbenannten Dateien)
        }
      }

      // Alle Kandidaten sind fehlgeschlagen
      entry.ok = false;
      const msg = String(lastErr?.message || lastErr || 'unknown');
      this.state.errors.push(msg);
      WARN('Atlas Fehler:', name, candidates, msg);

      // Inspector/Debug: Fehlerstatus persistieren (404/JSON/PNG)
      try{
        const st = ensureAssetStatus();
        st.atlas[name] = {
          ok: false,
          frames: 0,
          jsonUrl: entry.jsonUrl || (candidates[candidates.length-1] || ''),
          jsonTried: candidates.slice(),
          imageUrl: entry.imageUrl || imageUrlOverride || '',
          err: msg
        };
      }catch(_e){}

      return entry;
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

// --------------------------------------------------------------------
// MAP TILESET (wichtig, damit die Karte nicht „schwarz“ bleibt)
//  - game.map.js bindet das Tileset über Assets.getImage('tileset.terrain')
//  - Wir nehmen bevorzugt das data-tileset am Canvas (Repo-/Branch-sicher)
//  - Zusätzlich: Safari/iOS ist empfindlich bei „assets/xyz.“ (Trailing-Dot)
// --------------------------------------------------------------------
try{
  const cvs = document.getElementById('game');
  let url = (cvs && (cvs.getAttribute('data-tileset') || cvs.dataset?.tileset)) || 'assets/tiles/tileset.terrain.png';
  url = String(url || '').trim();
  // Trailing '.' killt Requests (wir hatten das schon mal in Logs gesehen)
  while (url.endsWith('.')) url = url.slice(0, -1);
  if (url) tasks.push(this.loadImage('tileset.terrain', url));
}catch(e){
  WARN('Tileset-Preload skipped:', e?.message || e);
}


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

      // Animals (Reh/Fuchs)

    // Animals (Hase/Kaninchen)
    tasks.push(this.loadAtlas(
      'rabbit_sprite_atlas',
      'data/atlases/rabbit_sprite_atlas.json',
      'assets/animals/rabbit_sprite_atlas.png'
    ));

    // Animals (Wildschwein)
    tasks.push(this.loadAtlas(
      'boar_sprite_atlas',
      'data/atlases/boar_sprite_atlas.json',
      'assets/animals/boar_sprite_atlas.png'
    ));
      tasks.push(this.loadAtlas(
        'deer_sprite_atlas',
        'data/atlases/deer_sprite_atlas.json',
        'assets/animals/deer_sprite_atlas.png'
      ));
      tasks.push(this.loadAtlas(
        'fox_sprite_atlas',
        'data/atlases/fox_sprite_atlas.json',
        'assets/animals/fox_sprite_atlas.png'
      ));




      // --------------------------------------------------------------------
      // Deco / Pflanzen (rein dekorativ, KEINE Ressourcen)
      //  - Für core/map.decorations.js (MapDecorations)
      //  - Atlas-Key MUSS 'deco_plants_mega_atlas' heißen (Default in map.decorations.js)
      //
      // Lege die Dateien z.B. hier ab:
      //   assets/tex/deco/deco_plants_mega_atlas.json
      //   assets/tex/deco/deco_plants_mega_atlas.png
      //
      // Oder (falls du die Original-Dateinamen beibehalten willst), nutze die Kandidatenliste:
      //   assets/tex/deco/deco_plants_iso_settlersstyle_v3_atlas_compact.json
      //   assets/tex/deco/deco_plants_iso_settlersstyle_v3_atlas_compact.png
      // --------------------------------------------------------------------
      tasks.push(this.loadAtlas(
        'deco_plants_mega_atlas',
        [
          'assets/tex/deco/deco_plants_mega_atlas.json'
        ],
        // PNG-Pfad bei Bedarf anpassen (Override gewinnt immer)
        'assets/tex/deco/deco_plants_mega_atlas.png'
      ));
      // Characters / Units: Carrier (Träger)
      // Hinweis: JSON kann meta.image="carrier.png" enthalten, deshalb geben wir
      // imageUrl explizit mit an, damit es immer stimmt.
      tasks.push(this.loadAtlas(
        'carrier_atlas',
        'assets/characters/carrier_atlas.json',
        'assets/characters/carrier.png'
      ));

// Characters / Units: Builder (neues Repo-Schema: JSON in data/characters, PNG in assets/characters)
tasks.push(this.loadAtlas(
  'builder_sprite_atlas',
  [
    'data/characters/builder_sprite_atlas.json',
    'assets/characters/builder_sprite_atlas.json' // optional fallback (falls du mal umziehst)
  ],
  // WICHTIG:
  //  - Einige Exporte verwenden im JSON meta.image den Ordner "assets/charakter/…" (DE).
  //  - Wenn wir hier fälschlich "assets/characters/…" erzwingen, lädt das PNG nicht
  //    und im Spiel sieht man nur den Fallback-Punkt.
  // -> Deshalb bevorzugen wir "assets/charakter".
  'assets/charakter/builder_sprite_atlas.png'
));



// Characters / Units: Woodcutter
tasks.push(this.loadAtlas(
  'woodcutter_sprite_atlas',
  'data/characters/woodcutter_sprite_atlas.json',
  // Siehe Builder: JSON meta.image zeigt i.d.R. auf "assets/charakter/..."
  'assets/charakter/woodcutter_sprite_atlas.png'
));

// Characters / Units: Fisherman
tasks.push(this.loadAtlas(
  'fisherman_atlas',
  ['assets/characters/fisherman_atlas.json','assets/characters/fisherman.json'],
  'assets/characters/fisherman.png'
));

// Characters / Units: Stonecutter
tasks.push(this.loadAtlas(
  'stonecutter_atlas',
  ['assets/characters/stonecutter_atlas.json','assets/characters/stonecutter.json'],
  'assets/characters/stonecutter.png'
));
      


      // --------------------------------------------------------------------
      // Buildings: Hunter (Gebäude-Atlas)
      //  - PNG:  assets/buildings/hunter/hunter-sprite.png
      //  - JSON:  data/atlases/hunter-sprite_atlas.json
      //  - Atlas-Key: 'hunter_building_atlas'
      // --------------------------------------------------------------------
      tasks.push(this.loadAtlas(
        'hunter_building_atlas',
        'data/atlases/hunter-sprite_atlas.json',
        'assets/buildings/hunter/hunter-sprite.png'
      ));

      // ---------------------------------------------------------------
      // Gebäude-Atlanten (World-Sprites, NICHT UI-Icons)
      // ---------------------------------------------------------------
      // Hinweis: loadAtlas(name, jsonUrl, imageOverride)
      // jsonUrl liegt bei dir unter data/atlases/*.json
      // imageOverride zeigt auf assets/buildings/<name>/<name>-sprite.png

      tasks.push(this.loadAtlas(
        'hq_building_atlas',
        'data/atlases/hq-sprite_atlas.json',
        'assets/buildings/hq/hq-sprite.png'
      ));

      tasks.push(this.loadAtlas(
        'lumberjack_building_atlas',
        'data/atlases/lumberjack-sprite_atlas.json',
        'assets/buildings/lumberjack/lumberjack-sprite.png'
      ));

      tasks.push(this.loadAtlas(
        'quarry_building_atlas',
        'data/atlases/quarry-sprite_atlas.json',
        'assets/buildings/quarry/quarry-sprite.png'
      ));

      // Dein Atlas heißt aktuell "fishman-sprite_atlas.json" (Dateiname).
      // Wir registrieren ihn aber bewusst als "fisher_building_atlas", damit
      // der Code/Buildings-IDs konsistent bleiben.
      tasks.push(this.loadAtlas(
        'fisher_building_atlas',
        'data/atlases/fishman-sprite_atlas.json',
        'assets/buildings/fishman/fishman-sprite.png'
      ));


// ------------------------------------------------------------
// Houses (Epoche 1) – World-Atlanten (nicht Baumenü-Icons)
// ------------------------------------------------------------
tasks.push(this.loadAtlas(
  'house_small_building_atlas',
  'data/atlases/house-small_atlas.json',
  'assets/buildings/house/house-small-sprite.png'
));

tasks.push(this.loadAtlas(
  'house_middle_building_atlas',
  'data/atlases/house-middle_atlas.json',
  'assets/buildings/house/house-middle-sprite.png'
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
