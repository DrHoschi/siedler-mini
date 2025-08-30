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
function cbLogOk(msg){ (window.CBLog?.ok || console.log)(msg); }
function cbLogWarn(msg){ (window.CBLog?.warn || console.warn)(msg); }
async function loadMapJson(url){
  cbLogOk(`[game] Lade Map ${url}`);
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`);
  if (!res.ok) throw new Error(`Map-HTTP-Fehler ${res.status}`);
  return res.json();
}

/* 4) Klassen */
class GameRuntime {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.tPrev = 0;
    this.anim = null;
    this.map = null;
    this.fps = 0;
  }
  setMap(mapData){ this.map = mapData; }
  resizeToViewport(){
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    Object.assign(this.canvas.style, { width:`${w}px`, height:`${h}px` });
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  start(){
    const loop = (t)=>{
      if (!this.tPrev) this.tPrev = t;
      const dt = t - this.tPrev;
      this.tPrev = t;
      // fps Schätzung glätten
      this.fps = this.fps ? (this.fps*0.9 + (1000/dt)*0.1) : (1000/dt);

      this.render(t);
      // Laufzeitdaten an Window (für Inspector)
      publishRuntime(this, t);

      this.anim = requestAnimationFrame(loop);
      window.dispatchEvent(new CustomEvent('cb:runtime-tick'));
    };
    this.resizeToViewport();
    window.addEventListener("resize", () => this.resizeToViewport());
    this.anim = requestAnimationFrame(loop);
    cbLogOk(`[game] Renderloop gestartet (${vStr(GAME_VERSION)})`);
  }
  stop(){ if (this.anim) cancelAnimationFrame(this.anim); this.anim = null; }
  render(t){
    const ctx = this.ctx;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;

    ctx.fillStyle = "#093c2f";
    ctx.fillRect(0,0,cssW,cssH);

    ctx.font = "12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
    ctx.fillStyle = "rgba(230,242,237,0.9)";
    ctx.fillText(`Siedler-Mini ${vStr(GAME_VERSION)} · dpr ${Math.round(window.devicePixelRatio||1)} · fps ${Math.round(this.fps)}`, 10, 20);

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
    fps: Math.round(rt.fps),
    perfNow: Math.round(nowMs)
  };
  // zusätzlich einmalig Game-Version setzen, damit ui-start.js sie anzeigen kann
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
