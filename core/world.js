import { IM } from './assets.js';
import { cam } from './camera.js';

/* --- Tiles & Welt --- */
export const TILE_W=64, TILE_H=32;
let W=0,H=0; export let grid=[]; export let startPos={x:0,y:0};

/* --- Tools --- */
export const TOOLS={ POINTER:'pointer', ROAD:'road', HQ:'hq', LUMBER:'lumber', DEPOT:'depot', BULL:'bulldoze' };
let tool=TOOLS.POINTER; export function setTool(t){tool=t;}

/* --- Ressourcen & Kosten --- */
export const resources = { wood:20, stone:10, food:10, gold:0 };
const COST = {
  road:    { wood:1 },
  hq:      { wood:15, stone:10 },
  lumber:  { wood:5 },
  depot:   { wood:8, stone:2 }
};
function canPay(c){ for(const k in c){ if((resources[k]||0)<c[k]) return false; } return true; }
function pay(c){ if(!canPay(c)) return false; for(const k in c) resources[k]-=c[k]; return true; }

/* --- Jobs & Carrier --- */
const carriers=[];           // {x,y, px,py, path:[], speed, carrying:{wood:n}, cap, anim}
const jobs=[];               // {from:{x,y}, to:{x,y}, type:'wood', qty, prio}
export function carriersCount(){ return carriers.length; }
const PRIORITY=['food','stone','wood']; // Nahrung > Stein > Holz

/* --- Welt erzeugen --- */
export function createWorld(w,h){
  W=w; H=h; grid=new Array(H);
  for(let y=0;y<H;y++){
    grid[y]=new Array(W);
    for(let x=0;x<W;x++){
      grid[y][x]={ground:'grass', road:false, building:null, variant:null, stock:{wood:0}, prodTimer:0};
    }
  }
  // See
  for(let y=10;y<26;y++) for(let x=10;x<26;x++)
    grid[y][x].ground=(x===10||x===25||y===10||y===25)?'shore':'water';

  // Start-HQ Stein
  const cx=Math.floor(W/2), cy=Math.floor(H/2);
  grid[cy][cx].building='hq'; grid[cy][cx].variant='stone';
  startPos={x:cx,y:cy};

  // ein paar Straßen
  for(const [dx,dy] of [[1,0],[2,0],[-1,0],[-2,0],[0,1],[0,2],[0,-1],[0,-2]]){
    const x=cx+dx,y=cy+dy; if(inb(x,y)&&grid[y][x].ground!=='water') grid[y][x].road=true;
  }
  // Holzfäller & Depot
  if(inb(cx+3,cy+2)){ grid[cy+2][cx+3].building='lumber'; grid[cy+2][cx+2].road=true; }
  if(inb(cx-4,cy-1)){ grid[cy-1][cx-4].building='depot';  grid[cy-1][cx-3].road=true; }

  // Träger spawnen
  spawnCarrierNear(cx,cy); spawnCarrierNear(cx,cy);
}

/* --- Update Loop --- */
export function updateWorld(dt){
  // Produktion (Holzfäller)
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=grid[y][x];
    if(c.building==='lumber'){
      c.prodTimer+=dt;
      if(c.prodTimer>=3){ c.prodTimer-=3; c.stock.wood=(c.stock.wood||0)+1; enqueueDelivery({x,y}, 'wood'); }
    }
  }
  // Jobs sortieren nach Prio + Backlog (mehr Bestand = leicht bevorzugt)
  jobs.sort((a,b)=>{
    const pa=PRIORITY.indexOf(a.type), pb=PRIORITY.indexOf(b.type);
    if(pa!==pb) return pa-pb;
    return (b.backlog||0)-(a.backlog||0);
  });

  assignJobs();

  // Carrier animieren + bewegen
  for(const k of carriers){ moveCarrier(k,dt); }
}

/* --- Bauen --- */
export function buildAt(x,y){
  if(!inb(x,y)) return false;
  const c=grid[y][x];

  switch(tool){
    case TOOLS.ROAD:
      if(c.ground==='water') return false;
      if(!pay(COST.road)) return false;
      c.road=true; c.building=null; break;

    case TOOLS.HQ:
      if(!pay(COST.hq)) return false;
      c.building='hq'; c.variant=null; c.road=false; spawnCarrierNear(x,y); break;

    case TOOLS.LUMBER:
      if(!pay(COST.lumber)) return false;
      c.building='lumber'; c.road=false; c.stock.wood=0; c.prodTimer=0; break;

    case TOOLS.DEPOT:
      if(!pay(COST.depot)) return false;
      c.building='depot'; c.road=false; break;

    case TOOLS.BULL:
      c.building=null; c.variant=null; if(c.road) c.road=false; c.stock={wood:0}; break;

    default: return false;
  }
  return true;
}

/* --- Zeichnen --- */
export function drawWorldLayered(ctx, camera){
  const {minX,minY,maxX,maxY} = visibleBounds(camera);

  // Boden
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const p=cellToIso(x,y), rx=p.x-camera.x, ry=p.y-camera.y;
      drawTile(ctx,rx,ry,grid[y][x].ground);
    }
  }
  // Straßen (Autotiles inkl. End/T/Kreuzung)
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      if(!grid[y][x].road) continue;
      const p=cellToIso(x,y), rx=p.x-camera.x, ry=p.y-camera.y;
      const m=roadMask(x,y);
      const neigh = bits(m);
      let tex=null, rot=0;

      if(neigh===0){ tex=IM.road_straight||IM.road_curve; rot=0; }
      else if(neigh===1){ tex=IM.road_straight||IM.road_curve; rot=0; } // Endkappen -> fallback
      else if(neigh===2){ tex=IM.road_straight; rot=(m===0b0101?0:90); } // gerade
      else if(neigh===2.1){ tex=IM.road_curve; rot=curveRot(m); }
      else if(neigh===3){ tex=IM.road_straight; rot=0; drawTJunctionOverlay(ctx,rx,ry,m); }
      else { tex=IM.road_straight; rot=0; drawCrossOverlay(ctx,rx,ry); }

      drawImageDiamondRot(ctx, tex, rx,ry,rot, '#6b6f7a');
    }
  }
  // Gebäude
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const b=grid[y][x].building; if(!b) continue;
      const p=cellToIso(x,y), rx=p.x-camera.x, ry=p.y-camera.y;
      const img = b==='hq'   ? ((grid[y][x].variant==='stone'&&IM.hq_stone)?IM.hq_stone:IM.hq)
               : b==='lumber'? IM.lumber
               : b==='depot' ? IM.depot : null;
      if(img){
        const w=TILE_W*1.06, h=img.height*(w/img.width);
        ctx.drawImage(img, rx+TILE_W/2-w/2, ry+TILE_H-h+TILE_H*0.10, w,h);
      }else{
        ctx.fillStyle=b==='hq'?'#7a6':'#8aa';
        ctx.fillRect(rx+TILE_W*.15, ry+TILE_H*.1, TILE_W*.7, TILE_H*.55);
      }
    }
  }
  // Träger (Sprite anim)
  for(const k of carriers){
    const p=cellToIso(k.px,k.py), rx=p.x-camera.x, ry=p.y-camera.y;
    const cx=rx+TILE_W/2, cy=ry+TILE_H/2;
    if(IM.carrier){
      const frame = Math.floor(k.anim.t*8)%4; // 8 FPS
      const sw=32, sh=32, s=22;
      ctx.drawImage(IM.carrier, frame*sw,0,sw,sh, cx-s/2, cy-s*0.9, s, s);
    }else{
      ctx.beginPath(); ctx.arc(cx,cy-6,5,0,Math.PI*2);
      ctx.fillStyle=k.carrying.total>0?'#f5c26b':'#e9edf5'; ctx.fill();
    }
  }
}

/* --- Mathe & Utility --- */
export function cellToIso(x,y){ return {x:(x-y)*(TILE_W/2), y:(x+y)*(TILE_H/2)}; }
function screenToIsoFloat(sx,sy){
  const wx=cam.x+sx/cam.z, wy=cam.y+sy/cam.z;
  const ix=0.5*( wy/(TILE_H/2) + wx/(TILE_W/2) );
  const iy=0.5*( wy/(TILE_H/2) - wx/(TILE_W/2) );
  return {ix,iy};
}
export function screenToCell(sx,sy){
  const {ix,iy}=screenToIsoFloat(sx,sy);
  const x=Math.floor(ix), y=Math.floor(iy);
  return inb(x,y)?{x,y}:null;
}
function visibleBounds(camera){
  const pts=[{sx:0,sy:0},{sx:camera.width,sy:0},{sx:0,sy:camera.height},{sx:camera.width,sy:camera.height}];
  let minX=+Infinity,minY=+Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of pts){ const {ix,iy}=screenToIsoFloat(p.sx,p.sy);
    if(ix<minX)minX=ix; if(ix>maxX)maxX=ix; if(iy<minY)minY=iy; if(iy>maxY)maxY=iy; }
  minX=Math.max(0,Math.floor(minX)-3); minY=Math.max(0,Math.floor(minY)-3);
  maxX=Math.min(W-1,Math.ceil(maxX)+3); maxY=Math.min(H-1,Math.ceil(maxY)+3);
  return {minX,minY,maxX,maxY};
}
function diamondPath(c,x,y,w,h){ c.beginPath(); c.moveTo(x+w*0.5,y); c.lineTo(x+w,y+h*0.5); c.lineTo(x+w*0.5,y+h); c.lineTo(x,y+h*0.5); c.closePath(); }
function drawTile(ctx,rx,ry,kind){
  const img = IM[kind] || (kind==='water'?IM.water:kind==='shore'?IM.shore:null);
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  if(img) ctx.drawImage(img,rx-1,ry-1,TILE_W+2,TILE_H+2);
  else { ctx.fillStyle = kind==='water'?'#10324a': kind==='shore'?'#2c4922': kind==='dirt'?'#4a3a2a': kind==='rocky'?'#3a3f46': kind==='sand'?'#bfae6a':'#2a3e1f'; ctx.fillRect(rx,ry,TILE_W,TILE_H); }
  ctx.restore();
}
function drawImageDiamondRot(ctx,img,rx,ry,deg,fallback='#777'){
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  if(img){
    ctx.translate(rx+TILE_W/2, ry+TILE_H/2);
    ctx.rotate(deg*Math.PI/180);
    ctx.drawImage(img, -TILE_W/2-1, -TILE_H/2-1, TILE_W+2, TILE_H+2);
  }else{
    ctx.fillStyle=fallback; ctx.fillRect(rx+TILE_W*.18, ry+TILE_H*.36, TILE_W*.64, TILE_H*.28);
  }
  ctx.restore();
}
function drawTJunctionOverlay(ctx,rx,ry,m){
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  ctx.globalAlpha=0.2; ctx.fillStyle='#999'; ctx.fillRect(rx+TILE_W*.45,ry+TILE_H*.2,4,TILE_H*.6);
  ctx.restore();
}
function drawCrossOverlay(ctx,rx,ry){
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  ctx.globalAlpha=0.18; ctx.fillStyle='#aaa';
  ctx.fillRect(rx+TILE_W*.48,ry+TILE_H*.18,4,TILE_H*.64);
  ctx.fillRect(rx+TILE_W*.18,ry+TILE_H*.48,TILE_W*.64,4);
  ctx.restore();
}
function bits(m){
  const n= (m&1?1:0)+(m&2?1:0)+(m&4?1:0)+(m&8?1:0);
  if(n===2 && ((m===0b0101)||(m===0b1010))) return 2;       // gerade
  if(n===2) return 2.1;                                     // kurve
  return n; // 0,1,3,4
}
function curveRot(m){
  // N,E,S,W bits -> choose rotation
  if((m&1)&&(m&2)) return 0;     // N+E
  if((m&2)&&(m&4)) return 90;    // E+S
  if((m&4)&&(m&8)) return 180;   // S+W
  return 270;                    // W+N
}
function roadMask(x,y){
  let m=0; if(y>0&&grid[y-1][x].road)m|=1; if(x<W-1&&grid[y][x+1].road)m|=2; if(y<H-1&&grid[y+1][x].road)m|=4; if(x>0&&grid[y][x-1].road)m|=8; return m;
}
function inb(x,y){ return x>=0&&y>=0&&x<W&&y<H; }

/* --- Logistik: Backlogs, Prioritäten, Mehrfachladung --- */
function enqueueDelivery(from, type){
  const to = nearestSink(from.x,from.y); if(!to) return;
  const backlog = (grid[from.y][from.x].stock[type]||0);
  jobs.push({from, to, type, qty:1, prio:PRIORITY.indexOf(type), backlog});
}
function nearestSink(sx,sy){
  let best=null, bestD=1e9;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const b=grid[y][x].building; if(b==='hq'||b==='depot'){
      const d=(x-sx)*(x-sx)+(y-sy)*(y-sy); if(d<bestD){bestD=d; best={x,y};}
    }
  }
  return best;
}
function assignJobs(){
  for(const j of jobs){
    if(j.assigned) continue;
    const k = idleCarrierNear(j.from.x,j.from.y) || spawnCarrierNear(j.from.x,j.from.y);
    const pathA = pathfind(j.from, j.to); if(!pathA) continue;
    j.assigned=true; k.job=j; k.carrying={wood:0,stone:0,food:0,total:0}; k.path=pathA.slice(0); // hinweg (holt später auf)
  }
}
function spawnCarrierNear(x,y){
  const k={x,y, px:x,py:y, path:[], speed:3.2, carrying:{wood:0,stone:0,food:0,total:0}, cap:3, job:null, anim:{t:0}};
  carriers.push(k); return k;
}
function idleCarrierNear(x,y){
  let best=null,bestD=1e9;
  for(const k of carriers){ if(k.path.length===0 && !k.job){
    const d=(k.x-x)*(k.x-x)+(k.y-y)*(k.y-y); if(d<bestD){bestD=d; best=k;}
  }}
  return best;
}
function moveCarrier(k,dt){
  k.anim.t += dt;
  if(k.path.length===0){
    // Kein Weg -> Job vielleicht beenden
    return;
  }
  const next=k.path[0];
  const dx=next.x-k.px, dy=next.y-k.py;
  const d=Math.hypot(dx,dy);
  const step=k.speed*dt;
  if(d<=step){
    k.px=next.x; k.py=next.y; k.x=next.x; k.y=next.y; k.path.shift();

    // Knoten erreicht?
    if(k.path.length===0 && k.job){
      const atX=k.x, atY=k.y;
      // Am Zielknoten des aktuellen Teilwegs
      if(!k.carrying.total){
        // An der Quelle: so viel laden wie möglich (Mehrfachladung)
        const src=grid[atY][atX]; let loaded=false;
        while(k.carrying.total<k.cap && (src.stock[k.job.type]||0)>0){
          src.stock[k.job.type]-=1; k.carrying[k.job.type]++; k.carrying.total++; loaded=true;
        }
        // Rückweg zum Ziel
        const back=pathfind({x:atX,y:atY}, k.job.to); if(back) k.path=back;
        if(!loaded){ k.job=null; } // nichts zu holen -> Job frei
      }else{
        // Am Senke: Abliefern
        const sink=grid[atY][atX];
        // (Optional: Ressourcen in globales Lager addieren)
        resources[k.job.type]=(resources[k.job.type]||0)+k.carrying[k.job.type];
        k.carrying={wood:0,stone:0,food:0,total:0};
        k.job=null;
        // bleibt wo er ist und sucht neuen Auftrag von dort
        assignJobs();
      }
    }
  }else{
    k.px += (dx/d)*step; k.py += (dy/d)*step;
  }
}

/* --- Wegfindung --- */
function passable(x,y){
  if(!inb(x,y)) return false;
  const c=grid[y][x];
  if(c.road) return true;
  if(c.building) return true;
  return false;
}
function pathfind(a,b){
  const q=[a], prev=new Map(), key=(x,y)=>x+'_'+y;
  prev.set(key(a.x,a.y), null);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(q.length){
    const n=q.shift();
    if(n.x===b.x && n.y===b.y) break;
    for(const d of dirs){
      const nx=n.x+d[0], ny=n.y+d[1];
      const k=key(nx,ny); if(prev.has(k)) continue;
      if(passable(nx,ny)){ prev.set(k,n); q.push({x:nx,y:ny}); }
    }
  }
  if(!prev.has(key(b.x,b.y))) return null;
  const path=[]; let cur={x:b.x,y:b.y};
  while(cur){ path.unshift({x:cur.x,y:cur.y}); cur=prev.get(key(cur.x,cur.y)); }
  return path;
}
