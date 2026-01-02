/* =========================================================================
 *  inspector/tab: SpriteTest
 *  Version: v26.01.05 (Register-Fix + Path/Trail Toggle + Pivot-Lane)
 *  Zweck:
 *   - Schnelltest für 8-Richtungs-Sprites (1024px / 8x8 => 128x128 Frames)
 *   - Zeigt Pivot/Anker (Crosshair), Bounding-Box, Fußlinie
 *   - Zeigt zusätzlich den Laufpfad:
 *       (A) Soll-Pfad (gestrichelt)  [optional]
 *       (B) Ist-Trail als Linie      [optional]
 *       (C) Ist-Trail als Punkte     [optional]
 *
 *  WICHTIG (Projekt-Konvention):
 *   - Frame 0 = Idle (Regel, immer der erste Frame pro Richtung)
 *   - Richtungs-Reihenfolge: N, NE, E, SE, S, SW, W, NW
 *
 *  Hinweis:
 *   - Dieser Tab registriert sich PRIMÄR über window.registerInspectorTab(...)
 *     (weil das in deinem Projekt das stabile API ist) und fällt erst danach
 *     auf Inspector.registerTab/addTab zurück.
 * ========================================================================= */
(function () {
  'use strict';

  /* -------------------------------------------------------------------------
   * Konstanten
   * ---------------------------------------------------------------------- */
  const TAB_ID   = 'spritetest';     // interne ID (klein, stabil)
  const TAB_NAME = 'SpriteTest';     // Button-Text
  const TAB_ICON = '🧪';

  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  // Default: 1024/8 = 128
  const DEFAULT_FRAME_W = 128;
  const DEFAULT_FRAME_H = 128;

  // Iso-Test: Umrechnung Tile->Screen (für Pivot-Laufspur im Canvas)
  // (tileW/tileH sind NUR für den Test-Canvas, nicht für dein echtes Game.)
  const ISO = {
    tileW: 64,
    tileH: 32,
    // Standard-Isometrie: screenX=(tx-ty)*tileW/2, screenY=(tx+ty)*tileH/2
    toScreen(tx, ty){
      const x = (tx - ty) * (ISO.tileW * 0.5);
      const y = (tx + ty) * (ISO.tileH * 0.5);
      return { x, y };
    }
  };

  // Bewegung in Tile-Space pro Richtung
  const DIR_VEC = {
    N : {dx:  0, dy: -1},
    NE: {dx:  1, dy: -1},
    E : {dx:  1, dy:  0},
    SE: {dx:  1, dy:  1},
    S : {dx:  0, dy:  1},
    SW: {dx: -1, dy:  1},
    W : {dx: -1, dy:  0},
    NW: {dx: -1, dy: -1},
  };

  /* -------------------------------------------------------------------------
   * Helper: Atlas Zugriff (robust gegen Loader-Varianten)
   * ---------------------------------------------------------------------- */
  function getAtlasByName(name){
    const A = window.Assets || null;
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

  /* -------------------------------------------------------------------------
   * Helper: Tab-Registration (wichtigster Fix für "Tab nicht sichtbar")
   *   1) window.registerInspectorTab(...) (Projekt-Standard)
   *   2) Inspector.registerTab/addTab (Fallback)
   *   3) DOM-Fallback (wenn Inspector API nicht greifbar)
   * ---------------------------------------------------------------------- */
  function tryRegisterViaGlobalAPI(mountFn){
    if(typeof window.registerInspectorTab !== 'function') return false;

    // Manche Varianten: (name, mount) oder (name, mount, opts)
    try{
      window.registerInspectorTab(TAB_ID, mountFn, { id: TAB_ID, title: TAB_NAME, icon: TAB_ICON, order: 90 });
      return true;
    }catch(_e1){
      try{
        window.registerInspectorTab(TAB_ID, mountFn);
        return true;
      }catch(_e2){
        return false;
      }
    }
  }

  function tryRegisterViaInspectorObj(mountFn){
    const I = window.Inspector || window.inspector || null;
    if(!I) return false;

    const def = { id: TAB_ID, title: TAB_NAME, icon: TAB_ICON, onShow: (el)=> mountFn(el) };
    try{
      if(typeof I.registerTab === 'function'){ I.registerTab(def); return true; }
      if(typeof I.addTab      === 'function'){ I.addTab(def);      return true; }
      if(I.api && typeof I.api.registerTab === 'function'){ I.api.registerTab(def); return true; }
      if(I.api && typeof I.api.addTab === 'function'){ I.api.addTab(def); return true; }
      if(I.tabs && typeof I.tabs.register === 'function'){ I.tabs.register(def); return true; }
    }catch(_){}
    return false;
  }

  function tryRegisterDomFallback(mountFn){
    // Minimaler Fallback: Button + Section direkt in #inspector einhängen.
    const insp = document.querySelector('#inspector');
    if(!insp) return false;

    const tabs = insp.querySelector('.insp-tabs');
    const content = insp.querySelector('.insp-content');
    if(!tabs || !content) return false;

    // Button nur anlegen, wenn nicht existiert
    if(tabs.querySelector(`[data-tab="${TAB_ID}"]`)) return true;

    const btn = document.createElement('button');
    btn.textContent = TAB_NAME;
    btn.dataset.tab = TAB_ID;
    btn.className = 'insp-tab'; // passt zu deinem Design

    const sec = document.createElement('section');
    sec.dataset.panel = TAB_ID;
    sec.style.display = 'none';

    tabs.appendChild(btn);
    content.appendChild(sec);

    // sehr einfache Umschalt-Logik (falls der Inspector-Core es nicht übernimmt)
    btn.addEventListener('click', ()=>{
      content.querySelectorAll('section').forEach(s=> s.style.display = (s.dataset.panel===TAB_ID ? 'block' : 'none'));
      window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab: TAB_ID } }));
      if(!sec.dataset.mounted){
        mountFn(sec);
        sec.dataset.mounted = '1';
      }
    });

    return true;
  }

  function registerTab(mountFn){
    // 1) Global API (sollte bei dir immer funktionieren)
    if(tryRegisterViaGlobalAPI(mountFn)) return true;

    // 2) Inspector-Objekt-Fallback
    if(tryRegisterViaInspectorObj(mountFn)) return true;

    // 3) DOM-Fallback
    if(tryRegisterDomFallback(mountFn)) return true;

    return false;
  }

  /* -------------------------------------------------------------------------
   * Rendering Helpers (Canvas)
   * ---------------------------------------------------------------------- */
  function clearCanvas(ctx, w, h){
    ctx.clearRect(0,0,w,h);

    // leichter Grid-Hintergrund
    const step = 32;
    ctx.save();
    ctx.globalAlpha = 0.12;
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
    ctx.globalAlpha = 0.95;
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

  function drawDashedPath(ctx, pts){
    if(!pts || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8,6]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrailLine(ctx, pts){
    if(!pts || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffcc66';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrailDots(ctx, pts){
    if(!pts || !pts.length) return;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#ffcc66';
    for(let i=0;i<pts.length;i++){
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------------------
   * UI Render
   * ---------------------------------------------------------------------- */
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

    const chkPivot = mkCheck('Pivot', true);
    const chkBox   = mkCheck('BBox', true);
    const chkFoot  = mkCheck('Fußlinie', true);

    const chkPlan  = mkCheck('Soll-Pfad', true);
    const chkLine  = mkCheck('Trail Linie', true);
    const chkDots  = mkCheck('Trail Punkte', false);

    [chkPivot,chkBox,chkFoot,chkPlan,chkLine,chkDots].forEach(c=> toggles.appendChild(c.wrap));

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
    canvas.width = 520;
    canvas.height = 420;
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
    root.appendChild(btnRow);
    root.appendChild(info);
    root.appendChild(toggles);
    root.appendChild(status);
    root.appendChild(canvas);

    /* -----------------------------------------------------------------------
     * Test-Loop
     * -------------------------------------------------------------------- */
    let running = false;
    let raf = 0;

    // motion state
    let dirIdx = 0;
    let stepInDir = 0;
    let frameIdx = 0;
    let tAcc = 0;
    let circlePhase = 0;

    // position in tiles (für Testbewegung)
    let tx = 0, ty = 0;

    // Trail: echte Pivot-Positionen (Canvas-Koordinaten)
    const trail = [];
    const MAX_TRAIL = 600;

    function setStatusOk(msg){ status.style.color = '#c8ffb0'; status.textContent = msg; }
    function setStatusWarn(msg){ status.style.color = '#ffd080'; status.textContent = msg; }
    function setStatusErr(msg){ status.style.color = '#ff8080'; status.textContent = msg; }

    function stop(){
      running = false;
      if(raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    btnStop.onclick = ()=> stop();

    // Soll-Pfad einmal "vorrechnen" (damit du sofort siehst, ob die Lane stimmt)
    function buildPlannedPathPoints(cx, cy, tilesPerDir){
      const pts = [];
      let ptx=0, pty=0;
      let pDirIdx=0;
      let pStepInDir=0;
      let pCirclePhase=0;

      function push(){
        const sc = ISO.toScreen(ptx, pty);
        pts.push({ x: cx + sc.x, y: cy + sc.y });
      }

      // Startpunkt
      push();

      // Erst alle 8 Richtungen je tilesPerDir Schritte
      while(pCirclePhase === 0){
        const d = DIRS[pDirIdx];
        const v = DIR_VEC[d];
        ptx += v.dx; pty += v.dy;
        pStepInDir++;
        push();

        if(pStepInDir >= tilesPerDir){
          pStepInDir = 0;
          pDirIdx = (pDirIdx + 1) % DIRS.length;
          if(pDirIdx === 0){
            pCirclePhase = 1;
            ptx = 0; pty = 0;
            push();
          }
        }

        // Sicherheitsbremse
        if(pts.length > 400) break;
      }

      // Kreis / Octagon: ein paar Runden (nur damit man "runde" Bewegungen sieht)
      const ring = ['E','E','SE','SE','S','S','SW','SW','W','W','NW','NW','N','N','NE','NE'];
      for(let r=0; r<ring.length*2; r++){
        const d = ring[r % ring.length];
        const v = DIR_VEC[d];
        ptx += v.dx; pty += v.dy;
        push();
      }

      return pts;
    }

    btnStart.onclick = ()=>{
      stop();
      running = true;
      dirIdx = 0;
      stepInDir = 0;
      frameIdx = 0;
      tAcc = 0;
      circlePhase = 0;
      tx = 0; ty = 0;
      trail.length = 0;
      loop(performance.now());
    };

    function loop(){
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

      // Animationszeit: ~8 FPS für Walk
      const dt = 16.67;
      tAcc += dt;

      // Alle ~120ms nächster Frame
      if(tAcc >= 120){
        tAcc = 0;
        frameIdx = (frameIdx + 1) % framesPerDir;
      }

      // Bewegung: alle ~350ms ein Tile weiter
      if(!loop._moveAcc) loop._moveAcc = 0;
      loop._moveAcc += dt;
      if(loop._moveAcc >= 350){
        loop._moveAcc = 0;

        if(circlePhase === 0){
          const d = DIRS[dirIdx];
          const v = DIR_VEC[d];
          tx += v.dx; ty += v.dy;
          stepInDir++;

          if(stepInDir >= tilesPerDir){
            stepInDir = 0;
            dirIdx = (dirIdx + 1) % DIRS.length;
            if(dirIdx === 0){
              circlePhase = 1;
              tx = 0; ty = 0;
            }
          }
        } else {
          // Kreis: Octagon-Ring in Iso (damit man Sprites bei Richtungswechsel sieht)
          const ring = ['E','E','SE','SE','S','S','SW','SW','W','W','NW','NW','N','N','NE','NE'];
          const d = ring[(circlePhase-1) % ring.length];
          dirIdx = DIRS.indexOf(d);
          const v = DIR_VEC[d];
          tx += v.dx; ty += v.dy;

          circlePhase++;
          if(circlePhase > ring.length*3){
            circlePhase = 1;
            tx = 0; ty = 0;
          }
        }
      }

      const dir = DIRS[dirIdx];

      // Im Test: wir laufen 0..framesPerDir-1 durch (damit du alles siehst).
      const key = buildFrameName(prefix, dir, frameIdx);

      const meta = getFrameMeta(atlas, key);
      if(!meta){
        setStatusWarn(`⚠ Frame fehlt: ${key}\nAtlas ok: ja | Prefix: "${prefix}" | dir=${dir} frame=${frameIdx}`);
        clearCanvas(ctx, canvas.width, canvas.height);
        raf = requestAnimationFrame(loop);
        return;
      }

      // --- Zeichnen ---
      clearCanvas(ctx, canvas.width, canvas.height);

      // Basisanker (Mitte) + Iso-Offset aus (tx,ty)
      const baseX = canvas.width * 0.5;
      const baseY = canvas.height * 0.70;
      const sc = ISO.toScreen(tx, ty);
      const cx = baseX + sc.x;
      const cy = baseY + sc.y;

      // Soll-Pfad & Trail (vor dem Sprite zeichnen, damit Sprite oben liegt)
      const planned = buildPlannedPathPoints(baseX, baseY, tilesPerDir);
      if(chkPlan.box.checked) drawDashedPath(ctx, planned);

      // Trail updaten
      trail.push({ x: cx, y: cy });
      if(trail.length > MAX_TRAIL) trail.shift();

      if(chkLine.box.checked) drawTrailLine(ctx, trail);
      if(chkDots.box.checked) drawTrailDots(ctx, trail);

      // 1) Sprite zeichnen
      if(window.Assets && typeof window.Assets.drawAtlasFrame === 'function'){
        // drawAtlasFrame(atlasName, frameKey, x, y, opts)
        // Annahme: (x,y) ist Pivot-Punkt (entspricht meta.pivot)
        window.Assets.drawAtlasFrame(atlasName, key, cx, cy, { ctx });
      } else {
        setStatusErr('✖ Assets.drawAtlasFrame nicht gefunden.');
        raf = requestAnimationFrame(loop);
        return;
      }

      // 2) Pivot/Box/Fußlinie überlagern
      const fw = (meta.frame && meta.frame.w) ? meta.frame.w : DEFAULT_FRAME_W;
      const fh = (meta.frame && meta.frame.h) ? meta.frame.h : DEFAULT_FRAME_H;
      const pv = meta.pivot || { x: fw/2, y: fh }; // fallback: Fußpunkt unten mittig

      const topLeftX = cx - pv.x;
      const topLeftY = cy - pv.y;

      if(chkFoot.box.checked){
        // Fußlinie = Basis-Y (damit du Pivot exakt auf einer "Lane" halten kannst)
        drawFootLine(ctx, baseY, canvas.width);
      }
      if(chkBox.box.checked){
        drawBox(ctx, topLeftX, topLeftY, fw, fh);
      }
      if(chkPivot.box.checked){
        drawCrosshair(ctx, cx, cy);
      }

      // Status
      const ax = (pv.x / fw).toFixed(2);
      const ay = (pv.y / fh).toFixed(2);
      setStatusOk(
        `✔ SpriteTest aktiv (${TAB_ID})\n` +
        `Atlas: ${atlasName}\n` +
        `Frame: ${key}\n` +
        `DIR=${dir} frame=${frameIdx}/${framesPerDir-1}  tilesPerDir=${tilesPerDir}\n` +
        `Pivot(px): x=${pv.x}, y=${pv.y}  Anchor(norm): x=${ax}, y=${ay}\n` +
        `BBox: w=${fw}, h=${fh} | TilePos(tx,ty)=(${tx},${ty})\n` +
        `TrailPts: ${trail.length}`
      );

      raf = requestAnimationFrame(loop);
    }
  }

  /* -------------------------------------------------------------------------
   * Mount / Bootstrapping
   * ---------------------------------------------------------------------- */
  function mount(sectionEl){
    renderUI(sectionEl);
  }

  function install(){
    const ok = registerTab(mount);
    if(ok){
      // Debug-Info in Konsole (hilft bei "Tab weg")
      console.info(`[spritetest] Tab registriert (${TAB_ID}).`);
      return true;
    }
    return false;
  }

  // Sofort versuchen + nochmal wenn Inspector ready Events feuert
  // (damit es auf iOS/Safari zuverlässig kommt, selbst wenn Scripts anders laden)
  install();
  window.addEventListener('cb:insp:core:ready', install);
  window.addEventListener('cb:insp:content:ready', install);
  window.addEventListener('cb:inspector:ready', install);
  document.addEventListener('DOMContentLoaded', install);
})();
