// core/input.js  v14.2 – Touch/Mouse für Pan, Pinch, Tap‑Build
import { isoToPixel } from '../world.js?v=14.2';

export function attachInput(canvas, camera, state, world, renderer, onBuilt){
  const st = {
    dragging:false, lastX:0, lastY:0,
    t1:null, t2:null, lastPinchDist:0
  };

  const onDown = (x,y)=>{
    st.dragging=true; st.lastX=x; st.lastY=y;
  };
  const onMove = (x,y)=>{
    if(!st.dragging) return;
    if (state.tool==='pointer'){
      camera.pan(-(x-st.lastX), -(y-st.lastY));
    }
    st.lastX=x; st.lastY=y;
  };
  const onUp = ()=>{
    st.dragging=false;
  };

  // Tap zum Bauen
  const onTap = (x,y)=>{
    if(state.tool==='pointer') return;
    // Bildschirm -> Welt
    // inverse Kamera-Transform (approx.)
    const cx = (x - canvas.width/2) / camera.zoom + camera.x;
    const cy = (y - canvas.height/2) / camera.zoom + camera.y;
    // inverse world-origin
    const wx = cx - world.originX;
    const wy = cy - world.originY;

    // Weltpixel -> IsoTile schätzen
    // aus isoToPixel-Formel umgestellt:
    // x = (wy/TILE_H + wx/TILE_W), y = (wy/TILE_H - wx/TILE_W)
    const TW=128, TH=64;
    let tx = Math.round( wy/(TH/2)/2 + wx/(TW/2)/2 );
    let ty = Math.round( wy/(TH/2)/2 - wx/(TW/2)/2 );

    if (!world.inBounds(tx,ty)) return;

    if (state.tool==='road'){
      if (world.placeRoad(tx,ty)) onBuilt?.(true);
    } else if (state.tool==='hq'){
      if (world.placeBuilding('hq_wood', tx,ty)) onBuilt?.(true);
    } else if (state.tool==='lumber'){
      if (world.placeBuilding('lumber', tx,ty)) onBuilt?.(true);
    } else if (state.tool==='depot'){
      if (world.placeBuilding('depot', tx,ty)) onBuilt?.(true);
    } else if (state.tool==='erase'){
      // Einfach: Straße entfernen
      const k = world.key(tx,ty);
      if (world.roads.delete(k)) onBuilt?.(true);
    }
  };

  // Mouse
  const mdown = e=>{ e.preventDefault(); onDown(e.clientX*devicePixelRatio, e.clientY*devicePixelRatio); };
  const mmove = e=>{ if(!st.dragging) return; onMove(e.clientX*devicePixelRatio, e.clientY*devicePixelRatio); };
  const mup   = e=>{ onUp(); };
  const mclick= e=>{
    // kurzer Klick gilt als Tap
    onTap(e.clientX*devicePixelRatio, e.clientY*devicePixelRatio);
  };

  // Touch
  const tstart = e=>{
    e.preventDefault();
    if (e.touches.length===1){
      const t=e.touches[0];
      onDown(t.clientX*devicePixelRatio, t.clientY*devicePixelRatio);
    } else if (e.touches.length===2){
      st.dragging=false;
      st.t1=e.touches[0]; st.t2=e.touches[1];
      st.lastPinchDist = dist(st.t1, st.t2);
    }
  };
  const tmove = e=>{
    e.preventDefault();
    if (e.touches.length===1 && state.tool==='pointer'){
      const t=e.touches[0];
      onMove(t.clientX*devicePixelRatio, t.clientY*devicePixelRatio);
    } else if (e.touches.length===2){
      const a=e.touches[0], b=e.touches[1];
      const d = dist(a,b);
      const anchorX = ( (a.clientX+b.clientX)/2 )*devicePixelRatio;
      const anchorY = ( (a.clientY+b.clientY)/2 )*devicePixelRatio;
      const worldAnchorX = (anchorX - canvas.width/2)/camera.zoom + camera.x;
      const worldAnchorY = (anchorY - canvas.height/2)/camera.zoom + camera.y;
      const factor = d / (st.lastPinchDist||d);
      camera.setZoom(camera.zoom * factor, worldAnchorX, worldAnchorY);
      st.lastPinchDist = d;
    }
  };
  const tend = e=>{
    e.preventDefault();
    if (e.touches.length===0) onUp();
  };
  const ttap = e=>{
    if (e.changedTouches && e.changedTouches[0]){
      const t=e.changedTouches[0];
      onTap(t.clientX*devicePixelRatio, t.clientY*devicePixelRatio);
    }
  };

  // Wheel (Desktop Test)
  const wheel = e=>{
    e.preventDefault();
    const dir = e.deltaY>0 ? 0.92 : 1.08;
    const ax = e.clientX*devicePixelRatio, ay = e.clientY*devicePixelRatio;
    const wx = (ax - canvas.width/2)/camera.zoom + camera.x;
    const wy = (ay - canvas.height/2)/camera.zoom + camera.y;
    camera.setZoom(camera.zoom*dir, wx, wy);
  };

  canvas.addEventListener('mousedown', mdown, {passive:false});
  window.addEventListener('mousemove', mmove, {passive:false});
  window.addEventListener('mouseup', mup, {passive:false});
  canvas.addEventListener('click', mclick, {passive:false});
  canvas.addEventListener('wheel', wheel, {passive:false});

  canvas.addEventListener('touchstart', tstart, {passive:false});
  canvas.addEventListener('touchmove',  tmove,  {passive:false});
  canvas.addEventListener('touchend',   tend,   {passive:false});
  canvas.addEventListener('touchcancel',tend,   {passive:false});
  canvas.addEventListener('touchend',   ttap,   {passive:false});

  // Tool-Buttons
  bindTool('#toolPointer','pointer');
  bindTool('#toolRoad','road');
  bindTool('#toolHQ','hq');
  bindTool('#toolLumber','lumber');
  bindTool('#toolDepot','depot');
  bindTool('#toolErase','erase');

  function bindTool(sel, name){
    const el=document.querySelector(sel);
    if(!el) return;
    el.addEventListener('click', ()=>{
      state.setTool(name);
      document.querySelectorAll('.tools .btn').forEach(b=>b.classList.remove('active'));
      el.classList.add('active');
    });
  }

  return { detach: () => detachInput(canvas) };
}

export function detachInput(canvas){
  canvas.replaceWith(canvas.cloneNode(true)); // quick & clean: alle Listener weg
}

function dist(a,b){
  const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY;
  return Math.hypot(dx,dy);
}
