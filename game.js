/* =============================================================================
 * game.js • v1.6
 * - Tileset-JSON+PNG (terrain) wie v1.4/v1.5
 * - Units/Carrier: Builder + (wood/stone/food)-Carrier, Loops + Delivery
 * - Builder kehrt nach dem Bauen zur Basis zurück
 * - Ressourcen: Start = 1000/1000/1000/1000; Delivery addiert, Bau abgezogen
 * - Pfadpunkte bei Platzhalterkarten sichtbar; Sprite-Fallbacks bleiben
 * - Umfangreiche Debug-Logs
 * =========================================================================== */

(function(){
  const CANVAS_ID = 'stage';
  const dbg = (...a) => (window.BootUI?.dbg ? window.BootUI.dbg(...a) : console.log(...a));

  const TILE_COLORS = {0:'#1a2735',1:'#2c3e2f',2:'#4a5b2f',3:'#6f5b2f',4:'#666'};
  const BUILD_COST = {
    road:{wood:1,stone:0,food:0,pop:0},
    hut:{wood:10,stone:2,food:0,pop:1},
    lumber:{wood:6,stone:0,food:0,pop:1},  // Holzfällerhütte
    mason:{wood:4,stone:6,food:0,pop:1},   // Steinmetz/Bruch
  };
  const CARRIER_PAYLOAD = { wood:8, stone:6, food:5 };   // pro Lieferung (Testwerte)
  const CARRIER_SPEED   = 90;                             // px/s
  const BUILDER_SPEED   = 90;                             // px/s

  // ---------- helpers ----------
  async function fetchJSON(url){ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return r.json(); }
  function joinPath(base,rel){ if(/^https?:|^\//.test(rel)) return rel; const u=new URL(base,location.href); const seg=u.pathname.split('/'); seg.pop(); return new URL(seg.join('/')+'/'+rel,u).toString(); }
  function hash2i(x,y,mod){ let n=(x|0)*73856093 ^ (y|0)*19349663; n^=(n<<11); n^=(n>>>7); n^=(n<<3); return mod>0?Math.abs(n)%mod:0; }
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

  // ---------- Map laden ----------
  async function loadMap(url){
    if (!url){ dbg('Map: NO URL → demo'); return demoMap(); }
    try{
      dbg('Map start', url);
      const j = await fetchJSON(url);
      const md = {
        width:  j.width  || j.w || 32,
        height: j.height || j.h || 18,
        tileSize: j.tileSize || j.tile || null,
        tileset: j.tileset || null,
        tiles: Array.isArray(j.tiles) ? j.tiles.flat() : [],
      };

      // Tileset (.json bevorzugt)
      let atlas = null;
      if (md.tileset && /\.json(\?|$)/i.test(md.tileset)){
        const metaUrl = md.tileset;
        const meta = await fetchJSON(metaUrl);
        const pngUrl = joinPath(metaUrl, meta.meta?.image || 'tileset.png');
        const tileSize = Number(meta.meta?.tileSize || meta.tileSize || md.tileSize || 32);
        atlas = { type:'json', metaUrl, pngUrl, tileSize, frames: meta.frames||{}, grid: meta.meta?.grid||null };
        md.tileSize = tileSize;
        dbg('Tileset JSON OK', JSON.stringify({pngUrl, tileSize, frames:Object.keys(atlas.frames).length}));
      } else if (md.tileset){
        atlas = { type:'png', pngUrl: md.tileset, tileSize: md.tileSize||32, frames:null, grid:null };
        dbg('Tileset PNG', JSON.stringify({pngUrl:atlas.pngUrl, tileSize:atlas.tileSize}));
      } else {
        // Auto terrain
        try{
          const autoMetaUrl = './assets/tiles/tileset.terrain.json';
          const meta = await fetchJSON(autoMetaUrl);
          const pngUrl = joinPath(autoMetaUrl, meta.meta?.image || 'tileset.terrain.png');
          const tileSize = Number(meta.meta?.tileSize || 64);
          atlas = { type:'json', metaUrl:autoMetaUrl, pngUrl, tileSize, frames: meta.frames||{}, grid: meta.meta?.grid||null };
          md.tileSize = md.tileSize || tileSize;
          dbg('AUTO Tileset JSON OK', JSON.stringify({pngUrl, tileSize}));
        }catch(e){ dbg('AUTO Tileset not found'); }
      }

      md._atlas = atlas;
      if (!md.tileSize) { md.tileSize = 32; dbg('Map had no tileSize → default 32'); }
      if (!md.tiles?.length) dbg('Map tiles empty (will use heuristic IDs if needed)');
      return md;
    }catch(e){
      dbg('Map FAIL → demo', e?.message||e);
      return demoMap();
    }
  }

  function demoMap(){
    const width=32, height=18, tileSize=32;
    const tiles = new Array(width*height).fill(0).map((_,i)=> {
      const x=i%width,y=(i/width)|0;
      if (y<4) return 0; if (y>height-4) return 4;
      if ((x+y)%7===0) return 1; if ((x*y)%11===0) return 3; return 2;
    });
    return { width, height, tileSize, tileset:null, tiles, _atlas:null };
  }

  function updateHUD(res, tag){
    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=String(val|0); };
    set('res-wood',res.wood); set('res-stone',res.stone); set('res-food',res.food); set('res-pop',res.pop);
    if (tag) dbg('HUD', tag, JSON.stringify(res));
  }

  // ---- Pfad/Koord ----
  function tileCenterPx(tx,ty,tile){ return {x: tx*tile + tile/2, y: ty*tile + tile/2}; }
  function manhattanPathTiles(x0,y0,x1,y1){
    const path=[]; let x=x0,y=y0;
    while (x!==x1){ x += (x1>x)?1:-1; path.push({x,y}); }
    while (y!==y1){ y += (y1>y)?1:-1; path.push({x,y}); }
    return path;
  }

  // ---------- Units ----------
  class Unit {
    constructor(type, posPx, opts={}){
      this.type = type;         // 'builder' | 'carrier'
      this.x = posPx.x; this.y = posPx.y;
      this.path = [];           // Array<{x,y} px>
      this.i = 0;
      this.speed = opts.speed||80;
      this.size = opts.size||18;
      this.color = opts.color||'#ffd166';
      this.sprite = opts.sprite||null;
      this.frameW = opts.frameW||0;
      this.frameH = opts.frameH||0;
      this.frames = opts.frames||1;
      this.fps = opts.fps||6;
      this._animT = 0;
      this.done = false;

      // Carrier Zusatz
      this.cargoType = opts.cargoType||null;   // 'wood' | 'stone' | 'food'
      this.cargo = opts.cargo||0;              // aktuelle Fracht
      this.cargoMax = opts.cargoMax||0;
      this.onArrive = opts.onArrive||null;     // callback(unit, waypointIndex == last ? 'end' : 'mid')
      this.loop = opts.loop||false;            // Loop hin/zurück
      this._home = opts.home||null;            // Startpunkt für Loop (px)
    }
    setPathPx(points){ this.path = points||[]; this.i=0; }
    update(dt){
      if (this.done || this.i >= this.path.length) { 
        if (this.onArrive && !this._arriveCalled){ this._arriveCalled=true; this.onArrive(this,'end'); }
        return; 
      }
      const tx = this.path[this.i].x, ty=this.path[this.i].y;
      const dx = tx - this.x, dy = ty - this.y;
      const dist = Math.hypot(dx,dy);
      if (dist < Math.max(1, this.speed*dt*0.5)){
        this.x=tx; this.y=ty; this.i++;
        if (this.i>=this.path.length){
          if (this.onArrive){ this.onArrive(this,'end'); }
          if (this.loop && this._home){
            // für Loop: Weg zurück spiegeln
            const back = this.path.slice().reverse();
            this.path = back; this.i=1; // bei 1 starten, weil 0 identisch ist
            if (this.onArrive){ this.onArrive(this,'loop'); }
          } else {
            this.done=true;
          }
        }
      } else {
        const v = this.speed * dt;
        this.x += (dx/dist)*v;
        this.y += (dy/dist)*v;
      }
      this._animT += dt;
    }
    draw(ctx){
      if (this.sprite){
        const frame = Math.floor(this._animT * this.fps) % this.frames;
        const sx = frame * this.frameW, sy = 0;
        ctx.drawImage(this.sprite, sx,sy,this.frameW,this.frameH, this.x-this.frameW/2, this.y-this.frameH/2, this.frameW, this.frameH);
      } else {
        ctx.fillStyle=this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size/2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.stroke();
      }
    }
  }

  // ---------- World ----------
  class World {
    constructor(canvas, mapData){
      this.canvas = canvas; this.ctx = canvas.getContext('2d');

      this.camX=0; this.camY=0; this.zoom=1; this.minZoom=0.5; this.maxZoom=3;
      this.time=0; this.running=true;

      this.state = { mapUrl:null, time:0, player:{x:0,y:0} };

      this.map = mapData;
      this.tileSize = mapData.tileSize||32;
      this.tiles = mapData.tiles?.length ? mapData.tiles : [];

      // Atlas
      this.tilesetImg = null;
      this.frames = null; this.cols=1; this.rows=1; this.total=1;
      this.tsTile = this.tileSize;
      this.numericIds=true; this.heuristic=false;

      // Gameplay
      this.buildings=[]; // {type, tx, ty}
      // Startressourcen für Tests:
      this.res={wood:1000,stone:1000,food:1000,pop:1000};
      this.currentTool=null;

      // Units
      this.units=[];
      this.unitSprites = { builder:null, carrier:null };  // optional
      this.unitSpriteMeta = { builder:{ frameW:32, frameH:32, frames:4, fps:6 },
                              carrier:{ frameW:32, frameH:32, frames:4, fps:6 } };

      // Input
      this._touches=new Map(); this._pinchBase=null; this._dragging=false; this._lastX=0; this._lastY=0;

      // intern
      this._raf=null; this.texturesReady=false; this._loggedRender=false;

      this._bindInput();
      this._resize(); window.addEventListener('resize',()=>this._resize(),{passive:true});
      updateHUD(this.res,'init');
    }

    async init(mapUrl){
      this.state.mapUrl = mapUrl || this.state.mapUrl;

      // ---- Atlas laden ----
      const A = this.map._atlas;
      if (A){
        try{
          const img = await window.Asset.loadImage('tileset', A.pngUrl);
          this.tilesetImg = img;
          this.tsTile = A.tileSize || this.tileSize;
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;

          if (A.type==='json' && A.frames && Object.keys(A.frames).length){
            this.frames = A.frames;
            if (A.grid && A.grid.cols && A.grid.rows){ this.cols=A.grid.cols; this.rows=A.grid.rows; }
            else { this.cols=Math.max(1,Math.floor(iw/this.tsTile)); this.rows=Math.max(1,Math.floor(ih/this.tsTile)); }
            this.total=this.cols*this.rows;
            dbg('Atlas JSON OK', JSON.stringify({tile:this.tsTile, cols:this.cols, rows:this.rows, frames:Object.keys(this.frames).length}));
          } else {
            this.frames=null;
            this.cols=Math.max(1,Math.floor(iw/this.tsTile)); this.rows=Math.max(1,Math.floor(ih/this.tsTile)); this.total=this.cols*this.rows;
            dbg('Atlas PNG OK', JSON.stringify({tile:this.tsTile, cols:this.cols, rows:this.rows}));
          }
          this.texturesReady=true; window.Asset.markTexturesReady(true);
        }catch(e){ dbg('Atlas FAIL → placeholders', e?.message||e); this.tilesetImg=null; this.frames=null; this.texturesReady=true; window.Asset.markTexturesReady(true); }
      } else { dbg('No atlas → placeholders'); this.texturesReady=true; window.Asset.markTexturesReady(true); }

      // Tiles Art
      this.numericIds = this.tiles.length ? (typeof this.tiles[0] === 'number') : true;
      this.heuristic = !this.tiles.length && !!this.tilesetImg;

      if (this.heuristic) dbg('Tiles mode: HEURISTIC'); else dbg('Tiles mode:', this.numericIds?'NUMERIC':'KEYS');

      // ---- Unit-Sprites versuchen (optional) ----
      try{ this.unitSprites.builder = await window.Asset.loadImage('builder', './assets/units/builder.png'); dbg('Unit sprite OK','builder.png'); }catch(e){ dbg('Unit sprite missing → dot (builder)'); }
      try{ this.unitSprites.carrier = await window.Asset.loadImage('carrier', './assets/units/carrier.png'); dbg('Unit sprite OK','carrier.png'); }catch(e){ dbg('Unit sprite missing → dot (carrier)'); }

      this.play();
    }

    play(){ if(this._raf) return; let last=performance.now();
      const tick=(t)=>{ this._raf=requestAnimationFrame(tick); const dt=Math.min(0.05,(t-last)/1000); last=t; if(!this.running) return;
        this.time+=dt; this.state.time=this.time; this._update(dt); this._draw(); };
      this._raf=requestAnimationFrame(tick);
    }
    pause(){ this.running=false; }
    get running(){ return this._running; } set running(v){ this._running=!!v; }

    snapshot(){ const s={mapUrl:this.state.mapUrl,time:this.time,buildings:this.buildings,cam:{x:this.camX,y:this.camY,z:this.zoom},res:this.res}; dbg('Snapshot create', JSON.stringify({t:Math.round(this.time),n:this.buildings.length})); return s; }
    async restore(s){ if(!s) return; dbg('Restore start', JSON.stringify({hasMap:!!s.mapUrl,n:s.buildings?.length||0}));
      if(s.mapUrl && s.mapUrl!==this.state.mapUrl){ const md=await loadMap(s.mapUrl); this.map=md; this.tileSize=md.tileSize||this.tileSize; this.tiles=md.tiles?.length?md.tiles:[]; await this.init(s.mapUrl); }
      this.buildings=Array.isArray(s.buildings)?s.buildings.slice():[]; if(s.res) this.res=Object.assign({},this.res,s.res); if(s.cam){this.camX=s.cam.x||0;this.camY=s.cam.y||0;this.zoom=s.cam.z||1;} this.time=Number(s.time||0); updateHUD(this.res,'restore'); dbg('Restore done', JSON.stringify({cam:{x:this.camX,y:this.camY,z:+this.zoom.toFixed(2)}})); }

    _resize(){ const dpr=Math.max(1,window.devicePixelRatio||1); const w=Math.floor(window.innerWidth),h=Math.floor(window.innerHeight);
      this.canvas.width=Math.floor(w*dpr); this.canvas.height=Math.floor(h*dpr); this.canvas.style.width=w+'px'; this.canvas.style.height=h+'px'; this.ctx.setTransform(dpr,0,0,dpr,0,0); dbg('Canvas',`${w}x${h} dpr:${dpr}`); }

    _bindInput(){
      document.querySelectorAll('#buildTools .tool').forEach(b=>b.addEventListener('click',()=>{ 
        this.currentTool=b.dataset.tool||null; 
        document.querySelectorAll('#buildTools .tool').forEach(n=>n.classList.toggle('active', n===b));
        dbg('Tool',this.currentTool||'none'); 
      }));
      this.canvas.addEventListener('click',(ev)=>{ if(!this.currentTool) return; const {tx,ty}=this._viewToTile(ev.clientX,ev.clientY);
        if(tx<0||ty<0||tx>=this.map.width||ty>=this.map.height){ dbg('Build OOB',JSON.stringify({tool:this.currentTool,tx,ty})); return; }
        const cost=BUILD_COST[this.currentTool]||{}; if(!this._canAfford(this.currentTool)){ dbg('Build DENIED',JSON.stringify({tool:this.currentTool,tx,ty,cost,have:this.res})); return; }
        const before={...this.res};
        this.buildings.push({type:this.currentTool, tx, ty});
        this._pay(this.currentTool); updateHUD(this.res,'build');
        dbg('Build OK',JSON.stringify({tool:this.currentTool,tx,ty,cost,before,after:this.res}));

        // Worker zur Baustelle schicken und zurück
        this.spawnBuilderReturn(tx,ty);

        // Bei Produktionsgebäuden direkt einen Träger in Endlosschleife starten
        if (this.currentTool==='lumber') this.spawnCarrierLoop('wood', tx,ty);
        if (this.currentTool==='mason')  this.spawnCarrierLoop('stone',tx,ty);
        // Nahrung gäbe es später über Farm/Jagd; hier optional:
        // if (this.currentTool==='farm') this.spawnCarrierLoop('food', tx,ty);
      });

      let wheelT=null; this.canvas.addEventListener('wheel',(ev)=>{ ev.preventDefault(); const d=-Math.sign(ev.deltaY)*0.1; this._zoomAt(ev.clientX,ev.clientY,d); clearTimeout(wheelT); wheelT=setTimeout(()=>dbg('Zoom',this.zoom.toFixed(2)),120); },{passive:false});
      this.canvas.addEventListener('pointerdown',(ev)=>{ this.canvas.setPointerCapture(ev.pointerId); this._dragging=true; this._lastX=ev.clientX; this._lastY=ev.clientY; this._touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY}); });
      let moved=false;
      this.canvas.addEventListener('pointermove',(ev)=>{ if(!this._touches.has(ev.pointerId)) return; this._touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
        if(this._touches.size===1&&this._dragging){ const dx=ev.clientX-this._lastX,dy=ev.clientY-this._lastY; this._lastX=ev.clientX; this._lastY=ev.clientY; this.camX-=dx/this.zoom; this.camY-=dy/this.zoom; moved=true; }
        else if(this._touches.size>=2){ const pts=[...this._touches.values()]; const a=pts[0],b=pts[1]; const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2; const dist=Math.hypot(a.x-b.x,a.y-b.y);
          if(!this._pinchBase) this._pinchBase={dist,zoom:this.zoom}; else { const scale=dist/this._pinchBase.dist; const target=clamp(this._pinchBase.zoom*scale,this.minZoom,this.maxZoom); this._zoomAt(cx,cy,0,target); } }
      });
      this.canvas.addEventListener('pointerup',(ev)=>{ this._touches.delete(ev.pointerId); if(this._touches.size<2) this._pinchBase=null; if(this._touches.size===0){ if(moved) dbg('Pan',JSON.stringify({x:Math.round(this.camX),y:Math.round(this.camY),z:+this.zoom.toFixed(2)})); this._dragging=false; moved=false; }});
      this.canvas.addEventListener('pointercancel',()=>{ this._touches.clear(); this._pinchBase=null; this._dragging=false; moved=false; });
    }

    // === Depot / Halbquartier ===
    getDepotTile(){ return {x:0, y:this.map.height-1}; }
    getNearestHQorHut(tx,ty){
      // nächstgelegene Hütte, sonst Depot
      const huts = this.buildings.filter(b=>b.type==='hut');
      if (!huts.length) return this.getDepotTile();
      let best=huts[0], bestD=1e9;
      for (const h of huts){
        const d = Math.abs(h.tx-tx)+Math.abs(h.ty-ty);
        if (d<bestD){ bestD=d; best=h; }
      }
      return {x:best.tx, y:best.ty};
    }

    // === Units erstellen ===
    spawnBuilderReturn(tx,ty){
      const startT = this.getDepotTile();
      const startPx = tileCenterPx(startT.x,startT.y,this.tileSize);
      const goalPx  = tileCenterPx(tx,ty,this.tileSize);
      const pathTo  = [startPx, ...manhattanPathTiles(startT.x,startT.y,tx,ty).map(p=>tileCenterPx(p.x,p.y,this.tileSize))];
      const pathBack= pathTo.slice().reverse();

      const opts = { speed: BUILDER_SPEED, size: 16, color: '#ffd166', sprite: this.unitSprites.builder, ...this.unitSpriteMeta.builder };
      const u = new Unit('builder', startPx, opts);
      u.setPathPx(pathTo.slice(1));
      u.onArrive = (unit,phase)=>{
        if (phase==='end'){ // An Baustelle angekommen
          dbg('Builder arrived', JSON.stringify({tx,ty}));
          // kurze „Bau“-Pause simulieren? (optional)
          // Rückweg:
          unit.setPathPx(pathBack.slice(1));
          unit._arriveCalled=false; // erneut callback erlauben
        } else if (phase==='loop'){
          // nichts
        }
      };
      this.units.push(u);
      dbg('Unit spawn', JSON.stringify({type:'builder', from:startT, to:{x:tx,y:ty}, steps:pathTo.length-1}));
    }

    spawnCarrierLoop(kind, srcTx, srcTy){
      const depotT = this.getNearestHQorHut(srcTx,srcTy);  // halbquartier/hütte bevor depot
      const srcPx  = tileCenterPx(srcTx,srcTy,this.tileSize);
      const dstPx  = tileCenterPx(depotT.x,depotT.y,this.tileSize);
      const pathTo = [srcPx, ...manhattanPathTiles(srcTx,srcTy,depotT.x,depotT.y).map(p=>tileCenterPx(p.x,p.y,this.tileSize))];

      const colorBy = { wood:'#7cc36b', stone:'#c7cbd1', food:'#f3b562' };
      const opts = { speed:CARRIER_SPEED, size:14, color:colorBy[kind]||'#6aa3ff', sprite:this.unitSprites.carrier, ...this.unitSpriteMeta.carrier,
                     cargoType:kind, cargoMax:CARRIER_PAYLOAD[kind]||4, cargo:CARRIER_PAYLOAD[kind]||4, loop:true, home:srcPx };
      const u = new Unit('carrier', srcPx, opts);
      u.setPathPx(pathTo.slice(1));
      u.onArrive = (unit,phase)=>{
        // Bei Ankunft am Ziel (Depot/Hütte): Fracht abliefern
        if (phase==='end'){
          const add = unit.cargo|0;
          if (add>0){
            this.res[unit.cargoType] = (this.res[unit.cargoType]||0) + add;
            updateHUD(this.res, 'deliver');
            dbg('Carrier deliver', JSON.stringify({kind:unit.cargoType, amount:add, at:depotT}));
            unit.cargo = 0;
          }
        } else if (phase==='loop'){
          // auf dem Rückweg: wieder „beladen“ am Quellgebäude
          unit.cargo = unit.cargoMax;
          dbg('Carrier load', JSON.stringify({kind:unit.cargoType, amount:unit.cargo, at:{x:srcTx,y:srcTy}}));
        }
      };
      this.units.push(u);
      dbg('Unit spawn', JSON.stringify({type:'carrier', kind, from:{x:srcTx,y:srcTy}, to:depotT, steps:pathTo.length-1, payload:opts.cargoMax}));
    }

    // === Update/Draw ===
    _update(dt){ for(const u of this.units){ if(!u.done) u.update(dt); } this.units = this.units.filter(u=>!u.done || u.loop); }

    _clamp(v,a,b){ return Math.min(b,Math.max(a,v)); }
    _zoomAt(cx,cy,delta=0,abs=null){ const bef=this._viewToWorld(cx,cy); const z=abs!=null?abs:this._clamp(this.zoom*(1+delta),this.minZoom,this.maxZoom); this.zoom=z; const aft=this._viewToWorld(cx,cy); this.camX+=(bef.x-aft.x); this.camY+=(bef.y-aft.y); }
    _viewToWorld(cx,cy){ const r=this.canvas.getBoundingClientRect(); return {x:(cx-r.left)/this.zoom+this.camX, y:(cy-r.top)/this.zoom+this.camY}; }
    _viewToTile(cx,cy){ const w=this._viewToWorld(cx,cy); return {tx:Math.floor(w.x/this.tileSize), ty:Math.floor(w.y/this.tileSize)}; }
    _canAfford(tool){ const c=BUILD_COST[tool]; if(!c) return true; return this.res.wood>=c.wood && this.res.stone>=c.stone && this.res.food>=c.food && this.res.pop>=c.pop; }
    _pay(tool){ const c=BUILD_COST[tool]; if(!c) return; this.res.wood-=c.wood; this.res.stone-=c.stone; this.res.food-=c.food; this.res.pop-=c.pop; }

    _draw(){
      const {ctx,tileSize}=this, W=this.map.width, H=this.map.height;
      ctx.save(); ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      ctx.translate(-this.camX*this.zoom,-this.camY*this.zoom); ctx.scale(this.zoom,this.zoom);

      if(!this._loggedRender){ this._loggedRender=true; dbg('Render', this.tilesetImg ? (this.frames?'TILESET(JSON)':'TILESET(PNG)') : 'PLACEHOLDER', this.heuristic?'(HEURISTIC)':''); }

      // --- TERRAIN ---
      if(this.tilesetImg){
        for(let ty=0; ty<H; ty++){
          for(let tx=0; tx<W; tx++){
            let sx,sy,sw,sh;
            if (this.frames){
              let key;
              if (this.heuristic){ const id=hash2i(tx,ty,this.cols*this.rows); const r=Math.floor(id/this.cols), c=id%this.cols; key=`terrain_r${r}_c${c}`; }
              else if (this.numericIds){ const id=(this.tiles[ty*W+tx]|0); const r=Math.floor(id/this.cols), c=id%this.cols; key=`terrain_r${r}_c${c}`; }
              else { key = this.tiles[ty*W+tx]+''; }
              const f=this.frames[key];
              if (!f){ const id=hash2i(tx,ty,this.cols*this.rows); const r=Math.floor(id/this.cols), c=id%this.cols; const fk=`terrain_r${r}_c${c}`; const ff=this.frames[fk]; if(!ff){ ctx.fillStyle='#8b0000'; ctx.fillRect(tx*tileSize,ty*tileSize,tileSize,tileSize); continue; } sx=ff.x; sy=ff.y; sw=ff.w; sh=ff.h; if((tx+ty)%23===0) dbg('WARN missing frame', key, '→', fk); }
              else { sx=f.x; sy=f.y; sw=f.w; sh=f.h; }
            } else {
              let id; if (this.heuristic) id=hash2i(tx,ty,this.total); else if (this.numericIds) id=(this.tiles[ty*W+tx]|0); else { const key=(this.tiles[ty*W+tx]+''); const m=key.match(/r(\d+)_c(\d+)/i); id = m ? (parseInt(m[1],10)*this.cols + parseInt(m[2],10)) : hash2i(tx,ty,this.total); }
              const col=id%this.cols, row=Math.floor(id/this.cols); sx=col*this.tsTile; sy=row*this.tsTile; sw=this.tsTile; sh=this.tsTile;
            }
            ctx.drawImage(this.tilesetImg, sx,sy,sw,sh, tx*tileSize,ty*tileSize, tileSize,tileSize);
          }
        }
      } else {
        for(let ty=0; ty<H; ty++){
          for(let tx=0; tx<W; tx++){
            const id=this.tiles.length? (this.numericIds?(this.tiles[ty*W+tx]|0):0) : 2;
            ctx.fillStyle=TILE_COLORS[id]||'#2a2a2a'; ctx.fillRect(tx*tileSize,ty*tileSize,tileSize,tileSize);
            ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.strokeRect(tx*tileSize,ty*tileSize,tileSize,tileSize);
          }
        }
      }

      // --- BUILDINGS (simple shapes) ---
      for(const b of this.buildings){
        const x=b.tx*tileSize,y=b.ty*tileSize,s=tileSize;
        switch(b.type){
          case 'road': ctx.fillStyle='#8c7a57'; ctx.fillRect(x+2,y+s*0.4,s-4,s*0.2); break;
          case 'hut': ctx.fillStyle='#b08968'; ctx.fillRect(x+4,y+8,s-8,s-12); ctx.fillStyle='#6b4f3f'; ctx.fillRect(x+8,y+4,s-16,8); break;
          case 'lumber': ctx.fillStyle='#2f5d2e'; ctx.beginPath(); ctx.arc(x+s/2,y+s/2,s*0.32,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#3c6b3a'; ctx.fillRect(x+s*0.45,y+s*0.2,s*0.1,s*0.6); break;
          case 'mason': ctx.fillStyle='#9aa0a6'; ctx.fillRect(x+6,y+6,s-12,s-12); ctx.fillStyle='#7d8186'; ctx.fillRect(x+s*0.4,y+4,s*0.2,s*0.2); break;
          default: ctx.strokeStyle='#fff'; ctx.strokeRect(x+6,y+6,s-12,s-12);
        }
      }

      // --- PATH DOTS (nur wenn Terrain Platzhalter ist) ---
      if (!this.tilesetImg){
        ctx.save();
        ctx.globalAlpha = 0.7;
        for (const u of this.units){
          ctx.fillStyle = '#6aa3ff';
          for (const p of u.path){ ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); }
        }
        ctx.restore();
      }

      // --- UNITS ---
      for(const u of this.units){ u.draw(ctx); }

      ctx.restore();
    }
  }

  // ---------- GameLoader ----------
  const GameLoader = {
    _world:null,
    async start(mapUrl){
      dbg('GameLoader.start', mapUrl);
      const mapData=await loadMap(mapUrl);
      const canvas=document.getElementById(CANVAS_ID);
      const world=new World(canvas,mapData); this._world=world;
      await world.init(mapUrl); window.BootUI?.paintInspectorBasic?.(); dbg('Game started');
    },
    async continueFrom(snap){
      dbg('GameLoader.continueFrom');
      const mapData=await loadMap(snap?.mapUrl);
      const canvas=document.getElementById(CANVAS_ID);
      const world=new World(canvas,mapData); this._world=world;
      await world.init(snap?.mapUrl); await world.restore(snap); window.BootUI?.paintInspectorBasic?.(); dbg('Game continued');
    }
  };
  window.GameLoader = GameLoader;
})();
