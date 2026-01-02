/* =====================================================================
   inspector/tabs/inspector.tab.spritetest-v1.js
   Neue Siedler – SpriteTest (Pro)
   Version: v26.01.08-spritetest-pro-markers-registerfix

   Zweck:
   - Schnelles Testen von Atlanten/Frames (geladen in Assets.atlases)
   - Unit/Animal-Test: 8 Richtungen, 5 Tiles/Dir, Soll-Pfad + Pivot-Trail (Linie/Punkte)
   - Frame-Viewer: Einzel-Frame anzeigen + Marker setzen (Entrance, Chimney, Hand, Carry, ToolTip)
   - PRO: Marker automatisch auf alle Frames der gleichen "Gruppe" anwenden
          (z.B. b.hunter_frame_0_0 .. b.hunter_frame_0_2)
   - Export: Marker-JSON per Copy&Paste (für Registry/Building JSON später)

   WICHTIG:
   - Diese Datei darf beim Laden KEINEN Zugriff auf "Game" machen!
     Sonst kann iOS/Safari die Tab-Registrierung abbrechen.
   ===================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     0) Mini-Utils
     --------------------------------------------------------------- */

  const DIRS = ['N','NE','E','SE','S','SW','W','NW']; // feste Projekt-Reihenfolge (Uhrzeigersinn)
  const DEFAULTS = {
    tilesPerDir: 5,
    framesPerDir: 8,
    prefix: 'deer_',
    mode: 'unit', // 'unit' | 'frame'
    showPlan: true,
    showTrailLine: true,
    showTrailDots: false,
    applyToGroup: true,
    markerType: 'entrance', // entrance | chimney | hand | carry | tool
  };

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function safeNum(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /* ---------------------------------------------------------------
     1) Robuste Tab-Registrierung (damit "Tab weg" nicht mehr passiert)
     --------------------------------------------------------------- */

  function registerTabSafely(tabDef){
    // 1) Primär: global registerInspectorTab (dein Projekt-Standard)
    if (typeof window.registerInspectorTab === 'function') {
      window.registerInspectorTab(tabDef);
      console.info('[spritetest] registered via window.registerInspectorTab');
      return true;
    }
    // 2) Fallback: Inspector.registerTab (falls vorhanden)
    if (window.Inspector && typeof window.Inspector.registerTab === 'function') {
      window.Inspector.registerTab(tabDef);
      console.info('[spritetest] registered via window.Inspector.registerTab');
      return true;
    }
    // 3) Fallback: Sammeln und später registrieren (wenn Inspector erst später lädt)
    window.__INSPECTOR_TABS__ = window.__INSPECTOR_TABS__ || [];
    window.__INSPECTOR_TABS__.push(tabDef);
    console.warn('[spritetest] Inspector API not ready – queued in __INSPECTOR_TABS__');
    return false;
  }

  /* ---------------------------------------------------------------
     2) Marker Storage
     --------------------------------------------------------------- */

  const LS_KEY = 'spritetest:markers:v1'; // bewusst stabil halten
  function loadMarkerDB(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function saveMarkerDB(db){
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
    catch(e){ /* ignore */ }
  }

  // Marker werden pro Atlas + FrameName gespeichert:
  // db[atlasName][frameName] = { entrance:{x,y}, chimney:{x,y}, ... }
  function getFrameMarkers(db, atlasName, frameName){
    db[atlasName] = db[atlasName] || {};
    db[atlasName][frameName] = db[atlasName][frameName] || {};
    return db[atlasName][frameName];
  }

  /* ---------------------------------------------------------------
     3) "PRO" Gruppenschlüssel: Welche Frames gehören zusammen?
     --------------------------------------------------------------- */

  function deriveGroupKey(frameName){
    // Buildings: b.hunter_frame_0_0 -> b.hunter
    const m1 = frameName.match(/^(.+?)_frame_\d+_\d+$/);
    if (m1) return m1[1];

    // Alternative building naming: b.hunter_place_0 -> b.hunter_place (ohne Index)
    const m2 = frameName.match(/^(.+?)_(\d+)$/);
    if (m2) return m2[1];

    // Units/Animals: deer_NE_walk_3 -> deer_walk (oder deer, je nachdem)
    // Wir gruppieren so, dass alle Directions zusammen gehören:
    const m3 = frameName.match(/^(.+?)_(N|NE|E|SE|S|SW|W|NW)_(walk|idle)_(\d+)$/);
    if (m3) return `${m3[1]}_${m3[3]}`; // deer_walk

    // Fallback: alles vor letztem '_' nehmen
    const ix = frameName.lastIndexOf('_');
    if (ix > 0) return frameName.slice(0, ix);
    return frameName;
  }

  function listFramesForGroup(atlasObj, groupKey){
    if (!atlasObj || !atlasObj.frames) return [];
    const out = [];
    const keys = Object.keys(atlasObj.frames);
    for (const k of keys) {
      if (deriveGroupKey(k) === groupKey) out.push(k);
    }
    out.sort();
    return out;
  }

  /* ---------------------------------------------------------------
     4) Zeichnen (Canvas)
     --------------------------------------------------------------- */

  function clearCanvas(ctx, w, h){
    ctx.clearRect(0,0,w,h);
    // leichter Schachbrett-Hintergrund
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y=0;y<h;y+=16){
      for (let x=0;x<w;x+=16){
        if (((x+y)/16)%2===0) ctx.fillRect(x,y,16,16);
      }
    }
  }

  function drawText(ctx, x, y, s){
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '12px monospace';
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function drawCross(ctx, x, y, r){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,80,80,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x-r, y); ctx.lineTo(x+r, y);
    ctx.moveTo(x, y-r); ctx.lineTo(x, y+r);
    ctx.stroke();
    ctx.restore();
  }

  function drawDot(ctx, x, y, r){
    ctx.save();
    ctx.fillStyle = 'rgba(255,220,80,0.95)';
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawDashed(ctx, pts){
    if (pts.length<2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,180,255,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawLine(ctx, pts){
    if (pts.length<2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,220,80,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     5) Tab-Implementierung
     --------------------------------------------------------------- */

  const TAB = {
    id: 'SpriteTest',
    title: 'SpriteTest',
    icon: '🧪',

    onShow(rootEl){
      // Root vorbereiten
      rootEl.innerHTML = '';
      const wrap = el('div','spritetest-root');
      rootEl.appendChild(wrap);

      // State
      const st = {
        running:false,
        raf:0,
        lastT:0,
        t:0,
        atlasName:'',
        frameName:'',
        prefix: DEFAULTS.prefix,
        framesPerDir: DEFAULTS.framesPerDir,
        tilesPerDir: DEFAULTS.tilesPerDir,
        mode: DEFAULTS.mode,
        showPlan: DEFAULTS.showPlan,
        showTrailLine: DEFAULTS.showTrailLine,
        showTrailDots: DEFAULTS.showTrailDots,
        applyToGroup: DEFAULTS.applyToGroup,
        markerType: DEFAULTS.markerType,
        // Movement simulation position (in "tile units" for test canvas)
        pos:{x:0,y:0},
        planPts:[],
        planIdx:0,
        trail:[],
        maxTrail: 300,
        // for marker viewer
        db: loadMarkerDB(),
        status:''
      };

      // ---- UI Top
      const row1 = el('div','spr-row');
      const row2 = el('div','spr-row');
      const row3 = el('div','spr-row');
      wrap.appendChild(row1);
      wrap.appendChild(row2);
      wrap.appendChild(row3);

      // Atlas select
      const atlasLabel = el('div','spr-label','Atlas');
      const atlasSel = el('select','spr-input');
      row1.appendChild(atlasLabel); row1.appendChild(atlasSel);

      // Mode select
      const modeLabel = el('div','spr-label','Mode');
      const modeSel = el('select','spr-input');
      modeSel.innerHTML = `
        <option value="unit">Unit/Animal Test (8-dir Lauf)</option>
        <option value="frame">Frame Viewer + Marker</option>
      `;
      row1.appendChild(modeLabel); row1.appendChild(modeSel);

      // Prefix input
      const prefixLabel = el('div','spr-label','Prefix (z.B. deer_)');
      const prefixInp = el('input','spr-input'); prefixInp.value = st.prefix;
      row2.appendChild(prefixLabel); row2.appendChild(prefixInp);

      // Frames/Dir + Tiles/Dir
      const fpdLabel = el('div','spr-label','Frames/Dir');
      const fpdInp = el('input','spr-input'); fpdInp.type='number'; fpdInp.min='1'; fpdInp.max='16'; fpdInp.value = st.framesPerDir;
      const tpdLabel = el('div','spr-label','Tiles/Dir');
      const tpdInp = el('input','spr-input'); tpdInp.type='number'; tpdInp.min='1'; tpdInp.max='20'; tpdInp.value = st.tilesPerDir;
      row2.appendChild(fpdLabel); row2.appendChild(fpdInp);
      row2.appendChild(tpdLabel); row2.appendChild(tpdInp);

      // Start/Stop
      const btnRow = el('div','spr-row');
      const startBtn = el('button','spr-btn','Start');
      const stopBtn  = el('button','spr-btn','Stop');
      btnRow.appendChild(startBtn); btnRow.appendChild(stopBtn);
      wrap.appendChild(btnRow);

      // Toggles
      const togRow = el('div','spr-row');
      const cbPlan = el('input'); cbPlan.type='checkbox'; cbPlan.checked = st.showPlan;
      const cbTrailLine = el('input'); cbTrailLine.type='checkbox'; cbTrailLine.checked = st.showTrailLine;
      const cbTrailDots = el('input'); cbTrailDots.type='checkbox'; cbTrailDots.checked = st.showTrailDots;
      togRow.appendChild(el('label','spr-cb', '')); togRow.lastChild.appendChild(cbPlan); togRow.lastChild.appendChild(document.createTextNode(' Soll-Pfad'));
      togRow.appendChild(el('label','spr-cb', '')); togRow.lastChild.appendChild(cbTrailLine); togRow.lastChild.appendChild(document.createTextNode(' Trail Linie'));
      togRow.appendChild(el('label','spr-cb', '')); togRow.lastChild.appendChild(cbTrailDots); togRow.lastChild.appendChild(document.createTextNode(' Trail Punkte'));
      wrap.appendChild(togRow);

      // Frame picker + markers (nur in frame-mode sichtbar)
      const framePane = el('div','spr-framepane');
      wrap.appendChild(framePane);

      const frameFilter = el('input','spr-input'); frameFilter.placeholder='Frame Filter (z.B. b.hunter oder deer_)';
      const frameList = el('select','spr-input'); frameList.size = 8;

      const markerRow = el('div','spr-row');
      const markerTypeSel = el('select','spr-input');
      markerTypeSel.innerHTML = `
        <option value="entrance">Marker: Eingang/Tür</option>
        <option value="chimney">Marker: Schornstein</option>
        <option value="hand">Marker: Hand/Tool</option>
        <option value="carry">Marker: Carry/Load</option>
        <option value="tool">Marker: ToolTip/Point</option>
      `;
      const cbApplyGroup = el('input'); cbApplyGroup.type='checkbox'; cbApplyGroup.checked = st.applyToGroup;
      const applyLbl = el('label','spr-cb'); applyLbl.appendChild(cbApplyGroup); applyLbl.appendChild(document.createTextNode(' PRO: auf ganze Gruppe anwenden'));
      const exportBtn = el('button','spr-btn','Export JSON');
      const clearBtn = el('button','spr-btn','Clear Marker (Frame)');
      const clearGroupBtn = el('button','spr-btn','Clear Marker (Gruppe)');
      markerRow.appendChild(markerTypeSel);
      markerRow.appendChild(applyLbl);
      markerRow.appendChild(exportBtn);
      markerRow.appendChild(clearBtn);
      markerRow.appendChild(clearGroupBtn);

      framePane.appendChild(el('div','spr-label','Frame Auswahl (nur Frame-Mode)'));
      framePane.appendChild(frameFilter);
      framePane.appendChild(frameList);
      framePane.appendChild(markerRow);

      // Status line
      const statusEl = el('div','spr-status','');
      wrap.appendChild(statusEl);

      // Canvas
      const canvas = el('canvas','spr-canvas');
      canvas.width = 520; canvas.height = 360;
      wrap.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // Helper: Assets/Atlas Zugriff
      function getAtlas(){
        const A = window.Assets;
        if (!A || !A.atlases) return null;
        const a = A.atlases[st.atlasName];
        return a || null;
      }
      function atlasOk(a){
        return !!(a && a.ok && a.img && a.frames);
      }
      function setStatus(msg, isErr){
        statusEl.innerHTML = (isErr ? '❌ ' : '✅ ') + msg;
        statusEl.style.color = isErr ? '#ff6b6b' : '#b9ffb9';
      }

      // Atlas dropdown füllen
      function rebuildAtlasList(){
        atlasSel.innerHTML = '';
        const A = window.Assets;
        const names = (A && A.atlases) ? Object.keys(A.atlases) : [];
        names.sort();
        for (const n of names){
          const opt = el('option'); opt.value = n; opt.textContent = n;
          atlasSel.appendChild(opt);
        }
        st.atlasName = names[0] || '';
        atlasSel.value = st.atlasName;
      }

      // Frame list füllen
      function rebuildFrameList(){
        frameList.innerHTML = '';
        const a = getAtlas();
        if (!atlasOk(a)) return;
        const q = (frameFilter.value || '').trim().toLowerCase();
        const keys = Object.keys(a.frames || {});
        keys.sort();
        const max = 800; // UI Schutz
        let cnt = 0;
        for (const k of keys){
          if (q && !k.toLowerCase().includes(q)) continue;
          const opt = el('option'); opt.value = k; opt.textContent = k;
          frameList.appendChild(opt);
          cnt++;
          if (cnt>=max) break;
        }
        st.frameName = frameList.value || '';
      }

      function ensureFrame(name){
        const a = getAtlas();
        if (!atlasOk(a)) return null;
        return a.frames[name] || null;
      }

      // Plan: 5 Tiles pro Richtung + kleiner Kreis
      function buildPlan(){
        const tile = 32; // Testcanvas tile-size (nur fürs Tool)
        const cx = canvas.width * 0.5;
        const cy = canvas.height * 0.55;

        // Start in der Mitte
        const pts = [{x: cx, y: cy}];

        function add(dx, dy, steps){
          const last = pts[pts.length-1];
          pts.push({x: last.x + dx*steps, y: last.y + dy*steps});
        }

        // 8 dirs je 5 "tiles"
        const s = st.tilesPerDir * tile;
        add( 0,-1, s); // N
        add( 1,-1, s); // NE
        add( 1, 0, s); // E
        add( 1, 1, s); // SE
        add( 0, 1, s); // S
        add(-1, 1, s); // SW
        add(-1, 0, s); // W
        add(-1,-1, s); // NW

        // kleiner Kreis (8 Punkte)
        const r = 2.2*tile;
        const center = pts[pts.length-1];
        for (let i=0;i<=16;i++){
          const ang = (i/16)*Math.PI*2;
          pts.push({x:center.x + Math.cos(ang)*r, y:center.y + Math.sin(ang)*r});
        }

        st.planPts = pts;
        st.planIdx = 0;
        st.pos.x = pts[0].x;
        st.pos.y = pts[0].y;
        st.trail = [];
      }

      // Direction aus Bewegungsvektor (Testcanvas: y+ nach unten)
      function dirFromVec(vx, vy){
        // 8-Sektor Mapping: Winkel 0 = E, CCW
        const ang = Math.atan2(-vy, vx); // wichtig: -vy, damit N oben ist
        let a = ang;
        if (a < 0) a += Math.PI*2;
        const sector = Math.round(a / (Math.PI/4)) % 8;
        // Mapping sector->DIR (0=E,1=NE,2=N,3=NW,4=W,5=SW,6=S,7=SE)
        const map = ['E','NE','N','NW','W','SW','S','SE'];
        return map[sector];
      }

      // Frame Name für Unit-Test
      function unitFrameName(dir, idx){
        // Standard: <prefix><DIR>_walk_<i>
        // Beispiel: deer_NE_walk_3
        return `${st.prefix}${dir}_walk_${idx}`;
      }

      function drawFrame(atlasName, frameName, x, y, opts){
        const A = window.Assets;
        if (!A || typeof A.drawAtlasFrame !== 'function') return false;
        try{
          A.drawAtlasFrame(ctx, atlasName, frameName, x, y, opts || {});
          return true;
        }catch(e){
          return false;
        }
      }

      // Marker-Overlay zeichnen (Frame Viewer)
      function drawMarkers(atlasName, frameName, drawX, drawY){
        const a = getAtlas();
        if (!atlasOk(a)) return;

        const fr = a.frames[frameName];
        if (!fr) return;

        const pm = fr.pivot || {x: fr.frame.w/2, y: fr.frame.h};
        // Pivot-Kreuz
        drawCross(ctx, drawX + pm.x, drawY + pm.y, 6);

        // Frame-Border
        ctx.save();
        ctx.strokeStyle = 'rgba(120,180,255,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, fr.frame.w, fr.frame.h);
        ctx.restore();

        // Fußlinie = Pivot-Y
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.moveTo(drawX, drawY + pm.y);
        ctx.lineTo(drawX + fr.frame.w, drawY + pm.y);
        ctx.stroke();
        ctx.restore();

        // Custom marker points
        const fm = getFrameMarkers(st.db, atlasName, frameName);
        for (const [k,v] of Object.entries(fm)){
          if (!v) continue;
          // Farbe pro Typ
          const col = (k==='entrance') ? 'rgba(80,255,140,0.9)'
                    : (k==='chimney') ? 'rgba(255,120,120,0.9)'
                    : (k==='hand') ? 'rgba(120,180,255,0.9)'
                    : (k==='carry') ? 'rgba(255,220,80,0.9)'
                    : 'rgba(200,200,255,0.9)';
          ctx.save();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(drawX + v.x, drawY + v.y, 5, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
          drawText(ctx, drawX + v.x + 8, drawY + v.y - 6, k);
        }
      }

      // Klick im Frame-Viewer: Marker setzen
      function onCanvasClick(ev){
        if (st.mode !== 'frame') return;
        const a = getAtlas();
        if (!atlasOk(a)) return;
        const fr = a.frames[st.frameName];
        if (!fr) return;

        const rect = canvas.getBoundingClientRect();
        const mx = (ev.clientX - rect.left) * (canvas.width / rect.width);
        const my = (ev.clientY - rect.top)  * (canvas.height / rect.height);

        // Frame wird im Viewer mittig gezeichnet:
        const drawX = (canvas.width  - fr.frame.w) * 0.5;
        const drawY = (canvas.height - fr.frame.h) * 0.5;

        // Nur innerhalb der Frame-Box
        if (mx < drawX || my < drawY || mx > drawX + fr.frame.w || my > drawY + fr.frame.h) return;

        const lx = Math.round(mx - drawX);
        const ly = Math.round(my - drawY);

        // Marker im DB setzen
        const fm = getFrameMarkers(st.db, st.atlasName, st.frameName);
        fm[st.markerType] = {x: lx, y: ly};

        // PRO: auf Gruppe anwenden
        if (st.applyToGroup){
          const gk = deriveGroupKey(st.frameName);
          const groupFrames = listFramesForGroup(a, gk);
          for (const fn of groupFrames){
            const gm = getFrameMarkers(st.db, st.atlasName, fn);
            gm[st.markerType] = {x: lx, y: ly};
          }
        }

        saveMarkerDB(st.db);
      }

      canvas.addEventListener('click', onCanvasClick);

      /* ---------------- UI Events ---------------- */

      atlasSel.addEventListener('change', ()=>{
        st.atlasName = atlasSel.value;
        rebuildFrameList();
        renderOnce();
      });
      modeSel.addEventListener('change', ()=>{
        st.mode = modeSel.value;
        framePane.style.display = (st.mode === 'frame') ? 'block' : 'none';
        renderOnce();
      });
      prefixInp.addEventListener('input', ()=>{ st.prefix = prefixInp.value; });
      fpdInp.addEventListener('input', ()=>{ st.framesPerDir = clamp(safeNum(fpdInp.value,8),1,16); });
      tpdInp.addEventListener('input', ()=>{ st.tilesPerDir = clamp(safeNum(tpdInp.value,5),1,40); buildPlan(); renderOnce(); });

      cbPlan.addEventListener('change', ()=>{ st.showPlan = cbPlan.checked; renderOnce(); });
      cbTrailLine.addEventListener('change', ()=>{ st.showTrailLine = cbTrailLine.checked; renderOnce(); });
      cbTrailDots.addEventListener('change', ()=>{ st.showTrailDots = cbTrailDots.checked; renderOnce(); });

      frameFilter.addEventListener('input', ()=>{ rebuildFrameList(); renderOnce(); });
      frameList.addEventListener('change', ()=>{ st.frameName = frameList.value; renderOnce(); });

      markerTypeSel.addEventListener('change', ()=>{ st.markerType = markerTypeSel.value; renderOnce(); });
      cbApplyGroup.addEventListener('change', ()=>{ st.applyToGroup = cbApplyGroup.checked; });

      exportBtn.addEventListener('click', ()=>{
        const a = getAtlas();
        if (!atlasOk(a)) { setStatus('Atlas nicht ok/geladen.', true); return; }
        // Export: nur aktueller Frame ODER ganze Gruppe (falls applyToGroup aktiv)
        const out = { atlas: st.atlasName, frames: {} };
        if (!st.frameName) { setStatus('Kein Frame ausgewählt.', true); return; }

        const frames = st.applyToGroup ? listFramesForGroup(a, deriveGroupKey(st.frameName)) : [st.frameName];
        for (const fn of frames){
          const fm = getFrameMarkers(st.db, st.atlasName, fn);
          if (fm && Object.keys(fm).length) out.frames[fn] = fm;
        }
        const txt = JSON.stringify(out, null, 2);
        navigator.clipboard?.writeText(txt).catch(()=>{});
        alert('Marker-JSON wurde in die Zwischenablage kopiert (wenn Browser es erlaubt).');
      });

      clearBtn.addEventListener('click', ()=>{
        if (!st.frameName) return;
        st.db[st.atlasName] = st.db[st.atlasName] || {};
        st.db[st.atlasName][st.frameName] = {};
        saveMarkerDB(st.db);
        renderOnce();
      });

      clearGroupBtn.addEventListener('click', ()=>{
        const a = getAtlas();
        if (!atlasOk(a) || !st.frameName) return;
        const frames = listFramesForGroup(a, deriveGroupKey(st.frameName));
        for (const fn of frames){
          st.db[st.atlasName] = st.db[st.atlasName] || {};
          st.db[st.atlasName][fn] = {};
        }
        saveMarkerDB(st.db);
        renderOnce();
      });

      startBtn.addEventListener('click', ()=>{
        st.running = true;
        buildPlan();
        st.lastT = performance.now();
        tick();
      });

      stopBtn.addEventListener('click', ()=>{
        st.running = false;
        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = 0;
        renderOnce();
      });

      /* ---------------- Render/Tick ---------------- */

      function renderOnce(){
        const a = getAtlas();
        clearCanvas(ctx, canvas.width, canvas.height);

        if (!st.atlasName) { setStatus('Kein Atlas vorhanden.', true); return; }
        if (!atlasOk(a)) {
          setStatus(`Atlas "${st.atlasName}" ist nicht ok/geladen.`, true);
          return;
        }

        if (st.mode === 'frame') {
          framePane.style.display = 'block';
          setStatus(`Frame-Viewer aktiv. Klicke in den Frame um Marker zu setzen.`, false);

          // Frame wählen
          if (!st.frameName) st.frameName = frameList.value || '';
          const fr = a.frames[st.frameName];
          if (!fr) { setStatus(`Frame fehlt: ${st.frameName}`, true); return; }

          const drawX = (canvas.width  - fr.frame.w) * 0.5;
          const drawY = (canvas.height - fr.frame.h) * 0.5;

          // Draw sprite
          const ok = drawFrame(st.atlasName, st.frameName, drawX, drawY, { alpha: 1.0 });
          if (!ok) { setStatus(`Draw fehlgeschlagen: ${st.frameName}`, true); return; }

          // Overlay Markers + Pivot
          drawMarkers(st.atlasName, st.frameName, drawX, drawY);

          // Debug
          const pv = fr.pivot || {x: fr.frame.w/2, y: fr.frame.h};
          drawText(ctx, 10, 16, `Atlas: ${st.atlasName}`);
          drawText(ctx, 10, 32, `Frame: ${st.frameName}`);
          drawText(ctx, 10, 48, `Pivot(px): ${pv.x.toFixed(1)}, ${pv.y.toFixed(1)}  |  Anchor: ${(pv.x/fr.frame.w).toFixed(3)}, ${(pv.y/fr.frame.h).toFixed(3)}`);
          drawText(ctx, 10, 64, `PRO-Gruppe: ${deriveGroupKey(st.frameName)}  (${listFramesForGroup(a, deriveGroupKey(st.frameName)).length} Frames)`);
          return;
        }

        // Unit/Animal-Test
        framePane.style.display = 'none';
        setStatus(`Unit-Test aktiv. DIR-Reihenfolge: ${DIRS.join('→')}. Frame0=Idle.`, false);

        // Sollpfad zeichnen
        if (st.showPlan && st.planPts.length) drawDashed(ctx, st.planPts);

        // Trail zeichnen
        if (st.showTrailLine && st.trail.length) drawLine(ctx, st.trail);
        if (st.showTrailDots && st.trail.length){
          for (let i=0;i<st.trail.length;i+=6) drawDot(ctx, st.trail[i].x, st.trail[i].y, 2);
        }

        // Aktuelles Target
        const p0 = st.planPts[st.planIdx] || st.planPts[0];
        const p1 = st.planPts[st.planIdx+1] || p0;

        // Richtung aus Vektor
        const vx = p1.x - st.pos.x;
        const vy = p1.y - st.pos.y;
        const dir = dirFromVec(vx, vy);

        // Laufphase
        const phase = Math.floor((st.t/120) % st.framesPerDir); // 120ms pro Frame
        const fn = unitFrameName(dir, phase);

        // Frame draw (centered on pos)
        // Wir zeichnen so, dass Pivot im Mittelpunkt der Bewegung liegt:
        const fr = ensureFrame(fn) || ensureFrame(unitFrameName(dir,0)); // fallback auf idle
        if (!fr) {
          drawText(ctx, 10, 16, `Fehlende Frames, z.B.: ${fn}`);
          return;
        }
        const pv = fr.pivot || {x: fr.frame.w/2, y: fr.frame.h};
        const drawX = st.pos.x - pv.x;
        const drawY = st.pos.y - pv.y;

        drawFrame(st.atlasName, fr.__name || fn, drawX, drawY, { alpha: 1.0 });
        // Pivot
        drawCross(ctx, st.pos.x, st.pos.y, 6);

        drawText(ctx, 10, 16, `Atlas: ${st.atlasName}`);
        drawText(ctx, 10, 32, `Prefix: ${st.prefix}`);
        drawText(ctx, 10, 48, `DIR: ${dir}  Frame: ${phase}  Name: ${fn}`);
        drawText(ctx, 10, 64, `Pivot(px): ${pv.x.toFixed(1)}, ${pv.y.toFixed(1)}  |  Anchor: ${(pv.x/fr.frame.w).toFixed(3)}, ${(pv.y/fr.frame.h).toFixed(3)}`);
      }

      function tick(){
        if (!st.running) return;

        const now = performance.now();
        const dt = now - st.lastT;
        st.lastT = now;
        st.t += dt;

        // Bewegung entlang Plan
        if (st.planPts.length >= 2){
          const a = getAtlas();
          const speed = 0.12 * dt; // px/ms -> ca. 120px/s
          const tgt = st.planPts[st.planIdx+1] || st.planPts[st.planIdx];
          const dx = tgt.x - st.pos.x;
          const dy = tgt.y - st.pos.y;
          const dist = Math.hypot(dx,dy);

          if (dist < 1.5){
            st.planIdx++;
            if (st.planIdx >= st.planPts.length-2){
              st.planIdx = 0; // loop
              st.pos.x = st.planPts[0].x;
              st.pos.y = st.planPts[0].y;
              st.trail = [];
            }
          } else {
            st.pos.x += (dx/dist) * speed;
            st.pos.y += (dy/dist) * speed;
          }

          // Trail (Pivot-Punkt)
          st.trail.push({x: st.pos.x, y: st.pos.y});
          if (st.trail.length > st.maxTrail) st.trail.splice(0, st.trail.length - st.maxTrail);
        }

        renderOnce();
        st.raf = requestAnimationFrame(tick);
      }

      /* ---------------- Init ---------------- */

      // Minimal CSS (inspektor-intern)
      const style = el('style');
      style.textContent = `
        .spritetest-root{ font-family: ui-monospace, Menlo, Monaco, monospace; padding:10px; }
        .spr-row{ display:flex; gap:8px; align-items:center; margin:6px 0; flex-wrap:wrap; }
        .spr-label{ opacity:0.85; min-width:140px; }
        .spr-input{ background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#fff; padding:6px 8px; border-radius:8px; }
        .spr-btn{ background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.22); color:#fff; padding:6px 10px; border-radius:10px; }
        .spr-status{ margin-top:8px; padding:8px 10px; background:rgba(0,0,0,0.25); border-radius:10px; border:1px solid rgba(255,255,255,0.12); }
        .spr-canvas{ width:100%; max-width:520px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; margin-top:10px; }
        .spr-cb{ display:flex; gap:6px; align-items:center; opacity:0.9; }
        .spr-framepane{ margin-top:6px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.15); }
      `;
      wrap.appendChild(style);

      rebuildAtlasList();

      // Default atlas: wenn deer_sprite_atlas vorhanden, direkt wählen
      const A = window.Assets;
      if (A && A.atlases && A.atlases['deer_sprite_atlas']){
        st.atlasName = 'deer_sprite_atlas';
        atlasSel.value = st.atlasName;
      }

      modeSel.value = st.mode;
      framePane.style.display = (st.mode === 'frame') ? 'block' : 'none';

      buildPlan();
      // Frames list erst aufbauen, wenn Atlas ok ist
      setTimeout(()=>{ rebuildFrameList(); renderOnce(); }, 0);

      // onHide cleanup (wenn Inspector es unterstützt)
      TAB.onHide = function(){
        st.running = false;
        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = 0;
      };
    }
  };

  // Tab registrieren (robust)
  registerTabSafely(TAB);

})();