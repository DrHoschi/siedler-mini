// worldToScreen: nimmt Weltkoordinaten (tile- oder centerbasiert) und liefert Canvas‑Pixel
export function worldToScreen(wx, wy){
  // falls du schon eine hast, nimm deine.
  // Beispiel (isometrisch, 64x32 Basis):
  const TW = 64, TH = 32;
  const sx = (wx - wy) * (TW/2) + camera.offsetX;
  const sy = (wx + wy) * (TH/2) + camera.offsetY;
  return {x:sx, y:sy};
}
  // Gerätepixel korrekt handhaben
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function resize(){
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight* DPR);
    if (canvas.width!==w || canvas.height!==h){
      canvas.width=w; canvas.height=h;
    }
  }
  // Layout
  function fit(){
    canvas.style.width='100vw';
    canvas.style.height='100vh';
    resize();
  }
  fit(); window.addEventListener('resize', fit);

  // Texturen laden (fehlende = Platzhalter)
  const IM = {};
  async function load(name, src){
    return new Promise(res=>{
      const img = new Image();
      img.onload=()=>{ IM[name]=img; res(); };
      img.onerror=()=>{ IM[name]=makePH(); res(); };
      img.src=src;
    });
  }
  function makePH(){
    const c = document.createElement('canvas');
    c.width=64; c.height=64;
    const g = c.getContext('2d');
    g.fillStyle='#334155'; g.fillRect(0,0,64,64);
    g.strokeStyle='#475569'; g.beginPath(); g.moveTo(0,64); g.lineTo(64,0); g.stroke();
    return c;
  }

  await Promise.all([
    load('grass','assets/grass.png'),
    load('water','assets/water.png'),
    load('shore','assets/shore.png'),
    load('hq_wood','assets/hq_wood.png'),
    load('hq_stone','assets/hq_stone.png'),
    load('lumber','assets/lumberjack.png'),
    load('depot','assets/depot.png'),
    load('road','assets/road.png'),
  ]);

  // Iso‑Geometrie
  const base = 64;                 // Kachelgrundmaß
  const isoW = base, isoH = base*0.5; // Diamantbreite/-höhe
  let zoom = 1;
  let cam = { x: world.W/2, y: world.H/2, px:0, py:0 }; // center in Grid

  // Von Grid (gx,gy) zu Screen‑Pixel
  function gridToScreen(gx,gy){
    const cx = (gx - gy) * (isoW/2);
    const cy = (gx + gy) * (isoH/2);
    const sx = (canvas.width/2) + (cx - cam.px)*zoom;
    const sy = (canvas.height/2)+ (cy - cam.py)*zoom;
    return {x:sx, y:sy};
  }
  // Umkehrung: Screen -> Grid (nächste Zelle)
  function screenToGrid(sx,sy){
    const cx = ((sx - canvas.width/2)/zoom) + cam.px;
    const cy = ((sy - canvas.height/2)/zoom) + cam.py;
    const gx = Math.round(( cy/(isoH/2) + cx/(isoW/2) )/2);
    const gy = Math.round(( cy/(isoH/2) - cx/(isoW/2) )/2);
    return {gx, gy};
  }

  // Kameraoperationen
  function centerOn(gx,gy, z=zoom){
    cam.x=gx; cam.y=gy;
    const c = gridToScreen(gx,gy);
    cam.px = ((gx - gy) * (isoW/2));
    cam.py = ((gx + gy) * (isoH/2));
    setZoomClamped(z);
    requestFrame();
  }
  function panPixels(dx,dy){
    cam.px -= dx/zoom;
    cam.py -= dy/zoom;
    requestFrame();
  }
  function setZoomClamped(z, anchorX=null, anchorY=null){
    const nz = Math.min(2.0, Math.max(0.35, z));
    if (anchorX!=null && anchorY!=null){
      // zoom zum Maus-/Fingerpunkt
      const before = screenToGrid(anchorX,anchorY);
      zoom = nz;
      hooks?.onZoom?.(zoom);
      const after = screenToGrid(anchorX,anchorY);
      cam.px += (after.gx - before.gx)*(isoW/2);
      cam.py += (after.gy - before.gy)*(isoH/2);
    } else {
      zoom = nz;
      hooks?.onZoom?.(zoom);
    }
    requestFrame();
  }

  // Zeichnen
  let needs = true;
  function requestFrame(){ needs=true; }
  function draw(){
    if (!needs) return;
    needs=false; resize();

    const g = ctx;
    g.setTransform(DPR,0,0,DPR,0,0);
    g.clearRect(0,0,canvas.width,canvas.height);

    // Sichtrechteck in Grid grob bestimmen (großzügig)
    const pad = 4;
    const TL = screenToGrid(-200,-200);                  // extra Rand
    const BR = screenToGrid(canvas.width+200, canvas.height+200);
    const minx = Math.max(0, Math.min(TL.gx,BR.gx)-pad);
    const maxx = Math.min(world.W-1, Math.max(TL.gx,BR.gx)+pad);
    const miny = Math.max(0, Math.min(TL.gy,BR.gy)-pad);
    const maxy = Math.min(world.H-1, Math.max(TL.gy,BR.gy)+pad);

    // Boden
    for (let y=miny; y<=maxy; y++){
      for (let x=minx; x<=maxx; x++){
        const t = world.tiles[y*world.W+x]; // 0 grass 1 water 2 shore
        const p = gridToScreen(x,y);
        const img = t===1?IM.water : t===2?IM.shore : IM.grass;
        const w = isoW*zoom, h = isoH*zoom;
        g.drawImage(img, p.x-w/2, p.y-h/2, w, h);
      }
    }

    // Straßen
    world.roads.forEach(k=>{
      const [x,y] = k.split(',').map(Number);
      if (x<minx||x>maxx||y<miny||y>maxy) return;
      const p = gridToScreen(x,y);
      g.drawImage(IM.road, p.x-(isoW*zoom/2), p.y-(isoH*zoom/2), isoW*zoom, isoH*zoom);
    });

    // Gebäude (einfache Z‑Sortierung)
    const list = [...world.buildings].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    for (const b of list){
      const p = gridToScreen(b.x,b.y);
      const img = IM[b.kind] || IM.hq_wood;
      const w = isoW*1.8*zoom, h = isoH*3.2*zoom;
      g.drawImage(img, p.x-w/2, p.y-h*0.9, w, h); // optischer Offset
    }

    // Debug-Raster
    if (hooks?.debugGetter?.()){
      g.strokeStyle='rgba(0,255,255,.15)';
      for (let y=miny; y<=maxy; y++){
        for (let x=minx; x<=maxx; x++){
          const p = gridToScreen(x,y);
          const w = isoW*zoom, h = isoH*zoom;
          g.strokeRect(p.x-w/2, p.y-h/2, w, h);
        }
      }
    }
  }

  // Loop
  function loop(){
    draw();
    requestAnimationFrame(loop);
  }
  loop();

  return {
    requestFrame,
    centerOn,
    panPixels,
    setZoomClamped,
    get zoom(){return zoom;},
    screenToGrid,
  };
}
