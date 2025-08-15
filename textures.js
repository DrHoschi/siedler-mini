// V15 textures – kleines Helper für Image‑Load mit Cache
const cache = new Map();

export function loadImage(url){
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error('Bild nicht gefunden: '+url));
    img.src = url + (url.includes('?')?'&':'?') + 'v=' + Date.now(); // Cache‑Bust für iOS
  });
  cache.set(url, p);
  return p;
}
