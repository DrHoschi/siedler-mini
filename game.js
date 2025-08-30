/*
============================================================
Datei: game.js
Projekt: Siedler-Mini
Version: v16.1.19
Zweck: Game-Start, Map-Laden, Canvas-Setup, Renderloop, Events
============================================================
*/

/* 1) Imports */
// (keine ES-Module; dieses File ist klassisch via <script> eingebunden)

/* 2) Konstanten / Meta */
const GAME_VERSION = "v16.1.19";
const TILE_SIZE = 32;

/* 3) Hilfsfunktionen */
// =====================================================
// Hilfsfunktion: Log
// =====================================================
function cbLogOk(msg){ (window.CBLog?.ok || console.log)(msg); }
function cbLogWarn(msg){ (window.CBLog?.warn || console.warn)(msg); }

// =====================================================
// Hilfsfunktion: Map laden (JSON)
// =====================================================
async function loadMapJson(url){
  cbLogOk(`[game] Lade Map ${url}`);
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`);
  if (!res.ok) throw new Error(`Map-HTTP-Fehler ${res.status}`);
  return res.json();
}

/* 4) Klassen */
// =====================================================
// Klasse: GameRuntime
// Zweck: Minimale Spiellogik/Loop für Platzhalterbetrieb
// =====================================================
class GameRuntime {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.t0 = 0;
    this.anim = null;
    this.map = null;
  }

  setMap(mapData){
    this.map = mapData;
  }

  resizeToViewport(){
    // Feste Strategie: Canvas füllt Viewport (CSS + echte Größe)
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(){
    const loop = (t)=>{
      if (!this.t0) this.t0 = t;
      const dt = t - this.t0;
      this.render(dt);
      this.anim = requestAnimationFrame(loop);
    };
    this.resizeToViewport();
    window.addEventListener("resize", () => this.resizeToViewport());
    this.anim = requestAnimationFrame(loop);
    cbLogOk(`[game] Renderloop gestartet (v${GAME_VERSION})`);
  }

  stop(){
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = null;
  }

  render(t){
    const ctx = this.ctx;
    const W = this.canvas.width / (window.devicePixelRatio || 1);
    const H = this.canvas.height / (window.devicePixelRatio || 1);

    // Hintergrund (dein dunkles Grün – identisch zu index)
    ctx.fillStyle = "#093c2f";
    ctx.fillRect(0,0,W,H);

    // Kleine Lebenszeichen-Anzeige
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(230,242,237,0.9)";
    ctx.fillText(`Siedler-Mini v${GAME_VERSION} · dpr ${Math.round(window.devicePixelRatio||1)} · t ${Math.round(t)}ms`, 10, 20);

    if (this.map && this.map.size) {
      ctx.fillText(`Map: ${this.map.size?.w || "?"}×${this.map.size?.h || "?"} · Tile ${TILE_SIZE}`, 10, 38);
    }
  }
}

/* 5) Hauptlogik (Init, Start) */
// Namespace für externen Start (UI ruft das auf)
window.GameBoot = window.GameBoot || {};
window.startGame = window.startGame || function(mapUrl){ // Fallback-API
  window.GameBoot.start(mapUrl);
};

window.GameBoot.start = async function(mapUrl){
  try {
    cbLogOk("[game] NewGame start " + (mapUrl || "(keine Map übergeben)"));

    // Canvas besorgen
    const canvas = document.getElementById("game");
    if (!canvas) {
      cbLogWarn("[game] Canvas #game fehlt – Abbruch.");
      return;
    }

    // Map laden (wenn vorhanden), ansonsten Dummy
    let mapData = { size: { w: 64, h: 64 } };
    if (mapUrl) {
      try {
        mapData = await loadMapJson(mapUrl);
        cbLogOk(`[game] Map geladen: ${mapUrl}`);
      } catch(e) {
        cbLogWarn(`[game] Map-Load fehlgeschlagen: ${e?.message || e}`);
      }
    }

    // Runtime starten
    const runtime = new GameRuntime(canvas);
    runtime.setMap(mapData);
    runtime.start();

    // 8) Events: Einheitlich nach erfolgreichem Start
    window.dispatchEvent(new CustomEvent('cb:game-started', { detail: { map: mapUrl || null }}));
    window.GameUI?.onGameStarted?.();   // Startfenster schließen

    cbLogOk("[game] Game started");
  } catch(err){
    cbLogWarn("[game] Startfehler: " + (err?.message || err));
  }
};

// Optional: Automatischer Start, wenn UI keine Karte übergibt (nur Dev)
window.addEventListener('cb:ui-ready', () => {
  cbLogOk(`[game] cb:ui-ready empfangen (v${GAME_VERSION})`);
  // Kein Autostart hier – Start erfolgt über UI-Panel
});

/* 6) Exports */
// (über window.GameBoot / window.startGame)
