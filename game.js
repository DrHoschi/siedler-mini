/*!
 * Datei: game.js
 * Version: v16.0.8
 * Zweck: Minimal lauffähiges Gerüst mit sauberem Init, GameLoader.start(),
 *        optionalen Editor/Inspector-Dummies und Texture-Atlas-Fallback.
 * Erwartet: wird von index.html mit ?v=16.0.8 geladen (Cache-Booster).
 */

/* ============================== LOG HELPERS ============================== */
(function(){
  if(!window.__bus){
    // Fallback, falls index.html nicht unser Log-Bus gesetzt hat.
    const sub=[]; window.__bus={
      emit:(t,m)=>{ const line = `[??:??:??] (${t}) ${m}`; console.log(line); (window.__LOG__=window.__LOG__||[]).push(line); },
      on:(fn)=>sub.push(fn)
    };
  }
})();

const LOG = {
  ok:   (m)=>window.__bus.emit("ok",   `game.js ${VERSION} → ${m}`),
  warn: (m)=>window.__bus.emit("warn", `game.js ${VERSION} → ${m}`),
  err:  (m)=>window.__bus.emit("err",  `game.js ${VERSION} → ${m}`)
};

/* ============================== VERSION TAG ============================== */
const VERSION = "v16.0.8";

// Direkt melden, dass game.js geladen wurde
window.__bus?.emit("ok", `game.js geladen, game.js ${VERSION}`);

/* ============================== CANVAS/CTX ============================== */
const G = {
  canvas: null,
  ctx: null,
  atlas: {
    image: null,
    json: null,
    urlImage: "./assets/tiles/tileset.terrain.png",
    urlJson:  "./assets/tiles/tileset.terrain.json"
  },
  state: {
    ready: false,
    started: false,
    map: null,
    tileSize: 64
  }
};

function ensureCanvas() {
  if (G.canvas && G.ctx) return;
  // Bevorzugt Canvas vom Index
  const existing = document.getElementById("gameCanvas");
  G.canvas = existing || Object.assign(document.createElement("canvas"),{width:1024,height:640});
  if(!existing) document.body.appendChild(G.canvas);
  G.ctx = G.canvas.getContext("2d");
  // Hintergrundfarbe, damit man etwas sieht
  G.ctx.fillStyle = "#0e4f2d";
  G.ctx.fillRect(0,0,G.canvas.width,G.canvas.height);
}

/* ============================== ATLAS LOADER ============================= */
async function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error("Bild konnte nicht geladen werden: "+src));
    img.src = src;
  });
}

async function fetchJson(url){
  const res = await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function loadAtlas(){
  // Versuch: JSON → image (falls "image" Feld existiert), sonst fester Pfad
  try{
    const json = await fetchJson(G.atlas.urlJson);
    G.atlas.json = json;
    let imgUrl = json.image || G.atlas.urlImage; // falls im JSON kein image-Feld
    // Falls das JSON eine relative URL ohne Verzeichnis liefert, normieren
    if(!/^\w+:\/\//.test(imgUrl) && !imgUrl.startsWith("./") && !imgUrl.startsWith("../") && !imgUrl.startsWith("/")){
      // liegt neben der JSON
      const base = G.atlas.urlJson.split("/").slice(0,-1).join("/");
      imgUrl = `${base}/${imgUrl}`;
    }
    G.atlas.image = await loadImage(imgUrl+"?v="+VERSION);
    window.__bus.emit("ok", `Tileset (atlas) OK ${G.atlas.image.width}x${G.atlas.image.height}`);
  }catch(e){
    // Fallback: nur Bild
    try{
      G.atlas.json = null;
      G.atlas.image = await loadImage(G.atlas.urlImage+"?v="+VERSION);
      window.__bus.emit("ok", `Tileset (IMG only) OK ${G.atlas.image.width}x${G.atlas.image.height}`);
    }catch(e2){
      window.__bus.emit("err", "Tileset konnte nicht geladen werden");
      throw e2;
    }
  }
}

/* ============================== MAP LOADER =============================== */
async function fetchMap(url){
  const data = await fetchJson(url);
  // akzeptiert: { width, height, tileSize, layers? } oder { layers:[{data,width,height,tileSize}] }
  let width=0,height=0,tile=G.state.tileSize;
  if (typeof data.width==="number" && typeof data.height==="number") {
    width=data.width; height=data.height; if(data.tileSize) tile=data.tileSize;
  } else if (Array.isArray(data.layers) && data.layers[0]) {
    width=data.layers[0].width||0; height=data.layers[0].height||0; tile=data.layers[0].tileSize||tile;
  }
  if(!width || !height) throw new Error("Map: width/height fehlen oder sind 0");
  G.state.map = { width, height, tileSize: tile, raw:data };
  window.__bus.emit("ok", `Map OK size ${width}x${height} tile ${tile}`);
}

/* ============================== RENDER ================================== */
function renderPlaceholder(){
  ensureCanvas();
  const {ctx,canvas} = G;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // einfacher Checker
  for(let y=0;y<canvas.height;y+=32){
    for(let x=0;x<canvas.width;x+=32){
      ctx.fillStyle = ((x/32 + y/32)&1) ? "#134e4a" : "#0f766e";
      ctx.fillRect(x,y,32,32);
    }
  }
  ctx.fillStyle="#e5e7eb";
  ctx.font="16px ui-monospace, monospace";
  ctx.fillText(`game.js ${VERSION} – Placeholder`, 16, 28);
}

/* ============================== INIT ==================================== */
async function initGame(){
  if(G.state.ready) return;
  ensureCanvas();
  try{
    await loadAtlas();
    G.state.ready = true;
    window.__bus.emit("ok", `game.js initialisiert (${VERSION})`);
  }catch(e){
    window.__bus.emit("err","Init fehlgeschlagen: "+(e?.message||e));
    throw e;
  }
}

/* ============================== PUBLIC API ============================== */
window.GameLoader = {
  /**
   * Startet das Spiel mit gegebener Map-URL.
   * Sorgt dafür, dass Init einmalig läuft.
   */
  async start(mapUrl="./assets/maps/map-mini.json"){
    if(!G.state.ready){
      await initGame();
    }
    await fetchMap(mapUrl);
    renderPlaceholder(); // bis die echte Render-Pipeline kommt
    G.state.started = true;
  }
};

/* ====================== OPTIONAL: EDITOR/INSPECTOR DUMMIES ============== */
/*
  Diese Dummies unterdrücken Warnungen. Sobald echte Module geladen werden,
  können sie diese Objekte einfach überschreiben (gleiche API).
*/
if(!window.GameEditor){
  window.GameEditor = {
    open(){
      window.__bus.emit("warn","(Dummy) Editor.open() – echtes Modul noch nicht eingebunden.");
      // Beispiel: könnte ein Panel öffnen etc.
    },
    version: VERSION
  };
}
if(!window.GameInspector){
  window.GameInspector = {
    toggle(){
      window.__bus.emit("warn","(Dummy) Inspector.toggle() – echtes Modul noch nicht eingebunden.");
    },
    version: VERSION
  };
}

/* ============================== READY PING ============================== */
(function(){
  // kleines Signal, dass game.js wirklich da ist
  window.__bus.emit("ok", `game.js initialisiert (Index meldet ${window.__BUILD__?.indexVersion||"unbekannt"})`);
})();
