/* =========================================================================
 * Datei   : inspector/tabs/inspector.tab.spritetest-v1.js
 * Projekt : Neue Siedler – Inspector
 * Version : v26.01.15-spritetest-renderfix-register-stable
 *
 * FIXES:
 *  - Kein globales renderUI mehr (war Ursache für: ReferenceError renderUI)
 *  - Registrierung stabil über window.registerInspectorTab('spritetest', ...)
 *  - Robust bei iOS/Safari + GitHub Pages Cache + Load-Order
 *
 * Features:
 *  - Atlas-Picker (aus geladenen Assets.atlases)
 *  - Prefix-Picker (aus Atlas-Frames abgeleitet)
 *  - Frames/Dir + Tiles/Dir
 *  - Pfad-Modus: 8Dirs / Linie / Viereck / Kreis
 *  - Richtung: AUTO oder Lock N/NE/...
 *  - Speed (px/s) + Anim FPS
 *  - Debug: Pivot, BBox, Fußlinie, Trail, Plan
 * ========================================================================= */

(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // TAB META
  // -------------------------------------------------------------------------
  const TAB_ID   = 'spritetest';  // <<< WICHTIG: stabiler Key
  const TAB_NAME = 'SpriteTest';

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  const PATH_MODES = [
    { id:'DIRS',   label:'8 Richtungen (N→…→NW)' },
    { id:'LINE',   label:'Linie (E hin, W zurück)' },
    { id:'SQUARE', label:'Viereck (E,S,W,N)' },
    { id:'CIRCLE', label:'Kreis (Iso-Ellipse)' }
  ];

  const CANVAS_W = 520;
  const CANVAS_H = 360;
  const TRAIL_MAX = 220;

  // -------------------------------------------------------------------------
  // ASSETS HELPERS (v4.5: Assets.atlases ist Map, legacy: Objekt)
  // -------------------------------------------------------------------------
  function getAssets(){ return window.Assets || null; }

  function getAtlasStore(){
    const A = getAssets();
    return A ? A.atlases : null;
  }

  function listAtlasNames(){
    const s = getAtlasStore();
    if(!s) return [];
    if(typeof s.keys === 'function' && typeof s.get === 'function'){
      return Array.from(s.keys());
    }
    if(typeof s === 'object') return Object.keys(s);
    return [];
  }

  function getAtlasByName(name){
    const s = getAtlasStore();
    if(!s || !name) return null;
    if(typeof s.get === 'function') return s.get(name) || null;
    return s[name] || null;
  }

  function isAtlasOk(atlas){
    if(!atlas) return false;
    if(atlas.ok === true) return true;
    const img = atlas.img || atlas.image || atlas._img;
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function listFrames(atlasName){
    const A = getAssets();
    if(!A) return [];
    if(typeof A.listFrames === 'function'){
      // v4.5
      return A.listFrames(atlasName, '') || [];
    }
    const at = getAtlasByName(atlasName);
    if(!at) return [];
    if(Array.isArray(at.names)) return at.names.slice();
    if(at.frames && typeof at.frames === 'object') return Object.keys(at.frames);
    return [];
  }

  // -------------------------------------------------------------------------
  // PREFIX EXTRACTION
  // -------------------------------------------------------------------------
  function extractPrefixesFromFrames(frameNames){
    const out = new Set();
    for(const n0 of frameNames){
      const n = String(n0);
      // animals: deer_N_walk_0 -> deer_
      const parts = n.split('_');
      if(parts.length >= 4 && DIRS.includes(parts[1]) && parts[2] === 'walk'){
        out.add(parts[0] + '_');
        continue;
      }
      // buildings: b.hunter_frame_0_0 -> b.hunter_
      const i = n.indexOf('_frame_');
      if(i > 0){
        out.add(n.slice(0, i + 1)); // include trailing "_"
        continue;
      }
      // fallback
      if(parts.length >= 3){
        out.add(parts.slice(0, parts.length - 2).join('_') + '_');
      }
    }
    return Array.from(out).sort();
  }

  // -------------------------------------------------------------------------
  // DRAW HELPERS
  // -------------------------------------------------------------------------
  function clearCanvas(ctx, w, h){
    ctx.clearRect(0,0,w,h);
    // simple grid
    const step = 32;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0;x<=w;x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for(let y=0;y<=h;y+=step){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
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

  function drawTrail(ctx, pts){
    if(!pts || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<pts.length;i++){
      const p = pts[i];
      if(i===0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPlan(ctx, pts){
    if(!pts || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#66d9ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    for(let i=0;i<pts.length;i++){
      const p = pts[i];
      if(i===0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // ISO STEP + DIRECTION MAPPING
  // -------------------------------------------------------------------------
  function isoStep(dir){
    const dx = 24;
    const dy = 14;
    switch(dir){
      case 'N':  return {x: 0,   y:-dy};
      case 'S':  return {x: 0,   y: dy};
      case 'E':  return {x: dx,  y: 0 };
      case 'W':  return {x:-dx,  y: 0 };
      case 'NE': return {x: dx,  y:-dy};
      case 'SE': return {x: dx,  y: dy};
      case 'SW': return {x:-dx,  y: dy};
      case 'NW': return {x:-dx,  y:-dy};
      default:   return {x:0,y:0};
    }
  }

  function vecToDir(dx, dy){
    const a = Math.atan2(dy, dx);
    const deg = (a * 180 / Math.PI + 360) % 360;
    const idx = Math.round(deg / 45) % 8;
    // 0:E,1:SE,2:S,3:SW,4:W,5:NW,6:N,7:NE
    const map = ['E','SE','S','SW','W','NW','N','NE'];
    return map[idx];
  }

  function buildPlanPoints(mode, tilesPerDir, cx, cy){
    const pts = [{x:cx, y:cy}];

    const stepDir = (dir, tiles)=>{
      const s = isoStep(dir);
      const last = pts[pts.length-1];
      pts.push({x:last.x + s.x*tiles, y:last.y + s.y*tiles});
    };

    if(mode === 'LINE'){
      stepDir('E', tilesPerDir);
      stepDir('W', tilesPerDir);
      return pts;
    }
    if(mode === 'SQUARE'){
      stepDir('E', tilesPerDir);
      stepDir('S', tilesPerDir);
      stepDir('W', tilesPerDir);
      stepDir('N', tilesPerDir);
      return pts;
    }
    if(mode === 'CIRCLE'){
      const rx = Math.max(1, tilesPerDir) * 24;
      const ry = Math.max(1, tilesPerDir) * 14;
      const SEG = 40;
      pts.length = 0;
      for(let i=0;i<=SEG;i++){
        const t = (i/SEG)*Math.PI*2;
        pts.push({x: cx + Math.cos(t)*rx, y: cy + Math.sin(t)*ry});
      }
      return pts;
    }

    // DIRS default
    for(const d of DIRS) stepDir(d, tilesPerDir);
    return pts;
  }

  function buildFrameName(prefix, dir, idx){
    return `${prefix}${dir}_walk_${idx}`;
  }

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const S = {
    running: false,
    raf: 0,

    // Mode:
    //  - ANIM    : 8-Richtungen Walk-Test (wie bisher)
    //  - PREVIEW : einzelnes Frame aus Atlas rendern (für Buildings/Deko/Icons)
    mode: 'ANIM',
    previewFilter: '',
    previewFrame: '',

    atlas: '',
    prefix: 'deer_',
    framesPerDir: 8,
    tilesPerDir: 5,

    pathMode: 'DIRS',
    dirLock: 'AUTO',
    pxPerSec: 140,
    animFps: 6,

    segIdx: 0,
    segT: 0,
    walkFrame: 0,
    frameClock: 0,
    lastTs: 0,

    plan: [],
    x: CANVAS_W * 0.55,
    y: CANVAS_H * 0.70,

    trail: []
  };

  // -------------------------------------------------------------------------
  // MAIN RENDER (NO renderUI dependency!)
  // -------------------------------------------------------------------------
  function mountSpriteTest(root){
    try{
      // Basic root styling
      root.innerHTML = '';
      root.style.padding = '8px';
      root.style.color = '#fff';
      root.style.fontFamily = 'monospace';

      // UI builders
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

      const mkSel = ()=>{
        const s = document.createElement('select');
        s.style.width = '100%';
        s.style.padding = '6px';
        s.style.borderRadius = '8px';
        return s;
      };

      const mkText = (val='')=>{
        const i = document.createElement('input');
        i.type = 'text';
        i.value = val;
        i.placeholder = '';
        i.style.width = '100%';
        i.style.padding = '6px';
        i.style.borderRadius = '8px';
        return i;
      };

      const mkInput = (val)=>{
        const i = document.createElement('input');
        i.type = 'text';
        i.value = val;
        i.style.width = '100%';
        i.style.padding = '6px';
        i.style.borderRadius = '8px';
        return i;
      };

      const mkNum = (val, min, max)=>{
        const i = document.createElement('input');
        i.type='number';
        i.value=String(val);
        i.min=String(min);
        i.max=String(max);
        i.style.width='100%';
        i.style.padding='6px';
        i.style.borderRadius='8px';
        return i;
      };

      const mkRange = (val, min, max, step)=>{
        const i = document.createElement('input');
        i.type='range';
        i.value=String(val);
        i.min=String(min);
        i.max=String(max);
        i.step=String(step);
        i.style.width='100%';
        return i;
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

      // Widgets
      // Mode selector
      const modeSel = mkSel();
      {
        const o1 = document.createElement('option');
        o1.value = 'ANIM';
        o1.textContent = 'Anim (8 Richtungen / Walk)';
        modeSel.appendChild(o1);
        const o2 = document.createElement('option');
        o2.value = 'PREVIEW';
        o2.textContent = 'Preview (einzelnes Frame)';
        modeSel.appendChild(o2);
        modeSel.value = S.mode;
      }

      const atlasSel  = mkSel();
      const prefixSel = mkSel();
      const prefixIn  = mkInput(S.prefix);

      // Preview controls (A): Frame-Dropdown + Filter
      const previewWrap = document.createElement('div');
      previewWrap.style.display = (S.mode === 'PREVIEW') ? 'block' : 'none';
      // Text-Input (mkText gibt es in diesem Projekt nicht -> mkInput verwenden)
      const frameFilterIn = mkInput(S.previewFilter);
      frameFilterIn.placeholder = 'Filter (z.B. "b.hq" oder "frame_0_0")';
      const frameSel = mkSel();

      const framesIn = mkNum(S.framesPerDir, 1, 32);
      const tilesIn  = mkNum(S.tilesPerDir,  1, 30);

      const pathSel = mkSel();
      PATH_MODES.forEach(m=>{
        const o=document.createElement('option');
        o.value=m.id; o.textContent=m.label;
        pathSel.appendChild(o);
      });
      pathSel.value = S.pathMode;

      const dirSel = mkSel();
      const optA = document.createElement('option');
      optA.value='AUTO'; optA.textContent='AUTO (aus Pfad)';
      dirSel.appendChild(optA);
      for(const d of DIRS){
        const o=document.createElement('option');
        o.value=d; o.textContent=`Lock: ${d}`;
        dirSel.appendChild(o);
      }
      dirSel.value = S.dirLock;

      const speedR = mkRange(S.pxPerSec, 30, 420, 10);
      const speedLbl = document.createElement('div');
      speedLbl.style.textAlign='right';
      speedLbl.style.opacity='0.9';
      speedLbl.textContent = `${S.pxPerSec} px/s`;

      const fpsR = mkRange(S.animFps, 1, 12, 1);
      const fpsLbl = document.createElement('div');
      fpsLbl.style.textAlign='right';
      fpsLbl.style.opacity='0.9';
      fpsLbl.textContent = `${S.animFps} fps`;

      const toggles = document.createElement('div');
      toggles.style.display='flex';
      toggles.style.gap='10px';
      toggles.style.flexWrap='wrap';

      const chkPivot = mkCheck('Pivot', true);
      const chkBBox  = mkCheck('BBox', true);
      const chkFoot  = mkCheck('Fußlinie', true);
      const chkTrail = mkCheck('Trail', true);
      const chkPlan  = mkCheck('Plan', true);

      toggles.appendChild(chkPivot.wrap);
      toggles.appendChild(chkBBox.wrap);
      toggles.appendChild(chkFoot.wrap);
      toggles.appendChild(chkTrail.wrap);
      toggles.appendChild(chkPlan.wrap);

      const btnRow = document.createElement('div');
      btnRow.style.display='flex';
      btnRow.style.gap='10px';

      const btnStart = document.createElement('button');
      btnStart.textContent='Start Test';
      btnStart.style.flex='1';
      btnStart.style.padding='8px';
      btnStart.style.borderRadius='999px';

      const btnStop = document.createElement('button');
      btnStop.textContent='Stop';
      btnStop.style.flex='1';
      btnStop.style.padding='8px';
      btnStop.style.borderRadius='999px';

      btnRow.appendChild(btnStart);
      btnRow.appendChild(btnStop);

      const btnRefresh = document.createElement('button');
      btnRefresh.textContent='↻ Refresh Atlases';
      btnRefresh.style.width='100%';
      btnRefresh.style.padding='8px';
      btnRefresh.style.borderRadius='999px';

      const hint = document.createElement('div');
      hint.style.marginTop='6px';
      hint.style.opacity='0.9';
      hint.textContent='Regel: Frame 0 = Idle. Teste Richtungen mit Pfad + Speed/FPS.';

      const status = document.createElement('div');
      status.style.margin='8px 0';
      status.style.color='#ff6b6b';

      const canvas = document.createElement('canvas');
      canvas.width=CANVAS_W;
      canvas.height=CANVAS_H;
      canvas.style.width='100%';
      canvas.style.borderRadius='10px';
      canvas.style.background='rgba(0,0,0,0.25)';

      // Layout
      row('Modus', modeSel);
      row('Atlas', atlasSel);

      // Preview UI (wird dynamisch gezeigt/hidden)
      {
        const r1 = document.createElement('div');
        r1.style.margin = '6px 0';
        const l1 = document.createElement('div');
        l1.textContent = 'Frame-Filter';
        l1.style.opacity = '0.85';
        l1.style.marginBottom = '4px';
        r1.appendChild(l1);
        r1.appendChild(frameFilterIn);

        const r2 = document.createElement('div');
        r2.style.margin = '6px 0';
        const l2 = document.createElement('div');
        l2.textContent = 'Frame auswählen';
        l2.style.opacity = '0.85';
        l2.style.marginBottom = '4px';
        r2.appendChild(l2);
        r2.appendChild(frameSel);

        previewWrap.appendChild(r1);
        previewWrap.appendChild(r2);
        root.appendChild(previewWrap);
      }
      row('Prefix-Picker (aus Atlas)', prefixSel);
      row('Prefix (manuell)', prefixIn);

      // grid: frames/tiles
      const grid2 = document.createElement('div');
      grid2.style.display='grid';
      grid2.style.gridTemplateColumns='1fr 1fr';
      grid2.style.gap='10px';
      const w1=document.createElement('div');
      const w2=document.createElement('div');
      w1.appendChild(document.createTextNode('Frames/Dir'));
      w1.appendChild(framesIn);
      w2.appendChild(document.createTextNode('Tiles/Dir (Länge/Radius)'));
      w2.appendChild(tilesIn);
      grid2.appendChild(w1); grid2.appendChild(w2);
      root.appendChild(grid2);

      // grid: path/dir
      const gridPath = document.createElement('div');
      gridPath.style.display='grid';
      gridPath.style.gridTemplateColumns='1fr 1fr';
      gridPath.style.gap='10px';
      const p1=document.createElement('div');
      const p2=document.createElement('div');
      p1.appendChild(document.createTextNode('Pfad'));
      p1.appendChild(pathSel);
      p2.appendChild(document.createTextNode('Richtung'));
      p2.appendChild(dirSel);
      gridPath.appendChild(p1); gridPath.appendChild(p2);
      root.appendChild(gridPath);

      // grid: speed/fps
      const gridSpeed = document.createElement('div');
      gridSpeed.style.display='grid';
      gridSpeed.style.gridTemplateColumns='1fr 1fr';
      gridSpeed.style.gap='10px';
      const s1=document.createElement('div');
      const s2=document.createElement('div');
      s1.appendChild(document.createTextNode('Speed'));
      s1.appendChild(speedR); s1.appendChild(speedLbl);
      s2.appendChild(document.createTextNode('Anim FPS'));
      s2.appendChild(fpsR); s2.appendChild(fpsLbl);
      gridSpeed.appendChild(s1); gridSpeed.appendChild(s2);
      root.appendChild(gridSpeed);

      root.appendChild(btnRow);
      root.appendChild(hint);
      root.appendChild(toggles);
      root.appendChild(btnRefresh);
      root.appendChild(status);
      root.appendChild(canvas);

      const ctx = canvas.getContext('2d');

      // ------------------------------
      // internal helpers
      // ------------------------------
      function repopulate(){
        const names = listAtlasNames().sort();

        atlasSel.innerHTML='';
        const opt0=document.createElement('option');
        opt0.value='';
        opt0.textContent = names.length ? '– Atlas wählen –' : '– keine Atlanten –';
        atlasSel.appendChild(opt0);

        for(const n of names){
          const a=getAtlasByName(n);
          const ok=isAtlasOk(a);
          const o=document.createElement('option');
          o.value=n;
          o.textContent = ok ? n : `${n} (not ready)`;
          atlasSel.appendChild(o);
        }

        if(S.atlas && names.includes(S.atlas)) atlasSel.value=S.atlas;

        prefixSel.innerHTML='';
        const atlasName = atlasSel.value || S.atlas || '';
        if(atlasName){
          const frames=listFrames(atlasName);
          const prefs=extractPrefixesFromFrames(frames);
          const p0=document.createElement('option');
          p0.value='';
          p0.textContent = prefs.length ? '– Prefix wählen –' : '– keine Prefixe erkannt –';
          prefixSel.appendChild(p0);
          for(const p of prefs){
            const o=document.createElement('option');
            o.value=p; o.textContent=p;
            prefixSel.appendChild(o);
          }
        } else {
          const p0=document.createElement('option');
          p0.value='';
          p0.textContent='– erst Atlas wählen –';
          prefixSel.appendChild(p0);
        }

        if(!names.length){
          status.textContent='✖ Keine Atlanten gefunden. (Sind Assets geladen?)';
          status.style.color='#ff6b6b';
        } else {
          const okCount = names.filter(n=>isAtlasOk(getAtlasByName(n))).length;
          status.textContent = `✓ Atlanten: ${names.length} (ok: ${okCount}).`;
          status.style.color='#a7ff9a';
          setTimeout(()=>{ status.style.color='#ff6b6b'; }, 1200);
        }

        // Preview frame list (A)
        frameSel.innerHTML='';
        if(atlasName){
          const frames = listFrames(atlasName);
          const f = String(frameFilterIn.value || '').trim().toLowerCase();
          const filtered = f ? frames.filter(n => String(n).toLowerCase().includes(f)) : frames;

          const o0 = document.createElement('option');
          o0.value='';
          o0.textContent = filtered.length ? '– Frame wählen –' : '– keine Frames –';
          frameSel.appendChild(o0);

          for(const n of filtered){
            const o = document.createElement('option');
            o.value = n;
            o.textContent = n;
            frameSel.appendChild(o);
          }

          // keep selection if still present
          if (S.previewFrame && filtered.includes(S.previewFrame)) frameSel.value = S.previewFrame;
        } else {
          const o0 = document.createElement('option');
          o0.value='';
          o0.textContent='– erst Atlas wählen –';
          frameSel.appendChild(o0);
        }
      }

      function rebuildPlan(){
        const cx = CANVAS_W * 0.50;
        const cy = CANVAS_H * 0.65;
        S.plan = buildPlanPoints(S.pathMode, S.tilesPerDir, cx, cy);
        S.segIdx = 0;
        S.segT = 0;
        S.x = (S.plan[0] && S.plan[0].x) || cx;
        S.y = (S.plan[0] && S.plan[0].y) || cy;
        S.trail.length = 0;
      }

      function resetAnim(){
        S.walkFrame = 0;
        S.frameClock = 0;
        S.lastTs = 0;
        rebuildPlan();
      }

      function drawOnce(){
        // read inputs
        S.atlas = atlasSel.value || S.atlas;
        S.prefix = String(prefixIn.value || '');
        S.framesPerDir = Math.max(1, Math.min(32, Number(framesIn.value)||8));
        S.tilesPerDir  = Math.max(1, Math.min(30, Number(tilesIn.value)||5));
        S.pathMode = pathSel.value || 'DIRS';
        S.dirLock  = dirSel.value || 'AUTO';
        S.pxPerSec = Math.max(10, Number(speedR.value)||140);
        S.animFps  = Math.max(1, Number(fpsR.value)||6);

        speedLbl.textContent = `${S.pxPerSec} px/s`;
        fpsLbl.textContent   = `${S.animFps} fps`;

        if(!S.plan || !S.plan.length) rebuildPlan();

        clearCanvas(ctx, CANVAS_W, CANVAS_H);
        if(chkPlan.box.checked)  drawPlan(ctx, S.plan);
        if(chkFoot.box.checked)  drawFootLine(ctx, CANVAS_H * 0.75, CANVAS_W);
        if(chkTrail.box.checked) drawTrail(ctx, S.trail);

        const atlas = getAtlasByName(S.atlas);
        const ok = isAtlasOk(atlas);

        // Preview zeichnet immer in der Mitte, Anim nutzt Pfad.
        const pivotX = (S.mode === 'PREVIEW') ? (CANVAS_W * 0.5) : S.x;
        const pivotY = (S.mode === 'PREVIEW') ? (CANVAS_H * 0.65) : S.y;

        let frameName = '';
        if (S.mode === 'PREVIEW'){
          frameName = String(frameSel.value || S.previewFrame || '').trim();
          S.previewFrame = frameName;
        } else {
          // choose direction
          let dir = 'E';
          if(S.dirLock !== 'AUTO') dir = S.dirLock;
          else if(S.plan.length >= 2){
            const maxSeg = (S.plan.length - 1);
            const a = S.plan[S.segIdx % maxSeg];
            const b = S.plan[(S.segIdx + 1) % maxSeg];
            dir = vecToDir(b.x - a.x, b.y - a.y);
          }
          frameName = buildFrameName(S.prefix, dir, 0); // idle
        }

        if(!S.atlas){
          status.textContent='✖ Bitte Atlas auswählen.';
          status.style.color='#ff6b6b';
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
          return;
        }
        if(!ok){
          status.textContent=`✖ Atlas "${S.atlas}" nicht ok/geladen.`;
          status.style.color='#ff6b6b';
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
          return;
        }

        status.textContent='';
        const A = getAssets();
        const drew = (A && typeof A.drawAtlasFrame === 'function')
          ? A.drawAtlasFrame(ctx, S.atlas, frameName, pivotX, pivotY, { align:'pivot', scale:1 })
          : false;

        const fr = (atlas && atlas.frames) ? atlas.frames[frameName] : null;
        if(drew && fr){
          const dx = pivotX - fr.pivotX;
          const dy = pivotY - fr.pivotY;
          if(chkBBox.box.checked)  drawBox(ctx, dx, dy, fr.w, fr.h);
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
        } else {
          ctx.save();
          ctx.globalAlpha=0.85;
          ctx.fillStyle='#ffaaaa';
          ctx.font='14px monospace';
          ctx.fillText(`Frame nicht gefunden: ${frameName || '(leer)'}`, 12, 22);
          ctx.restore();
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
        }
      }

      function tick(ts){
        if(!S.running){ S.raf = 0; return; }

        // Preview hat keine Bewegung/Animation – wir rendern einfach „standbild“.
        if (S.mode === 'PREVIEW'){
          drawOnce();
          S.raf = requestAnimationFrame(tick);
          return;
        }

        if(!S.lastTs) S.lastTs = ts;
        const dt = Math.max(0.0, (ts - S.lastTs) / 1000);
        S.lastTs = ts;

        // read inputs
        S.atlas = atlasSel.value || S.atlas;
        S.prefix = String(prefixIn.value || '');
        S.framesPerDir = Math.max(1, Math.min(32, Number(framesIn.value)||8));
        S.tilesPerDir  = Math.max(1, Math.min(30, Number(tilesIn.value)||5));
        S.pathMode = pathSel.value || 'DIRS';
        S.dirLock  = dirSel.value || 'AUTO';
        S.pxPerSec = Math.max(10, Number(speedR.value)||140);
        S.animFps  = Math.max(1, Number(fpsR.value)||6);

        speedLbl.textContent = `${S.pxPerSec} px/s`;
        fpsLbl.textContent   = `${S.animFps} fps`;

        if(!S.plan || !S.plan.length) rebuildPlan();

        clearCanvas(ctx, CANVAS_W, CANVAS_H);
        if(chkPlan.box.checked) drawPlan(ctx, S.plan);
        if(chkFoot.box.checked) drawFootLine(ctx, CANVAS_H * 0.75, CANVAS_W);

        // advance along plan
        if(S.plan.length >= 2){
          const maxSeg = (S.plan.length - 1);
          const a = S.plan[S.segIdx % maxSeg];
          const b = S.plan[(S.segIdx + 1) % maxSeg];

          const vx = b.x - a.x;
          const vy = b.y - a.y;
          const dist = Math.hypot(vx, vy) || 1;

          S.segT += (dt * S.pxPerSec) / dist;
          while(S.segT >= 1){
            S.segT -= 1;
            S.segIdx = (S.segIdx + 1) % maxSeg;
          }

          const aa = S.plan[S.segIdx % maxSeg];
          const bb = S.plan[(S.segIdx + 1) % maxSeg];

          S.x = aa.x + (bb.x - aa.x) * S.segT;
          S.y = aa.y + (bb.y - aa.y) * S.segT;

          if(chkTrail.box.checked){
            S.trail.push({x:S.x, y:S.y});
            if(S.trail.length > TRAIL_MAX) S.trail.shift();
            drawTrail(ctx, S.trail);
          }
        }

        // anim frame
        S.frameClock += dt;
        const step = 1 / Math.max(1, S.animFps);
        while(S.frameClock >= step){
          S.frameClock -= step;
          S.walkFrame = (S.walkFrame + 1) % Math.max(1, S.framesPerDir);
        }

        const atlas = getAtlasByName(S.atlas);
        const ok = isAtlasOk(atlas);

        // direction
        let dir = 'E';
        if(S.dirLock !== 'AUTO') dir = S.dirLock;
        else if(S.plan.length >= 2){
          const maxSeg = (S.plan.length - 1);
          const a = S.plan[S.segIdx % maxSeg];
          const b = S.plan[(S.segIdx + 1) % maxSeg];
          dir = vecToDir(b.x - a.x, b.y - a.y);
        }

        const frameName = buildFrameName(S.prefix, dir, S.walkFrame);
        const pivotX = S.x;
        const pivotY = S.y;

        if(!S.atlas){
          status.textContent='✖ Bitte Atlas auswählen.';
          status.style.color='#ff6b6b';
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
          S.raf = requestAnimationFrame(tick);
          return;
        }
        if(!ok){
          status.textContent=`✖ Atlas "${S.atlas}" nicht ok/geladen.`;
          status.style.color='#ff6b6b';
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
          S.raf = requestAnimationFrame(tick);
          return;
        }

        status.textContent='';
        const A = getAssets();
        const drew = (A && typeof A.drawAtlasFrame === 'function')
          ? A.drawAtlasFrame(ctx, S.atlas, frameName, pivotX, pivotY, { align:'pivot', scale:1 })
          : false;

        const fr = (atlas && atlas.frames) ? atlas.frames[frameName] : null;
        if(drew && fr){
          const dx = pivotX - fr.pivotX;
          const dy = pivotY - fr.pivotY;
          if(chkBBox.box.checked)  drawBox(ctx, dx, dy, fr.w, fr.h);
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
        } else {
          ctx.save();
          ctx.globalAlpha=0.85;
          ctx.fillStyle='#ffaaaa';
          ctx.font='14px monospace';
          ctx.fillText(`Frame nicht gefunden: ${frameName}`, 12, 22);
          ctx.restore();
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
        }

        S.raf = requestAnimationFrame(tick);
      }

      function start(){
        resetAnim();
        S.running = true;
        if(!S.raf) S.raf = requestAnimationFrame(tick);
      }

      function stop(){
        S.running = false;
      }

      // Events
      btnStart.addEventListener('click', start);
      btnStop.addEventListener('click', stop);

      btnRefresh.addEventListener('click', ()=>{
        repopulate();
        drawOnce();
      });

      atlasSel.addEventListener('change', ()=>{
        S.atlas = atlasSel.value;
        repopulate();
        drawOnce();
      });

      modeSel.addEventListener('change', ()=>{
        S.mode = modeSel.value || 'ANIM';
        previewWrap.style.display = (S.mode === 'PREVIEW') ? 'block' : 'none';
        // Stop anim if switching to preview
        if (S.mode === 'PREVIEW') S.running = false;
        drawOnce();
      });

      frameFilterIn.addEventListener('input', ()=>{
        S.previewFilter = String(frameFilterIn.value || '');
        repopulate();
        drawOnce();
      });

      frameSel.addEventListener('change', ()=>{
        S.previewFrame = frameSel.value || '';
        drawOnce();
      });

      prefixSel.addEventListener('change', ()=>{
        if(prefixSel.value){
          prefixIn.value = prefixSel.value;
          drawOnce();
        }
      });

      pathSel.addEventListener('change', ()=>{
        S.pathMode = pathSel.value || 'DIRS';
        rebuildPlan();
        drawOnce();
      });

      dirSel.addEventListener('change', ()=>{
        S.dirLock = dirSel.value || 'AUTO';
        drawOnce();
      });

      tilesIn.addEventListener('change', ()=>{
        rebuildPlan();
        drawOnce();
      });

      speedR.addEventListener('input', ()=>{
        S.pxPerSec = Math.max(10, Number(speedR.value)||140);
        speedLbl.textContent = `${S.pxPerSec} px/s`;
      });

      fpsR.addEventListener('input', ()=>{
        S.animFps = Math.max(1, Number(fpsR.value)||6);
        fpsLbl.textContent = `${S.animFps} fps`;
      });

      // Assets-ready hook
      window.addEventListener('cb:assets-ready', ()=>{
        repopulate();
        drawOnce();
      }, { passive:true });

      // Init
      repopulate();
      rebuildPlan();
      drawOnce();

      try{ console.info('[spritetest] mounted v26.01.15'); }catch(_e){}
    } catch(err){
      // falls irgendwas crasht, zeigen wir wenigstens den Fehler im Tab selbst
      root.innerHTML = '';
      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.color = '#ff6b6b';
      pre.textContent = '[spritetest] Render crash:\n' + (err && err.stack ? err.stack : String(err));
      root.appendChild(pre);
      try{ console.error('[spritetest] render crash', err); }catch(_e){}
    }
  }

  // -------------------------------------------------------------------------
  // REGISTER (stabil)
  // -------------------------------------------------------------------------
  function doRegister(){
    if(typeof window.registerInspectorTab === 'function'){
      window.registerInspectorTab(TAB_ID, mountSpriteTest, { title: TAB_NAME, icon: '🧪' });
      try{ console.info('[spritetest] registered as', TAB_ID); }catch(_e){}
      return true;
    }
    return false;
  }

  // Sofort versuchen + Retry
  if(!doRegister()){
    let tries = 0;
    const t = setInterval(()=>{
      tries++;
      if(doRegister() || tries > 120) clearInterval(t);
    }, 150);
  }

  // Zusätzlich: wenn Inspector später aufmacht/ready meldet, nochmal versuchen
  window.addEventListener('cb:insp:open', ()=>{ doRegister(); }, { passive:true });
  window.addEventListener('cb:insp:content:ready', ()=>{ doRegister(); }, { passive:true });

})();
