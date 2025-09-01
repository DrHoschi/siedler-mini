/* 
================================================================================
   Datei: core/asset.js
   Projekt: Siedler-Mini
   Version: v16.1.3
   Zweck:
   - Zentrale Asset-Helfer + Versionstoken (?v=…) gegen Safari-Cache
   - Laden von JSON/PNG
   - Charakter-Sprite & Atlas (High-End 2048×2048) registrieren
   - Utility: drawChar(ctx, name, dir, x, y)
================================================================================
*/

(function(){

  // ===========================================================================
  // 1) Globale Meta / Version / Token
  // ===========================================================================
  const VERSION = "16.1.3";
  const TOKEN = `${VERSION}-${Date.now().toString(36)}`;

  /** Hängt ein Versionstoken an URLs, um hartnäckiges Caching (Safari/iOS) zu umgehen. */
  function withToken(path){
    return `${path}${path.includes("?") ? "&" : "?"}v=${TOKEN}`;
  }

  // ===========================================================================
  // 2) Basis-Loader
  // ===========================================================================
  async function loadJSON(path){
    const res = await fetch(withToken(path));
    if(!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  /** Bildlader mit Promise. */
  function loadImage(path){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = withToken(path);
    });
  }

  // ===========================================================================
  // 3) Charakter-Sprite/Atlas – Pfade & Lazy-Loader
  //    → Lege die Dateien hier ab:
  //       assets/characters/characters_sprite_highend.png
  //       assets/characters/characters_sprite_atlas_2048.json
  // ===========================================================================
  const CHAR_IMG_PATH  = "assets/characters/characters_sprite_highend.png";
  const CHAR_ATLAS_PATH= "assets/characters/characters_sprite_atlas_2048.json";

  /** interner Cache, damit mehrfaches Laden vermieden wird */
  let _characters = null;

  /**
   * Lädt Sprite (PNG) + Atlas (JSON) für die Figuren.
   * Gibt ein Objekt { image, atlas } zurück.
   */
  async function loadCharacters(){
    if(_characters) return _characters;

    // Paralleles Laden
    const [atlas, image] = await Promise.all([
      loadJSON(CHAR_ATLAS_PATH),
      loadImage(CHAR_IMG_PATH),
    ]);

    _characters = { image, atlas };

    // Log + Event (einheitlicher Stil)
    (window.CBLog?.ok || console.log)(`[asset.js] Characters geladen (v${VERSION})`);
    window.dispatchEvent?.(new CustomEvent("cb:assets-ready", {
      detail: { type: "characters", version: VERSION }
    }));

    return _characters;
  }

  // ===========================================================================
  // 4) Zeichen-Utility für Figuren
  //    drawChar(ctx, name, dir, x, y)
  //    - nutzt Pivot aus dem Atlas (default 0.5/0.85)
  //    - erwartet Keys wie "Farmer_South"
  // ===========================================================================
  function drawChar(ctx, name, dir, x, y){
    if(!_characters || !_characters.image || !_characters.atlas){
      console.warn("[asset.js] drawChar() vor loadCharacters() aufgerufen – lade automatisch …");
      // Notfallsynchron: In Spielcode besser vorher loadCharacters() awaiten!
      // Wir starten ein Lazy-Load ohne await; diese erste Zeichnung wird evtl. leer sein.
      loadCharacters().catch(console.error);
      return;
    }
    const atlas = _characters.atlas;
    const key = `${name}_${dir}`;
    const data = atlas.frames?.[key];
    if(!data){
      console.warn(`[asset.js] Frame nicht gefunden: ${key}`);
      return;
    }

    const f = data.frame;
    const piv = data.pivot || { x: 0.5, y: 0.85 };
    const dx = Math.round(x - f.w * piv.x);
    const dy = Math.round(y - f.h * piv.y);

    ctx.drawImage(_characters.image, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
  }

  // ===========================================================================
  // 5) Öffentliche API
  // ===========================================================================
  window.Asset = {
    // Basis
    loadJSON,
    loadImage,
    withToken,
    version: VERSION,

    // Characters
    loadCharacters, // async → { image, atlas }
    drawChar,       // sync  → zeichnet 1 Frame anhand Key <Name>_<Dir>

    // Exponiere zur Sicherheit die verwendeten Pfade
    paths: {
      characters: {
        image: CHAR_IMG_PATH,
        atlas: CHAR_ATLAS_PATH,
      }
    }
  };

  // Frühes Log (Ladezeile je Modul)
  (window.CBLog?.ok || console.log)(`[asset.js] Modul bereit (v${VERSION})`);

})();
