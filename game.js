/* =====================================================
   game.js – Hauptspiel-Logik
   Version 15.2t
   ===================================================== */

export const game = (() => {

  // === Interner State ===
  const state = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    zoom: 1,
    camX: 0,
    camY: 0,
    tool: "pointer",
    roads: [],
    buildings: [],
    DPR: window.devicePixelRatio || 1,
    running: false,
    raf: null,
    onHUD: null,
  };

  // === Utils ===
  function log(...args){ console.log("[game]", ...args); }

  // === Start / Stop ===
  function startGame(cfg){
    if (!cfg?.canvas) {
      console.error("[game] startGame: canvas fehlt");
      return;
    }
    state.canvas = cfg.canvas;
    state.ctx = state.canvas.getContext("2d");
    state.width = state.canvas.width = state.canvas.offsetWidth * state.DPR;
    state.height = state.canvas.height = state.canvas.offsetHeight * state.DPR;
    state.canvas.style.width = "100%";
    state.canvas.style.height = "100%";

    state.zoom = 1;
    state.camX = 0;
    state.camY = 0;
    state.roads = [];
    state.buildings = [];
    state.running = true;
    state.onHUD = cfg.onHUD || null;

    log("startGame()", {w: state.width, h: state.height, DPR: state.DPR});

    if (state.onHUD){
      state.onHUD("Zoom", state.zoom.toFixed(2)+"x");
      state.onHUD("Tool", state.tool);
    }

    bindInput();
    loop();
  }

  function stopGame(){
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    log("stopGame()");
  }

  // === Input ===
  function bindInput(){
    if (!state.canvas) return;

    let isDown = false, lastX=0, lastY=0;

    state.canvas.addEventListener("mousedown", e=>{
      isDown = true; lastX=e.clientX; lastY=e.clientY;
      onTap(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", ()=>{ isDown=false; });
    window.addEventListener("mousemove", e=>{
      if (isDown && state.tool==="pointer"){
        state.camX += (e.clientX-lastX)/state.zoom;
        state.camY += (e.clientY-lastY)/state.zoom;
        lastX = e.clientX; lastY = e.clientY;
      }
    });

    state.canvas.addEventListener("wheel", e=>{
      e.preventDefault();
      const factor = (e.deltaY>0?0.9:1.1);
      state.zoom *= factor;
      if (state.onHUD) state.onHUD("Zoom", state.zoom.toFixed(2)+"x");
    }, {passive:false});

    // Touch (iOS!)
    let touchStartDist=0;
    state.canvas.addEventListener("touchstart", e=>{
      if (e.touches.length===1){
        const t=e.touches[0]; lastX=t.clientX; lastY=t.clientY;
        onTap(t.clientX, t.clientY);
      }
      if (e.touches.length===2){
        touchStartDist = dist(e.touches[0], e.touches[1]);
      }
    });
    state.canvas.addEventListener("touchmove", e=>{
      if (e.touches.length===1 && state.tool==="pointer"){
        const t=e.touches[0];
        state.camX += (t.clientX-lastX)/state.zoom;
        state.camY += (t.clientY-lastY)/state.zoom;
        lastX = t.clientX; lastY = t.clientY;
      }
      if (e.touches.length===2){
        const d = dist(e.touches[0], e.touches[1]);
        if (touchStartDist){
          const factor = d/touchStartDist;
          state.zoom *= factor;
          if (state.onHUD) state.onHUD("Zoom", state.zoom.toFixed(2)+"x");
        }
        touchStartDist = d;
      }
    });
  }

  function dist(a,b){
    const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY;
    return Math.sqrt(dx*dx+dy*dy);
  }

  // === Aktionen ===
  function onTap(x,y){
    const gx = (x*state.DPR - state.width/2)/state.zoom - state.camX;
    const gy = (y*state.DPR - state.height/2)/state.zoom - state.camY;

    log("tap", state.tool, gx, gy);

    if (state.tool==="road"){
      state.roads.push({x:gx,y:gy});
    }
    if (state.tool==="hq" || state.tool==="woodcutter" || state.tool==="depot"){
      state.buildings.push({x:gx,y:gy,type:state.tool});
    }
  }

  function setTool(name){
    state.tool = name;
    if (state.onHUD) state.onHUD("Tool", name);
    log("setTool", name);
  }

  function center(){
    state.camX=0; state.camY=0; state.zoom=1;
    if (state.onHUD){
      state.onHUD("Zoom", state.zoom.toFixed(2)+"x");
      state.onHUD("Tool", state.tool);
    }
    log("center()");
  }

  // === Render ===
  function loop(){
    if (!state.running) return;
    state.raf = requestAnimationFrame(loop);

    const ctx = state.ctx;
    if (!ctx) return;

    ctx.setTransform(state.DPR,0,0,state.DPR,0,0);
    ctx.clearRect(0,0,state.canvas.width,state.canvas.height);

    // Hintergrund
    ctx.fillStyle="#0b1628";
    ctx.fillRect(0,0,state.canvas.width,state.canvas.height);

    ctx.save();
    ctx.translate(state.width/2, state.height/2);
    ctx.scale(state.zoom, state.zoom);
    ctx.translate(state.camX, state.camY);

    // Raster
    ctx.strokeStyle="#20324a"; ctx.lineWidth=1;
    for(let x=-1000;x<=1000;x+=64){
      ctx.beginPath(); ctx.moveTo(x,-1000); ctx.lineTo(x,1000); ctx.stroke();
    }
    for(let y=-1000;y<=1000;y+=64){
      ctx.beginPath(); ctx.moveTo(-1000,y); ctx.lineTo(1000,y); ctx.stroke();
    }

    // Roads
    ctx.strokeStyle="#8f8"; ctx.lineWidth=3;
    state.roads.forEach(r=>{
      ctx.beginPath(); ctx.moveTo(r.x-16,r.y-16); ctx.lineTo(r.x+16,r.y+16); ctx.stroke();
    });

    // Buildings
    state.buildings.forEach(b=>{
      ctx.fillStyle = b.type==="hq" ? "#f88" : (b.type==="woodcutter"?"#8ff":"#ff8");
      ctx.fillRect(b.x-20, b.y-20, 40, 40);
      ctx.fillStyle="#000"; ctx.fillText(b.type, b.x-18, b.y+4);
    });

    ctx.restore();
  }

  // === Exportierte API ===
  return {
    startGame,
    stopGame,
    setTool,
    center,
    state,
  };

})();
