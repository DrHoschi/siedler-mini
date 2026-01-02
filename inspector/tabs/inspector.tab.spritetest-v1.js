/* =========================================================================
 * Datei   : inspector/tabs/inspector.tab.spritetest-v1.js
 * Projekt : Neue Siedler (Siedler‑Mini)
 * Version : v26.01.09 (Stabil + Picker + Pivot/Trail)
 * Autor   : Mann + ChatGPT
 *
 * WICHTIG (Stabilität):
 *  - Dieses Projekt nutzt inspector.tabs.adapter.js
 *    => Tabs MÜSSEN über window.registerInspectorTab(name, renderFn) registrieren.
 *  - Kein direkter Zugriff auf "Inspector"/"Game" globale Objekte!
 *    (Safari/iOS wirft sonst schnell "Can't find variable" und der Tab verschwindet.)
 *
 * Features:
 *  - Atlas auswählen (alle geladenen Atlanten aus window.Assets.atlases)
 *  - Frame/Prefix auswählen (aus Atlas-Keys generiert)
 *  - 8 Richtungen Testlauf (N,NE,E,SE,S,SW,W,NW)
 *  - Pivot/Anchor Crosshair + BBox + Fußlinie
 *  - Trail im Canvas (zeigt, ob Pivot stabil auf der Lauf-Linie bleibt)
 *
 * Konvention:
 *  - Frame 0 = Idle (zukünftig)
 *  - Walk-Frames = _walk_0..N (du passt Reihenfolge/Frames in deinem Atlas an)
 * ========================================================================= */

(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // Konstanten
  // ---------------------------------------------------------------------------
  const TAB_KEY = 'spritetest'; // IMPORTANT: lower-case, wie alle anderen Tabs
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  // ---------------------------------------------------------------------------
  // Kleine Helpers
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function getAssets(){
    return window.Assets || null;
  }

  function listAtlases(){
    const A = getAssets();
    const atl = A && A.atlases ? Object.keys(A.atlases) : [];
    atl.sort();
    return atl;
  }

  function getAtlas(name){
    const A = getAssets();
    if(!A || !A.atlases) return null;
    return A.atlases[name] || null;
  }

  function isAtlasOk(atlas){
    if(!atlas) return false;
    if(atlas.ok === true) return true;
    if(atlas.image && atlas.image.complete) return true;
    if(atlas.img && atlas.img.complete) return true;
    return false;
  }

  function getFrameMeta(atlas, key){
    if(!atlas) return null;
    if(atlas.frames && atlas.frames[key]) return atlas.frames[key];
    if(atlas.data && atlas.data.frames && atlas.data.frames[key]) return atlas.data.frames[key];
    if(atlas.json && atlas.json.frames && atlas.json.frames[key]) return atlas.json.frames[key];
    if(atlas._json && atlas._json.frames && atlas._json.frames[key]) return atlas._json.frames[key];
    return null;
  }

  // Extrahiert aus Keys so etwas wie "deer_" oder "carrier_" usw.
  // Heuristik: alles bis zum "_<DIR>_".
  function extractPrefixesFromAtlas(atlas){
    const keys = collectFrameKeys(atlas);
    const set = new Set();

    // Beispiel keys:
    //  deer_N_walk_0
    //  deer_NE_walk_3
    //  building_hq_frame_0_0
    // Wir versuchen primär das 8-dir Pattern zu erkennen.

    for(const k of keys){
      // 8-dir pattern
      const m = k.match(/^(.*)_((?:N|NE|E|SE|S|SW|W|NW))_/);
      if(m && m[1]) {
        set.add(m[1] + '_');
        continue;
      }
      // sonst: generischer Prefix bis zum letzten '_'
      const i = k.lastIndexOf('_');
      if(i > 0) set.add(k.slice(0, i+1));
    }

    return Array.from(set).sort();
  }

  function collectFrameKeys(atlas){
    if(!atlas) return [];
    const keys = [];
    if(atlas.frames && typeof atlas.frames === 'object') keys.push(...Object.keys(atlas.frames));
    else if(atlas.data && atlas.data.frames) keys.push(...Object.keys(atlas.data.frames));
    else if(atlas.json && atlas.json.frames) keys.push(...Object.keys(atlas.json.frames));
    else if(atlas._json && atlas._json.frames) keys.push(...Object.keys(atlas._json.frames));
    return keys;
  }

  function buildWalkKey(prefix, dir, idx){
    // Standard für Tiere/Units im Test: <prefix><DIR>_walk_<i>
    // prefix erwartet inkl. trailing underscore (z.B. "deer_")
    return `${prefix}${dir}_walk_${idx}`;
  }

  function clearCanvas(ctx, w, h){
    ctx.clearRect(0,0,w,h);

    // dezentes Grid
    const step = 32;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    for(let x=0; x<=w; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for(let y=0; y<=h; y+=step){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.strokeStyle = '#ffffff';
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
    ctx.globalAlpha = 0.55;
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
    ctx.strokeStyle = '#ffd080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // RenderFn für InspectorContent
  // ---------------------------------------------------------------------------
  function renderSpriteTest(root){
    root.innerHTML = '';
    root.style.padding = '8px';
    root.style.color = '#fff';
    root.style.fontFamily = 'monospace';

    // UI helpers
    const mkRow = (label, el)=>{
      const w = document.createElement('div');
      w.style.margin = '6px 0';
      const l = document.createElement('div');
      l.textContent = label;
      l.style.opacity = '0.85';
      l.style.marginBottom = '4px';
      w.appendChild(l);
      w.appendChild(el);
      root.appendChild(w);
      return w;
    };

    const mkBtn = (txt)=>{
      const b = document.createElement('button');
      b.textContent = txt;
      b.style.padding = '8px';
      b.style.borderRadius = '999px';
      return b;
    };

    const mkCheck = (label, checked=true)=>{
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
    };

    // Atlas select
    const atlasSel = document.createElement('select');
    atlasSel.style.width='100%';
    atlasSel.style.padding='6px';
    atlasSel.style.borderRadius='8px';

    const atlases = listAtlases();
    atlases.forEach(name=>{
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      atlasSel.appendChild(o);
    });

    // Prefix select + manual prefix
    const prefixSel = document.createElement('select');
    prefixSel.style.width='100%';
    prefixSel.style.padding='6px';
    prefixSel.style.borderRadius='8px';

    const prefixIn = document.createElement('input');
    prefixIn.type='text';
    prefixIn.placeholder='z.B. deer_';
    prefixIn.value='deer_';
    prefixIn.style.width='100%';
    prefixIn.style.padding='6px';
    prefixIn.style.borderRadius='8px';

    // Frames/Dir + Tiles/Dir
    const framesIn = document.createElement('input');
    framesIn.type='number';
    framesIn.min='1';
    framesIn.max='32';
    framesIn.value='8';
    framesIn.style.width='100%';
    framesIn.style.padding='6px';
    framesIn.style.borderRadius='8px';

    const tilesIn = document.createElement('input');
    tilesIn.type='number';
    tilesIn.min='1';
    tilesIn.max='50';
    tilesIn.value='5';
    tilesIn.style.width='100%';
    tilesIn.style.padding='6px';
    tilesIn.style.borderRadius='8px';

    // toggles
    const toggles = document.createElement('div');
    toggles.style.display='flex';
    toggles.style.gap='10px';
    toggles.style.flexWrap='wrap';

    const chkPivot = mkCheck('Pivot', true);
    const chkBox   = mkCheck('BBox', true);
    const chkFoot  = mkCheck('Fußlinie', true);
    const chkTrail = mkCheck('Trail', true);

    toggles.appendChild(chkPivot.wrap);
    toggles.appendChild(chkBox.wrap);
    toggles.appendChild(chkFoot.wrap);
    toggles.appendChild(chkTrail.wrap);

    // status
    const status = document.createElement('div');
    status.style.marginTop='8px';
    status.style.whiteSpace='pre-wrap';
    status.style.fontSize='12px';

    const setStatus = (type, msg)=>{
      status.style.color = type==='ok' ? '#c8ffb0' : type==='warn' ? '#ffd080' : '#ff8080';
      status.textContent = msg;
    };

    // canvas
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 420;
    canvas.style.width='100%';
    canvas.style.border='1px solid rgba(255,255,255,0.2)';
    canvas.style.borderRadius='10px';
    canvas.style.marginTop='10px';
    const ctx = canvas.getContext('2d');

    // buttons
    const btnRow = document.createElement('div');
    btnRow.style.display='flex';
    btnRow.style.gap='10px';
    const btnStart = mkBtn('Start Test');
    btnStart.style.flex='1';
    const btnStop = mkBtn('Stop');
    btnStop.style.flex='1';
    btnRow.appendChild(btnStart);
    btnRow.appendChild(btnStop);

    // info
    const info = document.createElement('div');
    info.style.opacity='0.85';
    info.style.marginTop='6px';
    info.textContent = 'Richtungs-Reihenfolge: N → NE → E → SE → S → SW → W → NW | Regel: Frame 0 = Idle';

    // layout
    mkRow('Atlas', atlasSel);
    mkRow('Prefix‑Picker (aus Atlas)', prefixSel);
    mkRow('Prefix (manuell)', prefixIn);

    const grid = document.createElement('div');
    grid.style.display='grid';
    grid.style.gridTemplateColumns='1fr 1fr';
    grid.style.gap='10px';

    const wFrames = document.createElement('div');
    const wTiles  = document.createElement('div');
    const lF = document.createElement('div'); lF.textContent='Frames/Dir'; lF.style.opacity='0.85'; lF.style.marginBottom='4px';
    const lT = document.createElement('div'); lT.textContent='Tiles/Dir';  lT.style.opacity='0.85'; lT.style.marginBottom='4px';
    wFrames.appendChild(lF); wFrames.appendChild(framesIn);
    wTiles.appendChild(lT);  wTiles.appendChild(tilesIn);
    grid.appendChild(wFrames);
    grid.appendChild(wTiles);
    root.appendChild(grid);

    root.appendChild(btnRow);
    root.appendChild(info);
    root.appendChild(toggles);
    root.appendChild(status);
    root.appendChild(canvas);

    // -----------------------------------------------------------------------
    // Prefix-Liste füllen
    // -----------------------------------------------------------------------
    function refreshPrefixPicker(){
      prefixSel.innerHTML='';
      const atlas = getAtlas(atlasSel.value);
      if(!atlas){
        const o = document.createElement('option');
        o.value=''; o.textContent='(kein Atlas)';
        prefixSel.appendChild(o);
        return;
      }
      const prefs = extractPrefixesFromAtlas(atlas);
      if(!prefs.length){
        const o = document.createElement('option');
        o.value=''; o.textContent='(keine Frames)';
        prefixSel.appendChild(o);
        return;
      }
      prefs.forEach(p=>{
        const o = document.createElement('option');
        o.value=p;
        o.textContent=p;
        prefixSel.appendChild(o);
      });

      // best guess: wenn deer_ existiert, nimm das
      const want = prefs.includes('deer_') ? 'deer_' : prefs[0];
      prefixSel.value = want;
      prefixIn.value = want;
    }

    atlasSel.addEventListener('change', ()=>{
      refreshPrefixPicker();
      clearCanvas(ctx, canvas.width, canvas.height);
      setStatus('warn', 'Atlas gewechselt – starte den Test.');
    });

    prefixSel.addEventListener('change', ()=>{
      if(prefixSel.value) prefixIn.value = prefixSel.value;
    });

    // initial
    if(!atlases.length){
      setStatus('err', '✖ Keine Atlanten gefunden. (Sind Assets geladen?)');
    } else {
      refreshPrefixPicker();
      setStatus('warn', 'Bereit. Wähle Atlas/Prefix und drücke „Start Test“.');
    }

    // -----------------------------------------------------------------------
    // Test-Loop
    // -----------------------------------------------------------------------
    let running = false;
    let raf = 0;

    let dirIdx = 0;
    let stepInDir = 0;
    let frameIdx = 0;
    let tAcc = 0;
    let circlePhase = 0;

    // Trail points (Canvas)
    const trail = [];
    const TRAIL_MAX = 140;

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
      trail.length = 0;
      loop();
    };

    function loop(){
      if(!running) return;

      const atlasName = atlasSel.value;
      const atlas = getAtlas(atlasName);

      const prefix = (prefixIn.value || '').trim();
      const framesPerDir = clamp(parseInt(framesIn.value||'8',10)||8, 1, 32);
      const tilesPerDir  = clamp(parseInt(tilesIn.value||'5',10)||5, 1, 50);

      if(!isAtlasOk(atlas)){
        clearCanvas(ctx, canvas.width, canvas.height);
        setStatus('err', `✖ Atlas "${atlasName}" ist nicht ok/geladen.\n(Tipp: Pfade in core/asset.js prüfen + 404 im Network)`);
        raf = requestAnimationFrame(loop);
        return;
      }

      const A = getAssets();
      if(!A || typeof A.drawAtlasFrame !== 'function'){
        clearCanvas(ctx, canvas.width, canvas.height);
        setStatus('err', '✖ Assets.drawAtlasFrame() nicht gefunden.');
        raf = requestAnimationFrame(loop);
        return;
      }

      // Timing
      const dt = 16.67;
      tAcc += dt;

      // Frame: ~8 FPS
      if(tAcc >= 120){
        tAcc = 0;
        frameIdx = (frameIdx + 1) % framesPerDir;
      }

      // Richtung wechseln: alle ~350ms ein Tile
      if(!loop._moveAcc) loop._moveAcc = 0;
      loop._moveAcc += dt;
      if(loop._moveAcc >= 350){
        loop._moveAcc = 0;

        if(circlePhase === 0){
          stepInDir++;
          if(stepInDir >= tilesPerDir){
            stepInDir = 0;
            dirIdx = (dirIdx + 1) % DIRS.length;
            if(dirIdx === 0) circlePhase = 1; // danach Kreis
          }
        } else {
          const ring = ['E','E','SE','SE','S','S','SW','SW','W','W','NW','NW','N','N','NE','NE'];
          const di = ring[(circlePhase-1) % ring.length];
          dirIdx = DIRS.indexOf(di);
          circlePhase++;
          if(circlePhase > ring.length*3) circlePhase = 1;
        }
      }

      const dir = DIRS[dirIdx];
      const key = buildWalkKey(prefix, dir, frameIdx);

      const meta = getFrameMeta(atlas, key);
      if(!meta){
        clearCanvas(ctx, canvas.width, canvas.height);
        setStatus('warn', `⚠ Frame fehlt: ${key}\nAtlas: ${atlasName}\nPrefix: "${prefix}" | DIR=${dir} frame=${frameIdx}`);
        raf = requestAnimationFrame(loop);
        return;
      }

      // --- draw ---
      clearCanvas(ctx, canvas.width, canvas.height);

      // erwarteter Pivot-Punkt im Canvas
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.70;

      // Trail (Pivot-Position)
      if(chkTrail.box.checked){
        trail.push({x:cx, y:cy});
        if(trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX);
        drawTrail(ctx, trail);
      }

      // Sprite
      A.drawAtlasFrame(atlasName, key, cx, cy, { ctx });

      // Meta -> Box ableiten
      const fw = meta.frame && meta.frame.w ? meta.frame.w : 128;
      const fh = meta.frame && meta.frame.h ? meta.frame.h : 128;
      const pv = meta.pivot || { x: fw/2, y: fh }; // fallback: bottom-center
      const topLeftX = cx - pv.x;
      const topLeftY = cy - pv.y;

      if(chkFoot.box.checked) drawFootLine(ctx, cy, canvas.width);
      if(chkBox.box.checked)  drawBox(ctx, topLeftX, topLeftY, fw, fh);
      if(chkPivot.box.checked) drawCrosshair(ctx, cx, cy);

      const ax = (pv.x / fw).toFixed(2);
      const ay = (pv.y / fh).toFixed(2);

      setStatus('ok',
        `✔ Atlas ok: ${atlasName}\n`+
        `Frame: ${key}\n`+
        `DIR=${dir} frame=${frameIdx}/${framesPerDir-1} | tilesPerDir=${tilesPerDir}\n`+
        `Pivot(px): x=${pv.x}, y=${pv.y} | Anchor(norm): x=${ax}, y=${ay}\n`+
        `BBox: w=${fw}, h=${fh}\n`+
        `Hinweis: Wenn es "wackelt", liegt es fast immer an pivot/footline im 128×128 Frame.`
      );

      raf = requestAnimationFrame(loop);
    }

    // cleanup wenn Tab neu gerendert wird
    root._spritetest_cleanup = ()=> stop();
  }

  // ---------------------------------------------------------------------------
  // Registrierung (robust, wie die anderen Tabs)
  // ---------------------------------------------------------------------------
  function registerNow(){
    if(typeof window.registerInspectorTab !== 'function') return false;
    window.registerInspectorTab(TAB_KEY, renderSpriteTest);
    return true;
  }

  // sofort versuchen
  if(!registerNow()){
    // Fallback: ein paar Mal versuchen (iOS Lade-Reihenfolge)
    let tries = 0;
    const t = setInterval(()=>{
      tries++;
      if(registerNow() || tries > 60) clearInterval(t);
    }, 150);
  }

})();
