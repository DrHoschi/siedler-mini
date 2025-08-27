/* Datei: core/asset.js
 * Version: v16.1.2
 * Zweck:
 *   - Zentrale Asset-Helfer + Versionstoken (?v=…) gegen Safari-Cache
 */

(function(){
  const VERSION = "16.1.2";
  const TOKEN = `${VERSION}-${Date.now().toString(36)}`;

  function withToken(path){ return `${path}${path.includes("?") ? "&" : "?"}v=${TOKEN}`; }

  async function loadJSON(path){
    const res = await fetch(withToken(path));
    if(!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  function loadImage(path){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = withToken(path);
    });
  }

  window.Asset = { loadJSON, loadImage, withToken, version: VERSION };
})();
