/* buildings.lumberjack.js v16.1.1
   Bindet deinen Lumberjack-Atlas ein
   Erwartet Dateien:
   - assets/buildings/lumberjack/lumberjack_tiers_grid.png
   - assets/buildings/lumberjack/lumberjack_tiers_grid.json
     (Array von Einträgen wie in deiner CSV: {id, name, tier, variant, role, "frame.x", "frame.y"})
*/

(function(){
  const version = "16.1.1";

  const Buildings = window.Buildings = window.Buildings || {};
  Buildings.Lumberjack = {
    version,
    async install(Game){
      const base = "./assets/buildings/lumberjack/";
      // Bild laden
      const img = await loadImage(base+"lumberjack_tiers_grid.png?v="+version);
      // Meta laden
      const meta = await fetch(base+"lumberjack_tiers_grid.json?v="+version).then(r=>r.json());

      // Default-Frame-Größe = 512x512 in deinem Grid (laut Beispielen) → wir mappen auf 64x64 Tiles
      const FW = 512, FH = 512;

      // Einträge in Game.atlas registrieren
      for (const it of meta){
        const key = it.id || it.name;
        const sx = it["frame.x"]|0, sy = it["frame.y"]|0;
        Game.setAtlas(key, { img, sx, sy, sw:FW, sh:FH });
      }

      Log.write(`✅ (ok) Lumberjack-Atlas geladen (${meta.length} Frames)`);
    }
  };

  function loadImage(src){
    return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error("IMG "+src)); i.src=src; });
  }
})();
