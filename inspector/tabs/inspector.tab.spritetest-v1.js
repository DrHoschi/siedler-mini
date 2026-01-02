/* =========================================================================
 *  inspector/tab: SpriteTest
 *  Version: v26.01.07 (Picker + Marker + Path)
 *  Purpose:
 *   - Schnelltest für 8-Richtungs-Sprites (1024px / 8x8 => 128x128 Frames)
 *   - Zeigt zusätzlich Pivot/Anker (Crosshair), Bounding-Box, Fußlinie
 *  Notes:
 *   - Frame 0 = Idle (Regel)
 *   - Reihenfolge Richtungen: N, NE, E, SE, S, SW, W, NW
 * ========================================================================= */
(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Konstanten
  // -------------------------------------------------------------------------
  const TAB_ID   = 'SpriteTest';
  const TAB_NAME = 'SpriteTest';
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  // -------------------------------------------------------------------------
  // Helper: Inspector-Tab registrieren (kompatibel zu mehreren API-Varianten)
  // -------------------------------------------------------------------------
  function registerTab(def){
    const I = window.Inspector || window.inspector || null;
    if(!I) return false;

    // Häufige Varianten, die im Projekt vorkommen können:
    if(typeof I.registerTab === 'function'){ I.registerTab(def); return true; }
    if(typeof I.addTab      === 'function'){ I.addTab(def);      return true; }
    if(I.api && typeof I.api.registerTab === 'function'){ I.api.registerTab(def); return true; }
    if(I.api && typeof I.api.addTab === 'function'){ I.api.addTab(def); return true; }
    if(I.tabs && typeof I.tabs.register === 'function'){ I.tabs.register(def); return true; }

    return false;
  }

  // -------------------------------------------------------------------------
  // Helper: Frame-Meta aus Atlas (robust gegen unterschiedliche Loader-Strukturen)
  // -------------------------------------------------------------------------
  function getAtlasByName(name){
    const A = window.Assets || null;
    if(!A || !A.atlases) return null;
    return A.atlases[name] || null;
  }

  function isAtlasOk(atlas){
    if(!atlas) return false;
    // üblich: atlas.ok true wenn JSON+PNG geladen
    if(atlas.ok === true) return true;
    // Fallback: manche Loader setzen .image/.img
    if(atlas.image && atlas.image.complete) return true;
    if(atlas.img && atlas.img.complete) return true;
    return false;
  }

  function getFrameMeta(atlas, key){
    if(!atlas) return null;

    // häufige Stellen
    if(atlas.frames && atlas.frames[key]) return atlas.frames[key];
    if(atlas.data && atlas.data.frames && atlas.data.frames[key]) return atlas.data.frames[key];
    if(atlas.json && atlas.json.frames && atlas.json.frames[key]) return atlas.json.frames[key];
    if(atlas._json && atlas._json.frames && atlas._json.frames[key]) return atlas._json.frames[key];

    // manchmal ist frames ein Array – dann suchen
    if(Array.isArray(atlas.frames)){
      for(const f of atlas.frames){
        if(f && f.name === key) return f;
      }
    }
    return null;
  }

  // FrameName-Konvention (wie im Tool angezeigt)
  // Beispiel: deer_N_walk_0
  function buildFrameName(prefix, dir, idx){
    return `${prefix}${dir}_walk_${idx}`;
  }

  // -------------------------------------------------------------------------
  // Rendering Helpers (Canvas)
  // -------------------------------------------------------------------------
  function clearCanvas(ctx, w, h){
    ctx.clearRect(0,0,w,h);
    // leichter Grid-Hintergrund
    const step = 32;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    for(let x=0; x<=w; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for(let y=0; y<=h; y+=step){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawCrosshair(ctx, x, y){
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ff4040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x-10, y); ctx.lineTo(x+10, y);
    ctx.moveTo(x, y-10); ctx.lineTo(x, y+10);
    ctx.stroke();
    ctx.restore();
  }

  function drawBox(ctx, x, y, w, h){
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#40c0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function drawFootLine(ctx, y, w){
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // UI Render
  // -------------------------------------------------------------------------
  
  function renderUI(root){
    const A = window.Assets || null;

    // ---------------------------------------------------------------
    // Basis-Layout
    // ---------------------------------------------------------------
    root.innerHTML = '';
    root.style.padding = '8px';
    root.style.color = '#fff';
    root.style.fontFamily = 'monospace';

    const row = (label, el)=>{
      const wrap = document.createElement('div');
      wrap.style.margin = '6px 0';
      const l = document.createElement('div');
      l.textContent = label;
      l.style.opacity = '0.85';
      l.style.marginBottom = '4px';
      wrap.appendChild(l);
      wrap.appendChild(el);
      root.appendChild(wrap);
      return wrap;
    };

    const mkBtn = (txt)=>{
      const b = document.createElement('button');
      b.textContent = txt;
      b.style.padding = '8px';
      b.style.borderRadius = '999px';
      b.style.flex = '1';
      return b;
    };

    function mkCheck(label, checked=true){
      const w = document.createElement('label');
      w.style.display='flex';
      w.style.alignItems='center';
      w.style.gap='6px';
      w.style.userSelect='none';
      const c = document.createElement('input');
      c.type='checkbox';
      c.checked=checked;
      const t = document.createElement('span');
      t.textContent=label;
      w.appendChild(c); w.appendChild(t);
      return {wrap:w, box:c};
    }

    // ---------------------------------------------------------------
    // Controls: Mode
    // ---------------------------------------------------------------
    const modeSel = document.createElement('select');
    modeSel.style.width = '100%';
    modeSel.style.padding = '6px';
    modeSel.style.borderRadius = '8px';
    modeSel.innerHTML = `
      <option value="anim8">Unit/Animal Test (8-dir walk)</option>
      <option value="frame">Frame Viewer + Marker</option>
    `;

    // ---------------------------------------------------------------
    // Controls: Atlas + Frame Picker (für Unit-Test UND Viewer)
    // ---------------------------------------------------------------
    const atlasSel = document.createElement('select');
    atlasSel.style.width = '100%';
    atlasSel.style.padding = '6px';
    atlasSel.style.borderRadius = '8px';

    const atlasNames = (A && A.atlases) ? Object.keys(A.atlases) : [];
    atlasNames.sort();
    for(const name of atlasNames){
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      atlasSel.appendChild(opt);
    }

    // Frame Filter + Frame Select
    const frameFilter = document.createElement('input');
    frameFilter.type = 'text';
    frameFilter.placeholder = 'Frame-Filter (z.B. deer_ oder b.hunter)';
    frameFilter.style.width = '100%';
    frameFilter.style.padding = '6px';
    frameFilter.style.borderRadius = '8px';

    const frameSel = document.createElement('select');
    frameSel.style.width = '100%';
    frameSel.style.padding = '6px';
    frameSel.style.borderRadius = '8px';
    frameSel.size = 6;

    // Optional: Images (nicht-Atlas) anzeigen (falls du reine PNGs testest)
    const imgSel = document.createElement('select');
    imgSel.style.width = '100%';
    imgSel.style.padding = '6px';
    imgSel.style.borderRadius = '8px';
    imgSel.size = 6;

    // ---------------------------------------------------------------
    // Controls: Anim-Parameter (8-dir)
    // ---------------------------------------------------------------
    const prefixIn = document.createElement('input');
    prefixIn.type = 'text';
    prefixIn.value = 'deer_';
    prefixIn.placeholder = 'Prefix (z.B. deer_)';
    prefixIn.style.width = '100%';
    prefixIn.style.padding = '6px';
    prefixIn.style.borderRadius = '8px';

    const framesIn = document.createElement('input');
    framesIn.type = 'number';
    framesIn.min = '1';
    framesIn.max = '16';
    framesIn.value = '8';
    framesIn.style.width = '100%';
    framesIn.style.padding = '6px';
    framesIn.style.borderRadius = '8px';

    const tilesIn = document.createElement('input');
    tilesIn.type = 'number';
    tilesIn.min = '1';
    tilesIn.max = '20';
    tilesIn.value = '5';
    tilesIn.style.width = '100%';
    tilesIn.style.padding = '6px';
    tilesIn.style.borderRadius = '8px';

    // Speed (ms)
    const speedIn = document.createElement('input');
    speedIn.type = 'number';
    speedIn.min = '30';
    speedIn.max = '5000';
    speedIn.value = '180';
    speedIn.style.width = '100%';
    speedIn.style.padding = '6px';
    speedIn.style.borderRadius = '8px';

    // ---------------------------------------------------------------
    // Visual toggles
    // ---------------------------------------------------------------
    const toggles = document.createElement('div');
    toggles.style.display = 'flex';
    toggles.style.gap = '10px';
    toggles.style.flexWrap = 'wrap';

    const chkPivot = mkCheck('Pivot', true);
    const chkBox   = mkCheck('BBox', true);
    const chkFoot  = mkCheck('Fußlinie', true);
    const chkPlan  = mkCheck('Soll-Pfad', true);
    const chkTrailLine  = mkCheck('Trail Linie', true);
    const chkTrailDots  = mkCheck('Trail Punkte', false);

    [chkPivot,chkBox,chkFoot,chkPlan,chkTrailLine,chkTrailDots].forEach(x=>toggles.appendChild(x.wrap));

    // ---------------------------------------------------------------
    // Marker controls (Viewer)
    // ---------------------------------------------------------------
    const markerRow = document.createElement('div');
    markerRow.style.display = 'flex';
    markerRow.style.gap = '10px';
    markerRow.style.flexWrap = 'wrap';

    const markerSel = document.createElement('select');
    markerSel.style.padding='6px';
    markerSel.style.borderRadius='8px';
    markerSel.innerHTML = `
      <option value="entrance">Marker: Eingang</option>
      <option value="chimney">Marker: Schornstein</option>
      <option value="hand">Marker: Hand/Tool</option>
      <option value="carry">Marker: Carry/Load</option>
      <option value="none">Marker: (aus)</option>
    `;

    const btnClearMarker = document.createElement('button');
    btnClearMarker.textContent = 'Marker löschen';
    btnClearMarker.style.padding='6px';
    btnClearMarker.style.borderRadius='999px';

    const btnExport = document.createElement('button');
    btnExport.textContent = 'Export JSON';
    btnExport.style.padding='6px';
    btnExport.style.borderRadius='999px';

    markerRow.appendChild(markerSel);
    markerRow.appendChild(btnClearMarker);
    markerRow.appendChild(btnExport);

    const exportBox = document.createElement('textarea');
    exportBox.placeholder = 'Export erscheint hier… (Copy & Paste)';
    exportBox.style.width='100%';
    exportBox.style.minHeight='78px';
    exportBox.style.borderRadius='10px';
    exportBox.style.padding='8px';
    exportBox.style.fontFamily='monospace';

    // ---------------------------------------------------------------
    // Buttons
    // ---------------------------------------------------------------
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';

    const btnStart = mkBtn('Start');
    const btnStop  = mkBtn('Stop');
    btnRow.appendChild(btnStart);
    btnRow.appendChild(btnStop);

    // ---------------------------------------------------------------
    // Status
    // ---------------------------------------------------------------
    const info = document.createElement('div');
    info.style.opacity = '0.85';
    info.style.marginTop = '6px';
    info.textContent =
      'DIR-Reihenfolge: N → NE → E → SE → S → SW → W → NW | Regel: Frame 0 = Idle | Tipp: Füße/Pivot müssen in jedem Frame stabil sein.';

    const status = document.createElement('div');
    status.style.marginTop = '8px';
    status.style.whiteSpace = 'pre-wrap';
    status.style.fontSize = '12px';

    function setStatus(color, msg){
      status.style.color = color;
      status.textContent = msg;
    }
    const setOk   = (m)=>setStatus('#c8ffb0', m);
    const setWarn = (m)=>setStatus('#ffd080', m);
    const setErr  = (m)=>setStatus('#ff8080', m);

    // ---------------------------------------------------------------
    // Canvas
    // ---------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 420;
    canvas.style.width = '100%';
    canvas.style.border = '1px solid rgba(255,255,255,0.2)';
    canvas.style.borderRadius = '10px';
    canvas.style.marginTop = '10px';
    const ctx = canvas.getContext('2d');

    // ---------------------------------------------------------------
    // Assemble UI
    // ---------------------------------------------------------------
    row('Mode', modeSel);
    row('Atlas', atlasSel);

    // Anim grid
    const gridAnim = document.createElement('div');
    gridAnim.style.display = 'grid';
    gridAnim.style.gridTemplateColumns = '1fr 1fr';
    gridAnim.style.gap = '10px';

    const w1 = document.createElement('div');
    const w2 = document.createElement('div');
    const w3 = document.createElement('div');
    const w4 = document.createElement('div');

    w1.appendChild(labelEl('Prefix (z.B. deer_)'));
    w1.appendChild(prefixIn);

    w2.appendChild(labelEl('Frames/Dir'));
    w2.appendChild(framesIn);

    w3.appendChild(labelEl('Tiles/Dir'));
    w3.appendChild(tilesIn);

    w4.appendChild(labelEl('Walk-Speed ms/Frame'));
    w4.appendChild(speedIn);

    gridAnim.appendChild(w1);
    gridAnim.appendChild(w2);
    gridAnim.appendChild(w3);
    gridAnim.appendChild(w4);

    // Viewer group
    const gridViewer = document.createElement('div');
    gridViewer.style.display = 'grid';
    gridViewer.style.gridTemplateColumns = '1fr 1fr';
    gridViewer.style.gap = '10px';

    const v1 = document.createElement('div');
    const v2 = document.createElement('div');
    v1.appendChild(labelEl('Frame Filter'));
    v1.appendChild(frameFilter);
    v2.appendChild(labelEl('Frame List (Atlas)'));
    v2.appendChild(frameSel);
    gridViewer.appendChild(v1);
    gridViewer.appendChild(v2);

    const imgWrap = document.createElement('div');
    imgWrap.appendChild(labelEl('Image List (Assets.images)'));
    imgWrap.appendChild(imgSel);

    root.appendChild(gridAnim);
    root.appendChild(gridViewer);
    root.appendChild(imgWrap);

    root.appendChild(btnRow);
    root.appendChild(info);
    root.appendChild(toggles);
    root.appendChild(markerRow);
    root.appendChild(exportBox);
    root.appendChild(status);
    root.appendChild(canvas);

    // ---------------------------------------------------------------
    // Helper: label element
    // ---------------------------------------------------------------
    function labelEl(txt){
      const l = document.createElement('div');
      l.textContent = txt;
      l.style.opacity='0.85';
      l.style.marginBottom='4px';
      return l;
    }

    // ---------------------------------------------------------------
    // Populate image list
    // ---------------------------------------------------------------
    function refillImages(){
      imgSel.innerHTML = '';
      const keys = (A && A.images) ? Object.keys(A.images) : [];
      keys.sort();
      for(const k of keys){
        const o = document.createElement('option');
        o.value = k;
        o.textContent = k;
        imgSel.appendChild(o);
      }
      if(keys.length===0){
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '(keine Assets.images gefunden)';
        imgSel.appendChild(o);
      }
    }

    // ---------------------------------------------------------------
    // Populate frame list from selected atlas
    // ---------------------------------------------------------------
    function atlasFrameKeys(atlas){
      if(!atlas) return [];
      // mögliche Strukturen im Projekt:
      // atlas.frames (Map)
      // atlas.data.frames (TexturePacker)
      // atlas.json.frames
      const f =
        atlas.frames ||
        (atlas.data && atlas.data.frames) ||
        (atlas.json && atlas.json.frames) ||
        null;
      if(!f) return [];
      if(Array.isArray(f)) return f.map(x=>x && x.name ? x.name : '').filter(Boolean);
      return Object.keys(f);
    }

    function refillFrames(){
      frameSel.innerHTML = '';
      const atlasName = atlasSel.value;
      const atlas = getAtlasByName(atlasName);
      const keys = atlasFrameKeys(atlas);
      const q = (frameFilter.value||'').trim().toLowerCase();
      const filtered = q ? keys.filter(k=>k.toLowerCase().includes(q)) : keys;
      filtered.sort();
      for(const k of filtered){
        const o = document.createElement('option');
        o.value = k;
        o.textContent = k;
        frameSel.appendChild(o);
      }
      if(filtered.length===0){
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '(keine Frames / Filter zu streng)';
        frameSel.appendChild(o);
      }
    }

    atlasSel.onchange = ()=>{ refillFrames(); exportBox.value=''; };
    frameFilter.oninput = ()=> refillFrames();

    refillImages();
    refillFrames();

    // ---------------------------------------------------------------
    // State: animation + path + markers
    // ---------------------------------------------------------------
    let running = false;
    let raf = 0;

    // anim state
    let dirIdx = 0;
    let stepInDir = 0;
    let frameIdx = 0;
    let frameAcc = 0;
    let moveAcc = 0;
    let circlePhase = 0;

    // pseudo position in tiles (für Pfad/Trail)
    let tx = 0, ty = 0;

    // trail buffer (Pivotpunkte in Canvas)
    let trail = []; // [{x,y}]
    const TRAIL_MAX = 240;

    // planned route points in tile coordinates
    let planTiles = []; // [{tx,ty}]
    let planPix = [];   // [{x,y}] - wird pro Render berechnet, wenn cx/cy bekannt

    // Marker store: per atlas+frameKey
    function markerKey(atlasName, frameKey){
      return `spritetest.markers.${atlasName}.${frameKey}`;
    }
    function loadMarkers(atlasName, frameKey){
      try{
        const raw = localStorage.getItem(markerKey(atlasName, frameKey));
        return raw ? JSON.parse(raw) : {};
      }catch(e){ return {}; }
    }
    function saveMarkers(atlasName, frameKey, obj){
      try{ localStorage.setItem(markerKey(atlasName, frameKey), JSON.stringify(obj)); }catch(e){}
    }

    let curMarkers = {};

    // ---------------------------------------------------------------
    // Build plan route (5 tiles je Richtung + dann ein Kreis)
    // ---------------------------------------------------------------
    function rebuildPlan(){
      const tilesPerDir  = Math.max(1, Math.min(20, parseInt(tilesIn.value||'5',10)));
      const pts = [];
      let px = 0, py = 0;
      pts.push({tx:px,ty:py});

      // 8 Richtungen
      for(let i=0;i<DIRS.length;i++){
        const dir = DIRS[i];
        for(let s=0;s<tilesPerDir;s++){
          if(dir.includes('N')) py -= 1;
          if(dir.includes('S')) py += 1;
          if(dir.includes('E')) px += 1;
          if(dir.includes('W')) px -= 1;
          pts.push({tx:px,ty:py});
        }
      }
      // "Kreis" als Oktagon (nur fürs Gefühl)
      const ring = ['E','E','SE','SE','S','S','SW','SW','W','W','NW','NW','N','N','NE','NE'];
      for(let r=0;r<ring.length*2;r++){
        const dir = ring[r % ring.length];
        if(dir.includes('N')) py -= 1;
        if(dir.includes('S')) py += 1;
        if(dir.includes('E')) px += 1;
        if(dir.includes('W')) px -= 1;
        pts.push({tx:px,ty:py});
      }

      planTiles = pts;
    }

    tilesIn.onchange = ()=>{ rebuildPlan(); };
    rebuildPlan();

    // ---------------------------------------------------------------
    // Events: Start/Stop
    // ---------------------------------------------------------------
    function stop(){
      running = false;
      if(raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    btnStop.onclick = ()=> stop();

    btnStart.onclick = ()=>{
      stop();
      running = true;

      // reset anim state
      dirIdx = 0; stepInDir = 0; frameIdx = 0;
      frameAcc = 0; moveAcc = 0; circlePhase = 0;
      tx = 0; ty = 0;
      trail = [];

      // viewer marker context
      exportBox.value = '';

      loop(performance.now());
    };

    // ---------------------------------------------------------------
    // Marker actions (Viewer)
    // ---------------------------------------------------------------
    btnClearMarker.onclick = ()=>{
      const atlasName = atlasSel.value;
      const frameKey = frameSel.value || '';
      if(!frameKey) return;
      const kind = markerSel.value;
      if(kind === 'none') return;

      const obj = loadMarkers(atlasName, frameKey);
      delete obj[kind];
      saveMarkers(atlasName, frameKey, obj);
      curMarkers = obj;
      exportBox.value = '';
      redrawOnce();
    };

    btnExport.onclick = ()=>{
      const atlasName = atlasSel.value;
      const frameKey = frameSel.value || '';
      if(!frameKey) return;

      const obj = loadMarkers(atlasName, frameKey);
      const out = {
        atlas: atlasName,
        frame: frameKey,
        markers: obj
      };
      exportBox.value = JSON.stringify(out, null, 2);
    };

    // ---------------------------------------------------------------
    // Canvas click: Marker setzen (Viewer)
    // ---------------------------------------------------------------
    canvas.addEventListener('click', (ev)=>{
      if(modeSel.value !== 'frame') return;
      const atlasName = atlasSel.value;
      const frameKey = frameSel.value || '';
      if(!frameKey) return;

      const kind = markerSel.value;
      if(kind === 'none') return;

      // wir mappen Click -> Frame-Local Koordinaten (0..w/h)
      const rect = canvas.getBoundingClientRect();
      const mx = (ev.clientX - rect.left) * (canvas.width / rect.width);
      const my = (ev.clientY - rect.top) * (canvas.height / rect.height);

      const atlas = getAtlasByName(atlasName);
      const meta = getFrameMeta(atlas, frameKey);
      if(!meta) return;

      const fw = (meta.frame && meta.frame.w) ? meta.frame.w : 128;
      const fh = (meta.frame && meta.frame.h) ? meta.frame.h : 128;
      const pv = meta.pivot || { x: fw/2, y: fh };

      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.70;
      const topLeftX = cx - pv.x;
      const topLeftY = cy - pv.y;

      const lx = Math.round(mx - topLeftX);
      const ly = Math.round(my - topLeftY);

      if(lx < 0 || ly < 0 || lx > fw || ly > fh){
        // Click war außerhalb der Frame-Box → ignorieren
        return;
      }

      const obj = loadMarkers(atlasName, frameKey);
      obj[kind] = { x: lx, y: ly };
      saveMarkers(atlasName, frameKey, obj);
      curMarkers = obj;

      exportBox.value = '';
      redrawOnce();
    });

    // ---------------------------------------------------------------
    // Mode change: UI visibility
    // ---------------------------------------------------------------
    function updateVisibility(){
      const m = modeSel.value;

      // anim controls
      gridAnim.style.display = (m === 'anim8') ? 'grid' : 'none';

      // frame picker + markers
      gridViewer.style.display = (m === 'frame') ? 'grid' : 'none';
      imgWrap.style.display    = (m === 'frame') ? 'block' : 'none';
      markerRow.style.display  = (m === 'frame') ? 'flex' : 'none';
      exportBox.style.display  = (m === 'frame') ? 'block' : 'none';

      // start/stop text
      btnStart.textContent = (m === 'anim8') ? 'Start Walk-Test' : 'Start (Viewer Refresh)';
    }
    modeSel.onchange = ()=>{ updateVisibility(); redrawOnce(); };
    updateVisibility();

    // ---------------------------------------------------------------
    // Draw helpers
    // ---------------------------------------------------------------
    function drawPlannedPath(ctx, points){
      if(points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([6,6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for(let i=1;i<points.length;i++){
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawTrail(ctx, pts){
      if(!pts.length) return;

      // Linie
      if(chkTrailLine.box.checked){
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#90e0ff';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
      }

      // Punkte
      if(chkTrailDots.box.checked){
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffd080';
        for(const p of pts){
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawMarkers(ctx, topLeftX, topLeftY, markers){
      const items = [
        ['entrance','Eingang','#ff8080'],
        ['chimney','Schornstein','#c8ffb0'],
        ['hand','Hand','#90e0ff'],
        ['carry','Carry','#ffd080'],
      ];
      for(const [k,label,color] of items){
        if(!markers || !markers[k]) continue;
        const x = topLeftX + markers[k].x;
        const y = topLeftY + markers[k].y;

        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '12px monospace';
        ctx.fillStyle = color;
        ctx.fillText(label, x + 8, y - 8);
        ctx.restore();
      }
    }

    // ---------------------------------------------------------------
    // Redraw once (Viewer)
    // ---------------------------------------------------------------
    function redrawOnce(){
      stop();
      drawFrameViewer();
    }

    // ---------------------------------------------------------------
    // Main loop
    // ---------------------------------------------------------------
    function loop(now){
      if(!running) return;

      if(modeSel.value === 'anim8'){
        runAnim8();
      } else {
        // Viewer: kein permanenter Loop nötig; wir refreshen 1x pro click/start
        drawFrameViewer();
        running = false;
      }

      raf = requestAnimationFrame(loop);
    }

    // ---------------------------------------------------------------
    // Anim8: 8-dir walk + planned path + trail
    // ---------------------------------------------------------------
    function runAnim8(){
      const atlasName = atlasSel.value;
      const prefix = prefixIn.value || '';
      const framesPerDir = Math.max(1, Math.min(16, parseInt(framesIn.value||'8',10)));
      const tilesPerDir  = Math.max(1, Math.min(20, parseInt(tilesIn.value||'5',10)));
      const msPerFrame = Math.max(30, Math.min(5000, parseInt(speedIn.value||'180',10)));

      const atlas = getAtlasByName(atlasName);
      if(!isAtlasOk(atlas)){
        setErr(`✖ Atlas "${atlasName}" ist nicht ok/geladen.`);
        clearCanvas(ctx, canvas.width, canvas.height);
        return;
      }

      // Tick (wir simulieren hier, iOS ist meist ~60fps)
      const dt = 16.67;
      frameAcc += dt;
      moveAcc  += dt;

      // Anim frame: alle msPerFrame
      if(frameAcc >= msPerFrame){
        frameAcc = 0;
        frameIdx = (frameIdx + 1) % framesPerDir;
      }

      // Bewegung: alle 300ms ein Tile
      if(moveAcc >= 300){
        moveAcc = 0;

        if(circlePhase === 0){
          const dir = DIRS[dirIdx];
          stepInDir++;

          if(dir.includes('N')) ty -= 1;
          if(dir.includes('S')) ty += 1;
          if(dir.includes('E')) tx += 1;
          if(dir.includes('W')) tx -= 1;

          if(stepInDir >= tilesPerDir){
            stepInDir = 0;
            dirIdx = (dirIdx + 1) % DIRS.length;
            if(dirIdx === 0){
              circlePhase = 1;
              tx = 0; ty = 0;
            }
          }
        } else {
          const ring = ['E','E','SE','SE','S','S','SW','SW','W','W','NW','NW','N','N','NE','NE'];
          dirIdx = DIRS.indexOf(ring[(circlePhase-1) % ring.length]);
          circlePhase++;
          if(circlePhase > ring.length*3) circlePhase = 1;

          const dir = DIRS[dirIdx];
          if(dir.includes('N')) ty -= 1;
          if(dir.includes('S')) ty += 1;
          if(dir.includes('E')) tx += 1;
          if(dir.includes('W')) tx -= 1;
        }
      }

      const dir = DIRS[dirIdx];
      const key = buildFrameName(prefix, dir, frameIdx);

      const meta = getFrameMeta(atlas, key);
      if(!meta){
        setWarn(`⚠ Frame fehlt: ${key}
Atlas ok: ja | Prefix="${prefix}" dir=${dir} frame=${frameIdx}`);
        clearCanvas(ctx, canvas.width, canvas.height);
        return;
      }

      clearCanvas(ctx, canvas.width, canvas.height);

      // Pivot-Punkt in Canvas (wo Assets.drawAtlasFrame pivot erwartet)
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.70;

      // Plan + Trail beziehen sich auf Pivot-Punkte
      const tileScale = 18; // nur Test-Canvas: wie weit ein Tile auseinander liegt
      planPix = planTiles.map(p=>({ x: cx + p.tx*tileScale, y: cy + p.ty*tileScale }));

      if(chkPlan.box.checked) drawPlannedPath(ctx, planPix);

      // Draw sprite
      if(window.Assets && typeof window.Assets.drawAtlasFrame === 'function'){
        window.Assets.drawAtlasFrame(atlasName, key, cx + tx*tileScale, cy + ty*tileScale, { ctx });
      } else {
        setErr('✖ Assets.drawAtlasFrame nicht gefunden.');
        return;
      }

      const fw = (meta.frame && meta.frame.w) ? meta.frame.w : 128;
      const fh = (meta.frame && meta.frame.h) ? meta.frame.h : 128;
      const pv = meta.pivot || { x: fw/2, y: fh };
      const px = cx + tx*tileScale;
      const py = cy + ty*tileScale;
      const topLeftX = px - pv.x;
      const topLeftY = py - pv.y;

      // Trail add (Pivotpoint)
      trail.push({ x: px, y: py });
      if(trail.length > TRAIL_MAX) trail.shift();

      drawTrail(ctx, trail);

      if(chkFoot.box.checked) drawFootLine(ctx, py, canvas.width);
      if(chkBox.box.checked)  drawBox(ctx, topLeftX, topLeftY, fw, fh);
      if(chkPivot.box.checked)drawCrosshair(ctx, px, py);

      const ax = (pv.x / fw).toFixed(2);
      const ay = (pv.y / fh).toFixed(2);
      setOk(
        `✔ Mode=anim8 | Atlas ok: ${atlasName}
` +
        `Frame: ${key}
` +
        `DIR=${dir} frame=${frameIdx}/${framesPerDir-1}  tilesPerDir=${tilesPerDir}
` +
        `Pivot(px): x=${pv.x}, y=${pv.y}  Anchor(norm): x=${ax}, y=${ay}
` +
        `TestPos(tx,ty)=(${tx},${ty})  |  Trail=${trail.length}`
      );
    }

    // ---------------------------------------------------------------
    // Viewer: single frame / image + markers
    // ---------------------------------------------------------------
    function drawFrameViewer(){
      const atlasName = atlasSel.value;
      const frameKey = frameSel.value || '';
      const atlas = getAtlasByName(atlasName);

      clearCanvas(ctx, canvas.width, canvas.height);

      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.70;

      // 1) Atlas frame draw (wenn vorhanden)
      if(isAtlasOk(atlas) && frameKey && window.Assets && typeof window.Assets.drawAtlasFrame === 'function'){
        const meta = getFrameMeta(atlas, frameKey);
        if(!meta){
          setWarn(`⚠ Frame fehlt im Atlas: ${frameKey}
Atlas: ${atlasName}`);
          return;
        }

        window.Assets.drawAtlasFrame(atlasName, frameKey, cx, cy, { ctx });

        const fw = (meta.frame && meta.frame.w) ? meta.frame.w : 128;
        const fh = (meta.frame && meta.frame.h) ? meta.frame.h : 128;
        const pv = meta.pivot || { x: fw/2, y: fh };
        const topLeftX = cx - pv.x;
        const topLeftY = cy - pv.y;

        // Load marker state
        curMarkers = loadMarkers(atlasName, frameKey);

        // Overlays
        if(chkFoot.box.checked) drawFootLine(ctx, cy, canvas.width);
        if(chkBox.box.checked)  drawBox(ctx, topLeftX, topLeftY, fw, fh);
        if(chkPivot.box.checked)drawCrosshair(ctx, cx, cy);

        // Markers
        drawMarkers(ctx, topLeftX, topLeftY, curMarkers);

        const ax = (pv.x / fw).toFixed(2);
        const ay = (pv.y / fh).toFixed(2);

        setOk(
          `✔ Mode=frame | Atlas ok: ${atlasName}
` +
          `Frame: ${frameKey}
` +
          `Pivot(px): x=${pv.x}, y=${pv.y}  Anchor(norm): x=${ax}, y=${ay}
` +
          `Marker: ${markerSel.value} | Klick in die BBox setzt Marker (0..w/h).`
        );
        return;
      }

      // 2) Image draw (Assets.images)
      const imgKey = imgSel.value || '';
      if(A && A.images && imgKey && A.images[imgKey] && A.images[imgKey].img){
        const img = A.images[imgKey].img;
        // center draw
        const w = img.naturalWidth || img.width || 128;
        const h = img.naturalHeight || img.height || 128;
        const scale = Math.min(1.0, 420 / Math.max(w,h));
        const dw = w * scale;
        const dh = h * scale;
        ctx.drawImage(img, cx - dw/2, cy - dh/2, dw, dh);
        setOk(`✔ Mode=frame | Image: ${imgKey}
${w}x${h} (scaled ${scale.toFixed(2)})
Hinweis: Marker nur bei Atlas-Frames.`);
        return;
      }

      setErr(`✖ Nichts zu zeichnen.
- Atlas ok? ${isAtlasOk(atlas)}
- Frame gewählt? ${!!frameKey}
- Oder Image gewählt? ${!!imgKey}`);
    }

    // init viewer once
    drawFrameViewer();
  }


  // -------------------------------------------------------------------------
  // Tab Mount
  // -------------------------------------------------------------------------
  function mount(){
    const ok = registerTab({
      id: TAB_ID,
      title: TAB_NAME,
      icon: '🧪',
      onShow: (el)=> renderUI(el)
    });
    if(!ok){
      // Falls Inspector noch nicht existiert: später erneut versuchen
      let tries = 0;
      const t = setInterval(()=>{
        tries++;
        const ok2 = registerTab({
          id: TAB_ID,
          title: TAB_NAME,
          icon: '🧪',
          onShow: (el)=> renderUI(el)
        });
        if(ok2 || tries > 50) clearInterval(t);
      }, 200);
    }
  }

  mount();
})();
