/* =============================================================================
 * game.js • v1.8.1
 * - NEU: Pfad-Overlay/Wear werden NICHT auf Gebäudefeldern (≠ road) angewendet.
 * - Belegt-Maske (occupiedNonRoad) verhindert Übermalen von Gebäuden.
 * - Rest wie v1.8: Trampelpfade 0..9 (assets/tex/path/topdown_path*.PNG),
 *   Speed-Boost pro Level, Units/Buildings-Sprites, robuste Pfad-Loader.
 * ============================================================================= */

(function(){
  const CANVAS_ID = 'stage';
  const dbg = (...a) => (window.BootUI?.dbg ? window.BootUI.dbg(...a) : console.log(...a));

  // === Projektpfade =========================================================
  const PATHS = {
    units: './assets/characters',
    buildings: './assets/tex/building/wood',
    paths: './assets/tex/path'
  };

  // === Path-Wear Tuning =====================================================
  const PATH_THRESH = [1, 3, 8, 18, 33, 53, 78, 108, 143]; // → Level 1..9
  const PATH_SPEED  = [1.00,1.02,1.04,1.07,1.10,1.13,1.16,1.20,1.25,1.30];

  // === Spiel-Balancing (Testwerte) =========================================
  const TILE_COLORS = {0:'#1a2735',1:'#2c3e2f',2:'#4a5b2f',3:'#6f5b2f',4:'#666'};
  const BUILD_COST = {
    road:{wood:1,stone:0,food:0,pop:0},
    hut:{wood:10,stone:2,food:0,pop:1},
    lumber:{wood:6,stone:0,food:0,pop:1},
    mason:{wood:4,stone:6,food:0,pop:1},
  };
  const CARRIER_PAYLOAD = { wood:8, stone:6, food:5 };
  const CARRIER_SPEED   = 90;
  const BUILDER_SPEED   = 90;

  // === Helpers: robuste URL-/Fetch-Utilities ===============================
  function normalizeUrl(input){
    const variants=[]; if(typeof input!=='string') return variants;
    variants.push(input);
    if (input.startsWith('./')) variants.push(input.slice(2));
    try { variants.push(new URL(input, location.href).href); } catch(e){}
    return [...new Set(variants)];
  }
  async function fetchTextSmart(url){
    const tries=normalizeUrl(url); let lastErr=null;
    for(const u of tries){
      try{ const r=await fetch(u,{cache:'no-cache'}); if(!r.ok) throw new Error(`HTTP ${r.status} ${u}`); const t=await r.text(); dbg('fetch OK',u); return t; }
      catch(e){ lastErr=e; dbg('fetch FAIL', String(e.message||e)); }
    }
    throw lastErr||new Error('fetch failed '+url);
  }
  async function fetchJSON(url){ const txt=await fetchTextSmart(url); try{ return JSON.parse(txt); }catch(e){ dbg('JSON parse FAIL', String(e.message||e)); throw e; } }
  function joinPath(base,rel){ if(/^https?:|^data:|^\//i.test(rel)) return rel; try{ return new URL(rel,new URL(base,location.href)).href; }catch(e){ return rel; } }
  function hash2i(x,y,mod){ let n=(x|0)*73856093 ^ (y|0)*19349663; n^=(n<<11); n^=(n>>>7); n^=(n<<3); return mod>0?Math.abs(n)%mod:0; }
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  async function loadFirstThatWorks(key,candidates){
    const tries=candidates.flatMap(normalizeUrl); let lastErr=null;
    for(const url of tries){ try{ const img=await window.Asset.loadImage(key+':'+url,url); dbg('img OK',url); return img; }catch(e){ lastErr=e; dbg('img FAIL',url); } }
    throw lastErr||new Error('No image found for '+key);
  }

  // === Map laden ============================================================
  async function loadMap(url){
    if(!url){ dbg('Map: NO URL → demo'); return demoMap(); }
    try{
      dbg('Map start', url);
      const j=await fetchJSON(url);
      const md={ width:j.width||j.w||32, height:j.height||j.h||18,
        tileSize:j.tileSize||j.tile||null, tileset:j.tileset||null,
        tiles:Array.isArray(j.tiles)?j.tiles.flat():[], };
      let atlas=null;
      if(md.tileset && /\.json(\?|$)/i.test(md.tileset)){
        const metaUrl=joinPath(url,md.tileset); const meta=await fetchJSON(metaUrl);
        const pngUrl=joinPath(metaUrl, meta.meta?.image||'tileset.png');
        const tileSize=Number(meta.meta?.tileSize||meta.tileSize||md.tileSize||32);
        atlas={type:'json', metaUrl, pngUrl, tileSize, frames:meta.frames||{}, grid:meta.meta?.grid||null};
        md.tileSize=tileSize; dbg('Tileset JSON OK', JSON.stringify({pngUrl,tileSize,frames:Object.keys(atlas.frames).length}));
      } else if (md.tileset){
        const pngUrl=joinPath(url,md.tileset);
        atlas={type:'png', pngUrl, tileSize:md.tileSize||32, frames:null, grid:null};
        dbg('Tileset PNG', JSON.stringify({pngUrl:atlas.pngUrl,tileSize:atlas.tileSize}));
      } else {
        try{
          const autoMetaUrl='./assets/tiles/tileset.terrain.json';
          const meta=await fetchJSON(autoMetaUrl);
          const pngUrl=joinPath(autoMetaUrl, meta.meta?.image||'tileset.terrain.png');
          const tileSize=Number(meta.meta?.tileSize||64);
          atlas={type:'json', metaUrl:autoMetaUrl, pngUrl, tileSize, frames:meta.frames||{}, grid:meta.meta?.grid||null};
          md.tileSize=md.tileSize||tileSize; dbg('AUTO Tileset JSON OK', JSON.stringify({pngUrl,tileSize}));
        }catch(e){ dbg('AUTO Tileset not found'); }
      }
      md._atlas=atlas; if(!md.tileSize){ md.tileSize=32; dbg('Map had no tileSize → default 32'); }
      if(!md.tiles?.length) dbg('Map tiles empty (heuristic IDs if needed)');
      return md;
    }catch(e){ dbg('Map FAIL → demo', e?.message||e); return demoMap(); }
  }
  function demoMap(){
    const width=32,height=18,tileSize=32;
    const tiles=new Array(width*height).fill(0).map((_,i)=>{const x=i%width,y=(i/width)|0; if(y<4)return 0; if(y>height-4)return 4; if((x+y)%7===0)return 1; if((x*y)%11===0)return 3; return 2;});
    return {width,height,tileSize,tileset:null,tiles,_atlas:null};
  }
  function updateHUD(res,tag){
    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=String(val|0); };
    set('res-wood',res.wood); set('res-stone',res.stone); set('res-food',res.food); set('res-pop',res.pop);
    if(tag) dbg('HUD', tag, JSON.stringify(res));
  }

  // === Pfad/Koord ===========================================================
  function tileCenterPx(tx,ty,tile){ return {x:tx*tile+tile/2, y:ty*tile+tile/2}; }
  function manhattanPathTiles(x0,y0,x1,y1){ const path=[]; let x=x0,y=y0; while(x!==x1){ x+=(x1>x)?1:-1; path.push({x,y}); } while(y!==y1){ y+=(y1>y)?1:-1; path.push({x,y}); } return path; }

  // === Units ================================================================
  class Unit{
    constructor(type,posPx,opts={}){
      this.type=type; this.x=posPx.x; this.y=posPx.y; this.path=[]; this.i=0;
      this.speed=opts.speed||80; this.size=opts.size||18; this.color=opts.color||'#ffd166';
      this.sprite=opts.sprite||null; this.frameW=opts.frameW||0; this.frameH=opts.frameH||0; this.frames=opts.frames||1; this.fps=opts.fps||6;
      this._animT=0; this.done=false;
      this.cargoType=opts.cargoType||null; this.cargo=opts.cargo||0; this.cargoMax=opts.cargoMax||0;
      this.onArrive=opts.onArrive||null; this.onStep=opts.onStep||null;
      this.loop=opts.loop||false; this._home=opts.home||null;
      this._lastTile={x:NaN,y:NaN};
      this.getSpeedFactorAt = opts.getSpeedFactorAt || (()=>1);
    }
    setPathPx(points){ this.path=points||[]; this.i=0; this._arriveCalled=false; }
    update(dt){
      // Step-Callback bei Kachelwechsel
      const cx=Math.floor(this.x/ (this.frameW||32)), cy=Math.floor(this.y/ (this.frameH||32));
      if((cx!==this._lastTile.x||cy!==this._lastTile.y) && this.onStep){ this._lastTile={x:cx,y:cy}; this.onStep(this,cx,cy); }
      if(this.done||this.i>=this.path.length){ if(this.onArrive && !this._arriveCalled){ this._arriveCalled=true; this.onArrive(this,'end'); } return; }
      const tx=this.path[this.i].x, ty=this.path[this.i].y; const dx=tx-this.x, dy=ty-this.y; const dist=Math.hypot(dx,dy);
      const ttx=Math.max(0,Math.floor(this.x/(this.frameW||32))), tty=Math.max(0,Math.floor(this.y/(this.frameH||32)));
      const factor=this.getSpeedFactorAt(ttx,tty);
      if(dist<Math.max(1,this.speed*factor*dt*0.5)){
        this.x=tx; this.y=ty; this.i++;
        if(this.i>=this.path.length){
          if(this.onArrive){ this.onArrive(this,'end'); }
          if(this.loop && this._home){ const back=this.path.slice().reverse(); this.path=back; this.i=1; this._arriveCalled=false; if(this.onArrive){ this.onArrive(this,'loop'); } }
          else { this.done=true; }
        }
      } else {
        const v=this.speed*factor*dt; this.x+=(dx/dist)*v; this.y+=(dy/dist)*v;
      }
      this._animT+=dt;
    }
    draw(ctx){
      if(this.sprite){
        const frame=Math.floor(this._animT*this.fps)%this.frames; const sx=frame*this.frameW, sy=0;
        ctx.drawImage(this.sprite,sx,sy,this.frameW,this.frameH, this.x-this.frameW/2,this.y-this.frameH/2,this.frameW,this.frameH);
      } else {
        ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.size/2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.stroke();
      }
    }
  }

  // === World ================================================================
  class World{
    constructor(canvas,mapData){
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      this.camX=0; this.camY=0; this.zoom=1; this.minZoom=0.5; this.maxZoom=3;
      this.time=0; this.running=true;
      this.state={mapUrl:null,time:0,player:{x:0,y:0}};

      this.map=mapData; this.tileSize=mapData.tileSize||32; this.tiles=mapData.tiles?.length?mapData.tiles:[];
      this.tilesetImg=null; this.frames=null; this.cols=1; this.rows=1; this.total=1; this.tsTile=this.tileSize;
      this.numericIds=true; this.heuristic=false;

      this.buildings=[];
      this.res={wood:1000,stone:1000,food:1000,pop:1000};
      this.currentTool=null;

      this.units=[];
      this.unitSprites={builder:null,carrier:null};
      this.unitSpriteMeta={ builder:{frameW:32,frameH:32,frames:4,fps:6}, carrier:{frameW:32,frameH:32,frames:4,fps:6} };

      this.buildingSprites={road:null,hut:null,lumber:null,mason:null};
      this.pathSprites=new Array(10).fill(null);

      this.pathWear=new Uint16Array(this.map.width*this.map.height);
      this.pathLevel=new Uint8Array(this.map.width*this.map.height);

      // NEU: Belegt-Maske für Gebäude ≠ road
      this.occupiedNonRoad=new Uint8Array(this.map.width*this.map.height);

      this._touches=new Map(); this._pinchBase=null; this._dragging=false; this._lastX=0; this._lastY=0;
      this._raf=null; this.texturesReady=false; this._loggedRender=false;

      this._bindInput();
      this._resize(); window.addEventListener('resize',()=>this._resize(),{passive:true});
      updateHUD(this.res,'init');
    }
    idx(tx,ty){ return ty*this.map.width+tx; }

    async init(mapUrl){
      this.state.mapUrl=mapUrl||this.state.mapUrl;
      const A=this.map._atlas;
      if(A){
        try{
          const img=await window.Asset.loadImage('tileset',A.pngUrl); this.tilesetImg=img; this.tsTile=A.tileSize||this.tileSize;
          const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
          if(A.type==='json' && A.frames && Object.keys(A.frames).length){
            this.frames=A.frames; if(A.grid && A.grid.cols && A.grid.rows){ this.cols=A.grid.cols; this.rows=A.grid.rows; }
            else { this.cols=Math.max(1,Math.floor(iw/this.tsTile)); this.rows=Math.max(1,Math.floor(ih/this.tsTile)); }
            this.total=this.cols*this.rows; dbg('Atlas JSON OK', JSON.stringify({tile:this.tsTile,cols:this.cols,rows:this.rows,frames:Object.keys(this.frames).length}));
          } else {
            this.frames=null; this.cols=Math.max(1,Math.floor(iw/this.tsTile)); this.rows=Math.max(1,Math.floor(ih/this.tsTile)); this.total=this.cols*this.rows;
            dbg('Atlas PNG OK', JSON.stringify({tile:this.tsTile,cols:this.cols,rows:this.rows}));
          }
          this.texturesReady=true; window.Asset.markTexturesReady(true);
        }catch(e){ dbg('Atlas FAIL → placeholders', e?.message||e); this.tilesetImg=null; this.frames=null; this.texturesReady=true; window.Asset.markTexturesReady(true); }
      } else { dbg('No atlas → placeholders'); this.texturesReady=true; window.Asset.markTexturesReady(true); }

      this.numericIds=this.tiles.length?(typeof this.tiles[0]==='number'):true;
      this.heuristic=!this.tiles.length && !!this.tilesetImg;
      dbg('Tiles mode:', this.heuristic?'HEURISTIC':(this.numericIds?'NUMERIC':'KEYS'));

      try{
        this.unitSprites.builder=await loadFirstThatWorks('builder',[`${PATHS.units}/builder.png`,`${PATHS.units}/worker.png`,`${PATHS.units}/builder_32x32x4.png`]);
        dbg('Unit sprite OK','builder');
      }catch(e){ dbg('Unit sprite missing → dot (builder)'); }
      try{
        this.unitSprites.carrier=await loadFirstThatWorks('carrier',[`${PATHS.units}/carrier.png`,`${PATHS.units}/porter.png`,`${PATHS.units}/carrier_32x32x4.png`]);
        dbg('Unit sprite OK','carrier');
      }catch(e){ dbg('Unit sprite missing → dot (carrier)'); }

      await this._loadBuildingSprites();
      await this._loadPathSprites();

      this.play();
    }

    async _loadBuildingSprites(){
      const map={ road:['road.png','road_64.png','road-wood.png'],
                  hut:['hut.png','hut_64.png','house_wood.png','hut-wood.png'],
                  lumber:['lumber.png','lumberjack.png','sawmill.png','lumber_64.png'],
                  mason:['mason.png','quarry.png','stonecutter.png','mason_64.png'] };
      for(const key of Object.keys(map)){
        const candidates=map[key].map(n=>`${PATHS.buildings}/${n}`);
        try{ this.buildingSprites[key]=await loadFirstThatWorks('b:'+key,candidates); dbg('Building sprite OK',key); }
        catch(e){ this.buildingSprites[key]=null; dbg('Building sprite missing → shape',key); }
      }
    }
    async _loadPathSprites(){
      for(let i=0;i<=9;i++){
        const name=`${PATHS.paths}/topdown_path${i}.PNG`;
        try{ this.pathSprites[i]=await loadFirstThatWorks('path:'+i,[name]); dbg('Path sprite OK',i,name); }
        catch(e){ this.pathSprites[i]=null; if(i===0) dbg('Path sprite 0 fehlt – Overlay startet ab Level>0'); else dbg('Path sprite missing',i); }
      }
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

        // Belegt-Maske pflegen
        const id=this.idx(tx,ty);
        if (this.currentTool==='road'){
          this._setPathLevel(tx,ty,9,true); // Straße sofort max
          this.occupiedNonRoad[id]=0;       // road blockiert Overlay nicht
        } else {
          this.occupiedNonRoad[id]=1;       // Gebäude blockiert Overlay/Wear
        }

        // Worker zur Baustelle + zurück
        this.spawnBuilderReturn(tx,ty);

        // Produktionsgebäude → Träger-Loop
        if (this.currentTool==='lumber') this.spawnCarrierLoop('wood', tx,ty);
        if (this.currentTool==='mason')  this.spawnCarrierLoop('stone',tx,ty);
      });

      let wheelT=null; this.canvas.addEventListener('wheel',(ev)=>{ ev.preventDefault(); const d=-Math.sign(ev.deltaY)*0.1; this._zoomAt(ev.clientX,ev.clientY,d); clearTimeout(wheelT); wheelT=setTimeout(()=>dbg('Zoom',this.zoom.toFixed(2)),120); },{passive:false});
      this.canvas.addEventListener('pointerdown',(ev)=>{ this.canvas.setPointerCapture(ev.pointerId); this._dragging=true; this._lastX=ev.clientX; this._lastY=ev.clientY; this._touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY}); });
      let moved=false;
      this.canvas.addEventListener('pointermove',(ev)=>{ if(!this._touches.has(ev.pointerId)) return; this._touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
        if(this._touches.size===1&&this._dragging){ const dx=ev.clientX-this._lastX,dy=ev.clientY-this._lastY; this._lastX=ev.clientX; this._lastY=ev.clientY; this.camX-=dx/this.zoom; this.camY-=dy/this.zoom; moved=true; }
        else if(this._touches.size>=2){ const pts=[...this._touches.values()]; const a=pts[0],b=pts[1]; const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2; const dist=Math.hypot(a.x-b.x); if(!this._pinchBase) this._pinchBase={dist,zoom:this.zoom}; else { const scale=dist/this._pinchBase.dist; const target=clamp(this._pinchBase.zoom*scale,this.minZoom,this.maxZoom); this._zoomAt(cx,cy,0,target); } }
      });
      this.canvas.addEventListener('pointerup',(ev)=>{ this._touches.delete(ev.pointerId); if(this._touches.size<2) this._pinchBase=null; if(this._touches.size===0){ if(moved) dbg('Pan',JSON.stringify({x:Math.round(this.camX),y:Math.round(this.camY),z:+this.zoom.toFixed(2)})); this._dragging=false; moved=false; }});
      this.canvas.addEventListener('pointercancel',()=>{ this._touches.clear(); this._pinchBase=null; this._dragging=false; moved=false; });
    }

    // === Path-Wear API ======================================================
    _incPath(tx,ty){
      if (tx<0||ty<0||tx>=this.map.width||ty>=this.map.height) return;
      const id=this.idx(tx,ty);
      // NEU: keine Wear auf Gebäuden ≠ road
      if (this.occupiedNonRoad[id]) return;

      const before=this.pathWear[id];
      this.pathWear[id]=Math.min(65535,before+1);
      const oldLevel=this.pathLevel[id];
      const newLevel=this._levelFromWear(this.pathWear[id]);
      if(newLevel>oldLevel){ this.pathLevel[id]=newLevel; dbg('Path level up', JSON.stringify({tx,ty,wear:this.pathWear[id],level:newLevel})); }
    }
    _setPathLevel(tx,ty,level,log){
      const id=this.idx(tx,ty); this.pathLevel[id]=Math.max(0,Math.min(9,level|0));
      if(log) dbg('Path set', JSON.stringify({tx,ty,level:this.pathLevel[id]}));
    }
    _levelFromWear(w){ let lvl=0; for(let i=0;i<PATH_THRESH.length;i++){ if(w>=PATH_THRESH[i]) lvl=i+1; else break; } return Math.min(9,lvl); }
    speedFactorAt(tx,ty){ const id=this.idx(tx,ty); const lvl=this.pathLevel[id]||0; return PATH_SPEED[lvl]||1.0; }

    // === Depot / Halbquartier ==============================================
    getDepotTile(){ return {x:0, y:this.map.height-1}; }
    getNearestHQorHut(tx,ty){
      const huts=this.buildings.filter(b=>b.type==='hut'); if(!huts.length) return this.getDepotTile();
      let best=huts[0],bestD=1e9; for(const h of huts){ const d=Math.abs(h.tx-tx)+Math.abs(h.ty-ty); if(d<bestD){ bestD=d; best=h; } }
      return {x:best.tx,y:best.ty};
    }

    // === Units erstellen ====================================================
    spawnBuilderReturn(tx,ty){
      const startT=this.getDepotTile(); const startPx=tileCenterPx(startT.x,startT.y,this.tileSize);
      const pathTo=[startPx,...manhattanPathTiles(startT.x,startT.y,tx,ty).map(p=>tileCenterPx(p.x,p.y,this.tileSize))];
      const pathBack=pathTo.slice().reverse();
      const opts={ speed:BUILDER_SPEED,size:16,color:'#ffd166', sprite:this.unitSprites.builder,...this.unitSpriteMeta.builder,
                   getSpeedFactorAt:(x,y)=>this.speedFactorAt(x,y), onStep:(_u,cx,cy)=>this._incPath(cx,cy) };
      const u=new Unit('builder',startPx,opts);
      u.setPathPx(pathTo.slice(1));
      u.onArrive=(unit,phase)=>{ if(phase==='end'){ dbg('Builder arrived', JSON.stringify({tx,ty})); unit.setPathPx(pathBack.slice(1)); unit._arriveCalled=false; } };
      this.units.push(u); dbg('Unit spawn', JSON.stringify({type:'builder',from:startT,to:{x:tx,y:ty},steps:pathTo.length-1}));
    }
    spawnCarrierLoop(kind,srcTx,srcTy){
      const depotT=this.getNearestHQorHut(srcTx,srcTy);
      const srcPx=tileCenterPx(srcTx,srcTy,this.tileSize);
      const pathTo=[srcPx,...manhattanPathTiles(srcTx,srcTy,depotT.x,depotT.y).map(p=>tileCenterPx(p.x,p.y,this.tileSize))];
      const colorBy={wood:'#7cc36b',stone:'#c7cbd1',food:'#f3b562'};
      const opts={ speed:CARRIER_SPEED,size:14,color:colorBy[kind]||'#6aa3ff', sprite:this.unitSprites.carrier,...this.unitSpriteMeta.carrier,
                   cargoType:kind,cargoMax:CARRIER_PAYLOAD[kind]||4,cargo:CARRIER_PAYLOAD[kind]||4, loop:true,home:srcPx,
                   getSpeedFactorAt:(x,y)=>this.speedFactorAt(x,y), onStep:(_u,cx,cy)=>this._incPath(cx,cy) };
      const u=new Unit('carrier',srcPx,opts);
      u.setPathPx(pathTo.slice(1));
      u.onArrive=(unit,phase)=>{
        if(phase==='end'){ const add=unit.cargo|0; if(add>0){ this.res[unit.cargoType]=(this.res[unit.cargoType]||0)+add; updateHUD(this.res,'deliver'); dbg('Carrier deliver', JSON.stringify({kind:unit.cargoType,amount:add,at:depotT})); unit.cargo=0; } }
        else if(phase==='loop'){ unit.cargo=unit.cargoMax; dbg('Carrier load', JSON.stringify({kind:unit.cargoType,amount:unit.cargo,at:{x:srcTx,y:srcTy}})); }
      };
      this.units.push(u);
      dbg('Unit spawn', JSON.stringify({type:'carrier',kind,from:{x:srcTx,y:srcTy},to:depotT,steps:pathTo.length-1,payload:opts.cargoMax}));
    }

    // === Update/Draw ========================================================
    _update(dt){ for(const u of this.units){ if(!u.done) u.update(dt); } this.units=this.units.filter(u=>!u.done||u.loop); }
    _clamp(v,a,b){ return Math.min(b,Math.max(a,v)); }
    _zoomAt(cx,cy,delta=0,abs=null){ const bef=this._viewToWorld(cx,cy); const z=abs!=null?this._clamp(abs,this.minZoom,this.maxZoom):this._clamp(this.zoom*(1+delta),this.minZoom,this.maxZoom); this.zoom=z; const aft=this._viewToWorld(cx,cy); this.camX+=(bef.x-aft.x); this.camY+=(bef.y-aft.y); }
    _viewToWorld(cx,cy){ const r=this.canvas.getBoundingClientRect(); return {x:(cx-r.left)/this.zoom+this.camX, y:(cy-r.top)/this.zoom+this.camY}; }
    _viewToTile(cx,cy){ const w=this._viewToWorld(cx,cy); return {tx:Math.floor(w.x/this.tileSize), ty:Math.floor(w.y/this.tileSize)}; }
    _canAfford(tool){ const c=BUILD_COST[tool]; if(!c) return true; return this.res.wood>=c.wood && this.res.stone>=c.stone && this.res.food>=c.food && this.res.pop>=c.pop; }
    _pay(tool){ const c=BUILD_COST[tool]; if(!c) return; this.res.wood-=c.wood; this.res.stone-=c.stone; this.res.food-=c.food; this.res.pop-=c.pop; }

    _draw(){
      const {ctx,tileSize}=this, W=this.map.width, H=this.map.height;
      ctx.save(); ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      ctx.translate(-this.camX*this.zoom,-this.camY*this.zoom); ctx.scale(this.zoom,this.zoom);
      if(!this._loggedRender){ this._loggedRender=true; dbg('Render', this.tilesetImg ? (this.frames?'TILESET(JSON)':'TILESET(PNG)') : 'PLACEHOLDER', this.heuristic?'(HEURISTIC)':''); }

      // TERRAIN
      if(this.tilesetImg){
        for(let ty=0; ty<H; ty++){
          for(let tx=0; tx<W; tx++){
            let sx,sy,sw,sh;
            if(this.frames){
              let key; if(this.heuristic){ const id=hash2i(tx,ty,this.cols*this.rows); const r=Math.floor(id/this.cols), c=id%this.cols; key=`terrain_r${r}_c${c}`; }
              else if(this.numericIds){ const id=(this.tiles[ty*W+tx]|0); const r=Math.floor(id/this.cols), c=id%this.cols; key=`terrain_r${r}_c${c}`; }
              else { key=this.tiles[ty*W+tx]+''; }
              const f=this.frames[key];
              if(!f){ const id=hash2i(tx,ty,this.cols*this.rows), r=Math.floor(id/this.cols), c=id%this.cols; const fk=`terrain_r${r}_c${c}`; const ff=this.frames[fk]; if(!ff){ ctx.fillStyle='#8b0000'; ctx.fillRect(tx*tileSize,ty*tileSize,tileSize,tileSize); continue; } sx=ff.x; sy=ff.y; sw=ff.w; sh=ff.h; if((tx+ty)%23===0) dbg('WARN missing frame', key,'→',fk); }
              else { sx=f.x; sy=f.y; sw=f.w; sh=f.h; }
            } else {
              let id; if(this.heuristic) id=hash2i(tx,ty,this.total); else if(this.numericIds) id=(this.tiles[ty*W+tx]|0); else { const key=(this.tiles[ty*W+tx]+''); const m=key.match(/r(\d+)_c(\d+)/i); id=m?(parseInt(m[1],10)*this.cols+parseInt(m[2],10)):hash2i(tx,ty,this.total); }
              const col=id%this.cols,row=Math.floor(id/this.cols); sx=col*this.tsTile; sy=row*this.tsTile; sw=this.tsTile; sh=this.tsTile;
            }
            ctx.drawImage(this.tilesetImg,sx,sy,sw,sh, tx*tileSize,ty*tileSize, tileSize,tileSize);
          }
        }
      } else {
        for(let ty=0; ty<H; ty++){ for(let tx=0; tx<W; tx++){ const id=this.tiles.length?(this.numericIds?(this.tiles[ty*W+tx]|0):0):2; ctx.fillStyle=TILE_COLORS[id]||'#2a2a2a'; ctx.fillRect(tx*tileSize,ty*tileSize,tileSize,tileSize); ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.strokeRect(tx*tileSize,ty*tileSize,tileSize,tileSize); } }
      }

      // BUILDINGS
      for(const b of this.buildings){
        const x=b.tx*tileSize,y=b.ty*tileSize,s=tileSize;
        const spr=this.buildingSprites[b.type]||null;
        if(spr){ ctx.drawImage(spr,x,y,s,s); }
        else {
          switch(b.type){
            case 'road': ctx.fillStyle='#8c7a57'; ctx.fillRect(x+2,y+s*0.4,s-4,s*0.2); break;
            case 'hut': ctx.fillStyle='#b08968'; ctx.fillRect(x+4,y+8,s-8,s-12); ctx.fillStyle='#6b4f3f'; ctx.fillRect(x+8,y+4,s-16,8); break;
            case 'lumber': ctx.fillStyle='#2f5d2e'; ctx.beginPath(); ctx.arc(x+s/2,y+s/2,s*0.32,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#3c6b3a'; ctx.fillRect(x+s*0.45,y+s*0.2,s*0.1,s*0.6); break;
            case 'mason': ctx.fillStyle='#9aa0a6'; ctx.fillRect(x+6,y+6,s-12,s-12); ctx.fillStyle='#7d8186'; ctx.fillRect(x+s*0.4,y+4,s*0.2,s*0.2); break;
            default: ctx.strokeStyle='#fff'; ctx.strokeRect(x+6,y+6,s-12,s-12);
          }
        }
      }

      // PATH OVERLAY (nur Level>0 und NICHT auf Gebäuden ≠ road)
      for(let ty=0; ty<H; ty++){
        for(let tx=0; tx<W; tx++){
          const id=this.idx(tx,ty);
          if(this.occupiedNonRoad[id]) continue;     // Gebäude blockiert Overlay
          const lvl=this.pathLevel[id];
          if(lvl>0 && this.pathSprites[lvl]){
            ctx.drawImage(this.pathSprites[lvl], tx*tileSize,ty*tileSize,tileSize,tileSize);
          }
        }
      }

      // UNITS
      for(const u of this.units){ u.draw(ctx); }

      ctx.restore();
    }
  }

  // === GameLoader ===========================================================
  const GameLoader={
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
  window.GameLoader=GameLoader;
})();
