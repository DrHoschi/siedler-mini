/* tools/map-runtime.js – Map laden + Tileset laden + Logging
 * Public API:
 *   MapRuntime.startSelected(url)
 */
window.MapRuntime = (function () {
  const log = (tag, ...a) => console.log(`%c[${tag}]`, "color:#9f7", ...a);
  const warn = (tag, ...a) => console.warn(`%c[${tag}]`, "color:#fb7", ...a);
  const err = (tag, ...a) => console.error(`%c[${tag}]`, "color:#f77", ...a);

  const state = window.__SM_STATE__ || {};

  async function fetchJSON(url) {
    const t0 = performance.now();
    const res = await fetch(url, { cache: "no-store" });
    log("net", `${res.status} ${url} (${Math.round(performance.now()-t0)}ms)`);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }

  async function loadTileset(baseDir, tilesetJsonRel, imageRel) {
    const jsonUrl  = new URL(tilesetJsonRel, baseDir).toString();
    const imageUrl = new URL(imageRel,     baseDir).toString();
    log("atlas", "base="+baseDir);
    log("atlas", "json="+tilesetJsonRel+" →", jsonUrl);
    log("atlas", "image="+imageRel+" →", imageUrl);

    const data = await fetchJSON(jsonUrl);
    const img = await loadImage(imageUrl);
    return { data, image: img };
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error("Image load failed: "+url));
      img.src = url + (url.includes("?") ? "&" : "?") + "bust=" + Date.now();
    });
  }

  async function startSelected(urlFromSelect) {
    const mapUrl = urlFromSelect || state.mapUrl;
    if (!mapUrl) { warn("game", "Keine Karte ausgewählt."); return; }

    // Map laden
    log("game", "Lade Karte:", mapUrl);
    let map;
    try {
      map = await fetchJSON(mapUrl);
    } catch (e) {
      err("game", "Karte konnte nicht geladen werden:", mapUrl);
      console.error(e);
      return;
    }
    log("game", "Karte geladen:", mapUrl);

    // Tileset/Atlas ermitteln (relative zum Kartenverzeichnis)
    const base = mapUrl.substring(0, mapUrl.lastIndexOf("/") + 1);
    const atlasJsonRel = map?.atlas?.json || "../tiles/tileset.json";
    const atlasImgRel  = map?.atlas?.image || "../tiles/tileset.png";

    let atlas = null;
    try {
      atlas = await loadTileset(base, atlasJsonRel, atlasImgRel);
    } catch (e) {
      warn("game", "Atlas konnte nicht geladen werden — fahre ohne Atlas fort.");
      console.warn(e);
    }

    // Render-Probe: wir zeichnen einen simplen Layer aus map.layers[0]
    try {
      renderMap(map, atlas);
    } catch(e) {
      err("game", "Render-Fehler:", e);
    }
  }

  function renderMap(map, atlas) {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const tile = (map.tileSize || 64) | 0;
    const W = (map.cols || 16) * tile;
    const H = (map.rows || 16) * tile;

    // Canvas-Größe ggf. anpassen
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      if (window.__SM_STATE__) {
        window.__SM_STATE__.width = W;
        window.__SM_STATE__.height = H;
      }
    }

    // Hintergrund
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#152536";
    ctx.fillRect(0,0,W,H);

    // Falls kein Layer: Grid als Fallback
    const layer = Array.isArray(map.layers) && map.layers[0];
    if (!layer) {
      for (let x=0; x<=W; x+=tile) {
        ctx.fillStyle = (x/tile)%4===0? "#2a4058":"#1b2f45";
        ctx.fillRect(x,0,1,H);
      }
      for (let y=0; y<=H; y+=tile) {
        ctx.fillStyle = (y/tile)%4===0? "#2a4058":"#1b2f45";
        ctx.fillRect(0,y,W,1);
      }
      return;
    }

    // Mit Atlas zeichnen (frames-Map aus tileset.json)
    const frames = atlas?.data?.frames || {};
    const img = atlas?.image || null;

    for (let y=0; y<map.rows; y++) {
      for (let x=0; x<map.cols; x++) {
        const key = layer[y*map.cols + x]; // z.B. "grass" / "water" …
        if (img && frames[key]) {
          const f = frames[key];
          ctx.drawImage(img, f.x, f.y, f.w, f.h, x*tile, y*tile, tile, tile);
        } else {
          // Fallback‑Kästchen, falls Key fehlt
          ctx.fillStyle = key ? "#345a2b" : "#384e66";
          ctx.fillRect(x*tile, y*tile, tile, tile);
          ctx.fillStyle = "rgba(0,0,0,.15)";
          ctx.fillRect(x*tile, y*tile, tile, 1);
          ctx.fillRect(x*tile, y*tile, 1, tile);
        }
      }
    }
  }

  return { startSelected };
})();
