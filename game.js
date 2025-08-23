/* =============================================================================
 * game.js • v1.3
 * - Auto-Tileset-Unterstützung für assets/tiles/tileset.terrain.json/.png
 * - Lädt Atlas (tileSize aus JSON), berechnet Spalten/Zeilen aus PNG
 * - Heuristik-Renderer: echte Atlas-Kacheln (deterministisch verteilt),
 *   auch wenn kein Name→Index-Mapping vorliegt (überall echte Texturen sichtbar)
 * - Kamera: Zoom/Pan (wie zuvor)
 * - Ressourcen + Bauen (wie zuvor)
 * - Umfangreiche Debug-Logs (Map/Tileset/Render-Modus/Fehler)
 * =========================================================================== */

(function(){
  const CANVAS_ID = 'stage';

  const dbg = (...a) => (window.BootUI?.dbg ? window.BootUI.dbg(...a) : console.log(...a));

  // Platzhalterfarben (nur falls gar kein Atlas nutzbar ist)
  const TILE_COLORS = {0:'#1a2735',1:'#2c3e2f',2:'#4a5b2f',3:'#6f5b2f',4:'#666'};

  // Baukosten
  const BUILD_COST = {
    road:   {wood:1,  stone:0,  food:0,  pop:0},
    hut:    {wood:10, stone:2,  food:0,  pop:1},
    lumber: {wood:6,  stone:0,  food:0,  pop:1},
    mason:  {wood:4,  stone:6,  food:0,  pop:1},
  };

  // ---------------------------------------------------------------------------
  // Map laden + optional Auto-Tileset (terrain)
  // ---------------------------------------------------------------------------
  async function loadJson(url){
    const res = await fetch(url, {cache:'no-cache'});
    if(!res.ok) throw new Error('HTTP '+res.status+' '+url);
    return res.json();
  }

  async function tryLoadTerrainTileset(){
    // Erwartet: assets/tiles/tileset.terrain.json neben tileset.terrain.png
    const base = './assets/tiles/tileset.terrain';
    try{
      const meta = await loadJson(base + '.json'); // enthält tileSize=64, groups, ...
      const tileSize = Number(meta.tileSize||64);
      const pngUrl = base + '.png';
      dbg('Tileset(meta) OK', JSON.stringify({tileSize, pngUrl}));
      return { pngUrl, tileSize, meta };
    }catch(e){
      dbg('Tileset(meta) not found', (e && e.message) || e);
      return null;
    }
  }

  async function loadMap(url){
    if (!url) { dbg('Map load: NO URL → demo'); return demoMap(); }
    try{
      dbg('Map load start', url);
      const j = await loadJson(url);
      const md = {
        width:  j.width  || j.w || 32,
        height: j.height || j.h || 18,
        tileSize: j.tileSize || j.tile || null, // wenn null → von Tileset ableiten
        tileset: j.tileset || null,
        tiles: (Array.isArray(j.tiles) ? j.tiles.flat() : []) || []
      };

      // Falls kein tileset in der Map: versuche Terrain-Auto-Tileset
      if (!md.tileset){
        const terrain = await tryLoadTerrainTileset();
        if (terrain){
          md.tileset  = terrain.pngUrl;
          md.tileSize = md.tileSize || terrain.tileSize;
          md._terrainMeta = terrain.meta; // Gruppen (Namen) – aktuell nur informativ
          dbg('Map uses AUTO tileset (terrain)', JSON.stringify({tileSize:md.tileSize}));
        }
      }

      // Wenn immer noch kein tileSize → Default auf 32, aber loggen
      if (!md.tileSize){
        md.tileSize = 32;
        dbg('Map had no tileSize → default 32 (warn)');
      }

      dbg('Map load OK', JSON.stringify({w:md.width,h:md.height,tile:md.tileSize,tileset:!!md.tileset}));
      return md;
    }catch(e){
      dbg('Map load FAIL → demo fallback', (e && e.message) || e);
      return demoMap();
    }
  }

  function demoMap(){
    const width=32, height=18, tileSize=32;
    const tiles = new Array(width*height).fill(0).map((_,i)=>{
      const x=i%width, y=(i/width)|0;
      if (y<4) return 0; if (y>height-4) return 4;
      if ((x+y)%7===0) return 1; if ((x*y)%11===0) return 3; return 2;
    });
    return { width, height, tileSize, tileset:null, tiles };
  }

  // HUD-Res Update
  function updateHUD(res, tag){
    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = String(val|0); };
    set('res-wood', res.wood);
    set('res-stone',res.stone);
    set('res-food', res.food);
    set('res-pop',  res.pop);
    if (tag) dbg('HUD resources', tag, JSON.stringify(res));
  }

  // deterministische „Pseudozufalls“-Verteilung (damit jede Zelle stabil bleibt)
  function hash2i(x,y,mod){
    // x,y ints → 32-bit hash → [0..mod)
    let n = (x|0)*73856093 ^ (y|0)*19349663;
    n ^= (n<<11); n ^= (n>>>7); n ^= (n<<3);
    if (mod<=0) return 0;
    const r = Math.abs(n) % mod;
    return r;
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

      // Tileset/Atlas
      this.tileset = null; this.tsCols = 1; this.tsRows = 1; this.tsTile = this.tileSize;
      this.totalTiles = 1;
      this.heuristicAtlas = false; // true = wir verteilen IDs ohne Mapping (Name→Index fehlt)

      // Buildings + Ressourcen
      this.buildings = [];
      this.res = { wood:50, stone:30, food:20, pop:5 };

      // Tool
      this.currentTool = null;

      // Touch state
      this._dragging = false; this._lastX=0; this._lastY=0;
      this._touches = new Map(); this._pinchBase = null;

      // intern
      this._raf = null; this.texturesReady = false;
      this._loggedRenderMode = false;

      this._bindInput();
      this._resize();
      window.addEventListener('resize', ()=>this._resize(), {passive:true});
      updateHUD(this.res, 'init');
    }

    async init(mapUrl){
      this.state.mapUrl = mapUrl || this.state.mapUrl;

      if (this.map.tileset){
        try{
          dbg('Tileset load start', this.map.tileset);
          this.tileset = await window.Asset.loadImage('tileset', this.map.tileset);
          const iw = this.tileset.naturalWidth || this.tileset.width;
          const ih = this.tileset.naturalHeight || this.tileset.height;
          this.tsCols = Math.max(1, Math.floor(iw / this.tsTile));
          this.tsRows = Math.max(1, Math.floor(ih / this.tsTile));
          this.totalTiles = this.tsCols * this.tsRows;
          this.texturesReady = true; window.Asset.markTexturesReady(true);

          if (!Array.isArray(this.map.tiles) || this.map.tiles.length===0){
            // Keine IDs vorhanden → Heuristik-Modus aktivieren
            this.heuristicAtlas = true;
            dbg('Tileset load OK (HEURISTIC MODE)', JSON.stringify({w:iw,h:ih,ts:this.tsTile,cols:this.tsCols,rows:this.tsRows,total:this.totalTiles}));
          } else {
            dbg('Tileset load OK', JSON.stringify({w:iw,h:ih,ts:this.tsTile,cols:this.tsCols,rows:this.tsRows,total:this.totalTiles}));
          }
        }catch(e){
          dbg('Tileset load FAIL → placeholders', (e && e.message) || e);
          this.tileset = null;
          this.texturesReady = true; window.Asset.markTexturesReady(true);
        }
      }else{
        dbg('No tileset → placeholders');
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

    snapshot(){
      const snap = { mapUrl:this.state.mapUrl, time:this.time, buildings:this.buildings, cam:{x:this.camX,y:this.camY,z:this.zoom}, res:this.res };
      dbg('Snapshot create', JSON.stringify({t:Math.round(this.time), n:this.buildings.length}));
      return snap;
    }
    async restore(snap){
      if (!snap) return;
      dbg('Restore start', JSON.stringify({hasMap:!!snap.mapUrl, n:snap.buildings?.length||0}));
      if (snap.mapUrl && snap.mapUrl !== this.state.mapUrl){
        const md = await loadMap(snap.mapUrl);
        this.map = md;
        this.tileSize = md.tileSize || this.tileSize;
        this.tiles = md.tiles?.length ? md.tiles : new Array(md.width*md.height).fill(2);
        await this.init(snap.mapUrl);
      }
      this.buildings = Array.isArray(snap.buildings) ? snap.buildings.slice() : [];
      if (snap.res) this.res = Object.assign({}, this.res, snap.res);
      if (snap.cam){ this.camX=snap.cam.x||0; this.camY=snap.cam.y||0; this.zoom=snap.cam.z||1; }
      this.time = Number(snap.time||0);
      updateHUD(this.res, 'restore');
      dbg('Restore done', JSON.stringify({cam:{x:this.camX,y:this.camY,z:+this.zoom.toFixed(2)}}));
    }

    _resize(){
      const dpr = Math.max(1, window.devicePixelRatio||1);
      const w = Math.floor(window.innerWidth), h = Math.floor(window.innerHeight);
      this.canvas.width = Math.floor(w*dpr); this.canvas.height = Math.floor(h*dpr);
      this.canvas.style.width=w+'px'; this.canvas.style.height=h+'px';
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      dbg('Canvas resize', `${w}x${h} (dpr:${dpr})`);
    }

    _bindInput(){
      // Baumenü Tools
      document.querySelectorAll('#buildTools .tool').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          this.currentTool = btn.dataset.tool || null;
          dbg('Tool select', this.currentTool || 'none');
        });
      });

      // Platzieren (Klick/Tap)
      this.canvas.addEventListener('click', (ev)=>{
        if (!this.currentTool) return;
        const {tx,ty} = this._viewToTile(ev.clientX, ev.clientY);
        if (tx<0||ty<0||tx>=this.map.width||ty>=this.map.height) { dbg('Build out-of-bounds', JSON.stringify({tool:this.currentTool,tx,ty})); return; }
        const cost = BUILD_COST[this.currentTool] || {};
        if (!this._canAfford(this.currentTool)) {
          dbg('Build DENIED (cost)', JSON.stringify({tool:this.currentTool,tx,ty,cost,have:this.res}));
          return;
        }
        const before = {...this.res};
        this.buildings.push({type:this.currentTool, tx, ty});
        this._pay(this.currentTool);
        updateHUD(this.res, 'build');
        dbg('Build OK', JSON.stringify({tool:this.currentTool,tx,ty,cost,before,after:this.res}));
      });

      // Wheel Zoom
      let wheelTimer=null;
      this.canvas.addEventListener('wheel', (ev)=>{
        ev.preventDefault();
        const delta = -Math.sign(ev.deltaY) * 0.1;
        this._zoomAt(ev.clientX, ev.clientY, delta);
        clearTimeout(wheelTimer);
        wheelTimer=setTimeout(()=>{ dbg('Zoom end', this.zoom.toFixed(2)); }, 120);
      }, {passive:false});

      // Pointer (Drag/Pinch)
      this.canvas.addEventListener('pointerdown', (ev)=>{
        this.canvas.setPointerCapture(ev.pointerId);
        this._dragging = true; this._lastX=ev.clientX; this._lastY=ev.clientY;
        this._touches.set(ev.pointerId, {x:ev.clientX,y:ev.clientY});
      });
      let panMoved=false;
      this.canvas.addEventListener('pointermove', (ev)=>{
        if (!this._touches.has(ev.pointerId)) return;
        const prev = this._touches.get(ev.pointerId);
        this._touches.set(ev.pointerId, {x:ev.clientX,y:ev.clientY});

        if (this._touches.size===1 && this._dragging){
          const dx = ev.clientX - this._lastX, dy = ev.clientY - this._lastY;
          this._lastX = ev.clientX; this._lastY = ev.clientY;
          this.camX -= dx / this.zoom; this.camY -= dy / this.zoom;
          panMoved=true;
        }
        else if (this._touches.size>=2){
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
        if (this._touches.size===0){
          if (panMoved){ dbg('Pan end', JSON.stringify({cam:{x:Math.round(this.camX),y:Math.round(this.camY),z:+this.zoom.toFixed(2)}})); }
          this._dragging=false; panMoved=false;
        }
      });
      this.canvas.addEventListener('pointercancel', (ev)=>{
        this._touches.delete(ev.pointerId);
        this._pinchBase = null; this._dragging=false; panMoved=false;
      });
    }

    _clamp(v,a,b){ return Math.min(b, Math.max(a,v)); }

    _zoomAt(clientX, clientY, deltaStep=0, absoluteZoom=null){
      const before = this._viewToWorld(clientX, clientY);
      const z1 = absoluteZoom!=null ? absoluteZoom : this._clamp(this.zoom * (1 + deltaStep), this.minZoom, this.maxZoom);
      this.zoom = z1;
      const after = this._viewToWorld(clientX, clientY);
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

      // Render-Modus einmalig loggen
      if (!this._loggedRenderMode){
        this._loggedRenderMode = true;
        if (this.tileset) dbg('Render mode: TILESET', this.heuristicAtlas ? '(HEURISTIC)' : '');
        else dbg('Render mode: PLACEHOLDER');
      }

      if (this.tileset){
        // --- TILESET Rendering ---
        for (let ty=0; ty<H; ty++){
          for (let tx=0; tx<W; tx++){
            let id;
            if (this.heuristicAtlas || this.map.tiles.length===0){
              // Keine IDs vorhanden → nimm deterministisch eine Atlas-Zelle
              id = hash2i(tx,ty,this.totalTiles);
            } else {
              id = this.map.tiles[ty*W+tx] | 0;
              if (id<0 || id>=this.totalTiles){
                // ID außerhalb Atlas → deterministisch ersetzen + Warnfarbe kurz zeichnen
                if ((tx+ty)%17===0) { // nicht jede Zelle warnen
                  dbg('WARN tile id outside atlas', JSON.stringify({id,total:this.totalTiles}));
                }
                id = hash2i(tx,ty,this.totalTiles);
              }
            }
            const col = id % this.tsCols;
            const row = Math.floor(id / this.tsCols);
            const sx = col * this.tsTile;
            const sy = row * this.tsTile;
            ctx.drawImage(this.tileset, sx, sy, this.tsTile, this.tsTile, tx*tileSize, ty*tileSize, tileSize, tileSize);
          }
        }
      }else{
        // --- Platzhalter ---
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
      dbg('GameLoader.start', mapUrl);
      const mapData = await loadMap(mapUrl);
      const canvas = document.getElementById(CANVAS_ID);
      const world = new World(canvas, mapData);
      this._world = world;
      await world.init(mapUrl);
      window.BootUI?.paintInspectorBasic?.();
      dbg('Game started');
    },
    async continueFrom(snap){
      dbg('GameLoader.continueFrom');
      const mapData = await loadMap(snap?.mapUrl);
      const canvas = document.getElementById(CANVAS_ID);
      const world = new World(canvas, mapData);
      this._world = world;
      await world.init(snap?.mapUrl);
      await world.restore(snap);
      window.BootUI?.paintInspectorBasic?.();
      dbg('Game continued');
    }
  };
  window.GameLoader = GameLoader;
})();
