// V15 render – Zeichnet Tiles, Straßen, Gebäude, Träger (Sprite oder Punkt)
import { loadImage } from './textures.js';

export function createRenderer({ canvas, world, onHUD=()=>{} }){
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  const camera = {
    x: 0, y: 0, zoom: 1.0,
    pan(dx,dy){ this.x -= dx/this.zoom; this.y -= dy/this.zoom; },
    centerOn(p){ this.x=p.x; this.y=p.y; },
    toJSON(){ return {x:this.x,y:this.y,zoom:this.zoom}; },
    fromJSON(o){ this.x=o.x; this.y=o.y; this.zoom=o.zoom||1; }
  };

  // Asset-Handles
  const tex = {
    grass:  null, dirt:null, forest:null, water:null,
    road_straight:null, road_corner:null, road_t:null, road_cross:null,
    hq:null, depot:null, woodcutter:null,
    carrier:null, carrierMeta:null,
  };

  // Lade versuchsweise Texturen (fehlende → null, dann Fallback)
  Promise.all([
    loadImage('assets/tex/topdown_grass.png').then(img=>tex.grass=img).catch(()=>null),
    loadImage('assets/tex/topdown_dirt.png').then(img=>tex.dirt=img).catch(()=>null),
    loadImage('assets/tex/topdown_forest.png').then(img=>tex.forest=img).catch(()=>null),
    loadImage('assets/tex/topdown_water.png').then(img=>tex.water=img).catch(()=>null),

    loadImage('assets/tex/topdown_road_straight.png').then(img=>tex.road_straight=img).catch(()=>null),
    loadImage('assets/tex/topdown_road_corner.png').then(img=>tex.road_corner=img).catch(()=>null),
    loadImage('assets/tex/topdown_road_t.png').then(img=>tex.road_t=img).catch(()=>null),
    loadImage('assets/tex/topdown_road_cross.png').then(img=>tex.road_cross=img).catch(()=>null),

    // Gebäude
    loadImage('assets/tex/topdown_hq.png').then(img=>tex.hq=img).catch(()=>null),
    loadImage('assets/tex/topdown_depot.png').then(img=>tex.depot=img).catch(()=>null),
    loadImage('assets/tex/topdown_woodcutter.png').then(img=>tex.woodcutter=img).catch(()=>null),

    // Träger (optional)
    loadImage('assets/sprites/carrier.png').then(img=>tex.carrier=img).catch(()=>null),
    fetch('assets/sprites/carrier.json').then(r=>r.json()).then(j=>tex.carrierMeta=j).catch(()=>null),
  ]).then(()=>{ /* ok */ });

  // Resize
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * DPR));
    const h = Math.max(1, Math.floor(rect.height* DPR));
    if (canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
  }
  resize();
  window.addEventListener('resize', ()=>setTimeout(resize, 50));
  document.addEventListener('fullscreenchange', ()=>setTimeout(resize, 50));
  document.addEventListener('webkitfullscreenchange', ()=>setTimeout(resize, 50));

  // Helpers
  function worldToScreen(x,y){
    const sx = (x - camera.x) * camera.zoom + canvas.width/(2*DPR);
    const sy = (y - camera.y) * camera.zoom + canvas.height/(2*DPR);
    return {x:sx*DPR, y:sy*DPR};
  }
  function screenToWorld(sx,sy){
    return {
      x: (sx/DPR - canvas.width/(2*DPR))/camera.zoom + camera.x,
      y: (sy/DPR - canvas.height/(2*DPR))/camera.zoom + camera.y
    };
  }

  const TILE = 40;

  function drawTiles(){
    const W = world.tiles[0]?.length||0, H = world.tiles.length||0;
    if (!W||!H) return;

    const step = TILE*camera.zoom*DPR;
    const leftTop = screenToWorld(0,0);
    const rightBot = screenToWorld(canvas.width, canvas.height);

    const gx0 = Math.floor(leftTop.x / TILE)-1;
    const gy0 = Math.floor(leftTop.y / TILE)-1;
    const gx1 = Math.ceil(rightBot.x / TILE)+1;
    const gy1 = Math.ceil(rightBot.y / TILE)+1;

    for (let gy=gy0; gy<=gy1; gy++){
      if (gy<0||gy>=H) continue;
      for (let gx=gx0; gx<=gx1; gx++){
        if (gx<0||gx>=W) continue;
        const tt = world.tiles[gy][gx];
        const wx = gx*TILE + TILE/2;
        const wy = gy*TILE + TILE/2;
        const p = worldToScreen(wx,wy);
        const s = TILE*camera.zoom*DPR;

        let img = (tt===0?tex.grass: tt===1?tex.water: tt===2?tex.dirt: tex.forest);
        if (img) {
          ctx.drawImage(img, p.x - s/2, p.y - s/2, s, s);
        } else {
          ctx.fillStyle = (tt===0?'#224a2b': tt===1?'#0b2a4f': tt===2?'#5a3e24':'#244020');
          ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
        }
      }
    }
  }

  function drawGrid(){
    const step = TILE*camera.zoom*DPR;
    const ox = (canvas.width/2 - (camera.x*camera.zoom)*DPR) % step;
    const oy = (canvas.height/2 - (camera.y*camera.zoom)*DPR) % step;
    ctx.save();
    ctx.strokeStyle = '#1e2a3d'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=ox; x<=canvas.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); }
    for (let y=oy; y<=canvas.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawRoads(){
    ctx.save();
    ctx.strokeStyle = '#78d9a8';
    ctx.lineWidth = 4 * camera.zoom * DPR;
    ctx.lineCap = 'round';
    for (const r of world.roads){
      const a = worldToScreen(r.x1,r.y1), b = worldToScreen(r.x2,r.y2);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuildings(){
    for (const b of world.buildings){
      const p = worldToScreen(b.x,b.y);
      const w = b.w*camera.zoom*DPR, h=b.h*camera.zoom*DPR;

      let img = null;
      if      (b.type==='hq')         img = tex.hq;
      else if (b.type==='depot')      img = tex.depot;
      else if (b.type==='woodcutter') img = tex.woodcutter;

      if (img) ctx.drawImage(img, p.x-w/2, p.y-h/2, w, h);
      else {
        ctx.fillStyle = (b.type==='hq')? '#43aa62' : (b.type==='depot')? '#d55384' : '#3f8cff';
        ctx.fillRect(p.x-w/2, p.y-h/2, w, h);
        ctx.fillStyle='#cfe3ff';
        ctx.font = `${Math.round(12*DPR*camera.zoom)}px system-ui, -apple-system, Segoe UI`;
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        const label = b.type==='hq'?'HQ': b.type==='depot'?'Depot':'Holzfäller';
        ctx.fillText(label, p.x, p.y - h/2 - 4);
      }
    }
  }

  function drawCarriers(){
    for (const c of world.carriers){
      const p = worldToScreen(c.x,c.y);
      if (tex.carrier && tex.carrierMeta?.frames?.length){
        // Sprite‑Sheet (einreihig)
        const fr = tex.carrierMeta.frames[Math.floor(c.frame)%tex.carrierMeta.frames.length];
        const sx=fr.x, sy=fr.y, sw=fr.w, sh=fr.h;
        const size = 22*camera.zoom*DPR;
        ctx.drawImage(tex.carrier, sx,sy,sw,sh, p.x-size/2, p.y-size/2, size, size);
      } else {
        // Fallback: Punkt
        ctx.beginPath();
        ctx.fillStyle = '#ffd85e';
        ctx.arc(p.x,p.y, 4*camera.zoom*DPR, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawTiles();
    drawGrid();
    drawRoads();
    drawBuildings();
    drawCarriers();
  }

  return {
    camera,
    draw,
    screenToWorld,
  };
}
