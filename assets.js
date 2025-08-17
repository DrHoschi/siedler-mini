/* assets.js — universeller Loader für Terrain/Textures
   - Bevorzugt Pfad: assets/tex/terrain/
   - Akzeptiert .png, .jpeg, .jpg
   - Akzeptiert Namensmuster: topdown_<name>, <name>, terrain_<name>
   - Nutze loadTextures({keys:[...names...]}) und getTexture(name)
*/

export const Assets = (() => {
  const cache = new Map();   // key -> HTMLImageElement
  const tried = new Map();   // key -> boolean (ob versucht)

  const exts = ["png","jpeg","jpg"];
  const nameVariants = (name) => [
    `topdown_${name}`,
    name,
    `terrain_${name}`
  ];
  const baseVariants = (nv, ext) => [
    `assets/tex/terrain/${nv}.${ext}`,
    `assets/tex/${nv}.${ext}`,           // Fallback, wenn ohne /terrain abgelegt
  ];

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("404 "+src));
      img.src = src + `?v=${Date.now()}`; // harter Cache‑Buster für iOS
    });
  }

  async function tryLoadSinglePath(path){
    try { const im = await loadImage(path); return im; }
    catch { return null; }
  }

  async function tryLoadKey(name){
    // bereits geladen?
    if (cache.has(name)) return cache.get(name);
    if (tried.get(name) === true) return null;
    tried.set(name, true);

    for (const variant of nameVariants(name)){
      for (const ext of exts){
        for (const path of baseVariants(variant, ext)){
          const img = await tryLoadSinglePath(path);
          if (img){
            cache.set(name, img);
            return img;
          }
        }
      }
    }
    return null;
  }

  async function loadTextures({keys=[]}){
    const results = {};
    for (const k of keys){
      results[k] = await tryLoadKey(k); // kann null sein (Platzhalter verwenden)
    }
    return results;
  }

  function getTexture(name){ return cache.get(name) || null; }

  // Kleines Platzhalter‑Canvas (64x64 kariert)
  function placeholder64(label="#"){
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#203040"; g.fillRect(0,0,64,64);
    g.fillStyle = "#2b3b53"; g.fillRect(0,0,32,32); g.fillRect(32,32,32,32);
    g.fillStyle = "#9fb3cc";
    g.font = "10px monospace"; g.textAlign="center"; g.textBaseline="middle";
    g.fillText(label,32,32);
    return c;
  }

  return {
    loadTextures,
    getTexture,
    placeholder64,
  };
})();
