// Siedler‑Mini V15 game.js
// Spielzustand, Input (Pan/Zoom/Build), Start‑Flow, Ressourcen‑HUD

import { TILE, Tex, loadAllTextures } from './textures.js?v=1500';
import { render } from './render.js?v=1500';

export const game = (()=>{
  const st = {
    running:false,
    canvas:null,
    // Kamera‑Pan
    panning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Tool
    tool:'pointer',                                // 'pointer'|'road'|'hq'|'woodcutter'|'depot'|'erase'
    roadStart:null,
    // Welt
    buildings:[],                                  // {type,x,y}
    roads:[],                                      // {x1,y1,x2,y2}
    // HUD/Debug
    onHUD:null, onDebug:null
  };

  // --------- HUD helper
  function hud(k,v){ st.onHUD?.(k,v); }

  // --------- Welt-Helfer
  function addBuilding(type, wx, wy){
    const x = render.snap(wx), y = render.snap(wy);
    // Kollision vermeiden: nur bauen, wenn Feld frei
    if (!hitBuilding(x,y)){
      st.buildings.push({type, x, y});
      st.onDebug?.(`Build ${type} @ ${x},${y}`);
    } else {
      st.onDebug?.(`Build blockiert @ ${x},${y}`);
    }
  }
  function hitBuilding(wx, wy){
    // 1 Tile footprint
    for (const b of st.buildings){
      if (Math.abs(wx-b.x)<=TILE/2 && Math.abs(wy-b.y)<=TILE/2) return true;
    }
    return false;
  }
  function eraseAt(wx, wy){
    // erst Gebäude
    for (let i=st.buildings.length-1; i>=0; i--){
      const b = st.buildings[i];
      if (Math.abs(wx-b.x)<=TILE/2 && Math.abs(wy-b.y)<=TILE/2){
        st.buildings.splice(i,1);
        st.onDebug?.(`Erase building @${b.x},${b.y}`);
        return true;
      }
    }
    // dann Straßen (Dist zu Segment)
    const hitDist = 8; // im Weltmaßstab ~Px bei Zoom 1
    for (let i=st.roads.length-1; i>=0; i--){
      const r = st.roads[i];
      if (pointToSeg(wx,wy,r.x1,r.y1,r.x2,r.y2)<=hitDist){
        st.roads.splice(i,1);
        st.onDebug?.(`Erase road`);
        return true;
      }
    }
    return false;
  }
  function pointToSeg(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot=A*C+B*D, len2=C*C+D*D;
    let t=len2?dot/len2:-1; if (t<0) t=0; else if (t>1) t=1;
    const x=x1+t*C, y=y1+t*D;
    return Math.hypot(px-x,py-y);
  }

  // --------- Zeichnen
  function draw(){
    render.draw({buildings:st.buildings, roads:st.roads});
    requestAnimationFrame(draw);
  }

  // --------- Input
  function bindInput(canvas){
    // Pan nur im Zeiger‑Tool
    canvas.addEventListener('pointerdown', (e)=>{
      if (e.button!==0 && e.button!==-1 && e.button!==undefined) return;
      canvas.setPointerCapture?.(e.pointerId);
      st.panStartX = e.clientX; st.panStartY = e.clientY;
      st.camStartX = render.state.camX; st.camStartY = render.state.camY;

      // Build
      const {x,y} = render.toWorld(e.clientX, e.clientY);
      if (st.tool==='pointer'){
        st.panning = true;
      } else if (st.tool==='hq') addBuilding('hq', x,y);
      else if (st.tool==='woodcutter') addBuilding('woodcutter', x,y);
      else if (st.tool==='depot') addBuilding('depot', x,y);
      else if (st.tool==='erase') eraseAt(x,y);
      else if (st.tool==='road'){
        const gx = render.snap(x), gy = render.snap(y);
        if (!st.roadStart) st.roadStart = {x:gx,y:gy};
        else {
          const a = st.roadStart, b = {x:gx,y:gy};
          if (Math.hypot(a.x-b.x,a.y-b.y)>=1) st.roads.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y});
          st.roadStart = null;
        }
      }
    }, {passive:false});

    canvas.addEventListener('pointermove', (e)=>{
      if (!st.panning || st.tool!=='pointer') return;
      const dx = (e.clientX - st.panStartX) / render.state.zoom;
      const dy = (e.clientY - st.panStartY) / render.state.zoom;
      render.state.camX = st.camStartX - dx;
      render.state.camY = st.camStartY - dy;
    }, {passive:false});

    canvas.addEventListener('pointerup', (e)=>{
      st.panning=false;
      canvas.releasePointerCapture?.(e.pointerId);
    });

    // Wheel‑Zoom (nur Desktop) — auf Mobil pinch handled vom Browser → optional per Gesten/Buttons später
    canvas.addEventListener('wheel', (e)=>{
      e.preventDefault();
      const dir = -Math.sign(e.deltaY);
      render.setZoom( render.state.zoom + dir*0.1 );
      hud('Zoom', render.state.zoom.toFixed(2)+'x');
    }, {passive:false});

    // Orientation / Resize
    window.addEventListener('resize', render.resize);
    window.addEventListener('orientationchange', ()=> setTimeout(render.resize, 200));
    document.addEventListener('fullscreenchange', render.resize);
    document.addEventListener('webkitfullscreenchange', render.resize);
  }

  // --------- Public API
  function setTool(t){
    st.tool = t;
    if (t!=='road') st.roadStart=null;
    hud('Tool',
      t==='pointer'?'Zeiger': t==='road'?'Straße': t==='hq'?'HQ': t==='woodcutter'?'Holzfäller': t==='depot'?'Depot':'Abriss'
    );
  }

  function center(){
    // Auf erstes HQ zentrieren, sonst 0/0
    const hq = st.buildings.find(b=>b.type==='hq');
    const cx = hq ? hq.x : 0;
    const cy = hq ? hq.y : 0;
    render.centerOn(cx, cy);
  }

  async function startGame(opts){
    if (st.running) return;
    st.canvas = opts.canvas;
    st.onHUD  = opts.onHUD;
    st.onDebug= opts.onDebug;

    // Reihenfolge: Canvas → Texturen → Startzustand → Input → Draw
    render.attachCanvas(st.canvas);

    st.onDebug?.('Lade Texturen…');
    await loadAllTextures(st.onDebug);

    // Startwelt: HQ mittig setzen
    st.buildings.length = 0;
    st.roads.length = 0;
    st.buildings.push({type:'hq', x:0, y:0});
    render.centerOn(0,0);
    render.setZoom(1.0);
    st.onHUD?.('Zoom','1.00x');
    setTool('pointer');

    bindInput(st.canvas);
    st.running = true;
    draw();
  }

  return { startGame, setTool, center };
})();
