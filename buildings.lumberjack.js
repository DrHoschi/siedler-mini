/* Datei: buildings.lumberjack.js
 * Version: v16.1.2
 * Zweck:
 *   - Frames/Einträge aus deiner CSV (vereinfacht) bereitstellen
 *   - UI nutzt role === "BuildMenu" für Buttons
 *   - GameTool.set("lumberjack:wood0") etc. verarbeitet in game.js
 */

(function(){
  window.LUMBERJACK_FRAMES = [
    { id:0, name:"lumberjack_wood0_ug0", tier:"Tier 1 (Holz)", variant:"wood0", role:"BuildMenu", frame:{x:0,y:0} },
    { id:1, name:"lumberjack_wood0_ug1", tier:"Tier 1 (Holz)", variant:"wood0", role:"Placed",    frame:{x:512,y:0} },
    { id:2, name:"lumberjack_wood1_ug0", tier:"Tier 2 (Teil-Stein)", variant:"wood1", role:"BuildMenu", frame:{x:0,y:512} },
    { id:3, name:"lumberjack_wood1_ug1", tier:"Tier 2 (Teil-Stein)", variant:"wood1", role:"Placed",    frame:{x:512,y:512} },
    { id:4, name:"lumberjack_wood2_ug0", tier:"Tier 3 (Stein)", variant:"wood2", role:"BuildMenu", frame:{x:0,y:1024} },
    { id:5, name:"lumberjack_wood2_ug1", tier:"Tier 3 (Stein)", variant:"wood2", role:"Placed",    frame:{x:512,y:1024} }
  ];
})();
