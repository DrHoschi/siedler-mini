// game.js — V14.6-mobil (kompatibel zu boot.js)
// Liefert die erwartete Schnittstelle: export function startGame(opts)
// und kümmert sich nur um HUD/Spielzustand, ohne die boot.js-Interaktionen zu stören.

export async function startGame(opts) {
  // opts: { canvas, DPR, onHUD(key,val) }
  const { onHUD } = opts;

  // --- interner "Spielzustand" (leichtgewichtig) ---------------------------
  const state = {
    tool: "pointer",          // pointer | road | hq | woodcutter | depot | erase
    resources: {
      holz: 30,
      stein: 20,
      nahrung: 0,
      gold: 0,
      traeger: 0,
    },
    // später können hier Weltobjekte, Straßen etc. ergänzt werden
  };

  // --- HUD initial befüllen -------------------------------------------------
  function pushHUDAll() {
    onHUD?.("holz", state.resources.holz);
    onHUD?.("stein", state.resources.stein);
    onHUD?.("nahrung", state.resources.nahrung);
    onHUD?.("gold", state.resources.gold);
    onHUD?.("traeger", state.resources.traeger);
    onHUD?.("tool", toolLabel(state.tool));
    // Hinweis: Zoom-Text aktualisiert boot.js selbst
  }
  pushHUDAll();

  // --- Tool-Umschaltung einhängen ------------------------------------------
  // Wir lauschen auf die linken Buttons (data-tool) und spiegeln das ins HUD.
  const toolsRoot = document.querySelector("#tools");
  if (toolsRoot) {
    toolsRoot.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tool]");
      if (!btn) return;
      const next = btn.getAttribute("data-tool");
      if (!next) return;
      state.tool = next;
      onHUD?.("tool", toolLabel(state.tool));
      // hier könnte man später eigene Build-/Spiel-Logik je Tool ergänzen
    });
  }

  // --- optional: Dev/Debug-Hooks -------------------------------------------
  // * Kein eigenes Zeichnen! Damit kollidieren wir nicht mit boot.js.
  // * Wenn du später Render hier übernehmen willst, sag Bescheid – ich schalte
  //   boot.js so um, dass es seine Fallback-Zeichnung dann abstellt.

  // Beispiel: kleine Komfort-Aktionen (optional, nichts Kritisches)
  const btnDebug = document.querySelector("#btnDebug");
  if (btnDebug) {
    btnDebug.addEventListener("click", () => {
      const msg =
        "Debug (V14.6):\n" +
        `Tool: ${state.tool}\n` +
        `Holz: ${state.resources.holz}, Stein: ${state.resources.stein}\n` +
        `Nahrung: ${state.resources.nahrung}, Gold: ${state.resources.gold}\n` +
        `Träger: ${state.resources.traeger}`;
      // Nur Info – blockiert nichts
      console.log(msg);
    });
  }

  // --- done -----------------------------------------------------------------
  // Wichtig: NICHTS zurückgeben / keinen Render-Loop starten.
  // Das Canvas-Rendering macht weiterhin boot.js (Raster + HQ-Platzhalter),
  // damit es zu keinem Event-/Zeichen-Konflikt kommt.
}

// Hilfsfunktion: deutsch beschriftete Tools für das HUD
function toolLabel(t) {
  switch (t) {
    case "pointer": return "Zeiger";
    case "road": return "Straße";
    case "hq": return "HQ";
    case "woodcutter": return "Holzfäller";
    case "depot": return "Depot";
    case "erase": return "Abriss";
    default: return t;
  }
}
