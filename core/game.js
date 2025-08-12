// core/game.js
import { Renderer } from './render.js';

export class Game {
  constructor(renderer){
    this.r = renderer;

    // Größe & Daten
    this.W = 80; this.H = 80;
    this.map = null;

    // Input / Tool
    this.tool = 'pointer';
    this._touches = [];
    this._isPanning = false;

    // State
    this.state = {
      res: { wood:20, stone:10, food:10, gold:0 },
      carriers: [],
      buildings: [],
    };

    // Kosten & Produktion (einfach)
    this.costs = {
      road:       { wood:1 },
      hq:         { wood:0, stone:0, food:0 }, // Start‑HQ kostenlos
      lumberjack: { wood:5 },
      depot:      { wood:6, stone:2 },
    };

    // Loop
    this.running=false; this.last=0;

    this._bindInput();
  }

  async init(){
    // Assets laden (Renderer kümmert sich um Fallbacks)
    await this.r.loadAssets({
      grass:'assets/grass.png',
      water:'assets/water.png',
      shore:'assets/shore.png',
      dirt:'assets/dirt.png',
      rocky:'assets/rocky.png',
      sand:'assets/sand.png',
      road:'assets/road.png',
      hq_stone:'assets/hq_stone.png',
      hq_wood:'assets/hq_wood.png',
      lumberjack:'assets/lumberjack.png',
      depot:'assets/depot.png',
      carrier:'assets/carrier.png',
    });

    this._genWorld();

    // HQ (Stein) in die Mitte
    const cx = this.W>>1, cy = this.H>>1;
    this._placeObject(cx,cy,'hq_stone', false);
    this.state.buildings.push({type:'hq',x:cx,y:cy});

    // Kamera auf HQ zentrieren
    const s = this.r.isoToScreen(cx,cy);
    this.r.cameraX = this.r.canvas.width/this.r.DPR/2 - s.x;
    this.r.cameraY = this.r.canvas.height/this.r.DPR/2 - (s.y + 24);

    // initialer Draw
    this.r.setMapSize(this.W,this.H);
    this.r.drawMap(this.map);

    // Debug‑HUD updaten
    const zoomLbl = document.getElementById('zoomLbl');
    const viewName = document.getElementById('viewName');
    viewName.textContent = 'Isometrisch';
    const updZoom = ()=> zoomLbl.textContent = `${this.r.zoom.toFixed(2)}×`;
    updZoom();
    this._updZoomLbl = updZoom;

    // Toolbar
    this._wireToolbar();

    // Debug‑Toggle
    document.getElementById('debugToggle')?.addEventListener('click',()=>{
      const d = document.getElementById('debug');
      d.style.display = (d.style.display==='none'||!d.style.display)?'block':'none';
    });
  }

  start(){
    if(this.running) return;
    this.running=true; this.last=performance.now();
    const loop=(ts)=>{
      if(!this.running) return;
      const dt = Math.min(0.05, (ts-this.last)/1000); this.last=ts;
      this._tick(dt);
      this.r.drawMap(this.map);
      // Debug‑Overlay
      const dbg = document.getElementById('debug');
      if(dbg && dbg.style.display==='block'){
        dbg.textContent = this.r.getDebugText({ tile:this._lastTile, msg:this._lastMsg });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setTool(t){ this.tool=t; }

  // ---------- Welt ----------
  _genWorld(){
    // Grund: alles Gras
    this.map = Array.from({length:this.H}, (_,y)=>
      Array.from({length:this.W}, (_,x)=>({ ground:'grass', object:null, meta:{} }))
    );
    // See oben‑links
    const sx=12, sy=10, sw=18, sh=12;
    for(let y=sy;y<sy+sh;y++) for(let x=sx;x<sx+sw;x++){
      this.map[y][x].ground='water';
    }
    // Ufer
    for(let y=sy-1;y<=sy+sh;y++) for(let x=sx-1;x<=sx+sw;x++){
      if(this._inb(x,y) && this.map[y][x].ground!=='water'){
        if(this._anyN(x,y,c=>c.ground==='water')) this.map[y][x].ground='shore';
      }
    }
  }
  _inb(x,y){ return x>=0&&y>=0&&x<this.W&&y<this.H; }
  _anyN(x,y,pred){
    const n=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const d of n){ const nx=x+d[0], ny=y+d[1]; if(this._inb(nx,ny)&&pred(this.map[ny][nx])) return true; }
    return false;
  }

  _placeObject(x,y,key, pay=true){
    if(!this._inb(x,y)) return false;
    if(this.map[y][x].object) return false;
    // Kosten prüfen?
    if(pay){
      const cost = (key==='road')? this.costs.road :
                   (key==='lumberjack')? this.costs.lumberjack :
                   (key==='depot')? this.costs.depot : null;
      if(cost){
        for(const k in cost){ if((this.state.res[k]||0) < cost[k]) return false; }
        for(const k in cost){ this.state.res[k]-=cost[k]; }
      }
    }
    this.map[y][x].object = key;
    return true;
  }

  // ---------- Loop ----------
  _tick(dt){
    // hier später: Produktion/Träger
    // HUD live updaten
    document.getElementById('res-wood').textContent  = Math.floor(this.state.res.wood);
    document.getElementById('res-stone').textContent = Math.floor(this.state.res.stone);
    document.getElementById('res-food').textContent  = Math.floor(this.state.res.food);
    document.getElementById('res-gold').textContent  = Math.floor(this.state.res.gold);
    document.getElementById('res-carrier').textContent = this.state.carriers.length;
  }

  // ---------- Toolbar ----------
  _wireToolbar(){
    document.querySelectorAll('#sidebar .btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('#sidebar .btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this.setTool(btn.dataset.tool);
        const tag=document.getElementById('toolName')||document.createElement('div');
        tag.id='toolName';
        tag.style.position='fixed'; tag.style.right='10px'; tag.style.top='10px';
        tag.style.color='#cfd8e3'; tag.style.font='600 12px system-ui';
        tag.textContent = btn.textContent.trim();
        document.body.appendChild(tag);
        setTimeout(()=>tag.remove(),1000);
      });
    });

    // Start schließen
    document.getElementById('startBtn')?.addEventListener('click', ()=>{
      document.getElementById('start').style.display='none';
      this.start();
    });
  }

  // ---------- Input ----------
  _bindInput(){
    const c = this.r.canvas;

    const onPointerDown = (e)=>{
      c.setPointerCapture?.(e.pointerId);
      if(e.pointerType==='touch'){
        this._touches = [{id:e.pointerId,x:e.clientX,y:e.clientY,_x:e.clientX,_y:e.clientY}];
      }else{
        this._mouseDown = true;
        this._mouseLast = {x:e.clientX,y:e.clientY};
      }
      // Bauen bei kurzem Tap (nur wenn Bau‑Tool)
      if(this.tool!=='pointer' && this.tool!=='bulldoze'){
        const rect = c.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const {tx,ty} = this.r.screenToTile(sx,sy);
        this._lastTile = {tx,ty};
        this._tryBuild(tx,ty);
      } else if(this.tool==='bulldoze'){
        const rect = c.getBoundingClientRect();
        const {tx,ty} = this.r.screenToTile(e.clientX-rect.left, e.clientY-rect.top);
        if(this._inb(tx,ty)){ this.map[ty][tx].object = null; }
      }
      this._isPanning = (this.tool==='pointer'); // nur im Zeiger‑Tool pannen
    };

    const onPointerMove = (e)=>{
      const rect = c.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      this._lastTile = this.r.screenToTile(sx,sy);

      if(e.pointerType!=='touch'){
        if(this._mouseDown && this._isPanning){
          const dx = e.clientX - this._mouseLast.x;
          const dy = e.clientY - this._mouseLast.y;
          this.r.cameraX += dx;
          this.r.cameraY += dy;
          this._mouseLast={x:e.clientX,y:e.clientY};
        }
        return;
      }
    };

    const onPointerUp = (e)=>{
      this._mouseDown=false;
      this._touches=[];
      this.r.endPinch();
    };

    // Touch‑Spezial: Pan (1 Finger) & Pinch (2 Finger)
    const onTouchStart = (e)=>{
      if(e.touches.length===2){
        const t0={x:e.touches[0].clientX,y:e.touches[0].clientY};
        const t1={x:e.touches[1].clientX,y:e.touches[1].clientY};
        t0._x=t0.x; t0._y=t0.y; t1._x=t1.x; t1._y=t1.y;
        this._touches=[t0,t1];
        this.r.beginPinch(t0,t1);
      }
    };
    const onTouchMove = (e)=>{
      if(e.touches.length===1 && this._isPanning){
        e.preventDefault();
        const dx = e.touches[0].movementX || (e.touches[0].clientX-(this._tLastX||e.touches[0].clientX));
        const dy = e.touches[0].movementY || (e.touches[0].clientY-(this._tLastY||e.touches[0].clientY));
        this.r.cameraX += dx;
        this.r.cameraY += dy;
        this._tLastX = e.touches[0].clientX; this._tLastY = e.touches[0].clientY;
      } else if(e.touches.length===2){
        e.preventDefault();
        const t0={x:e.touches[0].clientX,y:e.touches[0].clientY,_x:this._touches[0]._x,_y:this._touches[0]._y};
        const t1={x:e.touches[1].clientX,y:e.touches[1].clientY,_x:this._touches[1]._x,_y:this._touches[1]._y};
        this.r.doPinch(t0,t1);
        this._updZoomLbl?.();
      }
    };
    const onTouchEnd = ()=>{ this.r.endPinch(); this._touches=[]; };

    c.addEventListener('pointerdown', onPointerDown);
    c.addEventListener('pointermove', onPointerMove);
    c.addEventListener('pointerup', onPointerUp);
    c.addEventListener('pointercancel', onPointerUp);
    c.addEventListener('touchstart', onTouchStart, {passive:false});
    c.addEventListener('touchmove', onTouchMove, {passive:false});
    c.addEventListener('touchend', onTouchEnd, {passive:true});
  }

  _tryBuild(tx,ty){
    if(!this._inb(tx,ty)) return;
    switch(this.tool){
      case 'road':       this._placeObject(tx,ty,'road'); break;
      case 'hq':         this._placeObject(tx,ty,'hq_wood'); break;
      case 'lumberjack': this._placeObject(tx,ty,'lumberjack'); break;
      case 'depot':      this._placeObject(tx,ty,'depot'); break;
    }
  }
}
