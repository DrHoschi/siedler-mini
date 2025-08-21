/* boot.js – UI, Debug, Canvas, Zoom/Pan, Fit/Reset, AutoStart, Persist */
(function(){
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
    const chkAuto  = $("#autoStart");
    const zoomInfo = $("#zoomInfo");
    const btnZp    = $("#zoomIn");
    const btnZm    = $("#zoomOut");
    const btnFit   = $("#fit");
    const btnReset = $("#reset");
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
    function setZoom(z){ S.zoom = clamp(z, S.minZoom, S.maxZoom); applyTransform(); updateOverlay(); }
    function fitCanvasInView(){
      const r = stageRect();
      const zX = r.width  / S.width;
      const zY = r.height / S.height;
      setZoom( clamp(Math.min(zX,zY), S.minZoom, S.maxZoom) );
      S.camX = 0; S.camY = 0; applyTransform(); updateOverlay();
    }
    function resetView(){ setZoom(1); S.camX=0; S.camY=0; applyTransform(); updateOverlay(); }

    function applyTransform() {
      const r = stageRect();
      canvas.style.left = (r.width*0.5) + "px";
      canvas.style.top  = (r.height*0.5) + "px";

      const halfW = (S.width * S.zoom)/2, halfH = (S.height * S.zoom)/2;
      S.camX = clamp(S.camX, -halfW + r.width/2,  halfW - r.width/2);
      S.camY = clamp(S.camY, -halfH + r.height/2, halfH - r.height/2);

      canvas.style.transform =
        `translate(${S.camX}px, ${S.camY}px) scale(${S.zoom}) translate(${-S.width/2}px, ${-S.height/2}px)`;
      zoomInfo.textContent = `Zoom ${S.zoom.toFixed(2)}`;
    }

    function drawGrid() {
      ctx.clearRect(0,0,S.width,S.height);
      ctx.fillStyle = "#122132"; ctx.fillRect(0,0,S.width,S.height);
      for (let x=0;x<=S.width;x+=S.tile){ ctx.fillStyle=((x/S.tile)%4===0)?"#1e334a":"#162a3f"; ctx.fillRect(x,0,1,S.height); }
      for (let y=0;y<=S.height;y+=S.tile){ ctx.fillStyle=((y/S.tile)%4===0)?"#1e334a":"#162a3f"; ctx.fillRect(0,y,S.width,1); }
    }

    function mapInfoForOverlay(){
      const rows = Math.round(S.height / S.tile);
      const cols = Math.round(S.width  / S.tile);
      return `rows=${rows} cols=${cols} tile=${S.tile}`;
    }

    function updateOverlay() {
      if (!S.debug) return;
      const dpr = Math.round(window.devicePixelRatio*100)/100;
      const size = `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`;
      overlay.textContent =
`Cam: x=${S.camX.toFixed(1)}  y=${S.camY.toFixed(1)}  zoom=${S.zoom.toFixed(2)}
Map: ${S.mapUrl?S.mapUrl:"—"}
${mapInfoForOverlay()}
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
      setZoom(S.zoom * (1 + delta));
    }, {passive:false});

    // Touch Pinch
    let pinch=null;
    canvas.addEventListener("touchstart", (e)=>{ if (e.touches.length===2){ pinch={d:dist(e.touches[0],e.touches[1]), start:S.zoom}; } }, {passive:true});
    canvas.addEventListener("touchmove",  (e)=>{ if (pinch && e.touches.length===2){ const d=dist(e.touches[0],e.touches[1]); setZoom(pinch.start*(d/(pinch.d||d))); } }, {passive:true});
    canvas.addEventListener("touchend",   ()=>{ pinch=null; }, {passive:true});
    function dist(a,b){const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy);}

    // ---------- UI ----------
    $("#debugToggle").addEventListener("click", toggleDebug);
    window.addEventListener("keydown", (e)=>{ if (e.code==="F2") toggleDebug(); });

    btnReload.addEventListener("click", ()=>{
      const u = new URL(location.href); u.searchParams.set("bust", Date.now().toString()); location.href = u.toString();
    });

    btnStart.addEventListener("click", ()=> startSelected());
    btnZp.addEventListener("click", ()=> setZoom(S.zoom*1.12));
    btnZm.addEventListener("click", ()=> setZoom(S.zoom/1.12));
    btnFit.addEventListener("click", fitCanvasInView);
    btnReset.addEventListener("click", resetView);

    mapSel.addEventListener("change", ()=>{
      S.mapUrl = mapSel.value;
      localStorage.setItem("sm:lastMap", S.mapUrl);
      if (chkAuto.checked) startSelected();
      updateOverlay();
    });

    // ---------- MapRuntime Bridge ----------
    async function startSelected(){
      if (window.MapRuntime && window.MapRuntime.startSelected) {
        await window.MapRuntime.startSelected(S.mapUrl);
        // Größe kann sich geändert haben → Fit wenn aktiv
        if (btnFit.dataset.autofit === "1") fitCanvasInView();
        else { applyTransform(); }
        updateOverlay();
      }
    }

    // ---------- Auswahl ----------
    const MAPS = [
      { value:"assets/maps/map-pro.json",           label:"map-pro.json" },
      { value:"assets/maps/map-demo.json",          label:"map-demo.json" },
      { value:"assets/maps/map-checker-16x16.json", label:"map-checker (16×16)" }
    ];
    function buildMapSelect(){
      mapSel.innerHTML=""; MAPS.forEach(m=>{ const o=document.createElement("option"); o.value=m.value; o.textContent=m.label; mapSel.appendChild(o); });

      const q = new URL(location.href).searchParams.get("map");
      const last = localStorage.getItem("sm:lastMap");
      S.mapUrl = q || last || MAPS[0].value;
      mapSel.value = S.mapUrl;
      chkAuto.checked = localStorage.getItem("sm:autoStart")==="1";
    }

    chkAuto.addEventListener("change", ()=>{
      localStorage.setItem("sm:autoStart", chkAuto.checked ? "1" : "0");
    });

    // ---------- Boot ----------
    function boot(){
      L("preGameInit OK • V14.7‑hf2");
      drawGrid(); applyTransform(); buildMapSelect(); updateOverlay();
      // Optional: beim ersten Laden automatisch Fit
      btnFit.dataset.autofit = "1";
      fitCanvasInView();
    }
    boot();
  }
})();
