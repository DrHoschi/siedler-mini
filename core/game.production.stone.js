/* ============================================================================
 * Datei   : game.production.stone.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-prod-stone-with-carry-final
 * ----------------------------------------------------------------------------
 * Steinabbau:
 *   Feld degradieren → Stein erzeugen → OutputEvent → CarryJob
 *
 * NEU:
 *   ✔ buildingRef gespeichert
 *   ✔ dropTile vom Eingang übernommen
 *   ✔ CarryJob wird erzeugt, sobald Stein entsteht
 * ============================================================================
*/

(function(){

const Fields = new Map();

// ------------------------------------------------------------
// HELPER: Eingang + DropTile
// ------------------------------------------------------------
function getDoorTile(b){
  if (b && b.entrance) return { tx:b.x + b.entrance.tx, ty:b.y + b.entrance.ty };
  return { tx:b.x + Math.floor(b.w/2), ty:b.y + b.h };
}

function getDropTile(b){
  const e = getDoorTile(b);
  return { tx:e.tx, ty:e.ty + 1 };
}

// ------------------------------------------------------------
// BUILD COMPLETE
// ------------------------------------------------------------
window.addEventListener('cb:build:complete', ev=>{
  const b = ev.detail;
  if (b.kind !== 'b.quarry') return;

  const field = {
    uid      : b.uid,
    kind     : b.kind,
    x        : b.x,
    y        : b.y,
    building : b,           // <<< NEU: wichtig für CarryJob
    hits     : 0,
    maxHits  : 6            // z. B. 6 Abbaustufen
  };

  Fields.set(b.uid, field);
});

// ------------------------------------------------------------
// Wenn Stein entsteht → Output + CarryJob
// ------------------------------------------------------------
function handleStoneOutput(field, qty){
  // 1) Stein zählen
  window.Production?.addResource?.('stone', qty, 'stone-cycle', field.uid);

  // 2) Event
  try{
    dispatchEvent(new CustomEvent('cb:prod:output', {
      detail:{
        bId  : field.uid,
        kind : field.kind,
        item : 'stone',
        qty  : qty
      }
    }));
  }catch(e){ console.warn(e); }

  // 3) CarryJob erzeugen
  const b = field.building;
  if (b){
    window.Production?.enqueueCarryJobFromBuilding?.(b, 'stone', qty);
  } else {
    console.warn('[stone] Kein buildingRef – kein CarryJob möglich', field);
  }
}

// ------------------------------------------------------------
// Stein degradieren
// ------------------------------------------------------------
function degrade(field){
  field.hits++;
  if (field.hits >= field.maxHits){
    field.hits = 0;
  }

  // Jeder Schlag erzeugt 1 Stein (vereinfacht)
  handleStoneOutput(field, 1);
}

// ------------------------------------------------------------
// TICK
// ------------------------------------------------------------
window.GameProductionStone = {
  tick(dt){
    for (const f of Fields.values()){
      degrade(f);
    }
  }
};

})();
