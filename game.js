/* Datei: game.js
 * Version: v16.1.2
 * Zweck:
 *  - Minimaler Game-Loop + Tool-Handler
 *  - PathOverlay-Hooks (update/render)
 *  - GameLoader.start(mapPath)
 */

(function(){
  const VERSION = "16.1.2";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // ===== Logging helpers von index benutzen =====
  function ok(m){ window.appendLog?.(`[ok] ${m}`) ?? console.log(m); }
  function warn(m){ window.appendLog?.(`[warn] ${m}`) ?? console.warn(m); }
  function err(m){ window.appendLog?.(`[err] ${m}`) ?? console.error(m); }

  // ===== Spielzustand (sehr kompakt) =====
  const state = {
    running: false,
    map: null,
    tool: "none",
    resources: 1000
  };

  // ===== Tool-API (UI ruft das) =====
  window.GameTool = {
    set(id){
      state.tool = id;
      ok(`Tool gesetzt: ${id}`);
    }
  };

  // ===== Ressourcen Booster (Inspector) =====
  window.GameDebug = {
    grantResources(mode){
      if(mode === "max") state.resources = 1e9;
      else if(mode === "zero") state.resources = 0;
      else if(mode.startsWith("+")) state.resources += Number(mode.slice(1))||0;
      ok(`Ressourcen jetzt: ${state.resources}`);
    }
  };

  // ===== Loader / Start =====
  window.GameLoader = {
    async start(mapPath){
      try{
        ok(`GameLoader.start ${mapPath}`);
        // Map laden (Dummy – hier nur Dimensionen aus JSON verwenden, wenn vorhanden)
        const map = await Asset.loadJSON(mapPath);
        state.map = map;
        state.running = true;
        ok("Game started");
      }catch(e){
        err(`Start fehlgeschlagen: ${e.message || e}`);
      }
    }
  };

  // ===== PathOverlay Integration (Update/Render) =====
  function update(dt){
    // ... dein Zeug ...
    window.PathOverlay?.update?.(dt);
  }

  function render(){
    // 1) Boden/Map (hier nur Hintergrundfarbe)
    ctx.fillStyle = "#173a2b";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // 2) Overlay oben drauf
    window.PathOverlay?.render?.(ctx, {x:0,y:0, zoom:1});

    // 3) Entities/UI ...
  }

  // Minimaler Loop
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;
    if(state.running){ update(dt); render(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  ok(`game.js geladen, game.js v${VERSION}`);
})();
