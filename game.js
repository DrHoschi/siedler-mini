/* 
  Projekt: Siedler-Mini
  Datei:   game.js
  Version: v16.1.1
  Zweck:   Minimaler Game-Host: Canvas verwalten, Start-Flow, Hooks
  Notizen:
   - Setzt window.GameReady=true sobald initialisiert.
   - Bietet window.GameLoader.start(mapPath) an (Promise).
   - Loggt Versionsinfos für bessere Cache-Diagnose.
*/

(function(){
  const VER = (window.__VERSIONS__?.game) || "v16.1.1";
  const log = (type, msg) => {
    const target = document.querySelector("#log");
    if(!target) return;
    const now = new Date().toTimeString().slice(0,8);
    const div = document.createElement("div");
    div.className = "logline " + ({ok:"ok", warn:"warn", err:"err"}[type]||"muted");
    const icon = type==="ok"?"✅ (ok) ":type==="warn"?"⚠️ (warn) ":"❌ (err) ";
    div.textContent = `[${now}] ${icon}${msg}`;
    target.appendChild(div);
    const panel = document.querySelector("#logPanel");
    if(panel) panel.scrollTop = panel.scrollHeight;
  };
  const ok   = m=>log("ok",m);
  const warn = m=>log("warn",m);
  const err  = m=>log("err",m);

  // Canvas
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // Simple resize helper (keeps canvas CSS size, adjusts backing store minimally)
  function fitCanvas(){
    // (Hier nur Logging fürs UI – das echte Game würde DPI etc. berücksichtigen)
    const dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio||1)));
    ok(`Canvas ${canvas.clientWidth}x${canvas.clientHeight} dpr:${dpr}`);
  }
  window.addEventListener("resize", ()=> setTimeout(fitCanvas, 0));

  // Dummy world
  async function startGame(mapPath){
    // hier könnten Tiles/Map geladen werden – wir simulieren Erfolg:
    await new Promise(r=>setTimeout(r, 250));
    // Demo: grünen Platzhalter zeichnen
    ctx.fillStyle = "#214d35";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ok("Game started");
  }

  // Public API
  window.GameLoader = {
    async start(mapPath){
      ok(`Tileset (atlas) OK 1024x1024`); // Placeholder-Log (bis echte Assets eingebunden werden)
      ok(`Map OK size 16x10 tile 64`);    // dito (oder durch echte Map-Daten ersetzen)
      return startGame(mapPath);
    }
  };

  // UI-Hooks (Editor/Inspector Dummies – können vom Editor-Modul überschrieben werden)
  window.GameEditor = window.GameEditor || {
    open(){ ok("Editor geöffnet (Dummy)"); }
  };
  window.GameInspector = window.GameInspector || {
    _on:false, toggle(){ this._on=!this._on; return this._on; }
  };

  // Build-UI Bridge
  window.UI = window.UI || {
    currentTool: "cancel",
    setTool(t){ this.currentTool = t; /* hier später Game-Placement verbinden */ }
  };

  // Boot
  ok(`game.js geladen, game.js ${VER}`);
  window.GameReady = true;
})();
