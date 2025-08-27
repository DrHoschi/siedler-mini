/* ui-build.js v16.1.1
   - Build-Menü + Tool-Handling
   - nutzt GameAPI.placeByKey(...) und Buildings.Lumberjack keys
*/

(function(){
  const version = "16.1.1";
  const UIBuild = window.UIBuild = { version, init };

  function init(){
    Log.write(`✅ (ok) Bau-Menü bereit (ui-build.js v${version})`);

    // Tool clicks
    document.getElementById("buildBar").addEventListener("click", (ev)=>{
      const el = ev.target.closest(".tool");
      if (!el) return;
      const tool = el.getAttribute("data-tool");
      setTool(tool);
    });

    // Simple tap-to-place on canvas (grid snapping)
    const cvs = document.getElementById("game");
    cvs.addEventListener("click", (ev)=>{
      const rect = cvs.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const ts = window.Game?.tileSize||64;
      const gx = Math.floor(x / (rect.width  / (window.Game?.map?.width  || 16)));
      const gy = Math.floor(y / (rect.height / (window.Game?.map?.height || 10)));
      handlePlace(gx, gy);
    }, {passive:true});
  }

  let currentTool = "cancel";
  function setTool(t){
    currentTool = t;
    Log.write(`✅ (ok) Tool gesetzt: ${t}`);
  }

  function handlePlace(gx,gy){
    if (!window.Game) return;
    const keyFromTool = {
      "lumberjack_ug0": "lumberjack_wood0_ug0",
      "lumberjack_ug1": "lumberjack_wood1_ug1"
    }[currentTool];

    if (keyFromTool) {
      window.GameAPI.placeByKey(keyFromTool, gx, gy);
      return;
    }

    // legacy placeholder tools
    if (currentTool==="road"||currentTool==="path"||currentTool==="house"||currentTool==="factory"){
      window.Game.place(gx,gy,{kind:currentTool, sprite:{}});
      return;
    }
  }
})();
