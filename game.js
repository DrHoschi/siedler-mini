/*
============================================================
Datei: game.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck: Game-Start, Map-Laden, Canvas-Setup, Renderloop, Events
============================================================
*/

/* 1) Imports */
// – klassische <script>-Einbindung

/* 2) Konstanten / Meta */
const GAME_VERSION = "16.1.19";
const TILE_SIZE = 32;

/* 3) Hilfsfunktionen */
// ==============================================
// Log-Helfer
// ==============================================
function cbLogOk(msg){ (window.CBLog?.ok || console.log)(msg); }
function cbLogWarn(msg){ (window.CBLog?.warn || console.warn)(msg); }

// ==============================================
// Viewport (mobile-sicher, inkl. Safari-UI)
// ==============================================
function getViewportSize(){
  const vv = window.visualViewport;
  if (vv) return { w: Math.floor(vv.width), h: Math.floor(vv.height) };
  return { w: Math.floor(window.innerWidth), h: Math.floor(window.innerHeight) };
}

// ==============================================
// Map laden
// ==============================================
async function loadMapJson(url){
  cbLogOk(`[game] Lade Map ${url}`);
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`);
  if (!res.ok) throw new Error(`Map-HTTP-Fehler ${res.status}`);
  return res.json();
}

/* 4) Klassen */
// ==============================================
// Klasse: GameRuntime
// ==============================================
class GameRuntime {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.tPrev = 0;
    this.anim = null;
    this.map = null;
    this.fps = undefined; // erst nach 2. Frame vorhanden
  }

  setMap(mapData){ this.map = mapData; }

  resizeToViewport(){
    const { w, h } = getViewportSize();
    const dpr = window.devicePixelRatio || 1;

    // CSS-Größe (sichtbar)
    this.canvas.style.width  = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Pixel-Backbuffer
    this.canvas.width  = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));

    // DPI-Korrektur
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(){
    const loop = (t)=>{
      // dt berechnen (Infinity/NaN vermeiden)
      let dt = 0;
      if (this.tPrev > 0) dt = t - this.tPrev;
      this.tPrev = t;

      // fps nur berechnen, wenn dt > 0
      if (dt > 0 && Number.isFinite(dt)) {
        const inst = 1000 / dt;
        this.fps = this.fps === undefined ? inst : (this.fps * 0.9 + inst * 0.1);
      }

      this.render(t);
      publishRuntime(this, t);

      this.anim = requestAnimationFrame(loop);
      window.dispatchEvent(new CustomEvent('cb:runtime-tick'));
    };

    this.resizeToViewport();
    window.addEventListener("resize", () => this.resizeToViewport());
    window.visualViewport?.addEventListener("resize", () => this.resizeToViewport());
    window.addEventListener("orientationchange", () => {
      // leichte Verzögerung, bis iOS-UI eingefahren ist
      setTimeout(()=>this.resizeToViewport(), 120);
    });

    this.anim = requestAnimationFrame(loop);
    cbLogOk(`[game] Renderloop gestartet (${vStr(GAME_VERSION)})`);
  }

  stop(){ if (this.anim) cancelAnimationFrame(this.anim); this.anim = null; }

  render(){
    const ctx = this.ctx;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;

    // Hintergrund
    ctx.fillStyle = "#093c2f";
    ctx.fillRect(0,0,cssW,cssH);

    // HUD-Text
    ctx.font = "12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
    ctx.fillStyle = "rgba(230,242,237,0.9)";

    const fpsText = (this.fps !== undefined && Number.isFinite(this.fps))
      ? `${Math.round(this.fps)}`
      : "—";

    ctx.fillText(`Siedler-Mini ${vStr(GAME_VERSION)} · dpr ${Math.round(window.devicePixelRatio||1)} · fps ${fpsText}`, 10, 20);

    if (this.map && this.map.size) {
      ctx.fillText(`Map: ${this.map.size?.w || "?"}×${this.map.size?.h || "?"} · Tile ${TILE_SIZE}`, 10, 38);
    }
  }
}

/* 5) Hauptlogik */
const vStr = v => `v${String(v).replace(/^v+/,'')}`;

function publishRuntime(rt, nowMs){
  window.__cb = window.__cb || {};
  window.__cb.runtime = {
    version: vStr(GAME_VERSION),
    indexVersion: vStr(window.__cb.indexVersion || GAME_VERSION),
    canvas: {
      pxW: rt.canvas.width,
      pxH: rt.canvas.height,
      cssW: `${rt.canvas.clientWidth}px`,
      cssH: `${rt.canvas.clientHeight}px`
    },
    map: window.__cb.selectedMap || null,
    mapSize: rt.map?.size || null,
    tile: TILE_SIZE,
    dpr: window.devicePixelRatio || 1,
    fps: (rt.fps !== undefined && Number.isFinite(rt.fps)) ? Math.round(rt.fps) : null,
    perfNow: Math.round(nowMs)
  };
  window.__cb.gameVersion = GAME_VERSION;
}

window.GameBoot = window.GameBoot || {};
window.startGame = window.startGame || function(mapUrl){ window.GameBoot.start(mapUrl); };

window.GameBoot.start = async function(mapUrl){
  try {
    cbLogOk("[game] NewGame start " + (mapUrl || "(keine Map übergeben)"));
    const canvas = document.getElementById("game");
    if (!canvas) { cbLogWarn("[game] Canvas #game fehlt – Abbruch."); return; }

    let mapData = { size: { w: 64, h: 64 } };
    if (mapUrl) {
      try { mapData = await loadMapJson(mapUrl); cbLogOk(`[game] Map geladen: ${mapUrl}`); }
      catch(e) { cbLogWarn(`[game] Map-Load fehlgeschlagen: ${e?.message || e}`); }
    }

    const runtime = new GameRuntime(canvas);
    runtime.setMap(mapData);
    runtime.start();

    window.dispatchEvent(new CustomEvent('cb:game-started', { detail: { map: mapUrl || null }}));
    window.GameUI?.onGameStarted?.();
    cbLogOk("[game] Game started");
  } catch(err){
    cbLogWarn("[game] Startfehler: " + (err?.message || err));
  }
};

window.addEventListener('cb:ui-ready', () => {
  cbLogOk(`[game] cb:ui-ready empfangen (${vStr(GAME_VERSION)})`);
});

/* 6) Exports */
// (über window.GameBoot / window.startGame)
