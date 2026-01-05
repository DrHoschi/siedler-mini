/**
 * inspector.tab.spritetest-v1.js
 * v26.01.05-spritetest-stable
 *
 * Ziel:
 * - SpriteTest-Tab darf NIE den Inspector crashen.
 * - Preview-Fenster skalierbar (vertikal resizable) + Canvas immer zentriert.
 * - Plan/Trail bleibt im Bild (Auto-Fit auf Preview-Viewport).
 *
 * WICHTIG:
 * - Dieses File registriert den Tab via window.registerInspectorTab('spritetest', ...)
 * - Es nutzt nur die vorhandene Inspector-API (window.__INSPECTOR_API__ / window.__ASSET__ optional)
 * - Falls Assets/Atlanten noch nicht geladen sind, zeigt es Hinweise statt zu crashen.
 */

(()=>{
  'use strict';

  // ------------------------------[A] Guards---------------------------------
  if(typeof window.registerInspectorTab !== 'function'){
    console.warn('[spritetest] registerInspectorTab fehlt – Tab wird nicht registriert.');
    return;
  }

  // ------------------------------[B] Utils----------------------------------
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=> (typeof performance!=='undefined' && performance.now)? performance.now(): Date.now();

  function el(tag, attrs={}, children=[]){
    const e=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{})){
      if(k==='class') e.className=v;
      else if(k==='style' && v && typeof v==='object') Object.assign(e.style,v);
      else if(k.startsWith('on') && typeof v==='function') e.addEventListener(k.slice(2), v);
      else if(v!==undefined && v!==null) e.setAttribute(k, String(v));
    }
    for(const c of (Array.isArray(children)?children:[children])){
      if(c===null||c===undefined) continue;
      e.appendChild(typeof c==='string'? document.createTextNode(c): c);
    }
    return e;
  }

  function safeText(s){
    return (s==null)? '' : String(s);
  }

  function tryGetInspectorAPI(){
    return window.__INSPECTOR_API__ || window.__INSPECTOR__ || null;
  }

  function tryGetAsset(){
    // Wir unterstützen mehrere Varianten, weil dein Projekt öfter umgebaut wurde.
    return window.__ASSET__ || window.Asset || window.asset || null;
  }

  function getAtlasIndex(){
    // Erwartete Struktur in deinem Projekt: Asset.atlases oder Asset.atlasIndex
    const A = tryGetAsset();
    if(!A) return null;
    if(A.atlases && typeof A.atlases==='object') return A.atlases;
    if(A.atlasIndex && typeof A.atlasIndex==='object') return A.atlasIndex;
    if(A._atlases && typeof A._atlases==='object') return A._atlases;
    return null;
  }

  function listAtlasKeys(){
    const idx=getAtlasIndex();
    if(!idx) return [];
    return Object.keys(idx).sort((a,b)=>a.localeCompare(b));
  }

  function getAtlasByKey(key){
    const idx=getAtlasIndex();
    if(!idx) return null;
    return idx[key] || null;
  }

  function listFrameKeys(atlas){
    // Atlas-Formate:
    // - {frames:{name:{frame:{x,y,w,h}, pivot?, ...}, ...}}
    // - {frames:[{filename:'x', frame:{...}}, ...]}
    if(!atlas) return [];
    if(atlas.frames && !Array.isArray(atlas.frames)) return Object.keys(atlas.frames);
    if(Array.isArray(atlas.frames)) return atlas.frames.map(f=>f.filename||f.name).filter(Boolean);
    return [];
  }

  function getFrame(atlas, frameKey){
    if(!atlas || !frameKey) return null;
    if(atlas.frames && !Array.isArray(atlas.frames)) return atlas.frames[frameKey] || null;
    if(Array.isArray(atlas.frames)){
      return atlas.frames.find(f => (f.filename||f.name)===frameKey) || null;
    }
    return null;
  }

  function getFrameRect(frameObj){
    if(!frameObj) return null;
    // texturepacker style: frame:{x,y,w,h}
    if(frameObj.frame && typeof frameObj.frame==='object') return frameObj.frame;
    // sometimes direct x,y,w,h
    if(['x','y','w','h'].every(k=>k in frameObj)) return {x:frameObj.x,y:frameObj.y,w:frameObj.w,h:frameObj.h};
    return null;
  }

  function getFramePivot(frameObj){
    // Dein Projekt hatte unterschiedliche Pivot-Definitionen.
    // Wir unterstützen:
    // - pivot:{x,y} in Pixel
    // - meta.pivot
    if(!frameObj) return null;
    if(frameObj.pivot && typeof frameObj.pivot==='object') return frameObj.pivot;
    if(frameObj.spriteSourceSize && typeof frameObj.spriteSourceSize==='object'){
      // Fallback: Pivot mittig unten (typisch isometrisch)
      const w = frameObj.sourceSize?.w ?? frameObj.frame?.w ?? 0;
      const h = frameObj.sourceSize?.h ?? frameObj.frame?.h ?? 0;
      return {x: w*0.5, y: h*0.85};
    }
    return null;
  }

  // ---------------------------[C] Direction Map------------------------------
  // Wir bleiben bei der Reihenfolge, die du als Master genannt hast:
  // N -> NE -> E -> SE -> S -> SW -> W -> NW
  const DIRS = [
    {id:'N',  vx: 0, vy:-1},
    {id:'NE', vx: 1, vy:-1},
    {id:'E',  vx: 1, vy: 0},
    {id:'SE', vx: 1, vy: 1},
    {id:'S',  vx: 0, vy: 1},
    {id:'SW', vx:-1, vy: 1},
    {id:'W',  vx:-1,vy: 0},
    {id:'NW', vx:-1,vy:-1},
  ];

  function vecToDirIndex(dx,dy){
    // dx,dy in screen-space. Grobe Quantisierung.
    if(dx===0 && dy===0) return 0;
    const a = Math.atan2(dy, dx); // -pi..pi
    // Map auf 8 Sektoren (E=0)
    let idx = Math.round(a / (Math.PI/4));
    // idx: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE
    idx = (idx%8+8)%8;
    // Wir wollen 0=N...
    const map = {6:0,7:1,0:2,1:3,2:4,3:5,4:6,5:7};
    return map[idx] ?? 0;
  }

  // ------------------------------[D] UI CSS---------------------------------
  const CSS_ID='spritetest-css-v26_01_05';
  function injectCSS(){
    if(document.getElementById(CSS_ID)) return;
    const css = `
      .spritetest-wrap{padding:10px; display:flex; flex-direction:column; gap:10px;}
      .spritetest-row{display:flex; gap:10px; flex-wrap:wrap; align-items:center;}
      .spritetest-row label{font-size:13px; opacity:.9;}
      .spritetest-row select,.spritetest-row input{font-size:14px; padding:6px 8px; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.06); color:#e9f2ff;}
      .spritetest-row input[type=range]{padding:0;}
      .spritetest-btn{padding:10px 14px; border-radius:14px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.08); color:#e9f2ff;}
      .spritetest-btn:active{transform:translateY(1px);}
      .spritetest-hint{font-size:12px; opacity:.8;}

      /* Preview-Viewport: vertikal skalierbar */
      .spritetest-preview{border:1px solid rgba(255,255,255,.12); border-radius:14px; overflow:hidden; background:rgba(0,0,0,.18);
        height:360px; min-height:220px; max-height:65vh; resize:vertical;}
      .spritetest-preview-inner{position:relative; width:100%; height:100%;}
      .spritetest-canvas{position:absolute; inset:0; width:100%; height:100%; display:block;}
      .spritetest-overlaybar{position:absolute; left:10px; top:10px; right:10px; display:flex; gap:10px; align-items:center; justify-content:space-between; pointer-events:none;}
      .spritetest-overlaybar .pill{pointer-events:none; font-size:12px; padding:4px 8px; border-radius:999px; background:rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.12);}
    `;
    const style=document.createElement('style');
    style.id=CSS_ID;
    style.textContent=css;
    document.head.appendChild(style);
  }

  // -----------------------------[E] Core State-------------------------------
  function makeState(){
    return {
      atlasKey:'',
      frameKey:'',
      prefix:'',
      mode:'single', // 'single' | '8dir'
      framesPerDir:8,
      tilesPerDir:2,
      speedPx:100,
      animFps:6,
      showGrid:true,
      showTrail:true,
      showPlan:true,
      showPivot:true,
      showBBox:true,
      planKind:'line', // line | rect | circle
      fixedDir:'AUTO', // AUTO|N|NE|...
      zoom:1.0,
    };
  }

  // -----------------------------[F] Renderer---------------------------------
  function createRenderer(canvas){
    const ctx = canvas.getContext('2d');
    const r = {
      canvas, ctx,
      w:0,h:0,
      device: window.devicePixelRatio || 1,
      fit(){
        const rect = canvas.getBoundingClientRect();
        const d = window.devicePixelRatio || 1;
        const w = Math.max(2, Math.floor(rect.width * d));
        const h = Math.max(2, Math.floor(rect.height * d));
        if(canvas.width!==w || canvas.height!==h){
          canvas.width=w; canvas.height=h;
        }
        r.w=w; r.h=h; r.device=d;
      },
      clear(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
      },
      grid(step=32){
        ctx.save();
        ctx.globalAlpha=0.20;
        for(let x=0;x<r.w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,r.h);ctx.stroke();}
        for(let y=0;y<r.h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.w,y);ctx.stroke();}
        ctx.restore();
      }
    };
    return r;
  }

  function drawSpriteFrame(r, img, rect, drawX, drawY, scale){
    if(!img || !rect) return;
    const ctx=r.ctx;
    const sx=rect.x, sy=rect.y, sw=rect.w, sh=rect.h;
    const dw=sw*scale, dh=sh*scale;
    ctx.drawImage(img, sx,sy,sw,sh, drawX,drawY, dw,dh);
  }

  function drawCross(r, x,y){
    const ctx=r.ctx;
    ctx.save();
    ctx.strokeStyle='rgba(255,80,80,.95)';
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-8,y); ctx.lineTo(x+8,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-8); ctx.lineTo(x,y+8); ctx.stroke();
    ctx.restore();
  }

  function drawBBox(r, x,y,w,h){
    const ctx=r.ctx;
    ctx.save();
    ctx.strokeStyle='rgba(80,170,255,.8)';
    ctx.lineWidth=2;
    ctx.strokeRect(x,y,w,h);
    ctx.restore();
  }

  // ---------------------------[G] Plan Generation----------------------------
  function buildPlanPoints(kind){
    const pts=[];
    if(kind==='rect'){
      const size=160;
      pts.push({x:-size,y:-size});
      pts.push({x:size,y:-size});
      pts.push({x:size,y:size});
      pts.push({x:-size,y:size});
      pts.push({x:-size,y:-size});
    } else if(kind==='circle'){
      const R=170;
      const steps=64;
      for(let i=0;i<=steps;i++){
        const t=(i/steps)*Math.PI*2;
        pts.push({x:Math.cos(t)*R, y:Math.sin(t)*R});
      }
    } else {
      // line
      pts.push({x:-220,y:0});
      pts.push({x:220,y:0});
    }
    return pts;
  }

  function fitPointsToViewport(points, vw, vh, margin){
    if(!points || points.length===0) return {scale:1, offX:vw/2, offY:vh/2};
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of points){
      if(p.x<minX) minX=p.x;
      if(p.y<minY) minY=p.y;
      if(p.x>maxX) maxX=p.x;
      if(p.y>maxY) maxY=p.y;
    }
    const w=Math.max(1, maxX-minX);
    const h=Math.max(1, maxY-minY);
    const s=Math.min((vw-2*margin)/w, (vh-2*margin)/h);
    const offX = (vw - (minX+maxX)*s)/2;
    const offY = (vh - (minY+maxY)*s)/2;
    return {scale:s, offX, offY};
  }

  // ---------------------------[H] Main Tab Mount-----------------------------
  window.registerInspectorTab('spritetest', function mountSpriteTest(section){
    injectCSS();

    // Defensive: section kann bei manchen Inspector-States null sein.
    if(!section){
      console.warn('[spritetest] mount ohne section');
      return;
    }

    const state = makeState();

    // Root UI
    const root = el('div',{class:'spritetest-wrap'});
    section.innerHTML='';
    section.appendChild(root);

    const atlasSel = el('select');
    const frameSel = el('select');
    const modeSel  = el('select',{},[
      el('option',{value:'single'},'Single (Preview)'),
      el('option',{value:'8dir'},'8 Dir (Anim)')
    ]);

    const planSel = el('select',{},[
      el('option',{value:'line'},'Linie'),
      el('option',{value:'rect'},'Viereck'),
      el('option',{value:'circle'},'Kreis')
    ]);

    const dirSel = el('select',{},[
      el('option',{value:'AUTO'},'AUTO (aus Pfad)')
    ].concat(DIRS.map(d=>el('option',{value:d.id},d.id))));

    const speed = el('input',{type:'range', min:'10', max:'260', value:String(state.speedPx)});
    const fps   = el('input',{type:'range', min:'1', max:'18', value:String(state.animFps)});
    const zoom  = el('input',{type:'range', min:'0.35', max:'2.0', step:'0.05', value:String(state.zoom)});

    const speedVal = el('div',{class:'spritetest-hint'}, `${state.speedPx} px/s`);
    const fpsVal   = el('div',{class:'spritetest-hint'}, `${state.animFps} fps`);
    const zoomVal  = el('div',{class:'spritetest-hint'}, `Zoom ${state.zoom.toFixed(2)}x`);

    const chkPivot = el('input',{type:'checkbox', checked:true});
    const chkBBox  = el('input',{type:'checkbox', checked:true});
    const chkTrail = el('input',{type:'checkbox', checked:true});
    const chkPlan  = el('input',{type:'checkbox', checked:true});
    const chkGrid  = el('input',{type:'checkbox', checked:true});

    const btnStart = el('button',{class:'spritetest-btn'},'Start Test');
    const btnStop  = el('button',{class:'spritetest-btn'},'Stop');
    const btnRefresh = el('button',{class:'spritetest-btn'},'↻ Refresh Atlases');

    const hint = el('div',{class:'spritetest-hint'});

    // Preview area
    const preview = el('div',{class:'spritetest-preview'});
    const previewInner = el('div',{class:'spritetest-preview-inner'});
    const canvas = el('canvas',{class:'spritetest-canvas'});
    previewInner.appendChild(canvas);
    preview.appendChild(previewInner);

    const overlay = el('div',{class:'spritetest-overlaybar'},[
      el('div',{class:'pill'},'Frame 0 = Idle'),
      el('div',{class:'pill', id:'spritetest-atlaslabel'},'')
    ]);
    previewInner.appendChild(overlay);

    // Layout
    root.appendChild(el('div',{class:'spritetest-row'},[
      el('label',{},'Atlas'), atlasSel,
      el('label',{},'Frame'), frameSel,
    ]));

    root.appendChild(el('div',{class:'spritetest-row'},[
      el('label',{},'Modus'), modeSel,
      el('label',{},'Pfad'), planSel,
      el('label',{},'Richtung'), dirSel,
    ]));

    root.appendChild(el('div',{class:'spritetest-row'},[
      el('label',{},'Speed'), speed,
      speedVal,
      el('label',{style:{marginLeft:'8px'}},'Anim FPS'), fps,
      fpsVal,
    ]));

    root.appendChild(el('div',{class:'spritetest-row'},[
      el('label',{},'Zoom'), zoom, zoomVal,
      btnStart, btnStop,
    ]));

    root.appendChild(el('div',{class:'spritetest-row'},[
      el('label',{},[chkPivot,' Pivot ']),
      el('label',{},[chkBBox,' BBox ']),
      el('label',{},[chkTrail,' Trail ']),
      el('label',{},[chkPlan,' Plan ']),
      el('label',{},[chkGrid,' Grid ']),
      btnRefresh,
    ]));

    root.appendChild(hint);
    root.appendChild(preview);

    const r = createRenderer(canvas);

    // ------------------------ Data Binding / Populate -----------------------
    function populateAtlases(){
      const keys = listAtlasKeys();
      atlasSel.innerHTML='';
      atlasSel.appendChild(el('option',{value:''}, keys.length? '— wählen —' : '— keine Atlanten —'));
      for(const k of keys){
        atlasSel.appendChild(el('option',{value:k}, k));
      }
      if(!state.atlasKey && keys.length){
        state.atlasKey = keys[0];
      }
      atlasSel.value = state.atlasKey || '';
      populateFrames();
    }

    function populateFrames(){
      const atlas = getAtlasByKey(state.atlasKey);
      const keys = listFrameKeys(atlas).sort((a,b)=>a.localeCompare(b));
      frameSel.innerHTML='';
      frameSel.appendChild(el('option',{value:''}, keys.length? '— wählen —' : '— keine Frames —'));
      for(const k of keys){
        frameSel.appendChild(el('option',{value:k}, k));
      }
      if(!state.frameKey && keys.length){
        state.frameKey = keys[0];
      }
      frameSel.value = state.frameKey || '';
      updateAtlasLabel();
    }

    function updateAtlasLabel(){
      const label = document.getElementById('spritetest-atlaslabel');
      if(label) label.textContent = state.atlasKey? `${state.atlasKey}` : 'Atlas: —';
    }

    // ------------------------------- Animation ------------------------------
    let running=false;
    let lastT=0;
    let tAccum=0;
    let animFrame=0;
    let posT=0;

    function stop(){ running=false; }

    function start(){
      if(!state.atlasKey || !state.frameKey){
        hint.textContent='✖ Bitte Atlas und Frame auswählen.';
        return;
      }
      hint.textContent='';
      running=true;
      lastT=now();
      tAccum=0;
      animFrame=0;
      posT=0;
      requestAnimationFrame(tick);
    }

    function tick(){
      if(!running) return;
      const t=now();
      const dt=Math.min(0.05, (t-lastT)/1000);
      lastT=t;

      // anim
      tAccum += dt;
      const frameStep = 1 / clamp(state.animFps,1,60);
      while(tAccum>=frameStep){
        tAccum -= frameStep;
        animFrame = (animFrame+1) % Math.max(1,state.framesPerDir);
      }

      // move along plan
      posT += dt * (state.speedPx/100);

      render();
      requestAnimationFrame(tick);
    }

    // ------------------------------- Render ---------------------------------
    function render(){
      // Niemals crashen.
      try{
        r.fit();
        const ctx=r.ctx;
        ctx.save();
        ctx.clearRect(0,0,r.w,r.h);

        if(chkGrid.checked) {
          ctx.strokeStyle='rgba(255,255,255,.12)';
          r.grid(32 * r.device);
        }

        const atlas = getAtlasByKey(state.atlasKey);
        if(!atlas){
          ctx.restore();
          hint.textContent = '✖ Keine Atlanten gefunden. (Sind Assets geladen?)';
          return;
        }

        const img = atlas.__image || atlas.image || atlas._image || null;
        // Dein Asset-Layer kann img in atlas.meta.imageKey o.ä. halten.
        // Wir versuchen zusätzlich: Asset.getImage(key)
        let imgObj = img;
        if(!imgObj){
          const A = tryGetAsset();
          const imageKey = atlas.meta?.image || atlas.meta?.imageKey || null;
          if(A && imageKey && typeof A.getImage==='function') imgObj = A.getImage(imageKey);
        }

        const frameObj = getFrame(atlas, state.frameKey);
        const rect = getFrameRect(frameObj);
        if(!imgObj || !rect){
          ctx.restore();
          hint.textContent = '✖ Frame/PNG nicht verfügbar (Atlas geladen, aber Bild/Rect fehlt).';
          return;
        }

        // Plan in Viewport fitten
        const planPts = buildPlanPoints(state.planKind);
        const fit = fitPointsToViewport(planPts, r.w, r.h, 60*r.device);
        const planScale = fit.scale;
        const offX = fit.offX;
        const offY = fit.offY;

        // Aktuelle Position auf Plan
        let p = planPts[0];
        if(planPts.length>1){
          // Lerp über Segmente
          const totalSeg = planPts.length-1;
          const t = (posT % totalSeg);
          const i = Math.floor(t);
          const a = planPts[i];
          const b = planPts[i+1];
          const f = t - i;
          p = {x: a.x + (b.x-a.x)*f, y: a.y + (b.y-a.y)*f};
        }

        // Richtung aus Pfad ableiten oder fix
        let dirIdx = 0;
        if(state.fixedDir && state.fixedDir!=='AUTO'){
          dirIdx = DIRS.findIndex(d=>d.id===state.fixedDir);
          if(dirIdx<0) dirIdx = 0;
        } else if(planPts.length>1){
          // Tangente: nächster Punkt
          const totalSeg = planPts.length-1;
          const t = (posT % totalSeg);
          const i = Math.floor(t);
          const a = planPts[i];
          const b = planPts[i+1];
          dirIdx = vecToDirIndex((b.x-a.x), (b.y-a.y));
        }

        // Wir lassen "single" einfach denselben Frame nutzen.
        // Bei "8dir" nehmen wir an: frameKey ist der PREFIX für alle Frames.
        // => robust: wenn frameKey exakt existiert, nutzen wir es. Sonst versuchen wir prefix + dir + '_' + frame.
        let useFrameKey = state.frameKey;
        if(state.mode==='8dir'){
          // Heuristik: Wenn der FrameKey ein Prefix ist (endet mit '_' oder ohne Ziffern), bauen wir Key.
          const prefix = state.frameKey;
          // Muster: <prefix><dirIndex>_<frameIndex>
          // Du hast schon mehrere Varianten gehabt – wir bleiben minimal:
          // 1) prefix + DIR + '_' + frame
          // 2) prefix + dirIdx + '_' + frame
          // 3) prefix + '_' + dirIdx + '_' + frame
          const candidates = [
            `${prefix}${DIRS[dirIdx].id}_${animFrame}`,
            `${prefix}${dirIdx}_${animFrame}`,
            `${prefix}_${DIRS[dirIdx].id}_${animFrame}`,
            `${prefix}_${dirIdx}_${animFrame}`,
          ];
          const found = candidates.find(k=>!!getFrame(atlas,k));
          if(found) useFrameKey = found;
        }

        const fObj = getFrame(atlas, useFrameKey) || frameObj;
        const fRect = getFrameRect(fObj) || rect;
        const pivot = getFramePivot(fObj) || {x:fRect.w*0.5, y:fRect.h*0.85};

        // Sprite draw position: wir zeichnen so, dass Pivot am Planpunkt liegt.
        const scale = clamp(state.zoom, 0.2, 4.0);
        const drawX = offX + p.x*planScale - pivot.x*scale;
        const drawY = offY + p.y*planScale - pivot.y*scale;

        // Trail + Plan
        if(chkPlan.checked){
          ctx.save();
          ctx.strokeStyle='rgba(120,200,255,.55)';
          ctx.lineWidth=2;
          ctx.setLineDash([8,6]);
          ctx.beginPath();
          for(let i=0;i<planPts.length;i++){
            const px = offX + planPts[i].x*planScale;
            const py = offY + planPts[i].y*planScale;
            if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Sprite
        drawSpriteFrame(r, imgObj, fRect, drawX, drawY, scale);

        // BBox
        if(chkBBox.checked){
          drawBBox(r, drawX, drawY, fRect.w*scale, fRect.h*scale);
        }

        // Pivot
        if(chkPivot.checked){
          drawCross(r, offX + p.x*planScale, offY + p.y*planScale);
        }

        ctx.restore();
      } catch(e){
        running=false;
        const msg = (e && e.stack)? e.stack : String(e);
        section.innerHTML='';
        section.appendChild(el('div',{style:{padding:'12px', color:'#ff6b6b', whiteSpace:'pre-wrap'}},
          `[spritetest] Render crash:\n${msg}`
        ));
      }
    }

    // ------------------------------ Events ----------------------------------
    atlasSel.addEventListener('change', ()=>{
      state.atlasKey = atlasSel.value;
      state.frameKey = '';
      populateFrames();
      render();
    });

    frameSel.addEventListener('change', ()=>{
      state.frameKey = frameSel.value;
      render();
    });

    modeSel.addEventListener('change', ()=>{
      state.mode = modeSel.value;
      render();
    });

    planSel.addEventListener('change', ()=>{
      state.planKind = planSel.value;
      render();
    });

    dirSel.addEventListener('change', ()=>{
      state.fixedDir = dirSel.value;
      render();
    });

    speed.addEventListener('input', ()=>{
      state.speedPx = Number(speed.value||100);
      speedVal.textContent = `${state.speedPx} px/s`;
    });

    fps.addEventListener('input', ()=>{
      state.animFps = Number(fps.value||6);
      fpsVal.textContent = `${state.animFps} fps`;
    });

    zoom.addEventListener('input', ()=>{
      state.zoom = Number(zoom.value||1);
      zoomVal.textContent = `Zoom ${state.zoom.toFixed(2)}x`;
      render();
    });

    btnStart.addEventListener('click', start);
    btnStop.addEventListener('click', stop);
    btnRefresh.addEventListener('click', ()=>{
      // "Refresh" = Atlanten neu einlesen
      populateAtlases();
      render();
    });

    // Resize re-render (damit es bei "Resize: vertical" nicht rausläuft)
    const ro = new ResizeObserver(()=>{
      render();
    });
    ro.observe(preview);

    // Initial
    populateAtlases();
    render();

    // Debug log
    console.info('[spritetest] ready v26.01.05-spritetest-stable');
  });

})();
