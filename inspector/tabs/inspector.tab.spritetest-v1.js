/* ============================================================================
 * inspector/tab/inspector.tab.spritetest-v1.js
 * v26.01.05-spritetest-preview-mode
 * ----------------------------------------------------------------------------
 * Ziel:
 *  - Stabiler SpriteTest-Tab (ohne Render-Crashes)
 *  - Atlas/Frame-Auswahl funktioniert auch, wenn Assets später laden
 *  - Preview ist auf iOS "verkleinerbar": per Höhen-Slider + Zoom-Slider
 *  - Pfad/Plan bleibt IMMER im Sichtfenster (zentriert + safe margins)
 *  - Debug-Overlays: Pivot, BBox, Fußlinie, Trail, Plan, Grid
 *
 * WICHTIG:
 *  - Keine Abhängigkeit von externem CSS nötig (wir stylen inline minimal).
 *  - Nutzt window.Assets.drawAtlasFrame(...) falls vorhanden (Projektstandard).
 *  - Falls Assets/Atlanten noch nicht verfügbar sind, zeigt Tab Hinweis + Retry.
 * ============================================================================ */
(() => {
  // [SpriteTest] LOAD-MARKER (hilft gegen Cache/Load-Order Probleme)
  try{console.log('%c[SpriteTest] loaded','color:#7ff');}catch(e){}

  'use strict';

  // --------------------------------------------------------------------------
  // Imports (keine externen Imports – bewusst "drop-in" für GitHub Pages)
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // Konstanten
  // --------------------------------------------------------------------------
  const TAB_ID = 'spritetest';
  const TAB_TITLE = 'Spritetest';

  // iOS hat kein natives "resize-handle" für DIVs -> wir machen Slider.
  const PREVIEW_H_MIN = 140;
  const PREVIEW_H_MAX = 560;

  const ZOOM_MIN = 0.20;
  const ZOOM_MAX = 3.00;

  const SPEED_MIN = 10;
  const SPEED_MAX = 600;

  const FPS_MIN = 1;
  const FPS_MAX = 24;

  // Plan bleibt innerhalb dieser Safe-Margins (in % des View-Min-Dim).
  const SAFE_MARGIN_FRAC = 0.12;

  // Richtung-Reihenfolge (Master): N, NE, E, SE, S, SW, W, NW (Uhrzeiger).
  const DIR8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  // --------------------------------------------------------------------------
  // State (pro Tab-Instance)
  // --------------------------------------------------------------------------
  const S = {
    // Auswahl
    atlasKey: '',
    frameKey: '',

    // Modus (NEU):
    //  - mainMode='anim'   -> bestehender Movement/Anim-Viewer (Tiere/Units)
    //  - mainMode='preview'-> NEU: Standbild + Marker für Gebäude/Deko
    mainMode: 'anim',
    animMode: 'single', // 'single' | 'walk' (bestehend)

    // Pfad / Richtung (nur Anim-Mode)
    path: 'line',    // 'line' | 'circle' | 'box'
    dirMode: 'auto', // 'auto' | 'lock'
    dirLock: 'S',

    // Animation / Test (nur Anim-Mode)
    pxPerSec: 100,
    fps: 6,
    isRunning: false,

    // Preview
    previewH: 320,
    zoom: 1.0,

    // Marker (nur Preview-Mode)
    markerType: 'door', // 'door' | 'chimney' | 'tool' | 'carry'
    markers: {
      // pro Typ genau EIN Marker (wir überschreiben beim Setzen)
      // door: { dx, dy }, chimney: { dx, dy } ...
    },
    showMarkers: true,
    snapMarkerToInteger: true, // Export rundet sowieso – hier fürs UI

    // Overlay toggles
    showPivot: true,
    showBBox: true,
    showFoot: true,
    showTrail: true,
    showPlan: true,
    showGrid: false,

    // Intern
    rafId: 0,
    lastT: 0,
    animAcc: 0,
    step: 0,
    t: 0,

    // Plan data
    planPts: [],     // {x,y} in view-space
    trailPts: [],    // last points

    // DOM refs
    root: null,
    msg: null,

    // Auswahl-Controls
    selAtlas: null,
    selFrame: null,

    // Modus-Controls
    selMainMode: null,
    selAnimMode: null,

    // Anim-Controls
    selPath: null,
    selDirMode: null,
    selDirLock: null,
    rngSpeed: null,
    rngFps: null,

    // Preview-Controls
    selMarkerType: null,
    btnClearMarkers: null,
    btnCopyJson: null,
    taJson: null,

    // Shared controls
    rngZoom: null,
    rngPrevH: null,
    btnStart: null,
    btnStop: null,
    btnRefresh: null,

    // Canvas
    canvas: null,
    ctx: null,
    previewWrap: null,
    footerLeft: null,
    footerRight: null,

    // UI-Gruppen (für show/hide je Modus)
    uiAnimOnly: [],
    uiPreviewOnly: [],
  };

  // --------------------------------------------------------------------------
  // Helpers – DOM
  // --------------------------------------------------------------------------
  function el(tag, attrs = {}, children = null) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'style' && v && typeof v === 'object') Object.assign(n.style, v);
      else if (k === 'class') n.className = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, String(v));
    }
    if (children == null) return n;
    if (Array.isArray(children)) children.forEach(c => n.append(c));
    else n.append(children);
    return n;
  }
  function txt(s) { return document.createTextNode(String(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n, d=0) { return Number(n).toFixed(d); }

  // --------------------------------------------------------------------------
  // Helpers – Assets / Atlases
  // --------------------------------------------------------------------------
  function getAssets() {
    return (window.Assets && typeof window.Assets === 'object') ? window.Assets : null;
  }

  function getAtlasesRaw() {
    const A = getAssets();
    if (!A) return null;
    // Projekt: window.Assets.atlases kann Map oder Object sein.
    return A.atlases || A.AtlasMap || null;
  }

  function listAtlasKeys() {
    const atl = getAtlasesRaw();
    if (!atl) return [];
    if (atl instanceof Map) return Array.from(atl.keys()).sort();
    // Object
    return Object.keys(atl).sort();
  }

  function getAtlas(key) {
    if (!key) return null;
    const atl = getAtlasesRaw();
    if (!atl) return null;
    if (atl instanceof Map) return atl.get(key) || null;
    return atl[key] || null;
  }

  function listFrameKeys(atlasKey) {
    const a = getAtlas(atlasKey);
    if (!a) return [];
    const frames = a.frames || a.data?.frames || null;
    if (!frames) return [];
    return Object.keys(frames).sort();
  }

  // Sehr defensiv: "frame" kann unterschiedlich strukturiert sein.
  function getFrame(atlasKey, frameKey) {
    const a = getAtlas(atlasKey);
    if (!a) return null;
    const frames = a.frames || a.data?.frames || null;
    if (!frames) return null;
    return frames[frameKey] || null;
  }

  function assetsCanDraw() {
    const A = getAssets();
    return !!(A && typeof A.drawAtlasFrame === 'function');
  }

  // --------------------------------------------------------------------------
  // Helpers – Direction / Mapping
  // --------------------------------------------------------------------------
  function vecToDir8(dx, dy) {
    // Acht Richtungen im Uhrzeigersinn ab N.
    const ang = Math.atan2(dy, dx); // -pi..pi, 0 = +x (E)
    // Wir wollen 0 = N -> daher drehen: N entspricht -pi/2 im atan2.
    // delta = ang - (-pi/2) = ang + pi/2
    let a = ang + Math.PI / 2;
    while (a < 0) a += Math.PI * 2;
    while (a >= Math.PI * 2) a -= Math.PI * 2;
    const slice = (Math.PI * 2) / 8;
    const idx = Math.floor((a + slice / 2) / slice) % 8;
    return DIR8[idx];
  }

  // --------------------------------------------------------------------------
  // Preview / Canvas sizing
  // --------------------------------------------------------------------------
  function syncCanvasSize() {
    if (!S.canvas || !S.previewWrap) return;
    const dpr = window.devicePixelRatio || 1;

    // Höhe per Slider (iOS friendly)
    const h = clamp(S.previewH, PREVIEW_H_MIN, PREVIEW_H_MAX);
    S.previewWrap.style.height = `${h}px`;

    // Breite: 100% der Tab-Spalte
    const cssW = Math.max(10, S.previewWrap.clientWidth);
    const cssH = Math.max(10, S.previewWrap.clientHeight);

    // Physische Pixel
    S.canvas.width  = Math.floor(cssW * dpr);
    S.canvas.height = Math.floor(cssH * dpr);

    // CSS Pixel
    S.canvas.style.width = `${cssW}px`;
    S.canvas.style.height = `${cssH}px`;

    // 2D context, scaled by DPR
    const ctx = S.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false; // Pixel-Style / Crisp
    S.ctx = ctx;

    rebuildPlan();    // Plan an neue View-Größe anpassen
    drawOnce();       // Sofort neu zeichnen
  }

  function getViewWH() {
    if (!S.previewWrap) return { w: 520, h: 320 };
    return {
      w: Math.max(10, S.previewWrap.clientWidth),
      h: Math.max(10, S.previewWrap.clientHeight),
    };
  }

  // --------------------------------------------------------------------------
  // Plan generation (immer innerhalb Sichtfenster)
  // --------------------------------------------------------------------------
  function rebuildPlan() {
    const { w, h } = getViewWH();
    const m = Math.min(w, h) * SAFE_MARGIN_FRAC;
    const cx = w * 0.50;
    const cy = h * 0.62; // etwas tiefer, damit Sprite unten Platz hat

    let pts = [];
    const len = Math.min(w, h) * 0.32;

    if (S.path === 'line') {
      pts = [
        { x: cx - len, y: cy + len * 0.25 },
        { x: cx + len, y: cy - len * 0.25 },
      ];
    } else if (S.path === 'box') {
      const r = len * 0.65;
      pts = [
        { x: cx - r, y: cy - r },
        { x: cx + r, y: cy - r },
        { x: cx + r, y: cy + r },
        { x: cx - r, y: cy + r },
        { x: cx - r, y: cy - r },
      ];
    } else { // circle
      const r = len * 0.75;
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
    }

    // Clamp safe
    pts = pts.map(p => ({
      x: clamp(p.x, m, w - m),
      y: clamp(p.y, m, h - m),
    }));

    S.planPts = pts;
    // Trail reset beim Planwechsel
    S.trailPts = [];
    S.step = 0;
    S.t = 0;
  }

  // --------------------------------------------------------------------------
  // UI update helpers
  // --------------------------------------------------------------------------
  function setMsg(s) {
    if (!S.msg) return;
    S.msg.textContent = s || '';
  }

  function populateAtlases(keepSelection = true) {
    const keys = listAtlasKeys();
    const prev = S.atlasKey;

    // Clear
    S.selAtlas.innerHTML = '';
    if (keys.length === 0) {
      const opt = el('option', { value: '' }, txt('— keine Atlanten —'));
      S.selAtlas.append(opt);
      S.atlasKey = '';
      populateFrames(false);
      setMsg('✖ Keine Atlanten gefunden. (Sind Assets geladen?)');
      return false;
    }

    S.selAtlas.append(el('option', { value: '' }, txt('— Atlas wählen —')));
    keys.forEach(k => S.selAtlas.append(el('option', { value: k }, txt(k))));

    if (keepSelection && prev && keys.includes(prev)) {
      S.selAtlas.value = prev;
      S.atlasKey = prev;
    } else {
      S.selAtlas.value = keys[0];
      S.atlasKey = keys[0];
    }

    populateFrames(true);
    setMsg('');
    return true;
  }

  function populateFrames(keepSelection = true) {
    const frames = listFrameKeys(S.atlasKey);
    const prev = S.frameKey;

    S.selFrame.innerHTML = '';
    if (!S.atlasKey || frames.length === 0) {
      S.selFrame.append(el('option', { value: '' }, txt('— keine Frames —')));
      S.frameKey = '';
      return;
    }

    S.selFrame.append(el('option', { value: '' }, txt('— Frame wählen —')));
    frames.forEach(f => S.selFrame.append(el('option', { value: f }, txt(f))));

    if (keepSelection && prev && frames.includes(prev)) {
      S.selFrame.value = prev;
      S.frameKey = prev;
    } else {
      // heuristik: bevorzugt frame 0 / idle
      const idle = frames.find(x => /_0$/.test(x) || /idle/i.test(x)) || frames[0];
      S.selFrame.value = idle;
      S.frameKey = idle;
    }
  }

  // Retry-Mechanismus, falls Assets erst nach Tab-Open fertig sind.
  function retryAtlasDiscovery(triesLeft = 12) {
    if (populateAtlases(true)) return;
    if (triesLeft <= 0) return;
    window.setTimeout(() => retryAtlasDiscovery(triesLeft - 1), 350);
  }

  // --------------------------------------------------------------------------
  // Drawing
  // --------------------------------------------------------------------------
  function clearCanvas() {
    if (!S.ctx) return;
    const { w, h } = getViewWH();
    S.ctx.clearRect(0, 0, w, h);
  }

  function drawGrid() {
    if (!S.ctx || !S.showGrid) return;
    const { w, h } = getViewWH();
    const ctx = S.ctx;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#2aa3ff';
    ctx.lineWidth = 1;

    const step = 24; // leichte Rasterdichte
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlan() {
    if (!S.ctx || !S.showPlan || !S.planPts.length) return;
    const ctx = S.ctx;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#5fb7ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(S.planPts[0].x, S.planPts[0].y);
    for (let i = 1; i < S.planPts.length; i++) ctx.lineTo(S.planPts[i].x, S.planPts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrail() {
    if (!S.ctx || !S.showTrail || S.trailPts.length < 2) return;
    const ctx = S.ctx;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = '#9ad1ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(S.trailPts[0].x, S.trailPts[0].y);
    for (let i = 1; i < S.trailPts.length; i++) ctx.lineTo(S.trailPts[i].x, S.trailPts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawPivot(x, y) {
    if (!S.ctx || !S.showPivot) return;
    const ctx = S.ctx;
    ctx.save();
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawBBox(frame, x, y, scale) {
    if (!S.ctx || !S.showBBox || !frame) return;
    const fr = normalizeFrame(frame);
    if (!fr) return;
    const ctx = S.ctx;
    const dx = x - fr.pivotX * scale;
    const dy = y - fr.pivotY * scale;

    ctx.save();
    ctx.strokeStyle = '#00c7ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, dy, fr.w * scale, fr.h * scale);
    ctx.restore();
  }

  function drawFoot(frame, x, y, scale) {
    if (!S.ctx || !S.showFoot || !frame) return;
    const fr = normalizeFrame(frame);
    if (!fr) return;
    const ctx = S.ctx;

    // Fußlinie: y = (frame.footY ? footY : h) relativ zum frame-top
    const footY = (typeof fr.footY === 'number') ? fr.footY : fr.h;
    const dy = y - fr.pivotY * scale;
    const yLine = dy + footY * scale;

    ctx.save();
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, yLine);
    ctx.lineTo(x + 18, yLine);
    ctx.stroke();
    ctx.restore();
  }

  // Frame-Normalisierung, damit wir pivot/w/h stabil lesen können.
  function normalizeFrame(frameObj) {
    if (!frameObj) return null;
    const f = frameObj.frame || frameObj; // manchmal steckt es unter .frame
    const w = f.w ?? f.width;
    const h = f.h ?? f.height;
    if (!(w > 0 && h > 0)) return null;

    // pivotX/pivotY: Projekt nutzt oft frameObj.pivotX/Y oder data.pivot...
    const px = frameObj.pivotX ?? frameObj.px ?? frameObj.pivot?.x ?? 0;
    const py = frameObj.pivotY ?? frameObj.py ?? frameObj.pivot?.y ?? 0;

    // Optional: footY
    const fy = frameObj.footY ?? frameObj.foot?.y;

    return { w, h, pivotX: px, pivotY: py, footY: fy };
  }

  // --------------------------------------------------------------------------
  // Preview-Anker & Koordinaten-Umrechnung (für Marker)
  // --------------------------------------------------------------------------
  function getPreviewAnchor() {
    // Konsistent zum bisherigen Single-Preview: Pivot liegt optisch leicht unter Mitte.
    const { w, h } = getViewWH();
    return { x: w * 0.50, y: h * 0.62 };
  }

  function canvasToSpriteLocal(cx, cy, pivotX, pivotY, scale) {
    return {
      dx: (cx - pivotX) / (scale || 1),
      dy: (cy - pivotY) / (scale || 1),
    };
  }

  function spriteLocalToCanvas(dx, dy, pivotX, pivotY, scale) {
    return {
      x: pivotX + dx * (scale || 1),
      y: pivotY + dy * (scale || 1),
    };
  }

  function roundSmart(v) {
    return (S.snapMarkerToInteger) ? Math.round(v) : v;
  }

  function setMarker(type, dx, dy) {
    if (!type) return;
    S.markers[type] = { dx: roundSmart(dx), dy: roundSmart(dy) };
    syncExportJson();
    drawOnce();
  }

  function drawOnce() {
    clearCanvas();

    // Grid kann in beiden Modi hilfreich sein (z.B. Marker grob ausrichten).
    drawGrid();

    // Plan/Trail sind eigentlich Anim-Mode – im Preview lassen wir es optional drin,
    // aber wir zeichnen es nur wenn Toggle aktiv ist.
    drawPlan();
    drawTrail();

    // Guard: Ohne Atlas/Frame oder Draw-Funktion gibt's nichts zu rendern.
    if (!S.atlasKey || !S.frameKey || !assetsCanDraw()) {
      if (S.footerLeft) S.footerLeft.textContent = '—';
      if (S.footerRight) S.footerRight.textContent = `Atlas: ${S.atlasKey || '—'}`;
      syncExportJson();
      return;
    }

    const frame = getFrame(S.atlasKey, S.frameKey);
    const scale = S.zoom;

    // Im Preview/Single zeichnen wir mittig (Pivot-Anker).
    const a = getPreviewAnchor();
    const x = a.x;
    const y = a.y;

    // Sprite
    try {
      window.Assets.drawAtlasFrame(S.ctx, S.atlasKey, S.frameKey, x, y, { scale });
    } catch (e) {
      setMsg('✖ drawAtlasFrame Fehler: ' + (e?.message || e));
    }

    // Overlays
    drawBBox(frame, x, y, scale);
    drawFoot(frame, x, y, scale);
    drawPivot(x, y);

    // Preview-Mode: Marker rendern + Export-JSON aktualisieren
    if (S.mainMode === 'preview') {
      drawMarkers(x, y, scale);
      syncExportJson();
      if (S.footerLeft) S.footerLeft.textContent = `Preview: ${Object.keys(S.markers||{}).length} Marker`;
      if (S.footerRight) S.footerRight.textContent = `Atlas: ${S.atlasKey || '—'} | Frame: ${S.frameKey || '—'}`;
      return;
    }

    // Anim-Mode (nicht laufend): wir zeigen Standbild (wie bisher "single")
    if (S.footerLeft) S.footerLeft.textContent = 'Frame 0 = Idle';
    if (S.footerRight) S.footerRight.textContent = `Atlas: ${S.atlasKey || '—'}`;
    syncExportJson();
  }


  function clearMarkers() {
    S.markers = {};
    syncExportJson();
    drawOnce();
  }

  function buildExportObject() {
    const out = {
      atlas: S.atlasKey || '',
      frame: S.frameKey || '',
      markers: {},
    };
    for (const [k, v] of Object.entries(S.markers || {})) {
      if (!v) continue;
      out.markers[k] = { x: Math.round(v.dx), y: Math.round(v.dy) };
    }
    return out;
  }

  function syncExportJson() {
    if (!S.taJson) return;
    // hübsches JSON, stabil kopierbar
    const obj = buildExportObject();
    S.taJson.value = JSON.stringify(obj, null, 2);
  }

  async function copyExportJson() {
    if (!S.taJson) return;
    const txt = S.taJson.value || '';
    if (!txt) return;

    // iOS/Safari: clipboard API ist nicht immer verfügbar -> Fallback.
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
        setMsg('✅ JSON in Clipboard kopiert.');
        return;
      }
    } catch (_) {}

    try {
      S.taJson.focus();
      S.taJson.select();
      document.execCommand('copy');
      setMsg('✅ JSON in Clipboard kopiert.');
    } catch (e) {
      // Letzter Fallback: Prompt (User kann manuell kopieren)
      try { window.prompt('JSON kopieren:', txt); } catch (_) {}
      setMsg('ℹ️ JSON anzeigen (manuell kopieren).');
    }
  }

  function drawMarkers(pivotX, pivotY, scale) {
    if (!S.ctx || !S.showMarkers) return;
    const ctx = S.ctx;

    ctx.save();
    ctx.lineWidth = 2;

    for (const [type, m] of Object.entries(S.markers || {})) {
      if (!m) continue;
      const p = spriteLocalToCanvas(m.dx, m.dy, pivotX, pivotY, scale);

      // Kreis + Kreuz
      ctx.strokeStyle = '#ff5c8a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p.x - 10, p.y);
      ctx.lineTo(p.x + 10, p.y);
      ctx.moveTo(p.x, p.y - 10);
      ctx.lineTo(p.x, p.y + 10);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const label = `${type}: ${Math.round(m.dx)},${Math.round(m.dy)}`;
      const pad = 6;
      ctx.font = '12px ui-monospace, Menlo, Monaco, Consolas, monospace';
      const tw = ctx.measureText(label).width;
      const bx = p.x + 12;
      const by = p.y - 18;
      ctx.fillRect(bx - pad, by - 12, tw + pad * 2, 18);

      ctx.fillStyle = '#ffd1dc';
      ctx.fillText(label, bx, by + 1);
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Animation loop
  // --------------------------------------------------------------------------
  function start() {
    if (S.isRunning) return;
    S.isRunning = true;
    S.lastT = performance.now();
    S.animAcc = 0;
    S.t = 0;
    S.step = 0;
    S.trailPts = [];
    tick();
  }

  function stop() {
    S.isRunning = false;
    if (S.rafId) cancelAnimationFrame(S.rafId);
    S.rafId = 0;
    drawOnce();
  }

  function tick() {
    if (!S.isRunning) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - S.lastT) / 1000);
    S.lastT = now;

    const { w, h } = getViewWH();
    const scale = S.zoom;

    // Position entlang Plan
    const pts = S.planPts;
    if (!pts || pts.length < 2) rebuildPlan();

    const speed = clamp(S.pxPerSec, SPEED_MIN, SPEED_MAX);
    const fps = clamp(S.fps, FPS_MIN, FPS_MAX);

    // Wir laufen segmentweise entlang der Plan-Punkte.
    const segA = pts[S.step] || pts[0];
    const segB = pts[S.step + 1] || pts[pts.length - 1];

    const vx = segB.x - segA.x;
    const vy = segB.y - segA.y;
    const segLen = Math.hypot(vx, vy) || 1;

    // t in [0..1] über Segment
    S.t += (speed * dt) / segLen;
    if (S.t >= 1) {
      S.t = 0;
      S.step++;
      if (S.step >= pts.length - 1) S.step = 0;
    }

    const x = segA.x + vx * S.t;
    const y = segA.y + vy * S.t;

    // Trail
    S.trailPts.push({ x, y });
    if (S.trailPts.length > 90) S.trailPts.shift();

    // Direction
    let dir = S.dirLock;
    if (S.dirMode === 'auto') {
      dir = vecToDir8(vx, vy);
    }

    // Frame wählen:
    // - Für Walk: wir versuchen ..._<dir>_walk_<n> / ..._<dir>_<n>
    // - Fallback: frameKey aus Auswahl
    let frameKey = S.frameKey;
    if (S.mainMode === 'anim' && S.animMode === 'walk' && S.atlasKey) {
      const frames = listFrameKeys(S.atlasKey);
      // kleine heuristik: suche lauf-sequenz
      const base = frames.find(k => k.includes(`_${dir}_walk_`)) ? 'walk' : null;
      const walkFrames = frames.filter(k => base ? k.includes(`_${dir}_walk_`) : k.includes(`_${dir}_`));
      if (walkFrames.length) {
        // anim index
        S.animAcc += dt;
        const idx = Math.floor(S.animAcc * fps) % walkFrames.length;
        frameKey = walkFrames[idx];
      }
    }

    // Render
    clearCanvas();
    drawGrid();
    drawPlan();
    drawTrail();

    if (S.atlasKey && frameKey && assetsCanDraw()) {
      const frame = getFrame(S.atlasKey, frameKey);
      try {
        window.Assets.drawAtlasFrame(S.ctx, S.atlasKey, frameKey, x, y, { scale });
      } catch (e) {
        setMsg('✖ drawAtlasFrame Fehler: ' + (e?.message || e));
      }
      drawBBox(frame, x, y, scale);
      drawFoot(frame, x, y, scale);
      drawPivot(x, y);
    }

    // Footer
    if (S.footerLeft) S.footerLeft.textContent = 'Frame 0 = Idle';
    if (S.footerRight) S.footerRight.textContent = `Atlas: ${S.atlasKey || '—'} | Dir: ${dir}`;

    S.rafId = requestAnimationFrame(tick);
  }

  
  // --------------------------------------------------------------------------
  // UI-Logik: Modus umschalten (Anim vs Preview)
  // --------------------------------------------------------------------------
  function setDisabled(el, disabled, dim = true) {
    if (!el) return;
    el.disabled = !!disabled;
    if (dim) el.style.opacity = disabled ? '0.45' : '1.0';
  }

  function updateModeUI() {
    // Controls existieren erst nach mount – daher defensiv.
    const isAnim = (S.mainMode === 'anim');

    // Anim-Only Controls deaktivieren/aktivieren
    setDisabled(S.selAnimMode, !isAnim);
    setDisabled(S.selPath, !isAnim);
    setDisabled(S.selDirMode, !isAnim);
    setDisabled(S.selDirLock, !isAnim);
    setDisabled(S.rngSpeed, !isAnim);
    setDisabled(S.rngFps, !isAnim);

    // Start/Stop nur in Anim sinnvoll
    setDisabled(S.btnStart, !isAnim);
    setDisabled(S.btnStop,  !isAnim);

    // Preview-Only Controls
    setDisabled(S.selMarkerType, isAnim);
    setDisabled(S.btnClearMarkers, isAnim);
    setDisabled(S.btnCopyJson, isAnim);
    setDisabled(S.taJson, isAnim, false);

    // In Preview: Plan/Trail sind verwirrend -> wir lassen Checkboxen sichtbar,
    // aber der Loop läuft nicht. (Keine harte Deaktivierung nötig.)
  }
// --------------------------------------------------------------------------
  // Mount Tab
  // --------------------------------------------------------------------------
  function mountSpriteTest(containerEl) {
    // Guard: Container muss existieren
    if (!containerEl) return;

    // Root
    const root = el('div', { class: 'spritetest-root', style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '10px',
      color: '#e8e8e8',
      fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '14px',
    }});

    // Top: controls grid
    const grid = el('div', { style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px 12px',
      alignItems: 'center',
    }});

    const mkLabel = (t) => el('div', { style: { opacity: 0.9 }}, txt(t));
    const mkSelect = () => el('select', { style: ctlStyleSelect() });
    const mkRange = (min,max,step,val) => el('input', { type:'range', min, max, step, value: val, style: ctlStyleRange() });

    // Atlas select
    grid.append(mkLabel('Atlas'));
    S.selAtlas = mkSelect();
    grid.append(S.selAtlas);

    // Frame select
    grid.append(mkLabel('Frame'));
    S.selFrame = mkSelect();
    grid.append(S.selFrame);

    // Modus-Umschalter (NEU):
    //  - Anim Mode (bestehend, unverändert): für Tiere/Units mit Pfad + Richtungen
    //  - Preview Mode (NEU): für Gebäude/Deko (Standbild + Marker)
    grid.append(mkLabel('Modus'));
    S.selMainMode = mkSelect();
    S.selMainMode.append(el('option', { value:'anim' }, txt('Anim Mode (Units/Tiere)')));
    S.selMainMode.append(el('option', { value:'preview' }, txt('Preview Mode (Gebäude/Deko)')));
    grid.append(S.selMainMode);

    // Anim-Untermodus (bestehendes Verhalten, nur UI-klarer benannt)
    grid.append(mkLabel('Anim-Mode'));
    S.selAnimMode = mkSelect();
    S.selAnimMode.append(el('option', { value:'single' }, txt('Single (Stand)')));
    S.selAnimMode.append(el('option', { value:'walk' }, txt('Walk (Pfad)')));
    grid.append(S.selAnimMode);

    // Path
    grid.append(mkLabel('Pfad'));
    S.selPath = mkSelect();
    S.selPath.append(el('option', { value:'line' }, txt('Linie')));
    S.selPath.append(el('option', { value:'box' }, txt('Viereck')));
    S.selPath.append(el('option', { value:'circle' }, txt('Kreis')));
    grid.append(S.selPath);

    // Dir mode
    grid.append(mkLabel('Richtung'));
    S.selDirMode = mkSelect();
    S.selDirMode.append(el('option', { value:'auto' }, txt('AUTO (aus Pfad)')));
    S.selDirMode.append(el('option', { value:'lock' }, txt('LOCK (fix)')));
    grid.append(S.selDirMode);

    // Dir lock
    grid.append(mkLabel('Fix-Richtung'));
    S.selDirLock = mkSelect();
    DIR8.forEach(d => S.selDirLock.append(el('option', { value:d }, txt(d))));
    // Marker-Typ (nur Preview Mode)
    grid.append(mkLabel('Marker'));
    S.selMarkerType = mkSelect();
    S.selMarkerType.append(el('option', { value:'door' }, txt('Door / Entry')));
    S.selMarkerType.append(el('option', { value:'chimney' }, txt('Chimney / Rauch')));
    S.selMarkerType.append(el('option', { value:'tool' }, txt('Tool-Point')));
    S.selMarkerType.append(el('option', { value:'carry' }, txt('Carry-Point')));
    grid.append(S.selMarkerType);

    grid.append(S.selDirLock);

    // Speed
    grid.append(mkLabel('Speed'));
    const speedWrap = el('div', { style: { display:'flex', gap:'10px', alignItems:'center' }});
    S.rngSpeed = mkRange(SPEED_MIN, SPEED_MAX, 1, S.pxPerSec);
    const speedTxt = el('div', { style: { minWidth:'80px', textAlign:'right', opacity:0.9 }}, txt(`${S.pxPerSec} px/s`));
    speedWrap.append(S.rngSpeed);
    speedWrap.append(speedTxt);
    grid.append(speedWrap);

    // FPS
    grid.append(mkLabel('Anim FPS'));
    const fpsWrap = el('div', { style: { display:'flex', gap:'10px', alignItems:'center' }});
    S.rngFps = mkRange(FPS_MIN, FPS_MAX, 1, S.fps);
    const fpsTxt = el('div', { style: { minWidth:'60px', textAlign:'right', opacity:0.9 }}, txt(`${S.fps} fps`));
    fpsWrap.append(S.rngFps);
    fpsWrap.append(fpsTxt);
    grid.append(fpsWrap);

    // Zoom
    grid.append(mkLabel('Zoom'));
    const zoomWrap = el('div', { style: { display:'flex', gap:'10px', alignItems:'center' }});
    S.rngZoom = mkRange(ZOOM_MIN, ZOOM_MAX, 0.05, S.zoom);
    const zoomTxt = el('div', { style: { minWidth:'80px', textAlign:'right', opacity:0.9 }}, txt(`Zoom ${fmt(S.zoom,2)}x`));
    zoomWrap.append(S.rngZoom);
    zoomWrap.append(zoomTxt);
    grid.append(zoomWrap);

    // Preview height
    grid.append(mkLabel('Preview-Höhe'));
    const phWrap = el('div', { style: { display:'flex', gap:'10px', alignItems:'center' }});
    S.rngPrevH = mkRange(PREVIEW_H_MIN, PREVIEW_H_MAX, 5, S.previewH);
    const phTxt = el('div', { style: { minWidth:'80px', textAlign:'right', opacity:0.9 }}, txt(`${S.previewH}px`));
    phWrap.append(S.rngPrevH);
    phWrap.append(phTxt);
    grid.append(phWrap);

    // Buttons
    const btnRow = el('div', { style: { display:'flex', gap:'10px' }});
    S.btnStart = el('button', { style: ctlStyleButton(true) }, txt('Start Test'));
    S.btnStop  = el('button', { style: ctlStyleButton(false) }, txt('Stop'));
    btnRow.append(S.btnStart);
    btnRow.append(S.btnStop);

    // Toggles
    const togRow = el('div', { style: { display:'flex', gap:'14px', flexWrap:'wrap', alignItems:'center' }});
    const mkChk = (label, key) => {
      const id = `spritetest-${key}-${Math.random().toString(16).slice(2)}`;
      const cb = el('input', { id, type:'checkbox' });
      cb.checked = !!S[key];
      cb.addEventListener('change', () => { S[key] = cb.checked; drawOnce(); });
      const lb = el('label', { for:id, style:{ display:'flex', gap:'6px', alignItems:'center', cursor:'pointer' }}, [
        cb, el('span', {}, txt(label))
      ]);
      return lb;
    };
    togRow.append(mkChk('Pivot', 'showPivot'));
    togRow.append(mkChk('BBox', 'showBBox'));
    togRow.append(mkChk('Fußlinie', 'showFoot'));
    togRow.append(mkChk('Trail', 'showTrail'));
    togRow.append(mkChk('Plan', 'showPlan'));
    togRow.append(mkChk('Grid', 'showGrid'));

    // Refresh button
    S.btnRefresh = el('button', { style: ctlStyleButton(false) }, txt('↻ Refresh Atlases'));

    // Message
    S.msg = el('div', { style: { opacity: 0.85, minHeight:'18px' }}, txt(''));

    // Preview wrap + canvas
    S.previewWrap = el('div', { style: {
      position: 'relative',
      width: '100%',
      height: `${S.previewH}px`,
      borderRadius: '14px',
      background: 'rgba(0,0,0,0.20)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }});
    S.canvas = el('canvas', { style: { display:'block' }});
    S.previewWrap.append(S.canvas);

    // Footer inside preview
    const footer = el('div', { style: {
      position:'absolute',
      left:'10px', right:'10px', bottom:'10px',
      display:'flex', justifyContent:'space-between', gap:'10px',
      pointerEvents:'none',
      opacity: 0.9,
    }});
    S.footerLeft = el('div', { style: footerPillStyle() }, txt('Frame 0 = Idle'));
    S.footerRight = el('div', { style: footerPillStyle() }, txt('Atlas: —'));
    footer.append(S.footerLeft, S.footerRight);
    S.previewWrap.append(footer);

    // Assemble
    root.append(grid);
    root.append(btnRow);
    // Preview-Export UI (nur Preview Mode)
    const exportWrap = el('div', { style: {
      display:'flex',
      flexDirection:'column',
      gap:'8px',
      padding:'10px',
      borderRadius:'14px',
      border:'1px solid rgba(255,255,255,0.10)',
      background:'rgba(255,255,255,0.04)',
    }});

    const exportTop = el('div', { style:{ display:'flex', gap:'10px' }});
    S.btnClearMarkers = el('button', { style: ctlStyleButton(false) }, txt('Marker löschen'));
    S.btnCopyJson      = el('button', { style: ctlStyleButton(true)  }, txt('JSON kopieren'));
    exportTop.append(S.btnClearMarkers, S.btnCopyJson);

    S.taJson = el('textarea', { readonly:true, rows:'6', style: {
      width:'100%',
      resize:'none',
      borderRadius:'12px',
      border:'1px solid rgba(255,255,255,0.10)',
      background:'rgba(0,0,0,0.20)',
      color:'#eaeaea',
      padding:'10px',
      fontFamily:'inherit',
      fontSize:'13px',
      lineHeight:'1.25',
    }});
    exportWrap.append(exportTop, S.taJson);

    root.append(togRow);
    root.append(S.btnRefresh);
    root.append(exportWrap);
    root.append(S.msg);
    root.append(S.previewWrap);

    // UI-Gruppen merken (für show/hide)
    S.uiPreviewOnly.push(exportWrap);

    // Attach to container
    containerEl.innerHTML = '';
    containerEl.append(root);

    // Save refs
    S.root = root;

    // Events
    S.selAtlas.addEventListener('change', () => {
      S.atlasKey = S.selAtlas.value || '';
      populateFrames(false);
      drawOnce();
    });
    S.selFrame.addEventListener('change', () => {
      S.frameKey = S.selFrame.value || '';
      drawOnce();
    });
    S.selMainMode.addEventListener('change', () => {
      S.mainMode = S.selMainMode.value || 'anim';

      // Sicherheitsnetz: beim Wechsel in Preview stoppen wir Lauf-Loop sofort.
      if (S.mainMode !== 'anim') stop();

      // UI/Buttons konsistent halten
      updateModeUI();
      drawOnce();
    });

    S.selAnimMode.addEventListener('change', () => {
      S.animMode = S.selAnimMode.value || 'single';
      // Wenn wir nicht laufen, reicht ein Redraw
      drawOnce();
    });
    S.selPath.addEventListener('change', () => {
      S.path = S.selPath.value;
      rebuildPlan();
      drawOnce();
    });
    S.selDirMode.addEventListener('change', () => {
      S.dirMode = S.selDirMode.value;
      drawOnce();
    });
    S.selDirLock.addEventListener('change', () => {
      S.dirLock = S.selDirLock.value;
      drawOnce();
    });

    S.selMarkerType.addEventListener('change', () => {
      S.markerType = S.selMarkerType.value || 'door';
      // Nur UI-Update
      syncExportJson();
      drawOnce();
    });

    S.rngSpeed.addEventListener('input', () => {
      S.pxPerSec = Number(S.rngSpeed.value || 100);
      speedTxt.textContent = `${S.pxPerSec} px/s`;
    });
    S.rngFps.addEventListener('input', () => {
      S.fps = Number(S.rngFps.value || 6);
      fpsTxt.textContent = `${S.fps} fps`;
    });
    S.rngZoom.addEventListener('input', () => {
      S.zoom = Number(S.rngZoom.value || 1);
      zoomTxt.textContent = `Zoom ${fmt(S.zoom,2)}x`;
      drawOnce();
    });
    S.rngPrevH.addEventListener('input', () => {
      S.previewH = Number(S.rngPrevH.value || 320);
      phTxt.textContent = `${S.previewH}px`;
      syncCanvasSize();
    });

    S.btnStart.addEventListener('click', () => {
      if (S.mainMode !== 'anim') return;
      start();
    });
    S.btnStop.addEventListener('click', () => stop());

    // Preview-Buttons
    S.btnClearMarkers.addEventListener('click', () => {
      if (S.mainMode !== 'preview') return;
      clearMarkers();
      setMsg('✅ Marker gelöscht.');
    });
    S.btnCopyJson.addEventListener('click', () => {
      if (S.mainMode !== 'preview') return;
      copyExportJson();
    });
    S.btnRefresh.addEventListener('click', () => {
      retryAtlasDiscovery(2);
      drawOnce();
    });

    // Canvas-Interaktion:
    // - Anim Mode: keine speziellen Klicks (damit wir nix kaputt machen)
    // - Preview Mode: Tap/Klick setzt Marker relativ zum Pivot
    S.canvas.addEventListener('pointerdown', (ev) => {
      if (S.mainMode !== 'preview') return;

      const rect = S.canvas.getBoundingClientRect();
      const cx = (ev.clientX - rect.left);
      const cy = (ev.clientY - rect.top);

      // Pivot-Anker (wie in drawOnce)
      const a = getPreviewAnchor();
      const pivotX = a.x;
      const pivotY = a.y;

      const local = canvasToSpriteLocal(cx, cy, pivotX, pivotY, S.zoom);
      setMarker(S.markerType, local.dx, local.dy);
      setMsg(`📍 Marker "${S.markerType}" gesetzt: ${Math.round(local.dx)}, ${Math.round(local.dy)}`);
    }, { passive: true });


    // Initial populate + sizing
    populateAtlases(false);
    retryAtlasDiscovery();
    rebuildPlan();
    syncCanvasSize();

    // Default-UI sync
    if (S.selMainMode) S.selMainMode.value = S.mainMode;
    if (S.selAnimMode) S.selAnimMode.value = S.animMode;
    if (S.selMarkerType) S.selMarkerType.value = S.markerType;
    updateModeUI();
    syncExportJson();

    // ResizeObserver (wenn Tab-Größe / Orientation wechselt)
    try {
      const ro = new ResizeObserver(() => syncCanvasSize());
      ro.observe(S.previewWrap);
      ro.observe(containerEl);
    } catch (_) {
      // Falls ResizeObserver fehlt: window resize fallback
      window.addEventListener('resize', () => syncCanvasSize(), { passive: true });
    }

    // Erste Zeichnung
    drawOnce();
  }

  // --------------------------------------------------------------------------
  // Inline Styles (klein + robust)
  // --------------------------------------------------------------------------
  function ctlStyleSelect() {
    return {
      width: '100%',
      padding: '10px 10px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.06)',
      color: '#eaeaea',
      outline: 'none',
      fontSize: '14px',
    };
  }

  function ctlStyleRange() {
    return {
      width: '100%',
    };
  }

  function ctlStyleButton(primary) {
    return {
      flex: '1 1 auto',
      padding: '12px 12px',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.10)',
      background: primary ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
      color: '#eaeaea',
      cursor: 'pointer',
      fontSize: '14px',
    };
  }

  function footerPillStyle() {
    return {
      padding: '8px 10px',
      borderRadius: '12px',
      background: 'rgba(0,0,0,0.35)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      fontSize: '13px',
      maxWidth: '48%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };
  }

  // --------------------------------------------------------------------------
  // Registration (Projektstandard: window.registerInspectorTab)
  // --------------------------------------------------------------------------
  function doRegister() {
    // Guard A: Nur registrieren, wenn Adapter vorhanden ist.
    const reg = window.registerInspectorTab;
    if (typeof reg !== 'function') {
      // Fallback: später nochmal versuchen (wenn Inspector erst später lädt)
      window.setTimeout(doRegister, 250);
      return;
    }

    reg({
      id: TAB_ID,
      title: TAB_TITLE,
      // Inspector erwartet: (containerEl, api?) – wir nehmen nur containerEl
      mount: (containerEl) => {
        try {
          mountSpriteTest(containerEl);
        } catch (e) {
          // harte Crashes vermeiden: Tab bleibt benutzbar
          const msg = `[spritetest] Render crash: ${e?.message || e}`;
          console.error(msg, e);
          containerEl.innerHTML = '';
          containerEl.append(el('pre', { style: {
            whiteSpace:'pre-wrap',
            color:'#ff6b6b',
            padding:'10px',
            fontFamily:'ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace',
          }}, txt(msg)));
        }
      },
    });
  }

  // Sofort registrieren
  doRegister();
// ---------------------------------------------------------------------------
// Robust-Register (falls Inspector/Adapter später lädt)
// ---------------------------------------------------------------------------
function __spritetest_tryRegister(){
  try{
    if (window.InspectorContent && typeof window.InspectorContent.register === 'function') {
      window.InspectorContent.register(TAB_ID, mountSpriteTest);
      if (typeof window.InspectorContent.mount === 'function') window.InspectorContent.mount();
      return true;
    }
  }catch(e){}
  try{
    if (typeof window.registerInspectorTab === 'function') {
      window.registerInspectorTab(TAB_ID, mountSpriteTest);
      try{ window.dispatchEvent(new Event('req:insp:content:mount')); }catch(_e){}
      return true;
    }
  }catch(e){}
  return false;
}

if(!__spritetest_tryRegister()){
  let __tries=0;
  const __t=setInterval(()=>{
    __tries++;
    if(__spritetest_tryRegister() || __tries>120) clearInterval(__t);
  },150);
}

})();
