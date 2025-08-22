/**
 * Siedler‑Mini — boot.js
 * -----------------------------------------------------------------------------
 * Rolle: Startpunkt der App. Setup von Canvas, Rendering-Prefs, globaler Init,
 *        Laden der Items‑Master‑Sprite + Atlas, Start des Game‑Loops.
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweise:
 *  - Debug‑Tools bleiben unangetastet (hier nur optionaler Sanity‑Check via F2).
 *  - Startfenster/UX bleibt bei euch; hier nur Basiskleber zum Rendern.
 *  - Pixel‑Art-Rendering standardmäßig "crisp" (Nearest‑Neighbor).
 * -----------------------------------------------------------------------------
 */

/* ===================== Imports ===================== */
import Assets, { initItems, getItemsAtlas, drawItem } from './core/asset.js';

/* ===================== Konstanten ===================== */
const CANVAS_ID = 'game';
const ENABLE_PIXEL_ART = true;      // true = crisp (nearest); false = smooth
const INITIAL_BG = '#0b1628';       // euer Farbschema (aus index.html)
const DPR_FALLBACK = 1;             // falls devicePixelRatio nicht verfügbar
const SHOW_BOOT_LOG = true;         // Konsolen-Logs für Boot-Sequenz
const DEBUG_HOTKEY = 'F2';          // F2: Sanity-Overlay toggeln

/* ===================== Hilfsfunktionen ===================== */

/** Hole Canvas + 2D-Kontext, setze Rendering-Qualität und DPI-Scaling. */
function prepareCanvas() {
  const canvas = document.getElementById(CANVAS_ID);
  if (!canvas) throw new Error(`[boot] Canvas #${CANVAS_ID} nicht gefunden.`);

  // Rendering-Qualität setzen
  const { ctx } = ENABLE_PIXEL_ART
    ? Assets.imageRenderingCrisp(canvas)
    : Assets.imageRenderingSmooth(canvas);

  // Hintergrundfarbe (nur kosmetisch, falls CSS fehlt)
  try { canvas.style.background = INITIAL_BG; } catch {}

  // HiDPI-Setup
  const dpr = Assets.setupHiDPICanvas(canvas, { dpr: Math.max(DPR_FALLBACK, self.devicePixelRatio || 1) });

  return { canvas, ctx, dpr };
}

/** Resize-Handler (HiDPI bleibt korrekt). */
function attachResize(canvas) {
  let rafId = 0;
  const onResize = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      Assets.setupHiDPICanvas(canvas);
    });
  };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  return () => {
    removeEventListener('resize', onResize);
    removeEventListener('orientationchange', onResize);
  };
}

/** Clear mit optionaler Hintergrundfarbe. */
function clear(ctx, color = null) {
  const { canvas } = ctx;
  if (color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* ===================== Klassen ===================== */

/**
 * Kleine Debug‑Overlay‑Klasse: Zeichnet ein paar Items aus dem Atlas,
 * wenn per Hotkey aktiviert (F2). Ersetzt NICHT eure Debug‑Leiste.
 */
class ItemsSanityOverlay {
  constructor() {
    this.enabled = false;
    this.lastToggleTs = 0;
    this.keysToShow = [
      'log', 'stone', 'crate', 'sack', 'barrel', 'rope',
      'bread', 'cheese', 'fish', 'meat', 'grain', 'food',
      'bucket', 'sword', 'bow', 'arrows', 'shield', 'coins', 'gems'
    ];
  }
  toggle() {
    const now = performance.now();
    if (now - this.lastToggleTs < 150) return; // simple debounce
    this.enabled = !this.enabled;
    this.lastToggleTs = now;
    console.debug(`[ItemsSanityOverlay] ${this.enabled ? 'ON' : 'OFF'}`);
  }
  draw(ctx) {
    if (!this.enabled) return;
    let x = 24, y = 24, col = 0;
    const step = 72; // 128px * 0.5 ~ 64px + 8px padding
    for (const key of this.keysToShow) {
      try {
        drawItem(ctx, key, x, y, { scale: 0.5, pixelSnap: true });
      } catch (e) {
        // Falls ein Key (noch) nicht im Atlas existiert, ignorieren.
      }
      x += step; col++;
      if (col >= 10) { col = 0; x = 24; y += step; }
    }
  }
}

/* ===================== Hauptlogik ===================== */

const Boot = {
  /** Globaler Zustand des Bootstraps. */
  state: {
    canvas: null,
    ctx: null,
    dpr: 1,
    running: false,
    disposer: null,
    overlay: new ItemsSanityOverlay(),
    t0: 0,
    tLast: 0
  },

  /** Initialisiert Canvas, lädt Items‑Atlas, startet Loop. */
  async start() {
    if (SHOW_BOOT_LOG) console.debug('[BOOT] start');

    // 1) Canvas/Context vorbereiten
    const { canvas, ctx, dpr } = prepareCanvas();
    this.state.canvas = canvas;
    this.state.ctx = ctx;
    this.state.dpr = dpr;

    // 2) Resize-Listener
    this.state.disposer = attachResize(canvas);

    // 3) Items‑Atlas laden (idempotent)
    if (SHOW_BOOT_LOG) console.debug('[BOOT] loading Items…');
    try {
      await initItems(); // lädt /assets/items/items_master_sprite.(png|json)
      if (SHOW_BOOT_LOG) console.debug('[BOOT] Items ready', Object.keys(getItemsAtlas().frames).length, 'frames');
    } catch (err) {
      console.error('[BOOT] Items init failed:', err);
    }

    // 4) Input: Hotkey für Mini‑Sanity‑Overlay (F2)
    addEventListener('keydown', (ev) => {
      if (ev.key === DEBUG_HOTKEY) {
        this.state.overlay.toggle();
        ev.preventDefault();
      }
    });

    // 5) Game‑Loop starten
    this.state.running = true;
    this.state.t0 = performance.now();
    this.state.tLast = this.state.t0;
    requestAnimationFrame(this.loop.bind(this));
  },

  /** Einfache Loop mit Delta‑Zeit. */
  loop(tNow) {
    if (!this.state.running) return;
    const { ctx } = this.state;
    const dt = (tNow - this.state.tLast) / 1000;
    this.state.tLast = tNow;

    // Update‑Phase (hier später eure Systeme/Scenes aufrufen)
    // update(dt);

    // Render‑Phase
    clear(ctx, INITIAL_BG);

    // Beispiel: Hier könnten eure World/UI‑Renderer kommen
    // renderWorld(ctx, dt);
    // renderUI(ctx, dt);

    // Optional: Sanity‑Overlay mit Items zeichnen (wenn aktiviert)
    this.state.overlay.draw(ctx);

    requestAnimationFrame(this.loop.bind(this));
  },

  /** Stoppt den Loop & räumt Events auf. */
  stop() {
    this.state.running = false;
    if (this.state.disposer) {
      try { this.state.disposer(); } catch {}
      this.state.disposer = null;
    }
  }
};

/* ===================== Exports ===================== */
export default Boot;

/* ===================== Auto-Start ===================== */
function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// Automatischer Start (Startfenster/Scene-Manager bleibt getrennt bei euch)
onReady(() => Boot.start());
