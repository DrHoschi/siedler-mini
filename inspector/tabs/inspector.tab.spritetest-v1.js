/* =========================================================================
 *  inspector/tab: SpriteTest
 *  Version: v26.01.04 (Pivot/Anchor Visualizer)
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
  const TAB_KEY   = 'SpriteTest';
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

    // Atlas Select
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

    // Prefix input
    const prefixIn = document.createElement('input');
    prefixIn.type = 'text';
    prefixIn.value = 'deer_';
    prefixIn.placeholder = 'z.B. deer_';
    prefixIn.style.width = '100%';
    prefixIn.style.padding = '6px';
    prefixIn.style.borderRadius = '8px';

    // Frames/Dir
    const framesIn = document.createElement('input');
    framesIn.type = 'number';
    framesIn.min = '1';
    framesIn.max = '16';
    framesIn.value = '8';
    framesIn.style.width = '100%';
    framesIn.style.padding = '6px';
    framesIn.style.borderRadius = '8px';

    // Tiles/Dir
    const tilesIn = document.createElement('input');
    tilesIn.type = 'number';
    tilesIn.min = '1';
    tilesIn.max = '20';
    tilesIn.value = '5';
    tilesIn.style.width = '100%';
    tilesIn.style.padding = '6px';
    tilesIn.style.borderRadius = '8px';


    // ---------------------------------------------------------------------
    // Profi-Controls: Speed + Pattern + Direction-Override + UnitAnim-Tuning
    // ---------------------------------------------------------------------

    // Speed (ms pro Tile) – Default ~350ms (wie bisher)
    const speedRow = document.createElement('div');
    speedRow.style.display = 'grid';
    speedRow.style.gridTemplateColumns = '1fr 120px';
    speedRow.style.gap = '10px';
    speedRow.style.marginTop = '6px';

    const speedLabel = document.createElement('div');
    speedLabel.textContent = 'Speed (ms/Tile)';
    speedLabel.style.opacity = '0.85';

    const speedIn = document.createElement('input');
    speedIn.type = 'number';
    speedIn.min = '60';
    speedIn.max = '2000';
    speedIn.step = '10';
    speedIn.value = '350';
    speedIn.style.width = '100%';
    speedIn.style.padding = '6px';
    speedIn.style.borderRadius = '8px';

    speedRow.appendChild(speedLabel);
    speedRow.appendChild(speedIn);

    // Pattern: Sequence (8 dirs), Square, Circle
    const patternRow = document.createElement('div');
    patternRow.style.display = 'grid';
    patternRow.style.gridTemplateColumns = '1fr 1fr';
    patternRow.style.gap = '10px';
    patternRow.style.marginTop = '6px';

    const patternSel = document.createElement('select');
    patternSel.style.width = '100%';
    patternSel.style.padding = '6px';
    patternSel.style.borderRadius = '8px';
    ['Sequence (8 dirs)','Square','Circle'].forEach(v=>{
      const o=document.createElement('option'); o.value=v; o.textContent=v; patternSel.appendChild(o);
    });

    const dirOverrideSel = document.createElement('select');
    dirOverrideSel.style.width = '100%';
    dirOverrideSel.style.padding = '6px';
    dirOverrideSel.style.borderRadius = '8px';
    ['Auto','N','NE','E','SE','S','SW','W','NW'].forEach(v=>{
      const o=document.createElement('option'); o.value=v; o.textContent = (v==='Auto'?'Dir: Auto':('Dir: '+v)); dirOverrideSel.appendChild(o);
    });

    patternRow.appendChild(patternSel);
    patternRow.appendChild(dirOverrideSel);

    // UnitAnim-Tuning (wirkt auf Map & SpriteTest, wenn UnitAnim aktiv ist)
    const tuningRow = document.createElement('div');
    tuningRow.style.display = 'flex';
    tuningRow.style.gap = '10px';
    tuningRow.style.flexWrap = 'wrap';
    tuningRow.style.marginTop = '6px';

    
    const chkIso = (()=> {
      const w = document.createElement('label');
      w.style.display='flex';
      w.style.alignItems='center';
      w.style.gap='6px';
      w.style.userSelect='none';
      const c = document.createElement('input');
      c.type='checkbox';
      c.checked=true;
      const t = document.createElement('span');
      t.textContent='ISO-Project';
      w.appendChild(c); w.appendChild(t);
      return { wrap:w, box:c };
    })();

    const offIn = document.createElement('input');
    offIn.type = 'number';
    offIn.min = '-4';
    offIn.max = '4';
    offIn.step = '1';
    offIn.value = '0';
    offIn.style.width = '90px';
    offIn.style.padding = '6px';
    offIn.style.borderRadius = '8px';

    const offLbl = document.createElement('div');
    offLbl.textContent = 'OffsetSteps';
    offLbl.style.opacity = '0.85';
    offLbl.style.alignSelf = 'center';

    tuningRow.appendChild(chkIso.wrap);
    tuningRow.appendChild(offLbl);
    tuningRow.appendChild(offIn);



    // Visual toggles
    const toggles = document.createElement('div');
    toggles.style.display = 'flex';
    toggles.style.gap = '10px';
    toggles.style.flexWrap = 'wrap';

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

    const chkPivot = mkCheck('Pivot anzeigen', true);
    const chkBox   = mkCheck('BoundingBox anzeigen', true);
    const chkFoot  = mkCheck('Fußlinie anzeigen', true);
    toggles.appendChild(chkPivot.wrap);
    toggles.appendChild(chkBox.wrap);
    toggles.appendChild(chkFoot.wrap);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';

    const btnStart = document.createElement('button');
    btnStart.textContent = 'Start Test';
    btnStart.style.flex = '1';
    btnStart.style.padding = '8px';
    btnStart.style.borderRadius = '999px';

    const btnStop = document.createElement('button');
    btnStop.textContent = 'Stop';
    btnStop.style.flex = '1';
    btnStop.style.padding = '8px';
    btnStop.style.borderRadius = '999px';

    btnRow.appendChild(btnStart);
    btnRow.appendChild(btnStop);

    // Info
    const info = document.createElement('div');
    info.style.opacity = '0.85';
    info.style.marginTop = '6px';
    info.textContent = 'Richtungs-Reihenfolge: N → NE → E → SE → S → SW → W → NW | Regel: Frame 0 = Idle';

    // Status
    const status = document.createElement('div');
    status.style.marginTop = '8px';
    status.style.whiteSpace = 'pre-wrap';
    status.style.fontSize = '12px';

    // Canvas
    const canvas = document.createElement('canvas');
    // Canvas-Größe: dynamisch (damit es auf iPad/iPhone nicht abgeschnitten wirkt)
    const vw = Math.max(320, Math.min(760, Math.floor(window.innerWidth * 0.92)));
    const vh = Math.max(220, Math.min(420, Math.floor(window.innerHeight * 0.34)));
    canvas.width = vw;
    canvas.height = vh;
    canvas.style.width = '100%';
    canvas.style.border = '1px solid rgba(255,255,255,0.2)';
    canvas.style.borderRadius = '10px';
    canvas.style.marginTop = '10px';
    const ctx = canvas.getContext('2d');

    // Assemble UI
    row('Atlas', atlasSel);

    const two = document.createElement('div');
    two.style.display = 'grid';
    two.style.gridTemplateColumns = '1fr 1fr';
    two.style.gap = '10px';
    const wrapPrefix = document.createElement('div');
    const wrapFrames = document.createElement('div');
    const l1 = document.createElement('div'); l1.textContent = 'Prefix (z.B. deer_)'; l1.style.opacity='0.85'; l1.style.marginBottom='4px';
    const l2 = document.createElement('div'); l2.textContent = 'Frames/Dir'; l2.style.opacity='0.85'; l2.style.marginBottom='4px';
    wrapPrefix.appendChild(l1); wrapPrefix.appendChild(prefixIn);
    wrapFrames.appendChild(l2); wrapFrames.appendChild(framesIn);
    two.appendChild(wrapPrefix);
    two.appendChild(wrapFrames);
    root.appendChild(two);

    row('Tiles/Dir', tilesIn);

    // Profi: Speed/Pattern/Tuning
    root.appendChild(speedRow);
    root.appendChild(patternRow);
    root.appendChild(tuningRow);

    root.appendChild(btnRow);
    root.appendChild(info);
    root.appendChild(toggles);
    root.appendChild(status);
    root.appendChild(canvas);

    // -----------------------------------------------------------------------
    // Test-Loop
    // -----------------------------------------------------------------------
    let running = false;
    let raf = 0;

    // motion state
    let dirIdx = 0;
    let stepInDir = 0;
    let frameIdx = 0;
    let tAcc = 0;
    let circlePhase = 0;

    // pseudo position in tiles (für Anzeige/Bewegung)
    let tx = 0, ty = 0;

    function setStatusOk(msg){
      status.style.color = '#c8ffb0';
      status.textContent = msg;
    }
    function setStatusWarn(msg){
      status.style.color = '#ffd080';
      status.textContent = msg;
    }
    function setStatusErr(msg){
      status.style.color = '#ff8080';
      status.textContent = msg;
    }

    function stop(){
      running = false;
      if(raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    btnStop.onclick = ()=> stop();

    btnStart.onclick = ()=>{
      stop();
      running = true;
      dirIdx = 0;
      stepInDir = 0;
      frameIdx = 0;
      tAcc = 0;
      circlePhase = 0;
      tx = 0; ty = 0;

      // UnitAnim-Tuning live übernehmen (wirkt auch im Game-Render auf der Map)
      // Hinweis: Das hilft, wenn Sprite-Richtungen "nach Bildschirm" benannt sind,
      // aber die Unit-Bewegung in Tile-Deltas läuft (Isometric-Projektion).
      try{
        if(window.UnitAnim && typeof window.UnitAnim.setTuning === 'function'){
          const aKey = atlasSel.value;
          const per = {};
          per[aKey] = {
            isoProject: !!(chkIso && chkIso.box && chkIso.box.checked),
            offsetSteps: parseInt(offIn.value||'0',10) || 0,
          };
          window.UnitAnim.setTuning({ perAtlas: per });
        }
      }catch(e){ /* no-op */ }

      loop(performance.now());
    };

    function loop(now){
      if(!running) return;

      const atlasName = atlasSel.value;
      const prefix = prefixIn.value || '';
      const framesPerDir = Math.max(1, Math.min(16, parseInt(framesIn.value||'8',10)));
      const tilesPerDir  = Math.max(1, Math.min(20, parseInt(tilesIn.value||'5',10)));

      const atlas = getAtlasByName(atlasName);
      if(!isAtlasOk(atlas)){
        setStatusErr(`✖ Atlas "${atlasName}" ist nicht ok/geladen.`);
        clearCanvas(ctx, canvas.width, canvas.height);
        raf = requestAnimationFrame(loop);
        return;
      }

      // Animationszeit: 8 FPS für Walk
      const dt = 16.67;
      tAcc += dt;

      // Alle ~120ms nächster Frame
      if(tAcc >= 120){
        tAcc = 0;
        frameIdx = (frameIdx + 1) % framesPerDir;
      }

      // Bewegung: alle ~350ms ein Tile "weiter"
      // (im SpriteTest-Canvas ist das nur eine Demo)
      if(!loop._moveAcc) loop._moveAcc = 0;
      loop._moveAcc += dt;
      const moveMs = Math.max(60, Math.min(2000, Number(speedIn.value)||350));
      if(loop._moveAcc >= moveMs){
        loop._moveAcc = 0;

        const pattern = (patternSel && patternSel.value) ? patternSel.value : 'Sequence (8 dirs)';
        const dirOv = (dirOverrideSel && dirOverrideSel.value) ? dirOverrideSel.value : 'Auto';

        const DIR_VEC = {
        N:  {dx: 0, dy:-1},
        NE: {dx: 1, dy:-1},
        E:  {dx: 1, dy: 0},
        SE: {dx: 1, dy: 1},
        S:  {dx: 0, dy: 1},
        SW: {dx:-1, dy: 1},
        W:  {dx:-1, dy: 0},
        NW: {dx:-1, dy:-1},
      };

        function stepDir(dirToken){
          const v = DIR_VEC[dirToken];
          if(!v) return;
          tx += v.dx;
          ty += v.dy;
        }

        // ---------------------------------------------------------------
        // Bewegungs-Muster
        // - Auto: nutzt Pattern
        // - Override: läuft N/NE/E/... dauerhaft (gut zum Prüfen)
        // ---------------------------------------------------------------
        if(dirOv !== 'Auto'){
          // fester Richtungstest
          stepDir(dirOv);
        } else if(pattern.startsWith('Sequence')){
          // 8 Richtungen nacheinander, je "Tiles/Dir" Tiles (klassisch)
          const dir = DIRS[dirIdx];
          stepDir(dir);
          stepInDir++;
          if(stepInDir >= tilesPerDir){
            stepInDir = 0;
            dirIdx = (dirIdx + 1) % DIRS.length;
          }
        } else if(pattern === 'Square'){
          // Viereck: E -> S -> W -> N (Axis-aligned in Tile-Space)
          const sq = ['E','S','W','N'];
          const sIdx = (dirIdx % sq.length);
          const dir = sq[sIdx];
          stepDir(dir);
          stepInDir++;
          if(stepInDir >= tilesPerDir){
            stepInDir = 0;
            dirIdx = (dirIdx + 1) % sq.length;
          }
        } else {
          // Circle: Octagon-Ring (16 Steps), wiederholt
          const ring = ['E','E','SE','SE','S','S','SW','SW','W','W','NW','NW','N','N','NE','NE'];
          const dir = ring[(circlePhase) % ring.length];
          // dirIdx halten wir trotzdem konsistent (z.B. Anzeige / Key-Build)
          dirIdx = DIRS.indexOf(dir);
          circlePhase++;
          stepDir(dir);
        }
      }
// --- Zeichnen ---
      clearCanvas(ctx, canvas.width, canvas.height);

      // Zeichnungsanker in der Mitte (Pivot-Punkt)
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.70;

      // 1) Sprite zeichnen (Asset-API)
      if(window.Assets && typeof window.Assets.drawAtlasFrame === 'function'){
        // drawAtlasFrame(atlasName, frameKey, x, y, opts)
        // Annahme: (x,y) ist Pivot-Punkt (entspricht meta.pivot)
        window.Assets.drawAtlasFrame(atlasName, key, cx, cy, { ctx });
      } else {
        // Notfall: Falls die API nicht existiert, wenigstens Status zeigen
        setStatusErr('✖ Assets.drawAtlasFrame nicht gefunden.');
        raf = requestAnimationFrame(loop);
        return;
      }

      // 2) Pivot/Box/Fußlinie überlagern
      // TopLeft aus Pivot ableiten
      const fw = (meta.frame && meta.frame.w) ? meta.frame.w : 128;
      const fh = (meta.frame && meta.frame.h) ? meta.frame.h : 128;
      const pv = meta.pivot || { x: fw/2, y: fh }; // fallback
      const topLeftX = cx - pv.x;
      const topLeftY = cy - pv.y;

      if(chkFoot.box.checked){
        // Fußlinie = Pivot-Y in Welt (cy)
        drawFootLine(ctx, cy, canvas.width);
      }
      if(chkBox.box.checked){
        drawBox(ctx, topLeftX, topLeftY, fw, fh);
      }
      if(chkPivot.box.checked){
        drawCrosshair(ctx, cx, cy);
      }

      // Statustext
      const ax = (pv.x / fw).toFixed(2);
      const ay = (pv.y / fh).toFixed(2);
      setStatusOk(
        `✔ Atlas ok: ${atlasName}\n` +
        `Frame: ${key}\n` +
        `DIR=${dir} frame=${frameIdx}/${framesPerDir-1}  tilesPerDir=${tilesPerDir}\n` +
        `Pivot(px): x=${pv.x}, y=${pv.y}  Anchor(norm): x=${ax}, y=${ay}\n` +
        `BBox: w=${fw}, h=${fh} | DemoPos(tx,ty)=(${tx},${ty})`
      );

      raf = requestAnimationFrame(loop);
    }
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
