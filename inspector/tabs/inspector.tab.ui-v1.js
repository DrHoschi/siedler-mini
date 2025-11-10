/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.ui-v1.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.11.14-camdebug (final)
 * Zweck   : UI/Diagnose-Tab – Live-Ansicht für Kamera/Canvas/Viewport/Tiles
 *
 * Kurzüberblick
 * - Zeigt live: Kamera (x,y,zoom), Canvas (CSS/DPR/Backing), Map (cols/rows,tileW/H)
 * - Rechnet Sichtfenster in Pixel *und* Tiles (tx0..ty1) aus, inkl. 1-Tile-Puffer
 * - Visualisiert Viewport als Rechteck in einer Mini-Skizze (Map-Umriss + Kamera)
 * - Hört auf: cb:camera-change, cb:camera:update, cb:game:start, req:place:cursor
 * - Pullt (optional) interne Werte aus Game.__dbg.state, fällt sonst auf „nur Events“ zurück
 *
 * Bedienung
 * - „Refresh“: einmalige Aktualisierung
 * - „Live an/aus“: 10×/Sek. auto-aktualisieren (leichtgewichtig)
 * - „Snap“: aktuellen Datensatz einfrieren (JSON kopierbar)
 *
 * Hinweise
 * - Keine Abhängigkeiten zu fremden Inspector-Tabs.
 * - Defensive Fallbacks: Wenn Game.__dbg fehlt, wird alles aus Events/DOM berechnet.
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------- Log ---------------------------------- */
  const TAG  = '[insp/ui]';
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  /* ------------------------------ Interner State --------------------------- */
  const ST = {
    // Kamera & View
    cam:   { x:0, y:0, zoom:1 },
    css:   { w:0, h:0, dpr: 1 },
    back:  { w:0, h:0 },
    view:  { vx0:0, vy0:0, vx1:0, vy1:0, tx0:0, ty0:0, tx1:0, ty1:0 },

    // Map/Tile
    map: { cols:0, rows:0, tileW:64, tileH:64 },

    // Cursor (vom Platzier-Tool, Tile-Koords)
    cursor: { tx:null, ty:null },

    // Quellen (optional) – zur Diagnose
    sources: {
      gameDbg: false
    },

    // UI
    live: false,
    liveTimer: null,

    // DOM-Reffs
    el: {
      panel: null, outTxt: null, mini: null
    }
  };

  /* ----------------------------- Datenabruf ------------------------------- */
  function readFromGameDbg() {
    const dbg = window.Game && window.Game.__dbg && window.Game.__dbg.state;
    if (!dbg) { ST.sources.gameDbg = false; return false; }

    ST.sources.gameDbg = true;

    // Canvas/Viewport
    const canvas = dbg.canvas || document.getElementById('game');
    const dpr    = (window.devicePixelRatio || 1);
    const cssW   = (canvas && canvas.style.width)  ? parseInt(canvas.style.width,10)  : window.innerWidth|0;
    const cssH   = (canvas && canvas.style.height) ? parseInt(canvas.style.height,10) : window.innerHeight|0;

    ST.css.w  = cssW|0;
    ST.css.h  = cssH|0;
    ST.css.dpr= dpr;

    ST.back.w = (canvas ? canvas.width  : (cssW * dpr)|0);
    ST.back.h = (canvas ? canvas.height : (cssH * dpr)|0);

    // Kamera
    const cam = dbg.cam || {x:0,y:0,zoom:1};
    ST.cam.x    = Number(cam.x||0);
    ST.cam.y    = Number(cam.y||0);
    ST.cam.zoom = Math.max(0.1, Number(cam.zoom||1));

    // Map/Tile
    ST.map.cols  = Number(dbg.cols||0);
    ST.map.rows  = Number(dbg.rows||0);
    ST.map.tileW = Number(dbg.tileW||64);
    ST.map.tileH = Number(dbg.tileH||64);

    return true;
  }

  function readFromDomOnly() {
    // Canvas (DOM)
    const canvas = document.getElementById('game');
    const dpr = (window.devicePixelRatio || 1);

    const cssW = (canvas && canvas.style.width)
      ? parseInt(canvas.style.width,10) : window.innerWidth|0;
    const cssH = (canvas && canvas.style.height)
      ? parseInt(canvas.style.height,10) : window.innerHeight|0;

    ST.css.w = cssW|0; ST.css.h = cssH|0; ST.css.dpr = dpr;
    ST.back.w = (canvas ? canvas.width  : (cssW * dpr)|0);
    ST.back.h = (canvas ? canvas.height : (cssH * dpr)|0);

    // Map/Tile (nur grob – falls Game keine Infos liefert)
    const ts = (window.Game && (window.Game.tileSize || (window.Game.getTileSize && window.Game.getTileSize()))) || 64;
    ST.map.tileW = ts; ST.map.tileH = ts;
    // cols/rows unbekannt → 0 (Skizze nutzt defensive Defaults)
  }

  /* ------------------------ Sichtfenster-Berechnung ----------------------- */
  function recomputeViewport() {
    // Sichtfenster im World-Space (in px) – wie in core/game-v1.js
    const viewW = ST.css.w / ST.cam.zoom;
    const viewH = ST.css.h / ST.cam.zoom;
    const vx0   = ST.cam.x;
    const vy0   = ST.cam.y;
    const vx1   = vx0 + viewW;
    const vy1   = vy0 + viewH;

    ST.view.vx0 = vx0; ST.view.vy0 = vy0; ST.view.vx1 = vx1; ST.view.vy1 = vy1;

    // In Tiles (inkl. 1-Tile Puffer), bounds clampen wenn Map-Größe bekannt
    const TW = ST.map.tileW || 64;
    const TH = ST.map.tileH || 64;

    let tx0 = ((vx0 / TW) | 0) - 1;
    let ty0 = ((vy0 / TH) | 0) - 1;
    let tx1 = ((vx1 / TW) | 0) + 1;
    let ty1 = ((vy1 / TH) | 0) + 1;

    if (ST.map.cols > 0) {
      tx0 = Math.max(0, tx0);
      tx1 = Math.min(ST.map.cols-1, tx1);
    }
    if (ST.map.rows > 0) {
      ty0 = Math.max(0, ty0);
      ty1 = Math.min(ST.map.rows-1, ty1);
    }

    ST.view.tx0 = tx0; ST.view.ty0 = ty0;
    ST.view.tx1 = tx1; ST.view.ty1 = ty1;
  }

  /* --------------------------- Mini-Skizze zeichnen ----------------------- */
  function drawMini() {
    const cvs = ST.el.mini;
    if (!cvs) return;

    const ctx = cvs.getContext('2d');
    const W = cvs.width, H = cvs.height;

    // Hintergrund
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0,0,W,H);

    // Map-Umriss bestimmen (px in „Welt“)
    const worldW = (ST.map.cols>0 ? ST.map.cols*ST.map.tileW : Math.max(ST.view.vx1, ST.view.vx0+512));
    const worldH = (ST.map.rows>0 ? ST.map.rows*ST.map.tileH : Math.max(ST.view.vy1, ST.view.vy0+512));

    // Fit-Scale für Skizze
    const pad = 8;
    const sx = (W - pad*2) / Math.max(1, worldW);
    const sy = (H - pad*2) / Math.max(1, worldH);
    const s  = Math.min(sx, sy);

    // Map-Rahmen
    ctx.save();
    ctx.translate(pad, pad);
    ctx.scale(s, s);

    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2 / s;
    ctx.strokeRect(0, 0, worldW, worldH);

    // Viewport-Rechteck
    ctx.strokeStyle = '#7dd3fc';
    ctx.fillStyle   = 'rgba(125, 211, 252, 0.15)';
    const vx = ST.view.vx0;
    const vy = ST.view.vy0;
    const vw = (ST.css.w / ST.cam.zoom);
    const vh = (ST.css.h / ST.cam.zoom);
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeRect(vx, vy, vw, vh);

    // Cursor-Tile (falls vorhanden)
    if (Number.isFinite(ST.cursor.tx) && Number.isFinite(ST.cursor.ty)) {
      const cx = ST.cursor.tx * ST.map.tileW;
      const cy = ST.cursor.ty * ST.map.tileH;
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2 / s;
      ctx.strokeRect(cx, cy, ST.map.tileW, ST.map.tileH);
    }

    ctx.restore();
  }

  /* ----------------------------- Rendering (Text) ------------------------- */
  function buildDiagnosticsText() {
    const t = (n)=> typeof n === 'number' ? n.toFixed(2) : n;
    const J = (o)=> JSON.stringify(o);

    return [
      'KAMERA',
      `  x=${t(ST.cam.x)}  y=${t(ST.cam.y)}  zoom=${t(ST.cam.zoom)}`,
      '',
      'CANVAS',
      `  CSS:   ${ST.css.w}×${ST.css.h}px   DPR=${ST.css.dpr}`,
      `  Back:  ${ST.back.w}×${ST.back.h}px`,
      '',
      'MAP / TILE',
      `  cols=${ST.map.cols}  rows=${ST.map.rows}  tile=${ST.map.tileW}×${ST.map.tileH}`,
      '',
      'VIEW (px, World-Space)',
      `  vx0=${t(ST.view.vx0)}  vy0=${t(ST.view.vy0)}  vx1=${t(ST.view.vx1)}  vy1=${t(ST.view.vy1)}`,
      `  vw=${t(ST.css.w/ST.cam.zoom)}  vh=${t(ST.css.h/ST.cam.zoom)}`,
      '',
      'VIEW (Tiles)',
      `  tx0=${ST.view.tx0}  ty0=${ST.view.ty0}  tx1=${ST.view.tx1}  ty1=${ST.view.ty1}  (inkl. 1-Tile Puffer)`,
      '',
      'CURSOR (Tile, von req:place:cursor)',
      `  tx=${ST.cursor.tx==null?'–':ST.cursor.tx}  ty=${ST.cursor.ty==null?'–':ST.cursor.ty}`,
      '',
      'QUELLEN',
      `  Game.__dbg: ${ST.sources.gameDbg ? 'ja' : 'nein'}`,
      '',
      'FORMELN',
      '  // Pixel-Sichtfenster (World)',
      '  viewW = cssW / zoom;  viewH = cssH / zoom',
      '  vx0 = cam.x; vy0 = cam.y; vx1 = vx0 + viewW; vy1 = vy0 + viewH',
      '  // Tiles mit Puffer',
      '  tx0 = floor(vx0/tileW) - 1;  tx1 = floor(vx1/tileW) + 1',
      '  ty0 = floor(vy0/tileH) - 1;  ty1 = floor(vy1/tileH) + 1',
      ''
    ].join('\n');
  }

  function refreshOnce() {
    // Datenquelle bevorzugt: Game.__dbg (falls vorhanden)
    if (!readFromGameDbg()) readFromDomOnly();

    recomputeViewport();

    // Textfeld
    if (ST.el.outTxt) {
      ST.el.outTxt.textContent = buildDiagnosticsText();
    }
    // Mini-Skizze
    drawMini();
  }

  function startLive() {
    if (ST.liveTimer) return;
    ST.live = true;
    ST.liveTimer = setInterval(refreshOnce, 100); // 10 Hz reicht locker
  }

  function stopLive() {
    ST.live = false;
    if (ST.liveTimer) { clearInterval(ST.liveTimer); ST.liveTimer = null; }
  }

  /* ------------------------------- UI Setup ------------------------------- */
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>UI / Kamera-Diagnose</strong>
        <span class="spacer"></span>
        <button class="insp-btn" data-act="snap">Snap</button>
        <button class="insp-btn" data-act="live">Live an</button>
        <button class="insp-btn" data-act="refresh">Refresh</button>
      </div>
      <div class="insp-pad" style="display:grid;grid-template-columns: 1fr 300px;gap:12px;align-items:start;">
        <pre class="out" style="margin:0;max-height:50vh;overflow:auto;"></pre>
        <div>
          <canvas class="mini" width="300" height="200" style="width:300px;height:200px;border:1px solid #2a2f3a;border-radius:6px;background:#0b0d12;"></canvas>
          <div style="font-size:12px;opacity:.8;margin-top:6px;">
            Mini-Skizze: grauer Rahmen = Map (falls Größe bekannt), blau = sichtbarer Bereich,
            rot = Cursor-Tile.
          </div>
        </div>
      </div>
    `;
    ST.el.panel = panel;
    ST.el.outTxt = panel.querySelector('.out');
    ST.el.mini   = panel.querySelector('canvas.mini');

    panel.querySelector('[data-act="refresh"]').addEventListener('click', refreshOnce);
    panel.querySelector('[data-act="live"]').addEventListener('click', (ev)=>{
      if (ST.live) { stopLive(); ev.currentTarget.textContent = 'Live an'; }
      else         { startLive(); ev.currentTarget.textContent = 'Live aus'; }
    });
    panel.querySelector('[data-act="snap"]').addEventListener('click', ()=>{
      // eingefrorene JSON-Sicht (schnell kopierbar)
      const snap = {
        cam: ST.cam, css: ST.css, back: ST.back, map: ST.map, view: ST.view, cursor: ST.cursor,
        src: ST.sources
      };
      const box = ST.el.outTxt;
      if (box) box.textContent = (buildDiagnosticsText() + '\nSNAP(JSON):\n' + JSON.stringify(snap, null, 2));
    });

    refreshOnce();
  }

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "ui") return;
      const panel = document.querySelector('[data-panel="ui"]');
      if (!panel) return;
      if (!panel.querySelector('.mini')) mount(panel);
    });
  }

  /* -------------------------- Event-Listener (Live) ----------------------- */
  // Kamera-Events (beide Varianten unterstützen)
  window.addEventListener('cb:camera-change',  (e)=>{ const d=e.detail||{}; if('x'in d)ST.cam.x=d.x; if('y'in d)ST.cam.y=d.y; if('zoom'in d)ST.cam.zoom=Math.max(0.1,d.zoom); if(!ST.live) refreshOnce(); });
  window.addEventListener('cb:camera:update',  (e)=>{ const d=e.detail||{}; if('x'in d)ST.cam.x=d.x; if('y'in d)ST.cam.y=d.y; if('zoom'in d)ST.cam.zoom=Math.max(0.1,d.zoom); if(!ST.live) refreshOnce(); });

  // Cursor-Tile aus dem Input
  window.addEventListener('req:place:cursor', (e)=>{ const d=e.detail||{}; ST.cursor.tx=d.tx; ST.cursor.ty=d.ty; if(!ST.live) refreshOnce(); });

  // Bei Spielstart einmal initialisieren
  window.addEventListener('cb:game:start', ()=> { if (!ST.live) refreshOnce(); }, { once:true });

  /* ------------------------------- Tab-Register --------------------------- */
  // Achtung: alter Code hatte zwei getrennte Implementierungen – wir registrieren *eine* saubere.
  window.registerInspectorTab('ui', mount);

  /* ------------------------------- Bootstrapping -------------------------- */
  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);

  INFO('UI-Diagnose geladen (v25.11.14-camdebug)');
})();
