/*
  tools/map-runtime.js – MAX‑Variante
  ===================================
  Aufgabe:
  - Map JSON laden (Pfad aus boot.js).
  - Atlas‑JSON + Atlas‑PNG auflösen (relativ zum Map‑Pfad).
  - Tolerant sein:
      * Fehlt atlas.json oder image -> weiterfahren ohne Atlas (nur Log).
  - Kein Abbruch des Spiels bei Fehlern (wir werfen nur im harten Fehlerfall:
    Map nicht ladbar oder JSON ungültig).
  - Hilfsfunktion demoRenderToCanvas: malt aus der Map (Layer "ground")
    eine kleine Vorschau – reicht für Debug / Sichtprüfung.
*/

const text = (r) => r.text();
const json = (r) => r.json();

/** Hilfsfunktion: URL relativ zu einer Basis erstellen */
function resolveRelative(baseUrl, relative) {
  try {
    return new URL(relative, baseUrl).toString();
  } catch {
    // Fallback: einfach zusammenstückeln (sehr tolerant)
    if (relative.startsWith('http')) return relative;
    const idx = baseUrl.lastIndexOf('/');
    return baseUrl.slice(0, idx+1) + relative.replace(/^\.\//, '');
  }
}

/** Netzwerk-Fetch mit Logging-Hooks */
async function fetchWithLog(url, onNet) {
  const t0 = performance.now();
  const res = await fetch(url, { cache: 'no-store' });
  const dt = Math.max(1, Math.round(performance.now() - t0));
  if (onNet) onNet('[net]', res.status, url, `(${dt}ms)`);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.response = res;
    throw err;
  }
  return res;
}

/**
 * Map laden & vorbereiten.
 * @param {Object} opt
 * @param {string} opt.mapUrl              – absolute oder relative URL zur Map‑JSON
 * @param {(…args)=>void} [opt.onNet]      – Log‑Hook für Netz‑Zeilen
 * @param {(…args)=>void} [opt.onAtlas]    – Log‑Hook für Atlas‑Zeilen
 * @returns {Promise<{mapUrl:string, map:any, atlas?:any, atlasImage?:HTMLImageElement, frames?:Record<string, any>}>}
 */
export async function loadAndPrepareMap(opt) {
  const { mapUrl, onNet, onAtlas } = opt;

  // 1) Map‑JSON holen
  const rMap = await fetchWithLog(mapUrl, onNet);
  const map = await rMap.json();

  // 2) Atlas bestimmen (tolerant)
  let atlasJsonUrl = null;
  let atlasImgUrl  = null;
  if (map && map.atlas) {
    const base = map.atlas.base
      ? resolveRelative(mapUrl, map.atlas.base)
      : mapUrl; // „mapUrl“ ist eine brauchbare Basis

    if (map.atlas.json)  atlasJsonUrl = resolveRelative(base, map.atlas.json);
    if (map.atlas.image) atlasImgUrl  = resolveRelative(base, map.atlas.image);

    if (onAtlas) onAtlas('[atlas] base=' + base);
    if (atlasJsonUrl && onAtlas) onAtlas('[atlas] json=' + map.atlas.json + ' → ' + atlasJsonUrl);
    if (atlasImgUrl  && onAtlas) onAtlas('[atlas] image=' + map.atlas.image + ' → ' + atlasImgUrl);
  }

  // 3) Atlas‑JSON & Bild laden (optional)
  let atlas = null;
  let frames = null;
  let atlasImage = null;

  try {
    if (atlasJsonUrl) {
      const rA = await fetchWithLog(atlasJsonUrl, onNet);
      atlas = await rA.json();
      frames = atlas.frames || null;
    } else {
      if (onAtlas) onAtlas('Atlas‑JSON‑Pfad fehlt/ungültig — überspringe Atlas.');
    }
  } catch (e) {
    if (onAtlas) onAtlas('Atlas‑JSON konnte nicht geladen werden — fahre ohne Atlas fort.');
  }

  try {
    if (atlasImgUrl) {
      // Bild laden (klassisch)
      atlasImage = await new Promise((resolve, reject)=>{
        const img = new Image();
        // CORS‑freundlich auf GitHub Pages
        img.crossOrigin = 'anonymous';
        img.onload = ()=>resolve(img);
        img.onerror = reject;
        img.src = atlasImgUrl;
      });
    } else {
      if (onAtlas) onAtlas('Atlas‑IMAGE‑Pfad fehlt/ungültig — überspringe Atlas.');
    }
  } catch (e) {
    if (onAtlas) onAtlas('Atlas‑IMAGE konnte nicht geladen werden — fahre ohne Atlas fort.');
  }

  // Ergebnis zurück – Renderer/Engine kann selbst entscheiden, was er nutzt
  return { mapUrl, map, atlas, atlasImage, frames };
}

/* ============================================================
   Kleine Render‑Demo (DEBUG/Vorschau)
   ------------------------------------------------------------
   - Erwartet: map.layers.ground (2D‑Array von Frame‑Keys)
   - Nutzt „frames“ (aus atlas.json) – wenn nicht vorhanden, zeichnet Raster.
   - Diese Funktion ist optional; das eigentliche Spiel darf sie ignorieren.
============================================================ */
export async function demoRenderToCanvas(canvas, payload) {
  const { map, frames, atlasImage } = payload;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const W = Math.floor(innerWidth * dpr);
  const H = Math.floor(innerHeight * dpr);
  canvas.width = W; canvas.height = H;

  // Falls keine Map/Layer -> nur Grid zeichnen, aber NICHT scheitern
  if (!map || !map.layers || !map.layers.ground) {
    drawGrid(ctx, W, H, dpr);
    return;
  }

  const ground = map.layers.ground; // 2D‑Array der Frame‑Keys (Strings)
  const tile = (map.tileSize || 64) * dpr;

  // Viewport so anordnen, dass die Karte sichtbar ist
  const cols = ground[0]?.length || 0;
  const rows = ground.length;
  const mapW = cols * tile;
  const mapH = rows * tile;

  const offX = Math.floor((W - mapW) / 2);
  const offY = Math.floor((H - mapH) / 2);

  ctx.clearRect(0,0,W,H);

  // Wenn kein Atlas/frames -> graues Raster plus Keys schreiben
  if (!frames || !atlasImage) {
    drawGrid(ctx, W, H, dpr);
    ctx.save();
    ctx.translate(offX, offY);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${11*dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(x*tile, y*tile, tile, tile);
        const key = ground[y][x] ?? '';
        ctx.fillText(String(key), x*tile + 6*dpr, y*tile + 14*dpr);
      }
    }
    ctx.restore();
    return;
  }

  // Zeichnen mit Atlas
  ctx.save();
  ctx.translate(offX, offY);
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      const key = ground[y][x];
      const f = frames[key];
      if (!f) continue;
      const sx = f.x|0, sy = f.y|0, sw = f.w|0, sh = f.h|0;
      ctx.drawImage(atlasImage, sx, sy, sw, sh, x*tile, y*tile, tile, tile);
    }
  }
  ctx.restore();
}

/* Kleines Raster für Fallback */
function drawGrid(ctx, W, H, dpr) {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0f2030';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  const step = 64 * dpr;
  for (let x=0; x<=W; x+=step) ctx.strokeRect(x,0,1,H);
  for (let y=0; y<=H; y+=step) ctx.strokeRect(0,y,W,1);
}
