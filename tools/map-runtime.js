// tools/map-runtime.js
// Lädt Karte + Tileset, baut Offscreen‑Atlas und rendert die Welt auf Anfrage.

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// Hilfs‑Fetch mit Timing / Logging
async function timedFetch(url) {
  const t0 = performance.now();
  const res = await fetch(url, { cache:'no-store' });
  const t1 = performance.now();
  return { res, ms: Math.max(1, Math.round(t1 - t0)) };
}

// JSON sauber laden + Fehlertext
async function fetchJson(url) {
  const { res, ms } = await timedFetch(url);
  const code = res.status;
  if (!res.ok) throw new Error(`[net] ${code} ${url} (${ms}ms)`);
  const text = await res.text();
  try {
    return { data: JSON.parse(text), ms, code };
  } catch(e) {
    throw new Error(`SyntaxError: ${e.message} @ ${url}`);
  }
}

/* -----------------------------------------------------------
   API: Karte + Tileset laden und vorbereiten
   mapUrl: string (relativ zur Seite)
   opts: { onNet, onAtlas, log }
----------------------------------------------------------- */
export async function loadAndPrepareMap(mapUrl, opts = {}) {
  const base = new URL('.', new URL(mapUrl, location.href)).toString();
  opts.onAtlas?.('base', base);

  // Map JSON
  const { data: map, ms: msMap } = await fetchJson(mapUrl);
  opts.onNet?.(new URL(mapUrl, location.href).toString(), 200, msMap);

  // Tileset‑Pfade relativ zu /assets/maps/
  const tsJsonRel = map.tiles?.json || '../tiles/tileset.json';
  const tsImgRel  = map.tiles?.image || '../tiles/tileset.png';

  const tsJsonUrl = new URL(tsJsonRel, base).toString();
  const tsImgUrl  = new URL(tsImgRel,  base).toString();
  opts.onAtlas?.('json', `../tiles/tileset.json → ${tsJsonUrl}`);
  opts.onAtlas?.('image', `../tiles/tileset.png → ${tsImgUrl}`);

  // Tileset JSON
  const { data: tileset, ms: msTs } = await fetchJson(tsJsonUrl);
  opts.onNet?.(tsJsonUrl, 200, msTs);

  // Tileset PNG
  const t0 = performance.now();
  const img = await loadImage(tsImgUrl);
  const msImg = Math.max(1, Math.round(performance.now() - t0));
  opts.onNet?.(tsImgUrl, 200, msImg);

  const tileSize   = tileset.tileSize || 64;
  const imageWidth = tileset.imageWidth  || img.width;
  const imageHeight= tileset.imageHeight || img.height;

  // Offscreen‑Atlas (optional: hier nicht zerschneiden, wir ziehen direkt aus Bild)
  const atlasImage = img;

  // Offscreen‑Welt erzeugen
  const { fullCanvas, width, height } = renderFullMap(map, { tileset, atlasImage, tileSize });

  return {
    mapUrl, map, tileset, tileSize, atlasImage,
    view: { fullCanvas, width, height, tileSize }
  };
}

/* -----------------------------------------------------------
   Hilfsfunktionen
----------------------------------------------------------- */
function loadImage(url){
  return new Promise((res, rej)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=> res(img);
    img.onerror = ()=> rej(new Error(`Bild konnte nicht geladen werden: ${url}`));
    img.src = url + bust();
  });
}
function bust(){ return (urlHasQ() ? '&' : '?') + 'cb=' + Date.now(); }
function urlHasQ(){ return false; }

/* -----------------------------------------------------------
   Komplette Karte in Offscreen‑Canvas malen
   Erwartet ein simples Map‑JSON mit:
   {
     "size": {"cols":N,"rows":M},          // Gridmaß
     "tiles": {"json":"../tiles/tileset.json", "image":"../tiles/tileset.png"},
     "layers": [
       { "name":"ground", "grid":[[ "grass","grass",... ], ...] }
     ]
   }
   Frames aus tileset.json:
   { "frames": { "grass": {"x":0,"y":0,"w":64,"h":64}, ... } }
----------------------------------------------------------- */
function renderFullMap(map, { tileset, atlasImage, tileSize }){
  // Größe bestimmen
  const cols = map.size?.cols ?? 16;
  const rows = map.size?.rows ?? 12;

  const width  = cols * tileSize;
  const height = rows * tileSize;

  const off = new OffscreenCanvas(width, height);
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false;

  // Fallback: leere Map, wenn keine Layers vorliegen
  const layers = Array.isArray(map.layers) && map.layers.length ? map.layers : [];

  // Hilfszugriff auf Frame‑Rect
  const frames = tileset.frames || {};
  function drawFrame(frameKey, dx, dy){
    const f = frames[frameKey];
    if (!f) return; // unbekannter Name
    octx.drawImage(
      atlasImage,
      f.x, f.y, f.w, f.h,
      dx, dy, tileSize, tileSize
    );
  }

  // Alle Layers in Reihenfolge (ground -> above …)
  for (const L of layers){
    const grid = L.grid;
    if (!Array.isArray(grid)) continue;
    for (let r=0; r<grid.length; r++){
      const row = grid[r];
      if (!Array.isArray(row)) continue;
      for (let c=0; c<row.length; c++){
        const key = row[c];
        const dx = c * tileSize;
        const dy = r * tileSize;
        drawFrame(key, dx, dy);
      }
    }
  }

  return { fullCanvas: off, width, height };
}

/* -----------------------------------------------------------
   Sicht rendern: Grid + Welt zeichnen mit Kamera/Zoom
----------------------------------------------------------- */
export function renderView(targetCanvas, view, camera){
  const tctx = targetCanvas.getContext('2d');
  const dpr = devicePixelRatio||1;

  // Bildschirm löschen
  tctx.setTransform(1,0,0,1,0,0);
  tctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);

  // Welt‑Transform
  const z = camera.zoom;
  const x = camera.x;
  const y = camera.y;

  tctx.save();
  tctx.scale(z * dpr, z * dpr);
  tctx.translate(-x, -y);
  tctx.imageSmoothingEnabled = false;

  // Grid unter der Karte
  {
    const tile = view.tileSize || 64;
    const w = view.width, h = view.height;
    tctx.save();
    tctx.strokeStyle = 'rgba(255,255,255,0.06)';
    tctx.lineWidth = 1 / (z * dpr);
    for (let gx=0; gx<=w; gx+=tile){ tctx.beginPath(); tctx.moveTo(gx,0); tctx.lineTo(gx,h); tctx.stroke(); }
    for (let gy=0; gy<=h; gy+=tile){ tctx.beginPath(); tctx.moveTo(0,gy); tctx.lineTo(w,gy); tctx.stroke(); }
    tctx.restore();
  }

  // Welt zeichnen
  tctx.drawImage(view.fullCanvas, 0, 0);

  tctx.restore();
}
