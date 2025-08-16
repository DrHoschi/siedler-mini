// game.js
import { ASSETS } from './assets.js';

// globaler Texture-Cache
const TEX = {
  tiles: {},
  buildings: { wood: {}, stone: {} },
  ui: {},
};

// Hilfsfunktion für Bild-Load mit Cache-Buster (Safari/iOS Problem!)
async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `${url}?v=${Date.now().toString().slice(-6)}`;
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("⚠️ Bild konnte nicht geladen werden:", url);
      resolve(null);
    };
  });
}

// Alle Texturen vor Spielstart laden
async function preloadTextures() {
  // Tiles
  TEX.tiles.grass = await loadImage(ASSETS.tiles.grass);
  TEX.tiles.dirt  = await loadImage(ASSETS.tiles.dirt);
  TEX.tiles.water = await loadImage(ASSETS.tiles.water);

  TEX.tiles.path = [];
  for (const p of ASSETS.tiles.path) {
    TEX.tiles.path.push(await loadImage(p));
  }

  // Straßen
  if (ASSETS.tiles.road_straight) TEX.tiles.road_straight = await loadImage(ASSETS.tiles.road_straight);
  if (ASSETS.tiles.road_corner)   TEX.tiles.road_corner   = await loadImage(ASSETS.tiles.road_corner);
  if (ASSETS.tiles.road_t)        TEX.tiles.road_t        = await loadImage(ASSETS.tiles.road_t);
  if (ASSETS.tiles.road_cross)    TEX.tiles.road_cross    = await loadImage(ASSETS.tiles.road_cross);

  // Buildings – Holz
  const W = TEX.buildings.wood;
  const Wsrc = ASSETS.buildings.wood;
  for (const key of Object.keys(Wsrc)) {
    W[key] = await loadImage(Wsrc[key]);
  }

  // Buildings – Stein (falls später ergänzt)
  const Ssrc = ASSETS.buildings.stone || {};
  const S = TEX.buildings.stone;
  for (const key of Object.keys(Ssrc)) {
    S[key] = await loadImage(Ssrc[key]);
  }
}

// Mapping: Building-Objekt → Bild
function getBuildingTexture(b) {
  const BW = TEX.buildings.wood;
  switch (b.type) {
    case 'hq':              return BW.hq;
    case 'hq_ug1':          return BW.hq_ug1;
    case 'depot':           return BW.depot;
    case 'depot_ug':        return BW.depot_ug;
    case 'lumberjack':      return BW.lumberjack;
    case 'farm':            return BW.farm;
    case 'bakery':          return BW.bakery;
    case 'fisher':          return BW.fisher;
    case 'stonebreaker':    return BW.stonebreaker;
    case 'watermill':       return BW.watermill;
    case 'windmill':        return BW.windmill;
    case 'house1':          return BW.house1;
    case 'house1_ug1':      return BW.house1_ug1;
    case 'house2':          return BW.house2;
    default:                return null; // Fallback
  }
}

// Zeichnen eines Gebäudes
function drawBuilding(ctx, b, state) {
  const img = getBuildingTexture(b);
  const p = toScreen(b.x, b.y, state);
  const size = 64 * state.zoom; // 64x64 Raster

  const x = (p.x * state.DPR) - (size * state.DPR)/2;
  const y = (p.y * state.DPR) - (size * state.DPR)/2;

  if (img) {
    ctx.drawImage(img, x, y, size * state.DPR, size * state.DPR);
  } else {
    // Fallback: grüner Kasten mit Typ-Label
    ctx.fillStyle = '#2b7';
    ctx.fillRect(x, y, size*state.DPR, size*state.DPR);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(12*state.DPR)}px system-ui`;
    ctx.fillText(b.type, x+6, y+16);
  }
}

// Beispiel-Stub für toScreen (bitte durch deine eigene Funktion ersetzen)
function toScreen(wx, wy, state) {
  return { x: wx * state.zoom + state.offsetX, y: wy * state.zoom + state.offsetY };
}

// Startpunkt
(async()=>{
  await preloadTextures(); // alles laden
  startGame({ canvas: document.getElementById('game') }); // dein bestehendes Spiel starten
})();
