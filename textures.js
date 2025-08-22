/* ============================================================================
 * textures.js — Atlas/Tile-Handling
 * Lädt einen JSON-Atlas + Image und stellt Zugriff per Key bereit.
 * Robust: Wenn ein Key fehlt, wird ein Platzhalter gezeichnet.
 * Globale Exports: window.Textures
 * ========================================================================== */
(() => {
  if (window.Textures) return;

  const L = {
    log : (...a)=>console.log('[tex]',...a),
    warn: (...a)=>console.warn('[tex]',...a),
    err : (...a)=>console.error('[tex]',...a),
  };

  const cache = {
    image: null,
    frames: new Map(),   // key -> {x,y,w,h}
    tileSize: 64,
    ready: false,
  };

  async function loadAtlas(mapJson, mapUrl) {
    cache.frames.clear();
    cache.image = null;
    cache.ready = false;

    const atlas = mapJson?.atlas;
    if (!atlas) { L.warn('kein atlas in Map — Platzhalter aktiv'); return; }

    const base = new URL(mapUrl, location.href);
    const jsonUrl  = new URL(atlas.json, base).toString();
    const imageUrl = new URL(atlas.image, base).toString();

    const res = await fetch(jsonUrl, {cache:'no-store'});
    if (!res.ok) throw new Error(`Atlas JSON fehlgeschlagen: ${res.status} ${res.statusText}`);
    const data = await res.json();

    // Unterstütze unterschiedliche Tileset-Formate:
    // 1) {frames:{KEY:{frame:{x,y,w,h}}}}
    // 2) {tiles:[{name:'grass',x,y,w,h},...]}
    // 3) {map:{KEY:[x,y,w,h]}, tileSize:n}
    if (data.frames) {
      for (const [k,v] of Object.entries(data.frames)) {
        const fr = v.frame || v; cache.frames.set(stripExt(k), {x:fr.x,y:fr.y,w:fr.w,h:fr.h});
      }
    } else if (Array.isArray(data.tiles)) {
      for (const t of data.tiles) cache.frames.set(stripExt(t.name), {x:t.x,y:t.y,w:t.w,h:t.h});
    } else if (data.map) {
      for (const [k,arr] of Object.entries(data.map)) {
        const [x,y,w,h] = arr; cache.frames.set(stripExt(k), {x,y,w,h});
      }
    }

    cache.tileSize = Number.isFinite(mapJson.tileSize) ? mapJson.tileSize
                    : Number.isFinite(mapJson.tile)     ? mapJson.tile
                    : Number.isFinite(data.tileSize)    ? data.tileSize
                    : 64;

    cache.image = await loadImage(imageUrl);
    cache.ready = true;
    L.log('Atlas geladen', {keys: cache.frames.size, tile: cache.tileSize});
  }

  function stripExt(name){ return String(name).replace(/\.(png|jpg|jpeg|webp)$/i,''); }

  function loadImage(url){
    return new Promise((res, rej)=>{
      const img = new Image();
      img.onload = ()=>res(img);
      img.onerror= ()=>rej(new Error('Image load fail: '+url));
      img.src = url + (url.includes('?')?'&':'?') + 'cb=' + Date.now();
    });
  }

  function drawTile(ctx, key, dx, dy, size){
    size = size || cache.tileSize;
    const k = stripExt(key);
    if (cache.ready && cache.frames.has(k)) {
      const f = cache.frames.get(k);
      ctx.drawImage(cache.image, f.x, f.y, f.w, f.h, dx, dy, size, size);
    } else {
      // Platzhalter: farbige Kachel mit Label
      ctx.save();
      ctx.fillStyle = colorForKey(k);
      ctx.fillRect(dx, dy, size, size);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.strokeRect(dx+0.5, dy+0.5, size-1, size-1);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = Math.max(10, size*0.18)+'px ui-monospace,monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(k, dx+size/2, dy+size/2);
      ctx.restore();
    }
  }

  function colorForKey(k){
    // deterministische „Hash“-Farbe
    let h=0; for (let i=0;i<k.length;i++) h=(h*131 + k.charCodeAt(i))>>>0;
    const r = 100 + (h & 0x7F);
    const g = 100 + ((h>>7) & 0x7F);
    const b = 100 + ((h>>14)& 0x7F);
    return `rgb(${r},${g},${b})`;
  }

  window.Textures = { loadAtlas, drawTile, get tileSize(){return cache.tileSize;} };
})();
