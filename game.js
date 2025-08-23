/* =============================================================================
 * game.js • v1.1
 * - Map laden (Tileset oder Platzhalter)
 * - Kamera mit Zoom & Pan (Mausrad, Drag; Touch: Pinch & Drag) → Canvas fängt Gesten ab
 * - Ressourcen-System (Holz/Stein/Nahrung/Bewohner) + HUD-Update
 * - Baumenü platziert Objekte mit Kostenprüfung
 * - Snapshot/Continue kompatibel
 * - Asset.texturesReady = true sobald renderbar
 * =========================================================================== */

(function(){
  const CANVAS_ID = 'stage';

  // Platzhalterfarben
  const TILE_COLORS = {0:'#1a2735',1:'#2c3e2f',2:'#4a5b2f',3:'#6f5b2f',4:'#666'};

  // Baukosten
  const BUILD_COST = {
    road:   {wood:1,  stone:0,  food:0,  pop:0},
    hut:    {wood:10, stone:2,  food:0,  pop:1},
    lumber: {wood:6,  stone:0,  food:0,  pop:1},
    mason:  {wood:4,  stone:6,  food:0,  pop:1},
  };

  async function loadMap(url){
    try{
      const res = await fetch(url, {cache:'no-cache'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const j = await res.json();
      return {
        width:  j.width  || j.w || 32,
        height: j.height || j.h || 18,
        tileSize: j.tileSize || j.tile || 32,
        tileset: j.tileset || null,
        tiles: (Array.isArray(j.tiles) ? j.tiles.flat() : []) || []
      };
    }catch(e){
      console.warn('[game] Map laden fehlgeschlagen, Demo:', e);
      const width=32, height=18, tileSize=32;
      const tiles = new Array(width*height).fill(0).map((_,i)=>{
        const x=i%width, y=(i/width)|0;
        if (y<4) return 0; if (y>height-4) return 4;
        if ((x+y)%7===0) return 1; if ((x*y)%11===0) return 3; return 2;
      });
      return { width, height, tileSize, tileset:null, tiles };
    }
  }

  // HUD-Res Update
  function updateHUD(res){
    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = String(val|0); };
    set('res-wood', res.wood);
    set('res-stone',res.stone);
    set('res-food', res.food);
    set('res-pop',  res.pop);
  }

  class World {
    constructor(canvas, mapData){
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      // Kamera
      this.camX = 0; this.camY = 0; this.zoom = 1;
      this.minZoom = 0.5; this.maxZoom = 3;

      this.time = 0; this.running = true;

      this.state = { mapUrl:null, time:0, player:{x:0,y:0} };

      // Map
      this.map = mapData;
      this.tileSize = mapData.tileSize || 32;
      this.tiles = mapData.tiles?.length ? mapData.tiles : new Array(mapData.width*mapData.height).fill(2);

      // Tileset
      this.tileset = null; this.tsCols = 8; this.tsTile = this.tileSize;

      // Buildings + Ressourcen
      this.buildings = [];
      this.res = { wood:50, stone:30, food:20, pop:5 };

      // Tool
      this.currentTool = null;

      // Touch state
      this._dragging = false; this._lastX=0; this._lastY=0;
      this._touches = new Map();

      // intern
      this._raf = null; this.texturesReady = false;

      this._bindInput();
      this._resize();
      window.addEventListener('resize', ()=>this._resize(), {passive:true});
      updateHUD(this.res);
    }

    async init(mapUrl){
      this.state.mapUrl = mapUrl || this.state.mapUrl;
      if (this.map.tileset){
        try{
          this.tileset = await window.Asset.loadImage('tileset', this.map.tileset);
          this.texturesReady = true; window.Asset.markTexturesReady(true);
        }catch(e){ console.warn('[game] Tileset fehlgeschlagen:', e); this.texturesReady = true; window.Asset.markTexturesReady(true); }
      }else{
        this.texturesReady = true; window.Asset.markTexturesReady(true);
      }
      this.play();
    }

    play(){
      if (this._raf) return;
      const tick = ()=>{
        this._raf = requestAnimationFrame(tick);
        if (!this.running) return;
        this.time += 1/60; this.state.time=this.time;
        this._draw();
      };
      this._raf = requestAnimationFrame(tick);
    }
    pause(){ this.running=false; }
    get running(){ return this._running; }
    set running(v){ this._running=!!v; }

    snapshot(){ return { mapUrl:this.state.mapUrl, time:this.time, buildings:this.buildings, cam:{x:this.camX,y:this.camY,z:this.zoom}, res:this.res }; }
    async restore(snap){
      if (!snap) return;
      if (snap.mapUrl && snap.mapUrl !== this.state.mapUrl){
        const md = await loadMap(snap.mapUrl);
        this.map = md;
        this.tiles = md.tiles?.length ? md.tiles : new Array(md.width*md.height).fill(2);
        await this.init(snap.mapUrl);
      }
      this.buildings = Array.isArray(snap.buildings) ? snap.buildings.slice() : [];
      if (snap.res) this.res = Object.assign({}, this.res, snap.res);
      if (snap.cam){ this.camX=snap.cam.x||0; this.camY=snap.cam.y||0; this.zoom=snap.cam.z||1; }
      this.time = Number(snap.time||0); updateHUD(this.res);
    }

    _resize(){
      const dpr = Math.max(1, window.devicePixelRatio||1);
      const w = Math.floor(window.innerWidth), h = Math.floor(window.innerHeight);
      this.canvas.width = Math.floor(w*dpr); this.canvas.height = Math.floor(h*dpr);
      this.canvas.style.width=w+'px'; this.canvas.style.height=h+'px';
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    _bindInput(){
      // Baumenü Tools
      document.querySelectorAll('#buildTools .tool').forEach(btn=>{
        btn.addEventListener('click', ()=>{ this.currentTool = btn.dataset.tool || null; });
      });

      // Platzieren (Klick/Tap)
      this.canvas.addEventListener('click', (ev)=>{
        if (!this.currentTool) return;
        const {tx,ty} = this._viewToTile(ev.clientX, ev.clientY);
        if (tx<0||ty<0||tx>=this.map.width||ty>=this.map.height) return;
        if (!this._canAfford(this.currentTool)) return;
        this.buildings.push({type:this.currentTool, tx, ty});
        this._pay(this.currentTool);
        updateHUD(this.res);
      });

      // Wheel Zoom (auch Touchpad)
      this.canvas.addEventListener('wheel', (ev)=>{
        ev.preventDefault();
        const delta = -Math.sign(ev.deltaY) * 0.1; // step
        this._zoomAt(ev.clientX, ev.clientY, delta);
      }, {passive:false});

      // Mouse drag → Pan
      this.canvas.addEventListener('pointerdown', (ev)=>{
        this.canvas.setPointerCapture(ev.pointerId);
        this._dragging = true; this._lastX=ev.clientX; this._lastY=ev.clientY;
        this._touches.set(ev.pointerId, {x:ev.clientX,y:ev.clientY});
      });
      this.canvas.addEventListener('pointermove', (ev)=>{
        if (!this._touches.has(ev.pointerId)) return;
        const prev = this._touches.get(ev.pointerId);
        this._touches.set(ev.pointerId, {x:ev.clientX,y:ev.clientY});

        if (this._touches.size===1 && this._dragging){
          const dx = ev.clientX - this._lastX, dy = ev.clientY - this._lastY;
          this._lastX = ev.clientX; this._lastY = ev.clientY;
          this.camX -= dx / this.zoom; this.camY -= dy / this.zoom;
        }
        else if (this._touches.size>=2){
          // Pinch zoom
          const pts = Array.from(this._touches.values());
          const a = pts[0], b = pts[1];
          const cx = (a.x+b.x)/2, cy=(a.y+b.y)/2;
          const dist = Math.hypot(a.x-b.x, a.y-b.y);
          if (!this._pinchBase){
            this._pinchBase = {dist, zoom:this.zoom};
          } else {
            const scale = dist / this._pinchBase.dist;
            const targetZoom = this._clamp(this._pinchBase.zoom * scale, this.minZoom, this.maxZoom);
            this._zoomAt(cx, cy, 0, targetZoom);
          }
        }
      });
      this.canvas.addEventListener('pointerup', (ev)=>{
        this._touches.delete(ev.pointerId);
        if (this._touches.size<2) this._pinchBase = null;
        if (this._touches.size===0){ this._dragging=false; }
      });
      this.canvas.addEventListener('pointercancel', (ev)=>{
        this._touches.delete(ev.pointerId);
        this._pinchBase = null; this._dragging=false;
      });
    }

    _clamp(v,a,b){ return Math.min(b, Math.max(a,v)); }

    _zoomAt(clientX, clientY, deltaStep=0, absoluteZoom=null){
      const before = this._viewToWorld(clientX, clientY);
      const z0 = this.zoom;
      const z1 = absoluteZoom!=null ? absoluteZoom : this._clamp(this.zoom * (1 + deltaStep), this.minZoom, this.maxZoom);
      this.zoom = z1;
      const after = this._viewToWorld(clientX, clientY);
      // halte den Punkt unter dem Cursor fest
      this.camX += (before.x - after.x);
      this.camY += (before.y - after.y);
    }

    _viewToWorld(clientX, clientY){
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / this.zoom + this.camX;
      const y = (clientY - rect.top)  / this.zoom + this.camY;
      return {x,y};
    }
    _viewToTile(clientX, clientY){
      const w = this._viewToWorld(clientX, clientY);
      const tx = Math.floor(w.x / this.tileSize);
      const ty = Math.floor(w.y / this.tileSize);
      return {tx,ty};
    }

    _canAfford(tool){
      const c = BUILD_COST[tool]; if(!c) return true;
      return (this.res.wood>=c.wood) && (this.res.stone>=c.stone) && (this.res.food>=c.food) && (this.res.pop>=c.pop);
    }
    _pay(tool){
      const c = BUILD_COST[tool]; if(!c) return;
      this.res.wood -= c.wood; this.res.stone -= c.stone; this.res.food -= c.food; this.res.pop -= c.pop;
    }

    _draw(){
      const {ctx, tileSize} = this;
      const W=this.map.width, H=this.map.height;

      ctx.save();
      ctx.clearRect(0,0, this.canvas.width, this.canvas.height);

      // Kamera
      ctx.translate(-this.camX * this.zoom, -this.camY * this.zoom);
      ctx.scale(this.zoom, this.zoom);

      // Karte
      if (this.tileset){
        for (let ty=0; ty<H; ty++){
          for (let tx=0; tx<W; tx++){
            const id = this.tiles[ty*W+tx] | 0;
            const sx = (id % this.tsCols) * this.tsTile;
            const sy = Math.floor(id / this.tsCols) * this.tsTile;
            ctx.drawImage(this.tileset, sx, sy, this.tsTile, this.tsTile, tx*tileSize, ty*tileSize, tileSize, tileSize);
          }
        }
      }else{
        for (let ty=0; ty<H; ty++){
          for (let tx=0; tx<W; tx++){
            const id = this.tiles[ty*W+tx] | 0;
            ctx.fillStyle = TILE_COLORS[id] || '#2a2a2a';
            ctx.fillRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.strokeRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
          }
        }
      }

      // Buildings
      for (const b of this.buildings){
        const x=b.tx*tileSize, y=b.ty*tileSize, s=tileSize;
        switch(b.type){
          case 'road':
            ctx.fillStyle = '#8c7a57';
            ctx.fillRect(x+2, y+s*0.4, s-4, s*0.2);
            break;
          case 'hut':
            ctx.fillStyle = '#b08968';
            ctx.fillRect(x+4, y+8, s-8, s-12);
            ctx.fillStyle = '#6b4f3f';
            ctx.fillRect(x+8, y+4, s-16, 8);
            break;
          case 'lumber':
            ctx.fillStyle = '#2f5d2e';
            ctx.beginPath(); ctx.arc(x+s/2, y+s/2, s*0.32, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#3c6b3a'; ctx.fillRect(x+s*0.45, y+s*0.2, s*0.1, s*0.6);
            break;
          case 'mason':
            ctx.fillStyle = '#9aa0a6';
            ctx.fillRect(x+6, y+6, s-12, s-12);
            ctx.fillStyle = '#7d8186';
            ctx.fillRect(x+s*0.4, y+4, s*0.2, s*0.2);
            break;
          default:
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(x+6, y+6, s-12, s-12);
        }
      }

      ctx.restore();
    }
  }

  // GameLoader
  const GameLoader = {
    _world: null,
    async start(mapUrl){
      const mapData = await loadMap(mapUrl);
      const canvas = document.getElementById(CANVAS_ID);
      const world = new World(canvas, mapData);
      this._world = world;
      await world.init(mapUrl);
      window.BootUI?.paintInspectorBasic?.();
    },
    async continueFrom(snap){
      const mapData = await loadMap(snap?.mapUrl);
      const canvas = document.getElementById(CANVAS_ID);
      const world = new World(canvas, mapData);
      this._world = world;
      await world.init(snap?.mapUrl);
      await world.restore(snap);
      window.BootUI?.paintInspectorBasic?.();
    }
  };
  window.GameLoader = GameLoader;
})();
