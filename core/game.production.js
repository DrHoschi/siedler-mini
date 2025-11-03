/* ============================================================================
 * Datei   : core/game.production.js
 * Version : v25.11.03 (skeleton)
 * Zweck   : Produktionslogik (Gebäude-Zyklen, IO)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 * Ereignisse:
 *   cb:prod:start     {bId}
 *   cb:prod:output    {bId,item,qty}
 *   cb:prod:blocked   {bId,reason}
 * ============================================================================
 */

class ProductionBuilding {
  constructor(id, io) {
    this.id = id;
    this.io = io; // {input:{wood:1}, output:{board:1}, time:5000}
    this.busy = false;
  }

  async startCycle() {
    if (this.busy) return;
    this.busy = true;
    dispatchEvent(new CustomEvent("cb:prod:start",{detail:{bId:this.id}}));
    await new Promise(r=>setTimeout(r,this.io.time||3000));
    for(const [out,qty] of Object.entries(this.io.output||{})){
      dispatchEvent(new CustomEvent("cb:prod:output",{detail:{bId:this.id,item:out,qty}}));
      dispatchEvent(new CustomEvent("req:carry:enqueue",{detail:{from:this.id,to:"HQ",item:out,qty}}));
    }
    this.busy=false;
  }
}

const buildings = new Map();

function registerBuilding(id,io){ buildings.set(id,new ProductionBuilding(id,io)); }
function tickAll(){ for(const b of buildings.values()) b.startCycle(); }

window.Production = { register:registerBuilding, tick:tickAll };
