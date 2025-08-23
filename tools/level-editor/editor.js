// Siedler‑Mini • Level‑Editor v1 — KERN (mit Atlas‑Support)
// =============================================================================
// WICHTIG (Projekt-Standards):
//  - Kommentare ausführlich lassen (Debug/Erklärung) — NICHT entfernen
//  - Struktur strikt einhalten: Imports → Konstanten → Hilfsfunktionen
//                               → Klassen (Daten + Editor)
//                               → Hauptlogik (im Boot) → Exports
//  - Startfenster zuerst (im index.html/boot.js gelöst)
//  - Debug/Inspector immer drin lassen
//  - Dateiname/Ordnerstruktur stabil halten
// =============================================================================

// ————————————————————————————————————————————————
// Imports (keine externen Abhängigkeiten)
// ————————————————————————————————————————————————

// ————————————————————————————————————————————————
// Konstanten
// ————————————————————————————————————————————————
const DEFAULT_LAYERS = ['ground','overlay'];
const COLL_NONE=0, COLL_BLOCK=1;

// ————————————————————————————————————————————————
// Hilfsfunktionen
// ————————————————————————————————————————————————
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function make2D(w,h,fill=-1){ return Array.from({length:h},()=>Array(w).fill(fill)); }
function drawGrid(ctx,w,h,ts,c='#23262a'){ ctx.save(); ctx.strokeStyle=c; ctx.lineWidth=1;
  for(let x=0;x<=w*ts;x+=ts){ ctx.beginPath(); ctx.moveTo(x+.5,0); ctx.lineTo(x+.5,h*ts); ctx.stroke(); }
  for(let y=0;y<=h*ts;y+=ts){ ctx.beginPath(); ctx.moveTo(0,y+.5); ctx.lineTo(w*ts,y+.5); ctx.stroke(); }
  ctx.restore();
}
function hatch(ctx,x,y,w,h){ ctx.save(); ctx.globalAlpha=.35; ctx.fillStyle='#ff3b3b'; ctx.fillRect(x,y,w,h);
  ctx.globalAlpha=.4; ctx.strokeStyle='#b00000'; ctx.lineWidth=1;
  for(let i=-h;i<w+h;i+=8){ ctx.beginPath(); ctx.moveTo(x+i,y); ctx.lineTo(x+i+h,y+h); ctx.stroke(); }
  ctx.restore();
}
function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,8); }

// ————————————————————————————————————————————————
// Atlas‑Parser: Unterstützt gängige JSON‑Schemata (TexturePacker/PIXI/Phaser)
// Gibt Frames als [{name, x,y,w,h}] zurück.
// ————————————————————————————————————————————————
function parseAtlasJSON(jsonText){
  let j; try{ j=JSON.parse(jsonText); } catch(e){ throw new Error('Atlas‑JSON ungültig'); }
  const frames = [];

  // Schema A: { frames: { "name":{"frame":{"x":..,"y":..,"w":..,"h":..}} } }
  if(j.frames && !Array.isArray(j.frames)){
    for(const [name, node] of Object.entries(j.frames)){
      const f = node.frame || node; // manche packer haben frame direkt auf Knoten
      if(f && Number.isFinite(f.x)) frames.push({ name, x:f.x, y:f.y, w:f.w, h:f.h });
    }
  }

  // Schema B: { frames: [ {filename:"name", frame:{x,y,w,h}} ] }
  if(Array.isArray(j.frames)){
    for(const node of j.frames){
      const name = node.filename || node.name || '';
      const f = node.frame || node;
      if(f && Number.isFinite(f.x)) frames.push({ name, x:f.x, y:f.y, w:f.w, h:f.h });
    }
  }

  // Hinweis: LibGDX .atlas ist oft KEIN JSON, sondern ein Textformat — das behandeln
  // wir hier bewusst NICHT. (Optional später: Textparser.)

  if(!frames.length) throw new Error('Keine Frames im Atlas‑JSON erkannt.');
  return { frames, meta: j.meta||{} };
}

// ————————————————————————————————————————————————
// Datenklassen
// ————————————————————————————————————————————————

// Tile kann EINZELBILD oder ATLAS‑FRAME repräsentieren.
// Wenn tile.rect existiert, wird aus der Atlas‑Bildquelle ausgeschnitten.
class Tile {
  // img: HTMLImageElement der Bildquelle (entweder das Einzelbild oder das Atlas‑Sheet)
  // optRect: {x,y,w,h} falls Atlas‑Frame
  constructor(id, name, img, optRect=null, sourceInfo=null){
    this.id = id;
    this.name = name || ('tile-'+id);
    this.img = img;             // Bildquelle (kann das Atlas‑Sheet sein)
    this.rect = optRect;        // null → voll (Einzelbild), sonst frame‑Rect (Atlas)
    this.source = sourceInfo;   // { kind:'image'|'atlas', src:string, imageName?:string, frameName?:string }
  }
}

class MapDoc {
  constructor({w=32,h=18,ts=64,layers=[...DEFAULT_LAYERS]}={}){
    this.w=w; this.h=h; this.ts=ts;
    this.layers = layers.map(n=>({ name:n, tiles: make2D(w,h,-1) }));
    this.collision = make2D(w,h, COLL_NONE);

    // Palette/Katalog:
    // Für Export speichern wir KEINE HTMLImage‑Refs, sondern nur Metadaten:
    //  - Einzelbild: {id,name,src}
    //  - Atlas‑Frame: {id,name,atlasImage,frame:{name?,x,y,w,h}}
    this.tiles = [];

    // Level‑Sachen
    this.entities = []; // [{id,type,name,x,y,rot,props}]
    this.triggers = []; // [{id,name,x,y,w,h,props}]

    this.meta = { title:'Unbenanntes Level', created:new Date().toISOString(), engine:'siedler-mini', format:2 };
  }

  resize(newW,newH){
    const W=this.w,H=this.h; this.w=newW; this.h=newH;
    const fix = grid=>{
      const g=make2D(newW,newH,-1);
      for(let y=0;y<Math.min(H,newH);y++) for(let x=0;x<Math.min(W,newW);x++) g[y][x]=grid[y][x];
      return g;
    };
    this.layers = this.layers.map(L=>({name:L.name, tiles:fix(L.tiles)}));
    const col=make2D(newW,newH,COLL_NONE);
    for(let y=0;y<Math.min(H,newH);y++) for(let x=0;x<Math.min(W,newW);x++) col[y][x]=this.collision[y][x];
    this.collision=col;

    // Entities/Trigger im sichtbaren Bereich halten
    this.entities.forEach(e=>{ e.x=clamp(e.x,0,newW-1); e.y=clamp(e.y,0,newH-1); });
    this.triggers.forEach(t=>{
      t.x=clamp(t.x,0,newW-1); t.y=clamp(t.y,0,newH-1);
      t.w=clamp(t.w,1,newW-t.x); t.h=clamp(t.h,1,newH-t.y);
    });
  }

  toJSON(){
    return {
      meta:this.meta, width:this.w, height:this.h, tileSize:this.ts,
      // Wichtig: Wir geben die Metadatenstruktur aus, NICHT die Canvas‑Images.
      tiles:this.tiles.map(t=>({ ...t })), // shallow copy
      layers:this.layers.map(L=>({name:L.name, data:L.tiles})),
      collision:this.collision,
      entities:this.entities.map(e=>({id:e.id,type:e.type,name:e.name,x:e.x,y:e.y,rot:e.rot||0,props:e.props||{}})),
      triggers:this.triggers.map(t=>({id:t.id,name:t.name,x:t.x,y:t.y,w:t.w,h:t.h,props:t.props||{}}))
    };
  }

  static fromJSON(json){
    const d=new MapDoc({w:json.width,h:json.height,ts:json.tileSize,layers:(json.layers?.map(l=>l.name)||DEFAULT_LAYERS)});
    d.layers.forEach((L,i)=> L.tiles = json.layers?.[i]?.data || make2D(d.w,d.h,-1));
    d.collision = json.collision || make2D(d.w,d.h,COLL_NONE);

    // Palette‑Metadaten übernehmen (Images lädt der Editor separat)
    d.tiles = (json.tiles||[]).map(node=> ({...node}));

    d.entities = (json.entities||[]).map(e=>({id:e.id||uid('e'),type:e.type||'entity',name:e.name||'',x:e.x|0,y:e.y|0,rot:e.rot|0,props:e.props||{}}));
    d.triggers = (json.triggers||[]).map(t=>({id:t.id||uid('t'),name:t.name||'',x:t.x|0,y:t.y|0,w:Math.max(1,t.w|0),h:Math.max(1,t.h|0),props:t.props||{}}));
    d.meta = json.meta || d.meta;
    return d;
  }
}

// ————————————————————————————————————————————————
// Editor‑Klasse
// ————————————————————————————————————————————————
class LevelEditor {
  constructor({canvas, inspector, status, ui}){
    this.cv=canvas; this.ctx=this.cv.getContext('2d');

    // Dokument + Paletten-Cache (Images)
    this.doc = new MapDoc();
    this.tilesById=new Map(); // id → Tile (mit HTMLImage und evtl. rect)

    // Viewport / State
    this.zoom=1; this.scrollX=0; this.scrollY=0;
    this.state = {
      mode:'tiles', tool:'paint', brush:1, grid:true, coll:false, snap:true,
      layer:0, tileSel:-1,
      sel:null, // { kind:'entity'|'trigger', id:string }
      dragging:false, dragOff:{x:0,y:0},
      rectStart:null, creatingTrigger:null
    };

    // UI/Debug
    this.inspector=inspector; this.status=status; this.ui=ui;
    this._mouse={x:0,y:0,gx:0,gy:0,down:false,alt:false,shift:false};

    // Setup
    this._bindUI();
    this._resizeCanvas();
    window.addEventListener('resize', ()=>this._resizeCanvas());
    this._loop();
  }

  // ————————————————————————————————————————————————
  // UI‑Verdrahtung (Buttons, Inputs, Shortcuts)
  // ————————————————————————————————————————————————
  _bindUI(){
    const ui=this.ui;

    // Globale toggles
    ui.chkGrid.onchange = ()=>{ this.state.grid = ui.chkGrid.checked; };
    ui.chkColl.onchange = ()=>{ this.state.coll = ui.chkColl.checked; };
    ui.chkSnap.onchange = ()=>{ this.state.snap = ui.chkSnap.checked; };
    ui.mode.onchange = ()=> this.setMode(ui.mode.value);
    ui.tool.onchange = ()=> this.state.tool = ui.tool.value;
    ui.brush.onchange = ()=> this.state.brush = parseInt(ui.brush.value,10);

    // Map‑Props
    ui.btnResize.onclick = ()=>{
      const w=+ui.mapW.value|0, h=+ui.mapH.value|0, ts=+ui.tileSize.value|0;
      if(ts!==this.doc.ts) this.doc.ts=ts;
      this.doc.resize(Math.max(1,w), Math.max(1,h));
    };
    ui.btnCenter.onclick = ()=>{ this.scrollX=0; this.scrollY=0; };

    // Ebenen
    ui.btnAddLayer.onclick = ()=>{
      const name = prompt('Ebenen-Name?','layer'+(this.doc.layers.length+1));
      if(!name) return;
      this.doc.layers.push({name, tiles:make2D(this.doc.w,this.doc.h,-1)});
      this._rebuildLayerUI();
    };
    ui.btnDelLayer.onclick = ()=>{
      if(this.doc.layers.length<=1) return alert('Mindestens 1 Ebene erforderlich.');
      const idx = ui.layerSel.selectedIndex;
      this.doc.layers.splice(idx,1); this._rebuildLayerUI();
    };
    ui.layerSel.onchange = ()=>{ this.state.layer = ui.layerSel.selectedIndex; this._updateStatus(); };

    // Palette (Klick‑Auswahl)
    ui.tileRow.addEventListener('click', ev=>{
      const el=ev.target.closest('.tile'); if(!el) return;
      const id=+el.dataset.id;
      this.state.tileSel=id;
      [...ui.tileRow.querySelectorAll('.tile')].forEach(t=>t.classList.toggle('sel',+t.dataset.id===id));
      this._updateStatus();
    });

    // Entities
    ui.btnEntAdd.onclick = ()=>{
      this.setMode('entities');
      const e={ id:uid('e'), type:ui.entType.value, name:ui.entName.value||'', x:0, y:0, rot:0, props:{} };
      this.doc.entities.push(e);
      this.state.sel={kind:'entity', id:e.id};
      this._rebuildEntityList(); this._syncPropBox();
    };
    ui.entList.addEventListener('click', ev=>{
      const row=ev.target.closest('[data-id]'); if(!row) return;
      const id=row.dataset.id;
      if(ev.target.matches('.del')){ this.doc.entities = this.doc.entities.filter(e=>e.id!==id); if(this.state.sel?.id===id) this.state.sel=null; this._rebuildEntityList(); this._syncPropBox(); return; }
      this.state.sel={kind:'entity', id}; this._syncPropBox();
    });

    // Trigger
    ui.btnTrigAdd.onclick = ()=>{
      this.setMode('triggers');
      const name = ui.trigName.value||'trigger';
      this.state.creatingTrigger = { name };
      this.state.tool='rect';
      alert('Ziehe im Canvas ein Rechteck für den Trigger.');
    };
    ui.trigList.addEventListener('click', ev=>{
      const row=ev.target.closest('[data-id]'); if(!row) return;
      const id=row.dataset.id;
      if(ev.target.matches('.del')){ this.doc.triggers = this.doc.triggers.filter(t=>t.id!==id); if(this.state.sel?.id===id) this.state.sel=null; this._rebuildTriggerList(); this._syncPropBox(); return; }
      this.state.sel={kind:'trigger', id}; this._syncPropBox();
    });

    // Canvas Interaktion (Maus, Zoom, Pan)
    this.cv.addEventListener('mousemove', ev=> this._onMouse(ev));
    this.cv.addEventListener('mousedown', ev=> { this._onMouse(ev); this._onDown(ev); });
    window.addEventListener('mouseup', ev=> this._onUp(ev));
    this.cv.addEventListener('wheel', ev=>{
      if(ev.ctrlKey){ ev.preventDefault();
        const dz=Math.sign(ev.deltaY); const old=this.zoom;
        this.zoom = clamp(this.zoom*(dz>0?0.9:1.1), 0.25, 3);
        const rect=this.cv.getBoundingClientRect();
        const x=(ev.clientX-rect.left)/devicePixelRatio, y=(ev.clientY-rect.top)/devicePixelRatio;
        const rx=x/old, ry=y/old, nx=x/this.zoom, ny=y/this.zoom;
        this.scrollX += (nx-rx); this.scrollY += (ny-ry);
      } else {
        this.scrollX -= ev.deltaX/this.zoom;
        this.scrollY -= ev.deltaY/this.zoom;
      }
    }, {passive:false});
    this.cv.addEventListener('contextmenu', ev=> ev.preventDefault());

    // Shortcuts (Debugfreundlich, keine Konflikte mit Spiel)
    window.addEventListener('keydown', e=>{
      if(e.key==='g'){ this.state.grid=!this.state.grid; this.ui.chkGrid.checked=this.state.grid; }
      if(e.key==='c'){ this.state.coll=!this.state.coll; this.ui.chkColl.checked=this.state.coll; }
      if(e.key==='1'){ this.setMode('tiles'); }
      if(e.key==='2'){ this.setMode('entities'); }
      if(e.key==='3'){ this.setMode('triggers'); }
      if(e.key==='+'||e.key==='='){ this.zoom=clamp(this.zoom*1.1,0.25,3); }
      if(e.key==='-'){ this.zoom=clamp(this.zoom/1.1,0.25,3); }
      if(e.key==='0'){ this.zoom=1; this.scrollX=0; this.scrollY=0; }
      if(e.key==='Delete'||e.key==='Backspace'){ this._deleteSelection(); }
      if(e.key==='Alt') this._mouse.alt=true;
      if(e.key==='Shift') this._mouse.shift=true;
    });
    window.addEventListener('keyup', e=>{
      if(e.key==='Alt') this._mouse.alt=false;
      if(e.key==='Shift') this._mouse.shift=false;
    });

    // Listen initial füllen
    this._rebuildLayerUI();
    this._rebuildEntityList();
    this._rebuildTriggerList();
    this._updateStatus();
  }

  // Moduswechsel (Tiles / Entities / Triggers) + Tab‑Sync
  setMode(m){
    this.state.mode=m; this.ui.mode.value=m;
    document.querySelectorAll('.tab').forEach(t=> t.classList.toggle('active', (t.dataset.tab===(m+'Tab')) ));
    Object.entries(this.ui.panels).forEach(([k,el])=> el.classList.toggle('active', k===m+'Tab'));
    if(m==='tiles' && !['paint','erase','fill','rect','pick'].includes(this.state.tool)) this.state.tool='paint';
    if((m==='entities' || m==='triggers') && !['move','rect','pick','erase'].includes(this.state.tool)) this.state.tool='move';
    this.ui.tool.value=this.state.tool;
    this._updateStatus();
  }

  // ————————————————————————————————————————————————
  // Datei‑I/O
  // ————————————————————————————————————————————————
  createBlank(w=32,h=18,ts=64){
    this.doc = new MapDoc({w,h,ts});
    this.tilesById.clear(); this.state.tileSel=-1; this.state.sel=null;
    this._rebuildLayerUI(); this._rebuildEntityList(); this._rebuildTriggerList();
    this.ui.mapW.value=w; this.ui.mapH.value=h; this.ui.tileSize.value=ts;
    this._updateStatus('Neues Level erstellt.');
  }

  // Wichtig: Beim Laden müssen wir die dokumentierten Tiles (Metadaten) in echte Tile‑Objekte
  // + Images überführen. Atlas‑Frames brauchen dasselbe Atlas‑Image.
  load(json){
    this.doc = MapDoc.fromJSON(json);
    this.tilesById.clear();

    // 1) Alle Einzelbild‑Tiles laden
    for(const node of (this.doc.tiles||[])){
      if(node.src){ // Einzelbild
        this._loadImage(node.src).then(img=>{
          const t = new Tile(node.id, node.name, img, null, {kind:'image', src:node.src});
          this.tilesById.set(node.id, t);
          this._rebuildPalette();
        });
      }
    }

    // 2) Alle Atlas‑Tiles: Atlas‑Bilder ggf. cachen (damit ein Sheet nur 1× geladen wird)
    const atlasGroups = new Map(); // imageSrc -> list of nodes
    for(const node of (this.doc.tiles||[])){
      if(node.atlasImage){ // Atlas‑Frame
        const key=node.atlasImage;
        if(!atlasGroups.has(key)) atlasGroups.set(key, []);
        atlasGroups.get(key).push(node);
      }
    }
    for(const [imgSrc, nodes] of atlasGroups){
      // Atlas‑Bild laden und auf alle Frames anwenden
      this._loadImage(imgSrc).then(img=>{
        for(const node of nodes){
          const r = node.frame || node.rect; // kompatibel
          const rect = r ? {x:r.x|0,y:r.y|0,w:r.w|0,h:r.h|0} : null;
          const t = new Tile(node.id, node.name, img, rect, {kind:'atlas', src:imgSrc, imageName:node.imageName||'', frameName:node.frameName||''});
          this.tilesById.set(node.id, t);
        }
        this._rebuildPalette();
      });
    }

    this._rebuildLayerUI(); this._rebuildEntityList(); this._rebuildTriggerList();
    this.ui.mapW.value=this.doc.w; this.ui.mapH.value=this.doc.h; this.ui.tileSize.value=this.doc.ts;
    this._updateStatus('Level geladen.');
  }

  export(){ return this.doc.toJSON(); }

  async exportPng(){
    // Nur Map + einfache Overlays der Entities/Trigger (Debughilfreich)
    const cv=document.createElement('canvas'); cv.width=this.doc.w*this.doc.ts; cv.height=this.doc.h*this.doc.ts;
    const ctx=cv.getContext('2d');
    this._drawMap(ctx,true,false);
    this._drawEntities(ctx,true);
    this._drawTriggers(ctx,true);
    const a=document.createElement('a'); a.download=(this.doc.meta?.title||'level')+'.png'; a.href=cv.toDataURL('image/png'); a.click();
  }

  // ————————————————————————————————————————————————
  // Palette: Einzelbild
  // ————————————————————————————————————————————————
  async addTileFromUrl(src, name){
    const img = await this._loadImage(src);
    const id = this._nextTileId();
    // Metadaten für Export
    this.doc.tiles.push({ id, name: name||('tile-'+id), src });
    // Laufzeit‑Tile
    const tile = new Tile(id, name||('tile-'+id), img, null, {kind:'image', src});
    this.tilesById.set(id, tile);
    if(this.state.tileSel===-1) this.state.tileSel=id;
    this._rebuildPalette();
  }

  // ————————————————————————————————————————————————
  // Palette: ATLAS (JSON + Bild)
  //  - jsonText: Inhalt der Atlas‑JSON
  //  - imageUrl: Objekt‑URL oder reguläre URL des Sprite‑Sheets
  //  - opts: { imageName?:string, prefix?:string }
// ————————————————————————————————————————————————
  async addAtlasFromJson(jsonText, imageUrl, opts={}){
    const { frames } = parseAtlasJSON(jsonText);
    const img = await this._loadImage(imageUrl);
    const prefix = opts.prefix || '';
    for(const f of frames){
      const id = this._nextTileId();
      const name = (prefix? prefix : '') + (f.name || ('frame_'+id));
      // Metadaten für Export (HINWEIS: imageUrl kann blob: sein → im Export nicht portabel.
      // Für echte Builds bitte echte Pfade verwenden.)
      this.doc.tiles.push({
        id, name,
        atlasImage: imageUrl,
        imageName: opts.imageName || '',
        frameName: f.name || '',
        frame: { x:f.x|0, y:f.y|0, w:f.w|0, h:f.h|0 }
      });
      const rect = { x:f.x|0, y:f.y|0, w:f.w|0, h:f.h|0 };
      const tile = new Tile(id, name, img, rect, {kind:'atlas', src:imageUrl, imageName:opts.imageName||'', frameName:f.name||''});
      this.tilesById.set(id, tile);
      if(this.state.tileSel===-1) this.state.tileSel=id;
    }
    this._rebuildPalette();
  }

  // ————————————————————————————————————————————————
  // Hilfsloader für HTMLImage
  // ————————————————————————————————————————————————
  _loadImage(src){
    return new Promise((resolve,reject)=>{
      const img=new Image(); img.crossOrigin='anonymous';
      img.onload=()=> resolve(img);
      img.onerror=()=> reject(new Error('Bild konnte nicht geladen werden: '+src));
      img.src=src;
    });
  }
  _nextTileId(){
    return this.doc.tiles.length? Math.max(...this.doc.tiles.map(t=>t.id))+1 : 0;
  }

  _rebuildPalette(){
    const row=this.ui.tileRow; row.innerHTML='';
    for(const meta of this.doc.tiles){
      const t = this.tilesById.get(meta.id);
      const imgEl=document.createElement('img');
      imgEl.className='tile'+(meta.id===this.state.tileSel?' sel':''); imgEl.dataset.id=String(meta.id);
      imgEl.title=`${meta.name} (#${meta.id})`;
      // Für Atlas‑Frames können wir kein Teilbild direkt als <img> zeigen; zeigen das Gesamtbild:
      imgEl.src = (t?.img?.src || meta.src || meta.atlasImage || '');
      row.appendChild(imgEl);
    }
  }

  _rebuildLayerUI(){
    const sel=this.ui.layerSel; sel.innerHTML='';
    this.doc.layers.forEach((L,i)=>{ const o=document.createElement('option'); o.value=String(i); o.textContent=`${i}: ${L.name}`; sel.appendChild(o); });
    this.state.layer=clamp(this.state.layer,0,this.doc.layers.length-1); sel.selectedIndex=this.state.layer;
    this._updateStatus();
  }
  _rebuildEntityList(){
    const box=this.ui.entList; box.innerHTML='';
    if(!this.doc.entities.length){ box.innerHTML='<p style="color:#9fb0c0">Keine Entities.</p>'; return; }
    for(const e of this.doc.entities){
      const row=document.createElement('div'); row.className='row'; row.dataset.id=e.id;
      row.innerHTML=`<button>${e.name||e.type} (${e.x},${e.y})</button><button class="del" title="Löschen">✕</button>`;
      box.appendChild(row);
    }
  }
  _rebuildTriggerList(){
    const box=this.ui.trigList; box.innerHTML='';
    if(!this.doc.triggers.length){ box.innerHTML='<p style="color:#9fb0c0">Keine Trigger.</p>'; return; }
    for(const t of this.doc.triggers){
      const row=document.createElement('div'); row.className='row'; row.dataset.id=t.id;
      row.innerHTML=`<button>${t.name||t.id} (${t.x},${t.y} ${t.w}×${t.h})</button><button class="del" title="Löschen">✕</button>`;
      box.appendChild(row);
    }
  }

  // ————————————————————————————————————————————————
  // Rendering
  // ————————————————————————————————————————————————
  _resizeCanvas(){
    const rect=this.cv.getBoundingClientRect();
    this.cv.width=Math.max(2,rect.width*devicePixelRatio);
    this.cv.height=Math.max(2,rect.height*devicePixelRatio);
    this.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }
  _loop(){ requestAnimationFrame(()=>this._loop()); this._render(); }

  _render(){
    const ctx=this.ctx; ctx.save();
    ctx.clearRect(0,0,this.cv.width,this.cv.height);
    ctx.translate(this.scrollX*this.zoom, this.scrollY*this.zoom); ctx.scale(this.zoom,this.zoom);

    // Karte
    ctx.fillStyle='#0f141a'; ctx.fillRect(0,0,this.doc.w*this.doc.ts,this.doc.h*this.doc.ts);
    this._drawMap(ctx, this.state.grid, this.state.coll);

    // Entities/Trigger Overlays
    this._drawEntities(ctx,false);
    this._drawTriggers(ctx,false);

    // Cursor‑Kachel
    const {gx,gy}=this._mouse;
    if(gx>=0&&gy>=0&&gx<this.doc.w&&gy<this.doc.h){
      ctx.save(); ctx.strokeStyle='#5aa9ff'; ctx.lineWidth=2; ctx.strokeRect(gx*this.doc.ts+.5,gy*this.doc.ts+.5,this.doc.ts-1,this.doc.ts-1); ctx.restore();
    }

    ctx.restore();
    this._drawInspector();
  }

  // Zeichnet alle Layer; erkennt automatisch Atlas‑Frames.
  _drawMap(ctx, drawGridFlag, drawColl){
    const ts=this.doc.ts, W=this.doc.w, H=this.doc.h;
    for(const L of this.doc.layers){
      const G=L.tiles;
      for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
          const id=G[y][x]; if(id<0) continue;
          const t=this.tilesById.get(id);
          if(!t || !t.img?.complete) continue;
          const dx=x*ts, dy=y*ts;
          if(t.rect){
            const {x:sx,y:sy,w:sw,h:sh}=t.rect;
            ctx.drawImage(t.img, sx,sy,sw,sh, dx,dy, ts,ts);
          } else {
            ctx.drawImage(t.img, dx,dy, ts,ts);
          }
        }
      }
    }
    if(drawColl){
      for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(this.doc.collision[y][x]===COLL_BLOCK) hatch(ctx,x*ts,y*ts,ts,ts);
    }
    if(drawGridFlag) drawGrid(ctx,this.doc.w,this.doc.h,ts,'#2a313a');
  }

  _drawEntities(ctx, exporting){
    const ts=this.doc.ts;
    for(const e of this.doc.entities){
      const sel=(this.state.sel?.kind==='entity' && this.state.sel?.id===e.id);
      const x=e.x*ts, y=e.y*ts;
      ctx.save();
      ctx.globalAlpha = exporting? 1 : .95;
      ctx.fillStyle = sel? '#3bd1ff' : '#2a9df4';
      ctx.strokeStyle = sel? '#ffffff' : '#0b2a45';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x+ts/2,y+ts/2, Math.max(6,ts*0.2), 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffffff'; ctx.font='12px system-ui'; ctx.textAlign='center';
      ctx.fillText((e.name||e.type), x+ts/2, y+ts-4);
      ctx.restore();
    }
  }
  _drawTriggers(ctx, exporting){
    const ts=this.doc.ts;
    for(const t of this.doc.triggers){
      const sel=(this.state.sel?.kind==='trigger' && this.state.sel?.id===t.id);
      const x=t.x*ts, y=t.y*ts, w=t.w*ts, h=t.h*ts;
      ctx.save();
      ctx.globalAlpha = exporting? 0.25 : 0.25;
      ctx.fillStyle = sel? '#ffe08a' : '#ffd166';
      ctx.fillRect(x,y,w,h);
      ctx.globalAlpha = exporting? 0.8 : 0.8;
      ctx.strokeStyle = sel? '#ffffff' : '#caa64a'; ctx.lineWidth=2;
      ctx.strokeRect(x+.5,y+.5,w-1,h-1);
      ctx.fillStyle='#000'; ctx.globalAlpha=0.8;
      ctx.fillRect(x+4,y+4, Math.min(160,w-8), 18);
      ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.font='12px system-ui';
      ctx.fillText((t.name||t.id), x+8, y+18);
      ctx.restore();
    }
  }

  // ————————————————————————————————————————————————
  // Maus & Tools (Tiles / Entities / Trigger)
  // ————————————————————————————————————————————————
  _toGrid(ev){
    const rect=this.cv.getBoundingClientRect();
    const x=(ev.clientX-rect.left)/devicePixelRatio, y=(ev.clientY-rect.top)/devicePixelRatio;
    const sx=(x/this.zoom)-this.scrollX, sy=(y/this.zoom)-this.scrollY;
    const ts=this.doc.ts; const gx=Math.floor(sx/ts), gy=Math.floor(sy/ts);
    return {x,sx,y,sy,gx,gy};
  }
  _onMouse(ev){
    const g=this._toGrid(ev);
    this._mouse.x=g.sx; this._mouse.y=g.sy; this._mouse.gx=g.gx; this._mouse.gy=g.gy;
    this._updateStatus();
    if(this._mouse.down) this._applyToolMove(g, ev);
  }
  _onDown(ev){
    this._mouse.down=true; const g=this._toGrid(ev);
    if(this.state.mode==='tiles'){ this._applyTileTool(g, ev, true); return; }
    if(this.state.mode==='entities'){ this._entityDown(g, ev); return; }
    if(this.state.mode==='triggers'){ this._triggerDown(g, ev); return; }
  }
  _onUp(_ev){
    this._mouse.down=false; this.state.dragging=false;
    if(this.state.mode==='tiles' && this.state.tool==='rect' && this.state.rectStart){
      const a=this.state.rectStart, b={gx:this._mouse.gx, gy:this._mouse.gy};
      const layer=this.doc.layers[this.state.layer]; const id=this.state.tileSel; if(id>=0){
        const x1=Math.min(a.gx,b.gx), x2=Math.max(a.gx,b.gx), y1=Math.min(a.gy,b.gy), y2=Math.max(a.gy,b.gy);
        for(let y=y1;y<=y2;y++) for(let x=x1;x<=x2;x++) if(x>=0&&y>=0&&x<this.doc.w&&y<this.doc.h) layer.tiles[y][x]=id;
      }
      this.state.rectStart=null;
    }
    if(this.state.mode==='triggers' && this.state.creatingTrigger && this.state.rectStart){
      const a=this.state.rectStart, b={gx:this._mouse.gx, gy:this._mouse.gy};
      const x1=Math.max(0,Math.min(a.gx,b.gx)), y1=Math.max(0,Math.min(a.gy,b.gy));
      const x2=Math.min(this.doc.w-1,Math.max(a.gx,b.gx)), y2=Math.min(this.doc.h-1,Math.max(a.gy,b.gy));
      const t={ id:uid('t'), name:this.state.creatingTrigger.name, x:x1, y:y1, w:Math.max(1,x2-x1+1), h:Math.max(1,y2-y1+1), props:{} };
      this.doc.triggers.push(t);
      this.state.sel={kind:'trigger', id:t.id}; this.state.creatingTrigger=null; this.state.rectStart=null;
      this._rebuildTriggerList(); this._syncPropBox();
    }
  }

  _applyToolMove(g, ev){
    if(this.state.mode==='tiles'){ this._applyTileTool(g, ev, false); }
    else if(this.state.mode==='entities'){ this._entityMove(g, ev); }
    else if(this.state.mode==='triggers'){ this._triggerMove(g, ev); }
  }

  _applyTileTool({gx,gy}, ev, first=false){
    const W=this.doc.w,H=this.doc.h; if(gx<0||gy<0||gx>=W||gy>=H) return;
    const layer=this.doc.layers[this.state.layer]; const brush=this.state.brush|0;
    const each=(fn)=>{ const r=(brush-1)>>1; for(let y=gy-r;y<=gy+r;y++) for(let x=gx-r;x<=gx+r;x++){ if(x<0||y<0||x>=W||y>=H) continue; fn(x,y);} };
    if(ev.altKey){ each((x,y)=> this.doc.collision[y][x]=(this.doc.collision[y][x]===COLL_BLOCK?COLL_NONE:COLL_BLOCK)); return; }
    switch(this.state.tool){
      case 'pick': { const id=layer.tiles[gy][gx]; if(id>=0){ this.state.tileSel=id; this._highlightTile(id); } } break;
      case 'erase': { each((x,y)=> layer.tiles[y][x]=-1); } break;
      case 'paint': { const id=this.state.tileSel; if(id<0) return; each((x,y)=> layer.tiles[y][x]=id); } break;
      case 'rect': { if(first) this.state.rectStart={gx,gy}; /* final bei mouseup */ } break;
      case 'fill': {
        const id=this.state.tileSel; if(id<0) return; const target=layer.tiles[gy][gx]; if(target===id) return;
        const q=[[gx,gy]], seen=new Set(); const key=(x,y)=>x+'|'+y;
        while(q.length){ const [x,y]=q.pop(); const k=key(x,y); if(seen.has(k)) continue; seen.add(k);
          if(x<0||y<0||x>=W||y>=H) continue; if(layer.tiles[y][x]!==target) continue; layer.tiles[y][x]=id;
          q.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
        }
      } break;
    }
  }

  _entityAt(gx,gy){
    return this.doc.entities.findLast(e=> e.x===gx && e.y===gy ); // topmost
  }
  _entityDown({gx,gy}, ev){
    const hit=this._entityAt(gx,gy);
    if(this.state.tool==='erase'){ if(hit){ this.doc.entities=this.doc.entities.filter(e=>e!==hit); if(this.state.sel?.id===hit.id) this.state.sel=null; this._rebuildEntityList(); this._syncPropBox(); } return; }
    if(this.state.tool==='pick'){ if(hit){ this.state.sel={kind:'entity', id:hit.id}; this._syncPropBox(); } return; }
    if(this.state.tool==='move'){
      if(hit){ this.state.sel={kind:'entity', id:hit.id}; this.state.dragging=true; this.state.dragOff={x:gx-hit.x,y:gy-hit.y}; this._syncPropBox(); }
      else { if(this.state.sel?.kind==='entity'){ const e=this._getSelEntity(); if(e){ e.x=gx; e.y=gy; this._rebuildEntityList(); this._syncPropBox(); } } }
    }
  }
  _entityMove({gx,gy}, _ev){
    if(!this.state.dragging) return;
    const e=this._getSelEntity(); if(!e) return;
    e.x=clamp(gx-this.state.dragOff.x,0,this.doc.w-1);
    e.y=clamp(gy-this.state.dragOff.y,0,this.doc.h-1);
    this._rebuildEntityList();
    this._syncPropBox();
  }

  _triggerHit(gx,gy){
    return this.doc.triggers.findLast(t=> gx>=t.x && gx<t.x+t.w && gy>=t.y && gy<t.y+t.h);
  }
  _triggerDown({gx,gy}, _ev){
    if(this.state.tool==='rect'){ this.state.rectStart={gx,gy}; return; }
    if(this.state.tool==='pick'){ const t=this._triggerHit(gx,gy); if(t){ this.state.sel={kind:'trigger', id:t.id}; this._syncPropBox(); } return; }
    if(this.state.tool==='erase'){ const t=this._triggerHit(gx,gy); if(t){ this.doc.triggers=this.doc.triggers.filter(x=>x!==t); if(this.state.sel?.id===t.id) this.state.sel=null; this._rebuildTriggerList(); this._syncPropBox(); } return; }
    if(this.state.tool==='move'){
      const t=this._triggerHit(gx,gy);
      if(t){ this.state.sel={kind:'trigger', id:t.id}; this.state.dragging=true; this.state.dragOff={x:gx-t.x,y:gy-t.y}; this._syncPropBox(); }
      else this.state.sel=null;
    }
  }
  _triggerMove({gx,gy}, _ev){
    if(!this.state.dragging) return;
    const t=this._getSelTrigger(); if(!t) return;
    t.x=clamp(gx-this.state.dragOff.x,0,this.doc.w-1);
    t.y=clamp(gy-this.state.dragOff.y,0,this.doc.h-1);
    t.w=clamp(t.w,1,this.doc.w-t.x); t.h=clamp(t.h,1,this.doc.h-t.y);
    this._rebuildTriggerList(); this._syncPropBox();
  }

  _deleteSelection(){
    if(!this.state.sel) return;
    if(this.state.sel.kind==='entity'){ this.doc.entities=this.doc.entities.filter(e=>e.id!==this.state.sel.id); }
    if(this.state.sel.kind==='trigger'){ this.doc.triggers=this.doc.triggers.filter(t=>t.id!==this.state.sel.id); }
    this.state.sel=null; this._rebuildEntityList(); this._rebuildTriggerList(); this._syncPropBox();
  }

  _getSelEntity(){ return this.doc.entities.find(e=>e.id===this.state.sel?.id); }
  _getSelTrigger(){ return this.doc.triggers.find(t=>t.id===this.state.sel?.id); }

  // ————————————————————————————————————————————————
  // Inspector/Status/Props
  // ————————————————————————————————————————————————
  _drawInspector(){
    if(!this.inspector) return;
    const {gx,gy}=this._mouse;
    let sel='(keine)';
    if(this.state.sel?.kind==='entity'){ const e=this._getSelEntity(); if(e) sel=`Entity ${e.name||e.type} @ ${e.x},${e.y}`; }
    if(this.state.sel?.kind==='trigger'){ const t=this._getSelTrigger(); if(t) sel=`Trigger ${t.name} @ ${t.x},${t.y} ${t.w}×${t.h}`; }
    const lines=[
      `mode:${this.state.mode} tool:${this.state.tool} zoom:${this.zoom.toFixed(2)}`,
      `scroll:${this.scrollX|0},${this.scrollY|0} mouse:${gx},${gy}`,
      `layer:${this.state.layer} (${this.doc.layers[this.state.layer]?.name})`,
      `sel:${sel}`
    ];
    this.inspector.textContent=lines.join('\n');
  }
  _updateStatus(msg){
    if(this.status?.msg && msg) this.status.msg.textContent=msg;
    if(this.status?.xy){ const {gx,gy}=this._mouse; this.status.xy.textContent=`XY ${gx},${gy}`; }
    if(this.status?.sel){ this.status.sel.textContent = this.state.sel? `${this.state.sel.kind}#${this.state.sel.id}` : 'Auswahl –'; }
    if(this.status?.layer){ const L=this.doc.layers[this.state.layer]; this.status.layer.textContent=`Layer ${this.state.layer}:${L?.name}`; }
  }
  _syncPropBox(){
    const box=this.ui.propBox; box.innerHTML='';
    if(!this.state.sel){ box.innerHTML='<p style="color:#9fb0c0">Nichts selektiert.</p>'; return; }
    if(this.state.sel.kind==='entity'){
      const e=this._getSelEntity(); if(!e){ box.innerHTML='<p>Fehler: Entity weg.</p>'; return; }
      box.appendChild(this._kvField('Typ','text',e.type,v=>{e.type=v; this._rebuildEntityList();}));
      box.appendChild(this._kvField('Name','text',e.name||'',v=>{e.name=v; this._rebuildEntityList();}));
      box.appendChild(this._kvField('X','number',e.x,v=>{e.x=+v|0; this._rebuildEntityList();}));
      box.appendChild(this._kvField('Y','number',e.y,v=>{e.y=+v|0; this._rebuildEntityList();}));
      box.appendChild(this._kvField('Rotation','number',e.rot||0,v=>{e.rot=+v|0;}));
    }
    if(this.state.sel.kind==='trigger'){
      const t=this._getSelTrigger(); if(!t){ box.innerHTML='<p>Fehler: Trigger weg.</p>'; return; }
      box.appendChild(this._kvField('Name','text',t.name||'',v=>{t.name=v; this._rebuildTriggerList();}));
      box.appendChild(this._kvField('X','number',t.x,v=>{t.x=+v|0; this._rebuildTriggerList();}));
      box.appendChild(this._kvField('Y','number',t.y,v=>{t.y=+v|0; this._rebuildTriggerList();}));
      box.appendChild(this._kvField('Breite','number',t.w,v=>{t.w=Math.max(1,+v|0); this._rebuildTriggerList();}));
      box.appendChild(this._kvField('Höhe','number',t.h,v=>{t.h=Math.max(1,+v|0); this._rebuildTriggerList();}));
    }
  }
  _kvField(label,type,value,onchange){
    const wrap=document.createElement('div'); wrap.style.margin='6px 0';
    const lab=document.createElement('label'); lab.textContent=label; wrap.appendChild(lab);
    const inp=document.createElement('input'); inp.type=type; inp.value=value; inp.style.width='100%';
    inp.oninput=()=> onchange(inp.value);
    wrap.appendChild(inp);
    return wrap;
  }
  _highlightTile(id){
    const node=this.ui.tileRow.querySelector(`.tile[data-id="${id}"]`);
    if(!node) return;
    [...this.ui.tileRow.querySelectorAll('.tile')].forEach(t=>t.classList.remove('sel'));
    node.classList.add('sel');
  }
}

// ————————————————————————————————————————————————
// Exports
// ————————————————————————————————————————————————
export { LevelEditor };
