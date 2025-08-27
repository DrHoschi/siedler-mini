/* game.js v16.1.1
   - Stabiles GameLoader.start(mapPath)
   - Zeichenpipeline (Canvas 2D)
   - Placement-API: Game.place(x,y,{kind, sprite})
   - Atlas-Support (Buildings.Lumberjack)
*/

(function(){
  const version = "16.1.1";

  // --- tiny logger shared with index ---
  const Log = window.Log = window.Log || {
    _el: null,
    write(...a){
      const t = new Date().toTimeString().slice(0,8);
      const line = `[${t}] ${a.join(" ")}`;
      (this._el ||= document.getElementById("log")).textContent += line+"\n";
      (document.getElementById("logPanel")).scrollTop = 1e9;
      console.debug(line);
    },
    copy(){
      const txt = (this._el ||= document.getElementById("log")).textContent;
      navigator.clipboard?.writeText(txt);
      this.write("✅ (ok) Log in Zwischenablage");
    },
    clear(){ (this._el ||= document.getElementById("log")).textContent=""; }
  };

  // --- Game state ---
  const Game = window.Game = {
    version,
    tileSize: 64,
    map: null,
    grid: [],
    canvas: null,
    ctx: null,
    dpr: 1,
    entities: [],  // {x,y, sprite:{img, sx,sy,sw,sh}}
    atlas: {},     // by key
    setAtlas(key, sprite){ Game.atlas[key]=sprite; },
    place(x,y, spec){
      const {sprite} = spec || {};
      if (!sprite) { Log.write("⚠️ (warn) Kein Sprite übergeben"); return; }
      Game.entities.push({x,y,sprite});
      draw();
      Log.write(`✅ (ok) Platziert: ${spec.kind||"entity"} @ (${x},${y})`);
    }
  };

  function setupCanvas(){
    const cvs = Game.canvas = document.getElementById("game");
    Game.dpr = Math.max(1, Math.floor(window.devicePixelRatio||1));
    cvs.width = Math.floor(cvs.clientWidth * Game.dpr);
    cvs.height = Math.floor(cvs.clientHeight* Game.dpr);
    Game.ctx = cvs.getContext("2d");
  }

  function draw(){
    const ctx = Game.ctx; if (!ctx) return;
    // background
    ctx.fillStyle = "#2e5f3c";
    ctx.fillRect(0,0,Game.canvas.width, Game.canvas.height);

    // simple grid preview (based on current map size if present)
    const ts = Game.tileSize;
    const cols = Game.map?.width || 16;
    const rows = Game.map?.height|| 10;
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    for(let x=0;x<=cols;x++){ ctx.beginPath(); ctx.moveTo(x*ts,0); ctx.lineTo(x*ts,rows*ts); ctx.stroke(); }
    for(let y=0;y<=rows;y++){ ctx.beginPath(); ctx.moveTo(0,y*ts); ctx.lineTo(cols*ts,y*ts); ctx.stroke(); }

    // draw entities
    for(const e of Game.entities){
      const {img,sx,sy,sw,sh} = e.sprite;
      const dx = e.x*ts, dy = e.y*ts, dw = ts, dh = ts;
      if (img && sw && sh) ctx.drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh);
      else { ctx.fillStyle="#8dd3a5"; ctx.fillRect(dx,dy,dw,dh); }
    }
  }

  // --- Loader ---
  const GameLoader = window.GameLoader = {
    async start(mapPath){
      Log.write(`✅ (ok) GameLoader.start ${mapPath}`);
      await initIfNeeded();
      const map = await fetch(mapPath+"?v="+version).then(r=>r.json());
      if (!map.width || !map.height) throw new Error("Map: width/height fehlen oder sind 0");
      Game.map = map;
      Game.tileSize = map.tileSize || 64;
      Game.entities.length = 0; // clear
      draw();
      Log.write("✅ (ok) Game started");
    }
  };

  let __inited = false;
  async function initIfNeeded(){
    if (__inited) return;
    setupCanvas();

    // Hook resize
    const ro = new ResizeObserver(()=>draw());
    ro.observe(Game.canvas);

    // Prepare atlas (lumberjack) if module already loaded
    if (window.Buildings?.Lumberjack?.install) {
      await window.Buildings.Lumberjack.install(Game);
    }

    __inited = true;
    Log.write(`✅ (ok) game.js initialisiert (Index meldet v${window.__APP_VERSION__||"?"})`);
  }

  // Public helpers for UI:
  window.GameAPI = {
    // Place by grid cell
    placeByKey(key, gx, gy){
      const spr = Game.atlas[key];
      if (!spr) { Log.write(`⚠️ (warn) Sprite fehlt: ${key}`); return; }
      Game.place(gx, gy, {kind:key, sprite:spr});
    }
  };

  // first banner
  Log.write(`✅ (ok) game.js geladen, ✅ game.js v${version}`);
})();
