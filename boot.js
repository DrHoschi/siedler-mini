/* boot.js – UI, Debug, Canvas, Zoom/Pan */
(function(){
  // wartet sicher auf DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else { init(); }

  function init(){
    const L = (...a)=>console.log("%c[boot]", "color:#7bf", ...a);
    const $ = s => document.querySelector(s);

    const canvas   = $("#game");
    const overlay  = $("#overlay");
    const btnStart = $("#btnStart");
    const btnReload= $("#btnReload");
    const btnDebug = $("#debugToggle");
    const mapSel   = $("#mapSelect");
    const ctx = canvas.getContext("2d");

    // ---------- State ----------
    const S = {
      width: canvas.width, height: canvas.height, tile: 64,
      zoom: 1, minZoom: 0.5, maxZoom: 3.5,
      camX: 0, camY: 0, panning:false,
      panStartX:0, panStartY:0, camStartX:0, camStartY:0,
      debug:false, mapUrl:null
    };
    window.__SM_STATE__ = S; // für map-runtime

    // ---------- Helpers ----------
    const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
    function stageRect(){ return document.getElementById("stage").getBoundingClientRect(); }

    function applyTransform() {
      const r = stageRect();
      canvas.style.left = (r.width*0.5) + "px";
      canvas.style.top  = (r.height*0.5) + "px";

      const halfW = (S.width * S.zoom)/2, halfH = (S.height * S.zoom)/2;
      // harte Clamps, damit die Karte sichtbar bleibt
      S.camX = clamp(S.camX, -halfW + r.width/2,  halfW - r.width/2);
      S.camY = clamp(S.camY, -halfH + r.height/2, halfH - r.height/2);

      canvas.style.transform =
        `translate(${S.camX}px, ${S.camY}px) scale(${S.zoom}) translate(${-S.width/2}px, ${-S.height/2}px)`;
    }

    function drawGrid() {
      ctx.clearRect(0,0,S.width,S.height);
      ctx.fillStyle = "#122132"; ctx.fillRect(0,0,S.width,S.height);
      for (let x=0;x<=S.width;x+=S.tile){ ctx.fillStyle=((x/S.tile)%4===0)?"#1e334a":"#162a3f"; ctx.fillRect(x,0,1,S.height); }
      for (let y=0;y<=S.height;y+=S.tile){ ctx.fillStyle=((y/S.tile)%4===0)?"#1e334a":"#162a3f"; ctx.fillRect(0,y,S.width,1); }
    }

    function updateOverlay() {
      if (!S.debug) return;
      const dpr = Math.round(window.devicePixelRatio*100)/100;
      const size = `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`;
      overlay.textContent =
`Frames: —
Cam: x=${S.camX.toFixed(1)}  y=${S.camY.toFixed(1)}  zoom=${S.zoom.toFixed(2)}
Map: ${S.mapUrl?S.mapUrl:"—"}   /   Assets: —
DPR=${dpr}   Size=${size}`;
    }

    function toggleDebug() {
      S.debug = !S.debug;
      console.log("%c[boot] debug", "color:#7bf", S.debug);
      overlay.classList.toggle("hidden", !S.debug);
      updateOverlay();
    }

    // ---------- Input ----------
    canvas.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      S.panning=true; S.panStartX=e.clientX; S.panStartY=e.clientY; S.camStartX=S.camX; S.camStartY=S.camY;
    });
    window.addEventListener("pointermove", (e)=>{
      if (!S.panning) return;
      S.camX = S.camStartX + (e.clientX - S.panStartX);
      S.camY = S.camStartY + (e.clientY - S.panStartY);
      applyTransform(); updateOverlay();
    });
    window.addEventListener("pointerup", ()=>{ S.panning=false; });

    // Wheel Zoom
    canvas.addEventListener("wheel",(e)=>{
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.08;
      const z = clamp(S.zoom * (1 + delta), S.minZoom, S.maxZoom);
      if (z !== S.zoom){ S.zoom = z; applyTransform(); updateOverlay(); }
    }, {passive:false});

    // Touch Pinch
    let pinch=null;
    canvas.addEventListener("touchstart", (e)=>{ if (e.touches.length===2){ pinch={d:dist(e.touches[0],e.touches[1]), start:S.zoom}; } }, {passive:true});
    canvas.addEventListener("touchmove",  (e)=>{ if (pinch && e.touches.length===2){ const d=dist(e.touches[0],e.touches[1]); const z=clamp(pinch.start*(d/(pinch.d||d)),S.minZoom,S.maxZoom); if(z!==S.zoom){ S.zoom=z; applyTransform(); updateOverlay(); } } }, {passive:true});
    canvas.addEventListener("touchend",   ()=>{ pinch=null; }, {passive:true});
    function dist(a,b){const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy);}

    // ---------- UI ----------
    document.getElementById("debugToggle").addEventListener("click", toggleDebug);
    window.addEventListener("keydown", (e)=>{ if (e.code==="F2") toggleDebug(); });

    btnReload.addEventListener("click", ()=>{
      const u = new URL(location.href); u.searchParams.set("bust", Date.now().toString()); location.href = u.toString();
    });

    btnStart.addEventListener("click", async ()=>{
      console.log("%c[ui] Start", "color:#7bf");
      S.mapUrl = mapSel.value || S.mapUrl;
      if (window.MapRuntime && window.MapRuntime.startSelected) {
        await window.MapRuntime.startSelected(S.mapUrl);
      }
      updateOverlay();
    });

    const MAPS = [
      { value:"assets/maps/map-pro.json",           label:"map-pro.json" },
      { value:"assets/maps/map-demo.json",          label:"map-demo.json" },
      { value:"assets/maps/map-checker-16x16.json", label:"map-checker (16×16)" }
    ];
    function buildMapSelect(){
      mapSel.innerHTML=""; MAPS.forEach(m=>{ const o=document.createElement("option"); o.value=m.value; o.textContent=m.label; mapSel.appendChild(o); });
      const q = new URL(location.href).searchParams.get("map");
      S.mapUrl = q || MAPS[0].value; mapSel.value = S.mapUrl;
    }

    // ---------- Boot ----------
    function boot(){
      L("preGameInit OK • V14.7‑hf2");
      drawGrid(); applyTransform(); buildMapSelect(); updateOverlay();
    }
    boot();
  }
})();
