/* Siedler-Mini V14.7-hf4 (mobile)
   – Pinch-Zoom (nur Zeiger) + Pan
   – Bauen/Abriss + Straßen
   – Träger (Carrier) mit Ressourcenkette Holzfäller -> Depot -> HQ
   – HUD-Updates
   – NEU: optionale Sprite-Animation für Träger (Fallback: Punkt)
*/
export const game = (() => {
  // ===== Darstellung / Welt =====
  const TILE = 40;
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // ===== Träger-Parameter =====
  const CARRIER = {
    START_DELAY_MS: 3500,
    TURN_DELAY_MS:  400,
    RESPAWN_MS:     4000,
    SPEED:          55,          // px/s
    DOT_R:          4            // Fallback-Punkt
  };

  // ===== Sprite-Setup (Assets-Pfad) =====
  const SPRITE = {
    enabled: true,
    url: "assets/carrier_topdown_v2.png",   // <-- PNG im assets-Ordner
    frameW: 64,
    frameH: 64,
    framesPerDir: 4,
    fps: 8,
    scale: 0.6,
    carryRowOffset: 4
  };

  // ===== State =====
  const state = {
    running:false,
    canvas:null, ctx:null, DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    pointerTool:"pointer",
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    activePointers:new Map(), pinchActive:false, pinchLastDist:0,
    pinchCenter:{x:0,y:0}, tapBlockUntil:0,

    roads:[],
    buildings:[],
    stock:{ wood:0, stone:0, food:0, gold:0, carrier:0 },
    onHUD:(k,v)=>{},

    graph:{ nodes:[], edges:new Map() },
    carriers:[],
    _lastTS:0,

    sprite:{
      img:null, ready:false,
      cols:0, rows:0
    }
  };

  let _idSeq=1;

  // ===== Utilities =====
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const setHUD = (k,v)=> state.onHUD?.(k,v);
  const isPrimary = (e)=> (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==="touch");

  const toWorld = (sx,sy)=>({ x:(sx/state.DPR - state.width/2)/state.zoom + state.camX,
                               y:(sy/state.DPR - state.height/2)/state.zoom + state.camY });
  const toScreen= (wx,wy)=>({ x:(wx - state.camX)*state.zoom + state.width/2,
                               y:(wy - state.camY)*state.zoom + state.height/2 });

  function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }
  const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
  function screenMid(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }

  function zoomAroundScreen(sx,sy,newZoom){
    newZoom = clamp(newZoom, state.minZoom, state.maxZoom);
    const before = toWorld(sx*state.DPR, sy*state.DPR);
    state.zoom = newZoom;
    const after  = toWorld(sx*state.DPR, sy*state.DPR);
    state.camX += (before.x - after.x);
    state.camY += (before.y - after.y);
    writeZoomHUD();
  }

  function writeZoomHUD(){ setHUD("Zoom", `${state.zoom.toFixed(2)}x`); }
  function writeStockHUD(){
    setHUD("Holz", String(state.stock.wood));
    setHUD("Stein",String(state.stock.stone));
    setHUD("Nahrung",String(state.stock.food));
    setHUD("Gold", String(state.stock.gold));
    setHUD("Traeger", String(state.stock.carrier));
  }

  // ===== Initial / Resize =====
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();

    state.zoom=1; state.camX=0; state.camY=0;
    writeZoomHUD(); writeStockHUD();

    // Sprite laden (optional)
    if (SPRITE.enabled){
      const img = new Image();
      img.onload = ()=>{
        state.sprite.img = img;
        state.sprite.ready = true;
        state.sprite.cols  = Math.floor(img.width  / SPRITE.frameW);
        state.sprite.rows  = Math.floor(img.height / SPRITE.frameH);
      };
      img.onerror = ()=>{ state.sprite.ready=false; };
      img.src = SPRITE.url + "?v=147hf4";
    }

    state._lastTS = performance.now();
    requestAnimationFrame(tick);
  }
  function resizeCanvas(){
    const rect = state.canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (state.canvas.width  !== state.width ) state.canvas.width  = state.width;
    if (state.canvas.height !== state.height) state.canvas.height = state.height;
  }

  // … [RESTLICHER CODE BLEIBT IDENTISCH ZUR LETZTEN VERSION] …
  // Ich habe nur den `SPRITE.url` angepasst, damit die PNG aus `assets/` geladen wird.
  // Falls du willst, kann ich dir den kompletten Rest hier auch noch einmal reinkopieren.
})();
