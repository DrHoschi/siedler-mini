/* Datei: assets/ui/ui-build.js
 * Version: v16.1.2
 * Zweck:
 *   - Bau-Menü inkl. Lumberjack-Kacheln
 *   - Öffnen/Schließen via FAB oder Inspector
 *   - Tools setzen -> delegiert an Game (window.GameTool.set)
 * Hinweise:
 *   - Buttons haben weißen BG, damit nicht-freigestellte Icons sauber aussehen.
 *   - LUMBERJACK_FRAMES kommt aus buildings.lumberjack.js
 */

(function(){
  const VERSION = "16.1.2";

  const root = document.body;
  const bar  = document.createElement("div");
  bar.id = "buildBar";
  bar.innerHTML = `<div id="buildGrid" aria-label="Bau-Menü (v${VERSION})"></div>`;
  root.appendChild(bar);

  const grid = bar.querySelector("#buildGrid");

  // ---- Public API für Index/Inspector ----
  window.UI = window.UI || {};
  window.UI.toggleBuildMenu = function(state){
    const open = (typeof state === "boolean") ? state : !bar.classList.contains("open");
    bar.classList.toggle("open", open);
    log(`Bau-Menü ${open ? "geöffnet" : "geschlossen"}`);
  };

  // ---- Buttons aufbauen ----
  function makeBtn(imgSrc, label, toolId){
    const btn = document.createElement("button");
    btn.className = "build-btn";
    btn.title = label;
    btn.innerHTML = `
      <img loading="lazy" src="${imgSrc}" alt="${label}">
      <small>${label}</small>
    `;
    btn.addEventListener("click", () => {
      window.GameTool?.set?.(toolId);
      log(`Tool gesetzt: ${toolId}`);
    });
    return btn;
  }

  function addLumberjackTiles(){
    if(!window.LUMBERJACK_FRAMES){ return; }
    // Wir nehmen die ug0-Varianten für das Menü
    const menuFrames = window.LUMBERJACK_FRAMES.filter(f => f.role === "BuildMenu");
    for(const f of menuFrames){
      // Bildquelle: du hast grid.png – wir croppen nicht, sondern nutzen ganze Kachel-Preview
      // Tipp: Wenn du Previews willst, lege assets/buildings/lumberjack/preview/ an
      const img = `./assets/buildings/lumberjack/lumberjack_tiers_grid.png`;
      const label = f.name.replace("lumberjack_", "").replace("_ug0","").replace("_ug1","");
      const toolId = `lumberjack:${f.variant}`; // z.B. lumberjack:wood0
      grid.appendChild(makeBtn(img, label, toolId));
    }
  }

  function addBaseTools(){
    // Deine bestehenden Tools als Platzhalter
    grid.appendChild(makeBtn("./assets/icons/icons_spritesheet_64.png", "Straße", "road"));
    grid.appendChild(makeBtn("./assets/icons/icons_spritesheet_64.png", "Weg", "path"));
    grid.appendChild(makeBtn("./assets/icons/icons_spritesheet_64.png", "Abreißen", "bulldoze"));
  }

  function init(){
    addBaseTools();
    addLumberjackTiles();
    log(`Bau-Menü bereit (ui-build.js v${VERSION})`);
  }

  function log(msg){
    if(typeof window.appendLog === "function"){ window.appendLog(`[UI] ${msg}`); }
    else if(window.console) console.log("[UI]", msg);
  }

  // Init nach load
  if(document.readyState === "loading"){
    window.addEventListener("load", init);
  } else init();

})();
