// Tiny asset loader for images & JSON (no deps)
// Crisp pixels & ImageBitmap when available.

export const Assets = (() => {
  const cache = new Map();

  function imageRenderingCrisp(ctxOrCanvas) {
    const c = ctxOrCanvas?.canvas || ctxOrCanvas;
    if (!c) return;
    c.style.imageRendering = 'pixelated';
  }

  async function loadImage(url) {
    if (cache.has(url)) return cache.get(url);

    const p = (async () => {
      const res = await fetch(url);
      const blob = await res.blob();
      if ('createImageBitmap' in window) {
        return await createImageBitmap(blob, { imageOrientation: 'from-image', premultiplyAlpha: 'none' });
      }
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.decoding = 'async';
        img.src = URL.createObjectURL(blob);
      });
    })();

    cache.set(url, p);
    return p;
  }

  async function loadJSON(url) {
    if (cache.has(url)) return cache.get(url);
    const p = fetch(url).then(r => {
      if (!r.ok) throw new Error(`JSON load failed: ${url}`);
      return r.json();
    });
    cache.set(url, p);
    return p;
  }

  async function loadAll(manifest) {
    // manifest = { images: [url], json: [url] }
    const tasks = [];
    (manifest.images || []).forEach(u => tasks.push(loadImage(u)));
    (manifest.json || []).forEach(u => tasks.push(loadJSON(u)));
    await Promise.all(tasks);
  }

  function get(url) { return cache.get(url); }

  return { loadImage, loadJSON, loadAll, get, imageRenderingCrisp };
})();
