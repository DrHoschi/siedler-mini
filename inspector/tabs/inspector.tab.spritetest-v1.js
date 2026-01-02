/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.spritetest-v1.js
 * Version : v26.01.02-spritetest
 * Zweck   : Sprite-Testlabor (Atlas/Frames) – schnelle Validierung:
 *           - Richtungs-Reihenfolge (8-dir)
 *           - Pivot/Fußpunkt-Stabilität (kein „Wobble“)
 *           - Walk-Zyklus (Frame 0 = Idle)
 *
 * Philosophie:
 *   - Dieses Tool zeichnet NUR in ein eigenes Canvas (Inspector-Tab).
 *   - Es greift NICHT in Game-Units ein (kein Risiko, dass wir Spiel-Logik kaputt machen).
 *
 * Bedienung:
 *   - Atlas wählen (z.B. "animals" oder "world" – je nachdem wie du es lädst)
 *   - Prefix wählen (z.B. "deer_")
 *   - Frames pro Richtung (default 8)
 *   - "Start Test" → läuft:
 *        1) Jede Richtung 5 „Kacheln“ (im Test-Grid) laufen
 *        2) Danach Kreis (Loop)
 *
 * Hinweise:
 *   - Y ist im Canvas nach unten positiv (Standard im Browser).
 *   - Unsere Richtungstokens sind:
 *        N, NE, E, SE, S, SW, W, NW
 *   - Frame 0 ist IMMER Idle.
 * ========================================================================== */

(function(){
  'use strict';

  // =========================================================================
  // KONSTANTEN / CONFIG
  // =========================================================================

  // Exakte, projektweite Richtungs-Reihenfolge:
  // (Uhrzeigersinn, startend oben)
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  // Default: 8 Frames je Richtung (0=Idle, 1..7 Walk)
  const DEFAULT_FRAMES_PER_DIR = 8;

  // „Kachelgröße“ im Test-Grid (nur fürs Tool, NICHT tileSize im Spiel!)
  const GRID = {
    cell: 64,        // Pixel pro Grid-Zelle im Test-Canvas
    pad:  24,        // Rand
    stepsPerDir: 5,  // 5 Zellen laufen je Richtung
  };

  // Walk-Tempo im Test (Frames pro Sekunde)
  const WALK_FPS = 8;

  // =========================================================================
  // HILFSFUNKTIONEN
  // =========================================================================

  function el(tag, attrs={}, html='') {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.setAttribute('style', v);
      else n.setAttribute(k, v);
    }
    if (html) n.innerHTML = html;
    return n;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function listAtlasNames() {
    try {
      // Assets.atlases ist eine Map(name -> atlasObj)
      if (!window.Assets || !window.Assets.atlases) return [];
      return Array.from(window.Assets.atlases.keys()).sort();
    } catch (e) {
      return [];
    }
  }

  function listFrames(atlasName) {
    try {
      if (!window.Assets) return [];
      return window.Assets.listFrames(atlasName, '') || [];
    } catch (e) {
      return [];
    }
  }

  // Sucht Frames nach Schema: <prefix><DIR>_walk_<i>
  // Beispiel: deer_NE_walk_3
  function buildFrameName(prefix, dir, i) {
    return `${prefix}${dir}_walk_${i}`;
  }

  // =========================================================================
  // TEST-PFAD-GENERATOR
  // =========================================================================

  function buildPathSequence(stepsPerDir) {
    // 1) 8 Richtungen je 5 Schritte
    const seq = [];
    for (const dir of DIRS) {
      for (let s=0; s<stepsPerDir; s++) seq.push(dir);
    }
    // 2) Kreis (einmal rund um einen Radius)
    //    Wir approximieren den Kreis als Dir-Loop mit mehr Wiederholungen.
    for (let k=0; k<3; k++) {
      for (const dir of DIRS) seq.push(dir);
    }
    return seq;
  }

  function dirToDelta(dir) {
    // Achtung: Test-Grid ist top-down.
    // Y nach unten positiv (Canvas).
    switch(dir) {
      case 'N':  return {dx:0, dy:-1};
      case 'NE': return {dx:1, dy:-1};
      case 'E':  return {dx:1, dy:0};
      case 'SE': return {dx:1, dy:1};
      case 'S':  return {dx:0, dy:1};
      case 'SW': return {dx:-1, dy:1};
      case 'W':  return {dx:-1, dy:0};
      case 'NW': return {dx:-1, dy:-1};
      default:   return {dx:0, dy:0};
    }
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  function drawGrid(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;

    // feines Raster
    for (let x=GRID.pad; x<w-GRID.pad; x+=GRID.cell) {
      ctx.beginPath();
      ctx.moveTo(x, GRID.pad);
      ctx.lineTo(x, h-GRID.pad);
      ctx.stroke();
    }
    for (let y=GRID.pad; y<h-GRID.pad; y+=GRID.cell) {
      ctx.beginPath();
      ctx.moveTo(GRID.pad, y);
      ctx.lineTo(w-GRID.pad, y);
      ctx.stroke();
    }

    // Nullpunkt / Start
    ctx.globalAlpha = 0.9;
    ctx.fillText('START', GRID.pad+4, GRID.pad-6);
    ctx.restore();
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0,0,w,h);
    // Hintergrund leicht
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillRect(0,0,w,h);
    ctx.restore();
  }

  // =========================================================================
  // TAB-IMPLEMENTATION
  // =========================================================================

  function renderTab(root) {
    // ---------- Layout ----------
    root.innerHTML = '';
    root.appendChild(el('div', { style:
      'padding:10px; display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;' +
      'border-bottom:1px solid rgba(255,255,255,0.08);'
    }));

    const bar = root.firstChild;

    // Atlas Select
    const atlasSel = el('select', { style:'min-width:220px;' });
    bar.appendChild(el('label',{},'Atlas<br>'));
    bar.lastChild.appendChild(atlasSel);

    // Prefix input (z.B. deer_)
    const prefixIn = el('input', { type:'text', value:'deer_', style:'width:140px;' });
    bar.appendChild(el('label',{ style:'display:flex; flex-direction:column; gap:4px;'}, 'Prefix (z.B. deer_)'));
    bar.lastChild.appendChild(prefixIn);

    // Frames/dir
    const framesIn = el('input', { type:'number', min:'1', max:'16', value:String(DEFAULT_FRAMES_PER_DIR), style:'width:90px;' });
    bar.appendChild(el('label',{ style:'display:flex; flex-direction:column; gap:4px;'}, 'Frames/Dir'));
    bar.lastChild.appendChild(framesIn);

    // Steps/dir
    const stepsIn = el('input', { type:'number', min:'1', max:'20', value:String(GRID.stepsPerDir), style:'width:90px;' });
    bar.appendChild(el('label',{ style:'display:flex; flex-direction:column; gap:4px;'}, 'Tiles/Dir'));
    bar.lastChild.appendChild(stepsIn);

    const btnStart = el('button', { style:'padding:8px 10px;' }, 'Start Test');
    const btnStop  = el('button', { style:'padding:8px 10px;' }, 'Stop');
    bar.appendChild(btnStart);
    bar.appendChild(btnStop);

    const info = el('div', { style:'flex:1; min-width:280px; opacity:0.9; font-size:12px; line-height:1.25;' },
      `<b>Richtungs-Reihenfolge:</b> ${DIRS.join(' → ')}<br>` +
      `<b>Regel:</b> Frame 0 = Idle. Füße/Pivot müssen pro Frame stabil sein.`
    );
    bar.appendChild(info);

    // Canvas
    const wrap = el('div', { style:'padding:10px;' });
    const canvas = el('canvas', { width:'900', height:'520', style:
      'width:100%; max-width:1100px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.12); border-radius:8px;'
    });
    wrap.appendChild(canvas);

    // Status / Debug-Ausgabe
    const status = el('div', { style:'padding:8px 10px; font-size:12px; opacity:0.95; min-height:18px;' }, '');
    root.appendChild(status);

    const hint = el('div', { style:'padding:10px; opacity:0.85; font-size:12px;' },
      `Tipp: Wenn das Tier bei Richtungswechsel „wackelt“, liegt es fast immer an Pivot/Fußlinie im 128×128 Frame.`
    );

    root.appendChild(wrap);
    root.appendChild(hint);

    // ---------- Populate atlas list ----------
    function refreshAtlasList() {
      const names = listAtlasNames();
      atlasSel.innerHTML = '';
      for (const n of names) atlasSel.appendChild(el('option', { value:n }, n));
      // Fallback: wenn nichts da ist
      if (names.length === 0) atlasSel.appendChild(el('option', { value:'' }, '(keine Atlanten geladen)'));
    }
    refreshAtlasList();

    // ---------- Animation State ----------
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.font = '12px monospace';

    function setStatus(html){ try{ status.innerHTML = html || ''; }catch(e){} }
    let raf = 0;
    let running = false;

    const state = {
      atlasName: '',
      prefix: 'deer_',
      framesPerDir: DEFAULT_FRAMES_PER_DIR,
      path: [],
      pathIdx: 0,

      // Grid-Position
      gx: 4, gy: 3,

      // Sub-Steps innerhalb einer Grid-Zelle (für smooth movement)
      stepT: 0,      // 0..1
      stepDur: 0.35, // Sekunden pro Grid-Zelle

      // Anim
      animT: 0,
      animIdx: 0,
    };

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function start() {
      stop();
      state.atlasName = atlasSel.value;
      state.prefix = prefixIn.value || '';
      state.framesPerDir = clamp(parseInt(framesIn.value||DEFAULT_FRAMES_PER_DIR,10)||DEFAULT_FRAMES_PER_DIR, 1, 16);

      const steps = clamp(parseInt(stepsIn.value||GRID.stepsPerDir,10)||GRID.stepsPerDir, 1, 20);
      state.path = buildPathSequence(steps);
      state.pathIdx = 0;

      state.gx = 4; state.gy = 3;
      state.stepT = 0;
      state.animT = 0;
      state.animIdx = 0;

            // ---- Quick-Validate (zeigt sofort, warum ggf. nichts gezeichnet wird) ----
      try{
        const A = window.Assets;
        const a = A?.getAtlas?.(state.atlasName);
        if (!a || !a.ok) {
          setStatus(`<span style="color:#ff8080">❌ Atlas "${state.atlasName}" ist nicht ok/geladen.</span>`);
          return;
        }
        const testName = buildFrameName(state.prefix, DIRS[0], 0);
        if (!a.frames || !a.frames[testName]) {
          setStatus(`<span style="color:#ffcc66">⚠️ Frame fehlt: <code>${testName}</code> (Prefix/Benennung prüfen)</span>`);
        } else {
          setStatus(`<span style="color:#a8ffb0">✅ Atlas ok.</span> Testframe: <code>${testName}</code>`);
        }
      }catch(e){
        setStatus(`<span style="color:#ff8080">❌ SpriteTest error: ${e?.message||e}</span>`);
      }

running = true;
      last = performance.now();
      tick(last);
    }

    btnStart.addEventListener('click', start);
    btnStop.addEventListener('click', stop);

    // ---------- Main Loop ----------
    let last = 0;
    function tick(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Advance animation frames
      state.animT += dt;
      const frameStep = 1 / WALK_FPS;
      while (state.animT >= frameStep) {
        state.animT -= frameStep;
        // Frame 0 = Idle, daher beim Laufen: 1..framesPerDir-1 rotieren
        const max = Math.max(1, state.framesPerDir - 1);
        state.animIdx = 1 + ((state.animIdx - 1 + 1) % max);
      }

      // Move along path
      state.stepT += dt / state.stepDur;
      if (state.stepT >= 1) {
        state.stepT = 0;
        const dir = state.path[state.pathIdx] || 'S';
        const d = dirToDelta(dir);
        state.gx += d.dx;
        state.gy += d.dy;

        // Grenzen im Canvas halten
        state.gx = clamp(state.gx, 1, 12);
        state.gy = clamp(state.gy, 1, 6);

        state.pathIdx = (state.pathIdx + 1) % state.path.length;
      }

      // Draw
      clear(ctx, canvas.width, canvas.height);
      drawGrid(ctx, canvas.width, canvas.height);

      const dir = state.path[state.pathIdx] || 'S';

      // Footpoint im Canvas
      const fx = GRID.pad + state.gx * GRID.cell;
      const fy = GRID.pad + state.gy * GRID.cell;

      // Debug Text
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillText(`dir=${dir}  frame=${state.animIdx}  atlas=${state.atlasName}  prefix=${state.prefix}`, 10, canvas.height - 12);
      ctx.restore();

      // Zeichne Sprite (Atlas-Frame)
      // Wichtig: Wir nutzen "pivot" (Assets.drawAtlasFrame default).
      const frameName = buildFrameName(state.prefix, dir, state.animIdx);

      // Marker für Fußpunkt
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // Wenn Frame nicht existiert: fallback auf Idle (0)
      setStatus('');
      const ok = window.Assets?.drawAtlasFrame(ctx, state.atlasName, frameName, fx, fy, { scale: 1 });
      if (!ok) {
        setStatus(`<span style="color:#ffcc66">⚠️ Frame nicht gefunden: <code>${frameName}</code> (Fallback Idle)</span>`);
        const idleName = buildFrameName(state.prefix, dir, 0);
        window.Assets?.drawAtlasFrame(ctx, state.atlasName, idleName, fx, fy, { scale: 1 });
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillText(`(Frame fehlt: ${frameName})`, 10, canvas.height - 28);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    }

    // Auto-Refresh wenn Assets später ready werden
    window.addEventListener('cb:assets-ready', () => {
      refreshAtlasList();
    });
  }

  // =========================================================================
  // REGISTRIERUNG ALS INSPECTOR TAB
  // =========================================================================

  // Tabname: "SpriteTest" (kurz, eindeutig)
  if (window.registerInspectorTab) {
    window.registerInspectorTab('SpriteTest', renderTab);
  } else {
    // Fallback: warten, bis Adapter da ist
    window.addEventListener('cb:insp:content:ready', () => {
      window.registerInspectorTab && window.registerInspectorTab('SpriteTest', renderTab);
    });
  }
})();
