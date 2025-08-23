/* =============================================================================
 * game.js • v1.4
 * - Unterstützt Tileset-JSON (frames + meta) + PNG (z. B. tileset.terrain.json/.png)
 * - Map.tiles: Zahlen-IDs ODER Frame-Keys ("terrain_r4_c7")
 * - Debug-Logs für jeden Schritt
 * - Zoom/Pan, Build, Ressourcen wie zuvor
 * =========================================================================== */

(function(){
  const CANVAS_ID = 'stage';
  const dbg = (...a) => (window.BootUI?.dbg ? window.BootUI.dbg(...a) : console.log(...a));

  const TILE_COLORS = {0:'#1a2735',1:'#2c3e2f',2:'#4a5b2f',3:'#6f5b2f',4:'#666'};
  const BUILD_COST = {
    road:{wood:1,stone:0,food:0,pop:0},
    hut:{wood:10,stone:2,food:0,pop:1},
    lumber:{wood:6,stone:0,food:0,pop:1},
    mason:{wood:4,stone:6,food:0,pop:1},
  };

  // ---------- helpers ----------
  async function fetchJSON(url){
    const r = await fetch(url, {cache:'no-cache'});
    if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return r.json();
  }
  function joinPath(base, rel){
    if (/^https?:|^\//.test(rel)) return rel;
    const u = new URL(base, location.href);
    const seg = u.pathname.split('/'); seg.pop(); // drop file
    return new URL(seg.join('/') + '/' + rel, u).toString();
  }
  function hash2i(x,y,mod){ let n=(x|0)*73856093 ^ (y|0)*19349663; n^=(n<<11); n^=(n>>>7); n^=(n<<3); return mod>0?Math.abs(n)%mod:0; }

  // ---------- Map laden (mit Auto-/JSON-Tileset) ----------
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

      // Tileset-Auflösung (.json → lese meta; .png → direkt)
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
        // Kein Tileset angegeben → versuchen terrain automatisch
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

  class World {
    constructor(canvas, mapData){
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.camX=0; this.camY=0; this.zoom=1; this.minZoom=0.5; this.maxZoom=3;
      this.time=0; this.running=true;

      this.state = { mapUrl:null, time:0, player:{x:0,y:0} };

      this.map = mapData;
      this.tileSize = mapData.tileSize||32;
      this.tiles = mapData.tiles?.length ? mapData.tiles : [];

      // Atlas
      this.tilesetImg = null;
      this.frames = null;      // Map<string, {x,y,w,h}>
      this.cols = 1; this.rows = 1; this.total = 1;
      this.tsTile = this.tileSize;
      this.numericIds = true;  // true → map.tiles enthält Zahlen
      this.heuristic = false;  // true → keine Tiles → verteile deterministisch

      // Build + Ressourcen
      this.buildings=[]; this.res={wood:50,stone:30,food:20,pop:5};
      this.currentTool=null;

      // Input state
      this._touches=new Map(); this._pinchBase=null; this._dragging=false; this._lastX=0; this._lastY=0;

      this._raf=null; this.texturesReady=false; this._loggedRender=false;

      this._bindInput();
      this._resize(); window.addEventListener('resize',()=>this._resize(),{passive:true});
      updateHUD(this.res,'init');
    }

    async init(mapUrl){
      this.state.mapUrl = mapUrl || this.state.mapUrl;

      // ---------- Atlas laden ----------
      const A = this.map._atlas;
      if (A){
        try{
          const img = await window.Asset.loadImage('tileset', A.pngUrl);
          this.tilesetImg = img;
          this.tsTile = A.tileSize || this.tileSize;
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;

          if (A.type==='json' && A.frames && Object.keys(A.frames).length){
            this.frames = A.frames; // key → {x,y,w,h}
            // cols/rows aus meta.grid oder Bildmaßen
            if (A.grid && A.grid.cols && A.grid.rows){ this.cols=A.grid.cols; this.rows=A.grid.rows; }
            else { this.cols=Math.max(1,Math.floor(iw/this.tsTile)); this.rows=Math.max(1,Math.floor(ih/this.tsTile)); }
            this.total = this.cols * this.rows;
            dbg('Atlas JSON OK', JSON.stringify({tile:this.tsTile, cols:this.cols, rows:this.rows, frames:Object.keys(this.frames).length}));
          } else {
            // reines PNG‑Grid
            this.frames = null;
            this.cols=Math.max(1,Math.floor(iw/this.tsTile)); this.rows=Math.max(1,Math.floor(ih/this.tsTile)); this.total=this.cols*this.rows;
            dbg('Atlas PNG OK', JSON.stringify({tile:this.tsTile, cols:this.cols, rows:this.rows}));
          }
          this.texturesReady=true; window.Asset.markTexturesReady(true);
        }catch(e){
          dbg('Atlas FAIL → placeholders', e?.message||e);
          this.tilesetImg=null; this.frames=null; this.texturesReady=true; window.Asset.markTexturesReady(true);
        }
      } else {
        dbg('No atlas → placeholders'); this.texturesReady=true; window.Asset.markTexturesReady(true);
      }

      // Tiles Art bestimmen
      this.numericIds = this.tiles.length ? (typeof this.tiles[0] === 'number') : true;
      this.heuristic = !this.tiles.length && !!this.tilesetImg;

      if (this.heuristic) dbg('Tiles mode: HEURISTIC');
      else dbg('Tiles mode:', this.numericIds ? 'NUMERIC' : 'KEYS');

      this.play();
    }

    play(){ if(this._raf) return; const tick=()=>{ this._raf=requestAnimationFrame(tick); if(!this.running) return; this.time+=1/60; this.state.time=this.time; this._draw(); }; this._raf=requestAnimationFrame(tick); }
    pause(){ this.running=false; }
    get running(){ return this._running; } set running(v){ this._running=!!v; }

    snapshot(){ const s={mapUrl:this.state.mapUrl,time:this.time,buildings:this.buildings,cam:{x:this.camX,y:this.camY,z:this.zoom},res:this.res}; dbg('Snapshot create', JSON.stringify({t:Math.round(this.time),n:this.buildings.length})); return s; }
    async restore(s){ if(!s) return; dbg('Restore start', JSON.stringify({hasMap:!!s.mapUrl,n:s.buildings?.length||0}));
      if(s.mapUrl && s.mapUrl!==this.state.mapUrl){ const md=await loadMap(s.mapUrl); this.map=md; this.tileSize=md.tileSize||this.tileSize; this.tiles=md.tiles?.length?md.tiles:[]; await this.init(s.mapUrl); }
      this.buildings=Array.isArray(s.buildings)?s.buildings.slice():[]; if(s.res) this.res=Object.assign({},this.res,s.res); if(s.cam){this.camX=s.cam.x||0;this.camY=s.cam.y||0;this.zoom=s.cam.z||1;} this.time=Number(s.time||0); updateHUD(this.res,'restore'); dbg('Restore done', JSON.stringify({cam:{x:this.camX,y:this.camY,z:+this.zoom.toFixed(2)}})); }

    _resize(){ const dpr=Math.max(1,window.devicePixelRatio||1); const w=Math.floor(window.innerWidth),h=Math.floor(window.innerHeight);
      this.canvas.width=Math.floor(w*dpr); this.canvas.height=Math.floor(h*dpr); this.canvas.style.width=w+'px'; this.canvas.style.height=h+'px'; this.ctx.setTransform(dpr,0,0,dpr,0,0); dbg('Canvas',`${w}x${h} dpr:${dpr}`); }

    _bindInput(){
      document.querySelectorAll('#buildTools .tool').forEach(b=>b.addEventListener('click',()=>{ this.currentTool=b.dataset.tool||null; dbg('Tool',this.currentTool||'none'); }));
      this.canvas.addEventListener('click',(ev)=>{ if(!this.currentTool) return; const {tx,ty}=this._viewToTile(ev.clientX,ev.clientY);
        if(tx<0||ty<0||tx>=this.map.width||ty>=this.map.height){ dbg('Build OOB',JSON.stringify({tool:this.currentTool,tx,ty})); return; }
        const cost=BUILD_COST[this.currentTool]||{}; if(!this._canAfford(this.currentTool)){ dbg('Build DENIED',JSON.stringify({tool:this.currentTool,tx,ty,cost,have:this.res})); return; }
        const before={...this.res}; this.buildings.push({type:this.currentTool,tx,ty}); this._pay(this.currentTool); updateHUD(this.res,'build'); dbg('Build OK',JSON.stringify({tool:this.currentTool,tx,ty,cost,before,after:this.res}));
      });
      let wheelT=null; this.canvas.addEventListener('wheel',(ev)=>{ ev.preventDefault(); const d=-Math.sign(ev.deltaY)*0.1; this._zoomAt(ev.clientX,ev.clientY,d); clearTimeout(wheelT); wheelT=setTimeout(()=>dbg('Zoom',this.zoom.toFixed(2)),120); },{passive:false});
      this.canvas.addEventListener('pointerdown',(ev)=>{ this.canvas.setPointerCapture(ev.pointerId); this._dragging=true; this._lastX=ev.clientX; this._lastY=ev.clientY; this._touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY}); });
      let moved=false;
      this.canvas.addEventListener('pointermove',(ev)=>{ if(!this._touches.has(ev.pointerId)) return; this._touches.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
        if(this._touches.size===1&&this._dragging){ const dx=ev.clientX-this._lastX,dy=ev.clientY-this._lastY; this._lastX=ev.clientX; this._lastY=ev.clientY; this.camX-=dx/this.zoom; this.camY-=dy/this.zoom; moved=true; }
        else if(this._touches.size>=2){ const pts=[...this._touches.values()]; const a=pts[0],b=pts[1]; const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2; const dist=Math.hypot(a.x-b.x,a.y-b.y);
          if(!this._pinchBase) this._pinchBase={dist,zoom:this.zoom}; else { const scale=dist/this._pinchBase.dist; const target=this._clamp(this._pinchBase.zoom*scale,this.minZoom,this.maxZoom); this._zoomAt(cx,cy,0,target); } }
      });
      this.canvas.addEventListener('pointerup',(ev)=>{ this._touches.delete(ev.pointerId); if(this._touches.size<2) this._pinchBase=null; if(this._touches.size===0){ if(moved) dbg('Pan',JSON.stringify({x:Math.round(this.camX),y:Math.round(this.camY),z:+this.zoom.toFixed(2)})); this._dragging=false; moved=false; }});
      this.canvas.addEventListener('pointercancel',()=>{ this._touches.clear(); this._pinchBase=null; this._dragging=false; moved=false; });
    }

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

      if(this.tilesetImg){
        // --- Atlas: JSON (frames) oder PNG-Grid ---
        for(let ty=0; ty<H; ty++){
          for(let tx=0; tx<W; tx++){
            let sx,sy,sw,sh;
            if (this.frames){
              // Frames vorhanden → benutze Key oder numerisch zu Key
              let key;
              if (this.heuristic){
                // gar keine Tiles → verteile deterministisch
                const id = hash2i(tx,ty,this.cols*this.rows);
                const r = Math.floor(id/this.cols), c = id%this.cols;
                key = `terrain_r${r}_c${c}`;
              } else if (this.numericIds){
                const id = (this.tiles[ty*W+tx]|0);
                const r = Math.floor(id/this.cols), c = id%this.cols;
                key = `terrain_r${r}_c${c}`;
              } else {
                key = this.tiles[ty*W+tx] + '';
              }
              const f = this.frames[key];
              if (!f){ // Fallback: heuristisch wählen
                const id = hash2i(tx,ty,this.cols*this.rows);
                const r = Math.floor(id/this.cols), c = id%this.cols;
                const fk = `terrain_r${r}_c${c}`;
                const ff = this.frames[fk];
                if (!ff){ ctx.fillStyle='#8b0000'; ctx.fillRect(tx*tileSize,ty*tileSize,tileSize,tileSize); continue; }
                sx=ff.x; sy=ff.y; sw=ff.w; sh=ff.h;
                if ((tx+ty)%23===0) dbg('WARN missing frame', key, '→', fk);
              } else {
                sx=f.x; sy=f.y; sw=f.w; sh=f.h;
              }
            } else {
              // PNG-Grid
              let id;
              if (this.heuristic) id=hash2i(tx,ty,this.total);
              else if (this.numericIds) id=(this.tiles[ty*W+tx]|0);
              else { // string → in r/c übersetzen erwartet "rX_cY"
                const key=(this.tiles[ty*W+tx]+''); const m=key.match(/r(\d+)_c(\d+)/i);
                id = m ? (parseInt(m[1],10)*this.cols + parseInt(m[2],10)) : hash2i(tx,ty,this.total);
              }
              const col=id%this.cols, row=Math.floor(id/this.cols);
              sx=col*this.tsTile; sy=row*this.tsTile; sw=this.tsTile; sh=this.tsTile;
            }
            ctx.drawImage(this.tilesetImg, sx,sy,sw,sh, tx*tileSize,ty*tileSize, tileSize,tileSize);
          }
        }
      } else {
        // --- Platzhalter ---
        for(let ty=0; ty<H; ty++){
          for(let tx=0; tx<W; tx++){
            const id=this.tiles.length? (this.numericIds?(this.tiles[ty*W+tx]|0):0) : 2;
            ctx.fillStyle=TILE_COLORS[id]||'#2a2a2a'; ctx.fillRect(tx*tileSize,ty*tileSize,tileSize,tileSize);
            ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.strokeRect(tx*tileSize,ty*tileSize,tileSize,tileSize);
          }
        }
      }

      // Buildings (wie bisher, simple Shapes)
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
