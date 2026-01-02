/* =========================================================================
 * Datei   : inspector/tabs/inspector.tab.spritetest-v1.js
 * Projekt : Neue Siedler – Inspector
 * Version : v26.01.10-spritetest-final-stable
 *
 * Zweck:
 *  - SpriteTest TAB (stabil über inspector.tabs.adapter.js)
 *  - Atlas/Frame/Prefix Auswahl aus den tatsächlich geladenen Atlanten
 *  - 8-Richtungs-Testlauf (N,NE,E,SE,S,SW,W,NW)
 *  - Debug-Overlays: Pivot (Crosshair), BoundingBox, Fußlinie, Trail
 *
 * WICHTIG:
 *  - Keine direkten Game-Referenzen beim Laden (iOS/Safari-robust)
 *  - Unterstützt Assets.atlases als Map (v4.5) ODER Objekt (Legacy)
 * ========================================================================= */

(function(){
  'use strict';

  // =========================================================================
  // KONSTANTEN
  // =========================================================================
  const TAB_KEY   = 'SpriteTest'; // Anzeigename/Key im Inspector (wie du wolltest)
  const DIRS      = ['N','NE','E','SE','S','SW','W','NW'];
  const DIR_TOKEN = new Set(DIRS);

  // Canvas (Testfläche)
  const CANVAS_W = 520;
  const CANVAS_H = 360;

  // Trail-Limits
  const TRAIL_MAX = 220;

  // =========================================================================
  // HELPER: Assets Zugriff (v4.5: Assets.atlases ist Map)
  // =========================================================================
  function getAssets(){
    return window.Assets || null;
  }

  function getAtlasStore(){
    const A = getAssets();
    return A ? A.atlases : null;
  }

  function listAtlasNames(){
    const s = getAtlasStore();
    if(!s) return [];

    // v4.5: Map
    if(typeof s.keys === 'function' && typeof s.get === 'function'){
      return Array.from(s.keys());
    }

    // Legacy: plain object
    if(typeof s === 'object'){
      return Object.keys(s);
    }

    return [];
  }

  function getAtlasByName(name){
    const A = getAssets();
    const s = getAtlasStore();
    if(!A || !s || !name) return null;

    // v4.5 Map
    if(typeof s.get === 'function'){
      return s.get(name) || null;
    }

    // Legacy object
    return s[name] || null;
  }

  function isAtlasOk(atlas){
    if(!atlas) return false;
    if(atlas.ok === true) return true;
    // fallback: Image ok?
    const img = atlas.img || atlas.image || atlas._img;
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function listFrames(atlasName){
    const A = getAssets();
    if(!A) return [];

    // v4.5 bietet listFrames(atlasName,prefix)
    if(typeof A.listFrames === 'function'){
      return A.listFrames(atlasName, '');
    }

    // fallback: atlas.names / atlas.frames
    const at = getAtlasByName(atlasName);
    if(!at) return [];
    if(Array.isArray(at.names)) return at.names.slice();
    if(at.frames && typeof at.frames === 'object') return Object.keys(at.frames);
    return [];
  }

  // =========================================================================
  // HELPER: Prefix ableiten (aus Frame-Namen)
  // =========================================================================
  function extractPrefixesFromFrames(frameNames){
    // Ziel: aus Frame-Namen sinnvolle Prefixe für das Eingabefeld ableiten.
    // 1) animals/units: deer_N_walk_0 -> deer_
    // 2) buildings: b.hunter_frame_0_0 -> b.hunter_

    const out = new Set();

    for(const n of frameNames){
      const s = String(n);

      // Tier/Unit: <prefix><DIR>_walk_<i>
      // Wir suchen das DIR Token als eigenes Segment.
      const parts = s.split('_');
      // Beispiel: deer, N, walk, 0
      if(parts.length >= 4 && DIR_TOKEN.has(parts[1]) && parts[2] === 'walk'){
        out.add(parts[0] + '_');
        continue;
      }

      // Alternativ: deer_N_idle_0 etc.
      if(parts.length >= 3 && DIR_TOKEN.has(parts[1])){
        out.add(parts[0] + '_');
        continue;
      }

      // Gebäude: b.hunter_frame_0_0 -> bis vor _frame_
      const i = s.indexOf('_frame_');
      if(i > 0){
        out.add(s.slice(0, i + 1)); // inklusive '_' am Ende
        continue;
      }

      // Fallback: bis vor letzte 2 Segmente (…_0_0) / bzw. erster Punktblock
      // (nicht perfekt, aber besser als nix)
      if(parts.length >= 3){
        out.add(parts.slice(0, parts.length - 2).join('_') + '_');
      }
    }

    return Array.from(out).sort();
  }

  // =========================================================================
  // CANVAS DRAWING
  // =========================================================================
  function clearCanvas(ctx, w, h){
    ctx.clearRect(0,0,w,h);
    // dezentes Grid
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

  // =========================================================================
  // ISO TEST-PFAD (einfach, reproduzierbar)
  // =========================================================================
  function isoStep(dir){
    // ISO Screen-step: du kannst hier später feinjustieren.
    // Wichtig: wir testen Pivot-Konsistenz, nicht echtes Pathfinding.
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

  // =========================================================================
  // STATE
  // =========================================================================
  const S = {
    running: false,
    raf: 0,
    atlas: '',
    prefix: 'deer_',
    framesPerDir: 8,
    tilesPerDir: 5,

    // Anim
    dirIdx: 0,
    frameIdx: 0,
    stepCount: 0,

    // Pos
    x: CANVAS_W * 0.55,
    y: CANVAS_H * 0.70,

    // Debug
    trail: []
  };

  function buildFrameName(prefix, dir, idx){
    // Konvention für Tiere/Units (dein Wunsch): deer_N_walk_0
    return `${prefix}${dir}_walk_${idx}`;
  }

  // =========================================================================
  // UI / TAB MOUNT
  // =========================================================================
  function mountSpriteTest(root){
    root.innerHTML = '';
    root.style.padding = '8px';
    root.style.color = '#fff';
    root.style.fontFamily = 'monospace';

    // ------------------------------
    // UI Helpers
    // ------------------------------
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

    // ------------------------------
    // Widgets
    // ------------------------------
    const atlasSel = mkSel();
    const prefixSel = mkSel();
    const prefixIn  = mkInput(S.prefix);
    const framesIn  = mkNum(S.framesPerDir, 1, 32);
    const tilesIn   = mkNum(S.tilesPerDir,  1, 30);

    const toggles = document.createElement('div');
    toggles.style.display='flex';
    toggles.style.gap='10px';
    toggles.style.flexWrap='wrap';

    const chkPivot = mkCheck('Pivot', true);
    const chkBBox  = mkCheck('BBox', true);
    const chkFoot  = mkCheck('Fußlinie', true);
    const chkTrail = mkCheck('Trail', true);
    toggles.appendChild(chkPivot.wrap);
    toggles.appendChild(chkBBox.wrap);
    toggles.appendChild(chkFoot.wrap);
    toggles.appendChild(chkTrail.wrap);

    const btnRow = document.createElement('div');
    btnRow.style.display='flex';
    btnRow.style.gap='10px';

    const btnStart = document.createElement('button');
    btnStart.textContent = 'Start Test';
    btnStart.style.flex='1';
    btnStart.style.padding='8px';
    btnStart.style.borderRadius='999px';

    const btnStop = document.createElement('button');
    btnStop.textContent='Stop';
    btnStop.style.flex='1';
    btnStop.style.padding='8px';
    btnStop.style.borderRadius='999px';

    const btnRefresh = document.createElement('button');
    btnRefresh.textContent='↻ Refresh Atlases';
    btnRefresh.style.width='100%';
    btnRefresh.style.padding='8px';
    btnRefresh.style.borderRadius='999px';

    btnRow.appendChild(btnStart);
    btnRow.appendChild(btnStop);

    const hint = document.createElement('div');
    hint.style.marginTop = '6px';
    hint.style.opacity = '0.9';
    hint.textContent = 'Richtungs-Reihenfolge: N → NE → E → SE → S → SW → W → NW | Regel: Frame 0 = Idle';

    const status = document.createElement('div');
    status.style.margin = '8px 0';
    status.style.color  = '#ff6b6b';

    const canvas = document.createElement('canvas');
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.width = '100%';
    canvas.style.borderRadius = '10px';
    canvas.style.background = 'rgba(0,0,0,0.25)';

    // Layout
    row('Atlas', atlasSel);
    row('Prefix-Picker (aus Atlas)', prefixSel);
    row('Prefix (manuell)', prefixIn);

    const grid2 = document.createElement('div');
    grid2.style.display='grid';
    grid2.style.gridTemplateColumns='1fr 1fr';
    grid2.style.gap='10px';
    const w1 = document.createElement('div');
    const w2 = document.createElement('div');
    w1.appendChild(document.createTextNode('Frames/Dir'));
    w1.appendChild(framesIn);
    w2.appendChild(document.createTextNode('Tiles/Dir'));
    w2.appendChild(tilesIn);
    grid2.appendChild(w1);
    grid2.appendChild(w2);
    root.appendChild(grid2);

    root.appendChild(btnRow);
    root.appendChild(hint);
    root.appendChild(toggles);
    root.appendChild(btnRefresh);
    root.appendChild(status);
    root.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // ------------------------------
    // Populate helpers
    // ------------------------------
    function repopulate(){
      const names = listAtlasNames().sort();

      // Atlas Dropdown
      atlasSel.innerHTML = '';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = (names.length ? '– Atlas wählen –' : '– keine Atlanten –');
      atlasSel.appendChild(opt0);
      for(const n of names){
        const a = getAtlasByName(n);
        const ok = isAtlasOk(a);
        const o = document.createElement('option');
        o.value = n;
        o.textContent = ok ? n : `${n} (not ready)`;
        atlasSel.appendChild(o);
      }

      // Auswahl behalten
      if(S.atlas && names.includes(S.atlas)) atlasSel.value = S.atlas;

      // Prefix Picker
      prefixSel.innerHTML = '';
      const atlasName = atlasSel.value || S.atlas || '';
      if(atlasName){
        const frames = listFrames(atlasName);
        const prefs = extractPrefixesFromFrames(frames);
        const p0 = document.createElement('option');
        p0.value='';
        p0.textContent = prefs.length ? '– Prefix wählen –' : '– keine Prefixe erkannt –';
        prefixSel.appendChild(p0);
        for(const p of prefs){
          const o = document.createElement('option');
          o.value=p;
          o.textContent=p;
          prefixSel.appendChild(o);
        }
      } else {
        const p0 = document.createElement('option');
        p0.value='';
        p0.textContent='– erst Atlas wählen –';
        prefixSel.appendChild(p0);
      }

      // Status
      if(!names.length){
        status.textContent = '✖ Keine Atlanten gefunden. (Sind Assets geladen?)';
      } else {
        const okCount = names.filter(n=>isAtlasOk(getAtlasByName(n))).length;
        status.style.color = '#a7ff9a';
        status.textContent = `✓ Atlanten: ${names.length} (ok: ${okCount}).`; 
        // nach kurzer Zeit zurück zu neutral
        setTimeout(()=>{ status.style.color='#ff6b6b'; }, 1500);
      }
    }

    function resetAnim(){
      S.dirIdx = 0;
      S.frameIdx = 0;
      S.stepCount = 0;
      S.x = CANVAS_W * 0.55;
      S.y = CANVAS_H * 0.70;
      S.trail.length = 0;
    }

    // ------------------------------
    // Animation loop
    // ------------------------------
    function tick(){
      if(!S.running){
        S.raf = 0;
        return;
      }

      // read UI
      S.atlas = atlasSel.value || S.atlas;
      S.prefix = String(prefixIn.value || '');
      S.framesPerDir = Math.max(1, Math.min(32, Number(framesIn.value)||8));
      S.tilesPerDir  = Math.max(1, Math.min(30, Number(tilesIn.value)||5));

      clearCanvas(ctx, CANVAS_W, CANVAS_H);

      // Fußlinie (Referenz)
      const footY = CANVAS_H * 0.75;
      if(chkFoot.box.checked) drawFootLine(ctx, footY, CANVAS_W);

      const atlas = getAtlasByName(S.atlas);
      const ok = isAtlasOk(atlas);

      // Bewegungs-/Testframe
      const dir = DIRS[S.dirIdx % DIRS.length];
      const frameName = buildFrameName(S.prefix, dir, S.frameIdx);

      // Weltpunkt = Pivotpunkt
      const pivotX = S.x;
      const pivotY = footY; // wir halten pivot immer auf der Fußlinie, um Drift zu sehen

      // Trail speichern
      if(chkTrail.box.checked){
        S.trail.push({x:pivotX, y:pivotY});
        if(S.trail.length > TRAIL_MAX) S.trail.shift();
        drawTrail(ctx, S.trail);
      }

      if(!S.atlas){
        status.textContent = '✖ Bitte Atlas auswählen.';
      } else if(!ok){
        status.textContent = `✖ Atlas "${S.atlas}" nicht ok/geladen.`;
      } else {
        status.textContent = '';

        // Frame zeichnen
        const A = getAssets();
        const drew = (A && typeof A.drawAtlasFrame === 'function')
          ? A.drawAtlasFrame(ctx, S.atlas, frameName, pivotX, pivotY, { align:'pivot', scale: 1 })
          : false;

        // Meta für Overlays (BBox/Pivot)
        const fr = (atlas && atlas.frames) ? atlas.frames[frameName] : null;

        if(drew && fr){
          const dw = fr.w;
          const dh = fr.h;
          const dx = pivotX - fr.pivotX;
          const dy = pivotY - fr.pivotY;

          if(chkBBox.box.checked) drawBox(ctx, dx, dy, dw, dh);
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
        } else {
          // Frame fehlt → Hinweis
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#ffaaaa';
          ctx.font = '14px monospace';
          ctx.fillText(`Frame nicht gefunden: ${frameName}`, 12, 22);
          ctx.restore();
          if(chkPivot.box.checked) drawCrosshair(ctx, pivotX, pivotY);
        }

        // Step/Anim Progress
        //  - pro Tick: FrameIdx++
        //  - alle framesPerDir: 1 tile step in current direction
        //  - nach tilesPerDir: next direction
        S.frameIdx = (S.frameIdx + 1) % S.framesPerDir;

        if(S.frameIdx === 0){
          // 1 tile weiter
          const st = isoStep(dir);
          S.x += st.x;
          S.y += st.y; // (nicht benutzt für pivotY, aber für spätere Erweiterung)
          S.stepCount++;
          if(S.stepCount >= S.tilesPerDir){
            S.stepCount = 0;
            S.dirIdx = (S.dirIdx + 1) % DIRS.length;
          }
        }
      }

      S.raf = requestAnimationFrame(tick);
    }

    // ------------------------------
    // Events
    // ------------------------------
    btnStart.addEventListener('click', ()=>{
      resetAnim();
      S.atlas = atlasSel.value || S.atlas;
      S.prefix = prefixIn.value || S.prefix;
      S.running = true;
      if(!S.raf) S.raf = requestAnimationFrame(tick);
    });

    btnStop.addEventListener('click', ()=>{
      S.running = false;
    });

    btnRefresh.addEventListener('click', ()=>{
      repopulate();
    });

    atlasSel.addEventListener('change', ()=>{
      S.atlas = atlasSel.value;
      repopulate();
    });

    prefixSel.addEventListener('change', ()=>{
      if(prefixSel.value){
        prefixIn.value = prefixSel.value;
      }
    });

    // Wenn Assets später fertig werden: Dropdown automatisch füllen
    window.addEventListener('cb:assets-ready', ()=>{
      repopulate();
    }, { once:false });

    // initial
    repopulate();
    clearCanvas(ctx, CANVAS_W, CANVAS_H);

    // Debug: Tab bereit
    try{ console.info('[spritetest] tab mounted v26.01.10'); }catch(_e){}
  }

  // =========================================================================
  // TAB REGISTRIERUNG (über Adapter)
  // =========================================================================
  (function register(){
    // Wir verlassen uns bewusst auf den Adapter:
    // window.registerInspectorTab(name, renderFn)
    if(typeof window.registerInspectorTab === 'function'){
      window.registerInspectorTab(TAB_KEY, mountSpriteTest);
      return;
    }

    // Fallback: falls Adapter später kommt, kurz warten.
    let tries = 0;
    const t = setInterval(()=>{
      tries++;
      if(typeof window.registerInspectorTab === 'function'){
        clearInterval(t);
        window.registerInspectorTab(TAB_KEY, mountSpriteTest);
      }
      if(tries > 50) clearInterval(t);
    }, 100);
  })();

})();
