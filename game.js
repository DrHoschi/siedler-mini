/* game.js v16.0.7
 * - Konsistente Versionslogs + Badge an Index
 * - Sanfter UI-Handshake (__uiHello)
 * - GameLoader.start(..) Promise-basiert (unverändert, falls bereits vorhanden)
 * - Editor-/Inspector-Hooks (optional, werden nur geloggt, wenn nicht vorhanden)
 */

/* ====== Konstante Version ====== */
const GAME_JS_VERSION = "v16.0.7";

/* ====== Logging-Helpers ====== */
function stamp(){ const d=new Date(); return d.toTimeString().slice(0,8); }
function log(kind, msg){
  const icon = kind==="ok"?"✅":kind==="warn"?"⚠️":kind==="err"?"❌":"ℹ️";
  const line = `[${stamp()}] ${icon} (${kind}) ${msg}`;
  // An UI loggen, wenn vorhanden
  if (typeof window !== "undefined" && window.UIlog) {
    window.UIlog(msg, kind);
  } else {
    console.log(line);
  }
}

/* ====== Public API ====== */
const Game = {
  /* UI kann diesen Ping beim DOMContentLoaded schicken */
  __uiHello(indexVer){
    log("ok", `game.js initialisiert (${GAME_JS_VERSION}), UI meldet ${indexVer}`);
    if (typeof window.__setGameVersionBadge === "function"){
      window.__setGameVersionBadge(GAME_JS_VERSION);
    }
  },

  /* Editor-/Inspector-Facade optional */
  Editor: {
    open(){
      if (window.GameEditor && typeof window.GameEditor.open === 'function'){
        window.GameEditor.open();
      } else {
        log("warn","Editor nicht verfügbar (GameEditor.open fehlt).");
      }
    }
  },
  Inspector: {
    toggle(){
      if (window.GameInspector && typeof window.GameInspector.toggle === 'function'){
        return window.GameInspector.toggle();
      } else {
        log("warn","Inspector nicht verfügbar (GameInspector.toggle fehlt).");
        return false;
      }
    }
  },

  /* Minimaler Loader – ersetze intern durch deine echte Implementierung */
  GameLoader: {
    /**
     * Startet das Spiel mit einer Map-URL.
     * Gibt ein Promise zurück, das resolved, wenn Grundinitialisierung durch ist.
     */
    async start(mapUrl = "./assets/maps/map-mini.json"){
      log("ok", `GameLoader.start ${mapUrl}`);

      // Hier: deine echten Initialisierungsschritte integrieren
      // ------------------------------------------------------
      // Beispielhaft: Canvas binden
      const canvas = document.getElementById('gameCanvas');
      if (!canvas) {
        log("err", "Canvas #gameCanvas nicht gefunden.");
        throw new Error("Canvas nicht gefunden");
      }

      const ctx = canvas.getContext('2d');
      if (!ctx){
        log("err","2D Context nicht verfügbar.");
        throw new Error("2D Context fehlt");
      }

      // (Demo) Hintergrund + kleines Ready-Schild
      ctx.fillStyle = "#215a3f";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px ui-sans-serif";
      ctx.fillText("Spiel initialisiert …", 20, 28);

      // (Demo) Atlas/Map so nutzen, wie dein bestehender Code es bereits macht:
      // -> wenn du bereits eine funktionierende Pipeline hast, rufe sie hier auf.
      await fakeWait(300); // minimale asynchrone Wartezeit, um Promise-Flow zu demonstrieren

      log("ok", "Game started");
      return true;
    }
  }
};

/* ====== Hilfsfunktionen ====== */
function fakeWait(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ====== Export ins Window ====== */
if (typeof window !== "undefined"){
  window.Game = Game;
  // Beim Laden direkt einmal Version an UI-Badge melden (falls Index schon da)
  if (typeof window.__setGameVersionBadge === "function"){
    window.__setGameVersionBadge(GAME_JS_VERSION);
  }
  // Und selbst loggen (falls UIlog bereits da ist)
  log("ok", `game.js geladen, game.js ${GAME_JS_VERSION}`);
}
