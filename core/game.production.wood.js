/* ============================================================================
 * Datei   : game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-prod-wood-with-carry-final
 * ----------------------------------------------------------------------------
 * Dieses Modul steuert den gesamten Holz-Zyklus:
 *   PLANT → GROW → READY → CUT → Output → CarryJob
 *
 * NEU:
 *   ✔ buildingRef wird sauber gemerkt
 *   ✔ dropTile = Eingang + Offset
 *   ✔ CarryJob-Erzeugung über Production.enqueueCarryJobFromBuilding(...)
 * ============================================================================
*/

(function(){

// ------------------------------------------------------------
// interne Struktur
// ------------------------------------------------------------
const Lumberjacks = new Map();

// Phasen (vereinfacht)
const LJ_PHASE = {
  PLANT : 0,
  GROW  : 1,
  READY : 2,
  CUT   : 3
};

// Timings
const LJ_TIMES = {
  PLANT: 1000,
  GROW : 3000,
  CUT  : 1500
};

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function getDoorTile(b){
  // buildings.json liefert dir bereits den Eingang
  if (b && b.entrance) return { tx:b.x + b.entrance.tx, ty:b.y + b.entrance.ty };
  return { tx:b.x + Math.floor(b.w/2), ty:b.y + b.h }; // Fallback
}

function getDropTile(b){
  const e = getDoorTile(b);
  return { tx:e.tx, ty:e.ty + 1 };
}

// Zufälligen Baumplatz setzen
function recomputeTreePos(lj){
  const area = window.GameWorkArea?.getAreaFor?.(lj.uid);
  if (!area){ lj.treeX = lj.x+2; lj.treeY = lj.y+2; return; }

  const tiles = area.tiles;
  if (!tiles?.length){ lj.treeX = lj.x+2; lj.treeY = lj.y+2; return; }

  const t = tiles[Math.floor(Math.random()*tiles.length)];
  lj.treeX = t.x;
  lj.treeY = t.y;
}

// ------------------------------------------------------------
// BUILD COMPLETE → Lumberjack registrieren
// ------------------------------------------------------------
window.addEventListener('cb:build:complete', ev=>{
  const b = ev.detail;
  if (b.kind !== 'b.lumberjack') return;

  const state = {
    uid   : b.uid,
    kind  : b.kind,
    x     : b.x,
    y     : b.y,
    w     : b.w,
    h     : b.h,
    building : b,                 // <<< NEU: Referenz merken
    phase : LJ_PHASE.PLANT,
    timer : 0,
    treeX : b.x+2,
    treeY : b.y+2
  };

  recomputeTreePos(state);
  Lumberjacks.set(b.uid, state);
});

// ------------------------------------------------------------
// CUT → Output → CarryJob
// ------------------------------------------------------------
function handleCutPhase(lj, dt){
  lj.timer += dt;
  if (lj.timer < LJ_TIMES.CUT) return;

  lj.timer = 0;
  lj.phase = LJ_PHASE.PLANT;

  const qty = 1;

  // 1) Resource → HUD
  window.Production?.addResource?.('wood', qty, 'lumberjack-cycle', lj.uid);

  // 2) Event für Observer
  try{
    dispatchEvent(new CustomEvent('cb:prod:output', {
      detail:{
        bId  : lj.uid,
        kind : lj.kind,
        item : 'wood',
        qty  : qty
      }
    }));
  }catch(e){ console.warn(e); }

  // 3) Carry-Job erzeugen *****************************************
  const b = lj.building;
  if (b){
    window.Production?.enqueueCarryJobFromBuilding?.(b, 'wood', qty);
  } else {
    console.warn('[wood] Kein buildingRef – kann CarryJob nicht erzeugen', lj);
  }

  // 4) Nächster Baum
  recomputeTreePos(lj);
}

// ------------------------------------------------------------
// TICK
// ------------------------------------------------------------
function tickLumberjack(lj, dt){
  switch(lj.phase){

    case LJ_PHASE.PLANT:
      lj.timer += dt;
      if (lj.timer >= LJ_TIMES.PLANT){
        lj.phase = LJ_PHASE.GROW;
        lj.timer = 0;
      }
      break;

    case LJ_PHASE.GROW:
      lj.timer += dt;
      if (lj.timer >= LJ_TIMES.GROW){
        lj.phase = LJ_PHASE.READY;
        lj.timer = 0;
      }
      break;

    case LJ_PHASE.READY:
      // Sofort schneiden (vereinfachte Version)
      lj.phase = LJ_PHASE.CUT;
      lj.timer = 0;
      break;

    case LJ_PHASE.CUT:
      handleCutPhase(lj, dt);
      break;
  }
}

// ------------------------------------------------------------
window.GameProductionWood = {
  tick(dt){
    for (const lj of Lumberjacks.values()){
      tickLumberjack(lj, dt);
    }
  }
};

})();
