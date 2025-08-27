/**
 * ============================================================================
 *  PathOverlay (V1.0.0) — Dynamische Trampelpfade als Overlay
 *  Projekt: Siedler-Mini
 *  Autor: ChatGPT (Spiel Texturen)
 *
 *  Zweck:
 *  - Richtungsorientiertes Stempeln von transparenten Dirt-Brushes
 *  - Pfade entstehen durch Nutzung, verblassen ohne Nutzung (Decay)
 *  - Zeichnet auf Offscreen-Canvas, wird über Karte gelegt (flexibel)
 *
 *  Integration:
 *  - import { PathOverlay } from "./core/path-overlay.js";
 *  - PathOverlay.init({ tileSize, worldWidthPx, worldHeightPx, brushes: [...] })
 *  - Im Game-Loop: PathOverlay.update(dt); PathOverlay.render(ctx, camera)
 *  - Bei Einheitenbewegung: PathOverlay.stampAt(x, y, angleRad, speed)
 *
 *  Abhängigkeiten: keine (nur Canvas 2D)
 * ============================================================================
 */

export const PathOverlay = (() => {
  // -----------------------------
  // KONSTANTEN (tweakbar)
  // -----------------------------
  const DEFAULTS = {
    spacingPx: 10,          // Mindestabstand zwischen Stempeln entlang der Bewegung
    baseAlpha: 0.04,        // Alphawert pro Stempel (wird ggfs. mit "pressure" skaliert)
    angleStretch: 1.35,     // Elliptische Streckung entlang Laufrichtung (x:1, y:angleStretch)
    jitterPx: 0.8,          // Leichtes Jitter für organische Kanten
    decayPerSec: 0.012,     // Globale Abnahme der Overlay-Deckkraft pro Sekunde
    compositeMode: "source-over", // "source-over" (Farben der Brush benutzen) oder "multiply" (Brush grau + Farbtint)
    tint: "rgba(112, 78, 35, 0.65)", // Wird genutzt, falls tinting aktiviert wird (siehe drawStamp)
    maxBrushScale: 1.0,     // Obergrenze beim Skalieren
    minBrushScale: 0.85,    // Untergrenze (Zoom/Wear-Anpassung)
    usePerAgentSpacing: true,
  };

  // -----------------------------
  // INTERNER STATE
  // -----------------------------
  const S = {
    inited: false,
    tileSize: 32,
    worldW: 2048,
    worldH: 2048,
    off: null,          // Offscreen-Canvas
    offCtx: null,       // Offscreen-Context
    brushes: [],        // [{img, size, weight}]
    lastStampPosPerAgent: new WeakMap(), // agent -> {x,y}
    tmpStampCanvas: null,               // zum Tint/Stretchen
    tmpStampCtx: null,
  };

  // -----------------------------
  // HILFE: Brush laden
  // -----------------------------
  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // -----------------------------
  // INIT
  // -----------------------------
  async function init(opts) {
    if (S.inited) return;
    const o = { ...DEFAULTS, ...opts };

    S.tileSize = o.tileSize ?? 32;
    S.worldW = o.worldWidthPx ?? 2048;
    S.worldH = o.worldHeightPx ?? 2048;

    // Offscreen anlegen
    S.off = document.createElement("canvas");
    S.off.width  = S.worldW;
    S.off.height = S.worldH;
    S.offCtx = S.off.getContext("2d", { alpha: true });
    S.offCtx.imageSmoothingEnabled = true;

    // Tempo-Canvas für Tint/Stretch
    S.tmpStampCanvas = document.createElement("canvas");
    S.tmpStampCanvas.width = 256;
    S.tmpStampCanvas.height = 256;
    S.tmpStampCtx = S.tmpStampCanvas.getContext("2d", { alpha: true });

    // Brushes laden
    S.brushes = [];
    if (o.brushes && o.brushes.length) {
      for (const b of o.brushes) {
        const img = typeof b.img === "string" ? await loadImage(b.img) : b.img;
        S.brushes.push({
          img,
          size: b.size || img.width,
          weight: b.weight ?? 1.0,  // höhere weight = häufiger genutzt
          grayscale: b.grayscale ?? false, // falls multiply-Tinting gewünscht
        });
      }
      // nach weight sortieren (optional)
      S.brushes.sort((a,b)=> (b.weight - a.weight));
    } else {
      console.warn("[PathOverlay] Keine Brushes angegeben – bitte unter init({brushes:[...]}) übergeben.");
    }

    S.DEFAULTS = o;
    S.inited = true;
    console.log("[PathOverlay] init ok", { world: [S.worldW, S.worldH], brushes: S.brushes.length });
  }

  // -----------------------------
  // INTERN: Stempel zeichnen
  // -----------------------------
  function drawStamp(x, y, angleRad, alpha = S.DEFAULTS.baseAlpha, scale = 1.0) {
    if (!S.brushes.length) return;

    // Brush auswählen (einfach: erstes – oder zufällig gewichtet)
    const brush = pickWeightedBrush(S.brushes);

    const w = brush.size;
    const h = brush.size;

    // Temp-Canvas dimension
    const maxDim = Math.max(w, h) * 1.6;
    if (S.tmpStampCanvas.width !== Math.ceil(maxDim)) {
      S.tmpStampCanvas.width  = Math.ceil(maxDim);
      S.tmpStampCanvas.height = Math.ceil(maxDim);
    }
    const tctx = S.tmpStampCtx;
    tctx.clearRect(0,0,S.tmpStampCanvas.width, S.tmpStampCanvas.height);

    // optional: grauen Brush einfärben (multiply) – hier mit tint
    // wir malen erst Brush, dann (falls nötig) farbe im Multiply drüber.
    tctx.globalCompositeOperation = "source-over";
    tctx.drawImage(brush.img, 0, 0, w, h,
                   (S.tmpStampCanvas.width - w)/2,
                   (S.tmpStampCanvas.height - h)/2,
                   w, h);

    // Falls der Brush neutral grau ist und wir eine Tönung möchten
    if (S.DEFAULTS.compositeMode === "multiply" || brush.grayscale) {
      tctx.globalCompositeOperation = "multiply";
      tctx.fillStyle = S.DEFAULTS.tint;
      tctx.fillRect(0,0,S.tmpStampCanvas.width,S.tmpStampCanvas.height);
      tctx.globalCompositeOperation = "source-over";
    }

    // Zielkontext vorbereiten
    const ctx = S.offCtx;
    ctx.save();

    // Gesamt-Alpha (Wear)
    ctx.globalAlpha = alpha;

    // Blend-Modus (z. B. multiply für natürliches Einfärben des Untergrunds)
    ctx.globalCompositeOperation = S.DEFAULTS.compositeMode;

    // Transform: translate -> rotate -> scale (elliptisch in Bewegungsrichtung)
    const stretch = S.DEFAULTS.angleStretch;
    const s = clamp(scale, S.DEFAULTS.minBrushScale, S.DEFAULTS.maxBrushScale);
    const sx = s * stretch;
    const sy = s;

    // leichtes Jitter
    const jx = (Math.random()*2 - 1) * S.DEFAULTS.jitterPx;
    const jy = (Math.random()*2 - 1) * S.DEFAULTS.jitterPx;

    ctx.translate(x + jx, y + jy);
    ctx.rotate(angleRad);
    ctx.scale(sx, sy);

    // Bild zentriert zeichnen
    ctx.drawImage(
      S.tmpStampCanvas,
      -S.tmpStampCanvas.width/2,
      -S.tmpStampCanvas.height/2
    );

    ctx.restore();
  }

  function pickWeightedBrush(brushes) {
    const total = brushes.reduce((a,b)=> a + (b.weight||1), 0);
    let r = Math.random() * total;
    for (const b of brushes) {
      r -= (b.weight || 1);
      if (r <= 0) return b;
    }
    return brushes[0];
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // -----------------------------
  // API: Stempeln entlang Bewegung
  // -----------------------------
  function stampAt(x, y, angleRad, speed = 1, agent = null) {
    if (!S.inited) return;

    // Per-Agent-Spacing (verhindert Stempel-Spam bei hoher Tickrate)
    if (agent && S.DEFAULTS.usePerAgentSpacing) {
      const last = S.lastStampPosPerAgent.get(agent);
      if (last) {
        const dx = x - last.x, dy = y - last.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < (S.DEFAULTS.spacingPx * S.DEFAULTS.spacingPx)) return; // noch zu nah
      }
      S.lastStampPosPerAgent.set(agent, {x, y});
    }

    // Alpha abhängig von Geschwindigkeit minimal boosten
    const alpha = S.DEFAULTS.baseAlpha * (0.9 + Math.min(1.2, speed*0.15));
    drawStamp(x, y, angleRad, alpha, 1.0);
  }

  // -----------------------------
  // UPDATE (Decay)
  // -----------------------------
  function update(dtSeconds) {
    if (!S.inited || S.DEFAULTS.decayPerSec <= 0) return;

    const ctx = S.offCtx;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    // Ein gleichmäßiger, sehr transparenter „Radier“-Film
    ctx.fillStyle = `rgba(0,0,0,${S.DEFAULTS.decayPerSec * dtSeconds})`;
    ctx.fillRect(0,0,S.off.width,S.off.height);
    ctx.restore();
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  function render(ctx, camera) {
    if (!S.inited) return;
    // Kamera erwartet world->screen: wir zeichnen nur den sichtbaren Ausschnitt
    const sx = Math.floor(camera.x);
    const sy = Math.floor(camera.y);
    const sw = Math.ceil(camera.w);
    const sh = Math.ceil(camera.h);

    ctx.drawImage(
      S.off,
      sx, sy, sw, sh,      // Quelle: sichtbarer Bereich
      0,  0,  sw, sh       // Ziel: Bildschirmbereich
    );
  }

  // -----------------------------
  // DEBUG / UTIL
  // -----------------------------
  function clearAll() {
    if (!S.offCtx) return;
    S.offCtx.clearRect(0,0,S.off.width,S.off.height);
  }

  return {
    init,
    update,
    render,
    stampAt,
    clearAll,
    get canvas(){ return S.off; },
    get config(){ return S.DEFAULTS; },
  };
})();
