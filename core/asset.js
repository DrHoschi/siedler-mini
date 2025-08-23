/* =============================================================================
 * core/asset.js • v1.0 • Asset-Loader (Images) + Textures-Ready-Flag
 * =========================================================================== */
(function(){
  const images = Object.create(null);
  let texturesReady = false;

  async function loadImage(key, url){
    if (images[key]) return images[key];
    const img = new Image();
    img.decoding = 'async';
    img.loading  = 'eager';
    const p = new Promise((res, rej) => {
      img.onload = () => res(img);
      img.onerror = (e) => rej(new Error('Image load failed: '+url));
    });
    img.src = url;
    images[key] = p.then(()=>img);
    return images[key];
  }

  function markTexturesReady(v=true){ texturesReady = !!v; }
  function areTexturesReady(){ return texturesReady; }

  // Public API
  window.Asset = {
    images,
    loadImage,
    markTexturesReady,
    areTexturesReady,
    get texturesReady(){ return texturesReady; },
    set texturesReady(v){ texturesReady = !!v; }
  };
})();
