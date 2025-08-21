/*
  tools/map-runtime.js – MAX + View-Renderer
  - Lädt Map-JSON (mapUrl)
  - Lädt Tileset-JSON/PNG (relativ zur Map)
  - Rastert die komplette Map in ein Offscreen-Canvas (fullCanvas)
  - Exportiert renderView(targetCanvas, view, camera) für Pan/Zoom
*/

export async function loadAndPrepareMap({ mapUrl, onNet = ()=>{}, onAtlas = ()=>{} } = {}) {
  const base = mapUrl.replace(/[^/]+$/, ''); // Pfad zur Map

  // 1) Map laden
  onNet(mapUrl);
  const map = await fetch(mapUrl, { cache:'no-store' }).then(r=>r.json());

  // 2) Tileset auflösen (relativ zur Map)
  const jsonRel  = map.atlas?.json  ?? '../tiles/tileset.json';
  const imageRel = map.atlas?.image ?? '../tiles/tileset.png';
  const jsonUrl  = new URL(jsonRel,  base).toString();
  const imageUrl = new URL(imageRel, base).toString();

  onAtlas('base='+base);
  onAtlas('json='+jsonRel+' → '+jsonUrl);
  onAtlas('image='+imageRel+' → '+imageUrl);

  // 3) Tileset laden
  onNet(jsonUrl);
  const tileset = await fetch(jsonUrl, { cache:'no-store' }).then(r=>r.json());
  const tileSize = tileset.tileSize ?? 64;

  // 4) Bild laden
  const atlasImage = await new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  });

  // 5) Frames-Tabelle vorbereiten (Name → {x,y,w,h})
  const frames = tileset.frames || {};

  // 6) Komplette Map in Offscreen-Canvas rastern
  const cols = map.width;
  const rows = map.height;

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width  = cols * tileSize;
  fullCanvas.height = rows * tileSize;
  const fctx = fullCanvas.getContext('2d');

  const layer = map.layers?.[0]?.grid || []; // einfache Variante: nur erste Ebene
  for (let y = 0; y < rows; y++) {
    const row = layer[y] || [];
    for (let x = 0; x < cols; x++) {
      const key = row[x];
      if (!key) continue;
      const fr = frames[key];
      if (!fr) continue;
      fctx.drawImage(
        atlasImage,
        fr.x, fr.y, fr.w, fr.h,
        x * tileSize, y * tileSize, tileSize, tileSize
      );
    }
  }

  return {
    mapUrl,
    map,
    tileset,
    frames,
    tileSize,
    atlasImage,
    // für den View-Renderer:
    view: {
      fullCanvas,
      width:  fullCanvas.width,
      height: fullCanvas.height
    }
  };
}

/**
 * Zeichnet den vorbereiteten Full-Buffer (view.fullCanvas)
 * in den Ziel-Canvas mit Kamera-Transform (x,y in Pixeln, zoom).
 */
export function renderView(targetCanvas, view, camera) {
  if (!view?.fullCanvas) return;

  const tctx = targetCanvas.getContext('2d');
  const { width, height } = targetCanvas;

  tctx.setTransform(1,0,0,1,0,0);
  tctx.clearRect(0,0,width,height);

  // Kamera anwenden
  // camera.x/y geben die Welt-Koordinaten des linken/oberen Randes an
  const zoom = camera?.zoom ?? 1;
  const camX = camera?.x ?? 0;
  const camY = camera?.y ?? 0;

  tctx.save();
  tctx.scale(zoom * devicePixelRatio, zoom * devicePixelRatio);
  tctx.translate(-camX, -camY);
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(view.fullCanvas, 0, 0);
  tctx.restore();
}

// Optional: eine einmalige Demo-Zeichnung (falls jemand ohne View-Loop nutzt)
export async function demoRenderToCanvas(targetCanvas, result) {
  renderView(targetCanvas, result.view, { x:0, y:0, zoom:1 });
}
