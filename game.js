/* ============================================================================
 * game.js — v16.1.10
 * Zweck: Engine-Bootstrap + Renderloop + Building-Layer (Lumberjack sichtbar)
 * WICHTIG: Keine Abhängigkeit auf Tilesets nötig; Buildings werden als Overlay
 *          direkt aus dem Lumberjack-Atlas gerendert (512→TileSize skaliert).
 * ========================================================================== */

(() => {
  const V = "v16.1.10";
  const log = (...a) => console.log(`[${new Date().toLocaleTimeString()}]`, ...a);
  const ok  = (m)=>log("✅ (ok)", m);
  const warn= (m)=>log("⚠️ (warn)", m);
  const err = (m)=>log("❌ (err)", m);

  // --- Globale State-Struktur (minimal, nicht-invasiv) ----------------------
  const GameState = {
    version: V,
    canvas: null, ctx: null,
    dpr: Math.max(1, Math.round(window.devicePixelRatio||1)),
    tileSize: 64,
    map: { width: 16, height: 10, loaded: false },
    buildings: [], // [{id, name, x, y, atlas:'...png', sx, sy, sw, sh}]
    atlasCache: new Map(), // url -> HTMLImageElement
    running: false,
  };
  window.GameState = GameState;

  // --- Atlas Loader (einfaches Image-Caching) -------------------------------
  async function loadAtlas(url){
    if (GameState.atlasCache.has(url)) return GameState.atlasCache.get(url);
    const img = new Image();
    const p = new Promise((resolve, reject)=>{
      img.onload = ()=>resolve(img);
      img.onerror = ()=>reject(new Error("Atlas konnte nicht geladen werden: "+url));
    });
    img.src = url;
    GameState.atlasCache.set(url, p);
    return p;
  }

  // --- Canvas Setup ----------------------------------------------------------
  function setupCanvas(){
    const c = document.getElementById("game-canvas");
    GameState.canvas = c;
    GameState.ctx = c.getContext("2d");
    resizeCanvas();
    ok(`game.js initialisiert (${V})`);
  }

  function resizeCanvas(){
    const { canvas, dpr } = GameState;
    const w = Math.max(320, Math.floor(window.innerWidth));
    const h = Math.max(200, Math.floor(window.innerHeight));
    canvas.style.width = w+"px";
    canvas.style.height= h+"px";
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    GameState.ctx.setTransform(dpr,0,0,dpr,0,0);
    ok(`Canvas ${w}x${h} dpr:${dpr}`);
    requestRender();
  }
  window.addEventListener("resize", resizeCanvas);

  // --- Map Loader (Stub: wir nutzen vorhandene Engine-Hooks, wenn vorhanden) -
  async function startGame(mapPath){
    ok(`GameLoader.start ${mapPath}`);
    // Falls deine Engine eine eigene Start-Funktion hat, nutze sie:
    if (window.GameLoader?.start) {
      const r = await window.GameLoader.start(mapPath).catch(e=>{
        err("GameLoader.start Fehler: " + (e?.message||e));
        throw e;
      });
      GameState.map.loaded = true;
      ok(`Game gestartet (Engine)`);
    } else {
      // Fallback: Markiere Map als geladen, damit wir sofort bauen/zeichnen können.
      GameState.map.loaded = true;
      warn("Engine noch nicht eingebunden – Fallback-Start genutzt.");
    }

    // Event-Integration wie besprochen:
    window.dispatchEvent(new CustomEvent('cb:game-started'));
    window.GameUI?.onGameStarted?.();
    GameState.running = true;
    requestRender();
  }

  // --- Building-Registry (Lumberjack) ---------------------------------------
  // Quelle: assets/buildings/lumberjack/lumberjack_tiers_grid.png
  // CSV-Ausschnitt (von dir): id,name,tier,variant,role,frame.x,frame.y
  // Wir verwenden hier die 'BuildMenu'-Variante (ug0) als Thumb & die 'Placed'-Variante (ug1) im Spiel.
  const LUMBERJACK_ATLAS = "assets/buildings/lumberjack/lumberjack_tiers_grid.png";
  const SPRITES = {
    // toolKey -> atlas frame
    // Annahme: Einzelkachel 512x512 im Atlas
    "wood0": { atlas: LUMBERJACK_ATLAS, sx: 0,   sy: 0,   sw: 512, sh: 512, name: "lumberjack_wood0_ug0" },
    "wood1": { atlas: LUMBERJACK_ATLAS, sx: 0,   sy: 512, sw: 512, sh: 512, name: "lumberjack_wood1_ug0" },
    "wood2": { atlas: LUMBERJACK_ATLAS, sx: 0,   sy: 1024,sw: 512, sh: 512, name: "lumberjack_wood2_ug0" },
    // Wenn du lieber die "Placed"-Variante sehen willst, setze sx:512 beibehaltene sy:
    // z.B. wood0_placed: { atlas:LUMBERJACK_ATLAS, sx:512, sy:0, sw:512, sh:512 }
  };

  // --- Platzieren aus UI (Listener auf CustomEvent von ui-build.js) ----------
  window.addEventListener("cb:place", async (ev)=>{
    const { tool, x, y } = ev.detail||{};
    if (!GameState.map.loaded) { warn("Platzieren ignoriert – Map noch nicht geladen."); return; }
    if (!tool) return;

    // Roads/Paths überlässt du weiter deiner bestehenden Logik;
    // Hier kümmern wir uns nur um bekannte Gebäude-Tools:
    if (SPRITES[tool]) {
      const s = SPRITES[tool];
      GameState.buildings.push({
        id: `${tool}@${x},${y}@${Date.now()}`,
        name: s.name,
        x, y,
        atlas: s.atlas, sx: s.sx, sy: s.sy, sw: s.sw, sh: s.sh
      });
      ok(`Gebäude platziert: ${s.name} @ (${x},${y})`);
      // Atlas ggf. laden (async), dann redraw:
      try { await loadAtlas(s.atlas); } catch(e){ err(e.message); }
      requestRender();
    }
  });

  // --- Rendering --------------------------------------------------------------
  let needsRender = true;
  function requestRender(){ needsRender = true; }
  function render(){
    const { ctx, canvas, tileSize } = GameState;
    // Hintergrund
    ctx.fillStyle = "#2d4f2d"; // grünlich
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // einfache Grid-Anmutung (optional, debug)
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#ffffff";
    for (let y=0; y<canvas.height/tileSize; y++){
      ctx.beginPath();
      ctx.moveTo(0, y*tileSize);
      ctx.lineTo(canvas.width, y*tileSize);
      ctx.stroke();
    }
    for (let x=0; x<canvas.width/tileSize; x++){
      ctx.beginPath();
      ctx.moveTo(x*tileSize, 0);
      ctx.lineTo(x*tileSize, canvas.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // --- Building-Layer: alle platzierten Gebäude zeichnen
    GameState.buildings.forEach(b=>{
      const dx = b.x * tileSize;
      const dy = b.y * tileSize;
      const imgP = GameState.atlasCache.get(b.atlas);
      if (imgP && typeof imgP.then === "function"){
        // Promise noch pending → Platzhalter
        ctx.fillStyle="#444";
        ctx.fillRect(dx,dy,tileSize,tileSize);
        ctx.fillStyle="#eee";
        ctx.fillText("…", dx+tileSize/2-4, dy+tileSize/2+4);
      } else if (imgP){ // Bereits ein Image-Objekt (geladen)
        const img = imgP;
        try{
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(
            img,
            b.sx, b.sy, b.sw, b.sh,        // Quelle 512x512 im Atlas
            dx, dy, tileSize, tileSize     // Ziel: 64x64 (Tile)
          );
        }catch(e){
          err("Render-Fehler (Building): "+e.message);
        }
      } else {
        // Noch nicht geladen/angefordert
        ctx.fillStyle="#222";
        ctx.fillRect(dx,dy,tileSize,tileSize);
      }
    });
  }

  function loop(){
    if (needsRender){ render(); needsRender=false; }
    requestAnimationFrame(loop);
  }

  // --- Öffentliche API (minimal) ---------------------------------------------
  window.Game = {
    version: V,
    startGame,
    requestRender,
    getState: ()=>GameState
  };

  // --- Boot ------------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", ()=>{
    ok(`game.js geladen, game.js ${V}`);
    setupCanvas();
    loop();
  });

})();
