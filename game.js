// V14.1 – Spiel‑State & Logik (sehr schlank)
export const Tools = { POINTER:'pointer', ROAD:'road', HQ:'hq', LUMBER:'lumber', DEPOT:'depot', BULL:'bulldoze' };

export class Game {
  constructor(world){
    this.world=world;
    this.tool=Tools.POINTER;
    this.resources = {wood:20, stone:10, food:10, gold:0, carriers:0};
    this.debug=false;
    this.hqPos = {tx: Math.floor(world.w/2), ty: Math.floor(world.h/2)};
    // HQ (Stein) initial
    world.buildings[this.hqPos.ty][this.hqPos.tx] = {kind:'hq'};
  }
  setTool(t){ this.tool=t; }
  tryBuild(tx,ty){
    switch(this.tool){
      case Tools.ROAD:  return this._buildRoad(tx,ty);
      case Tools.HQ:    return this._build('hq',tx,ty);
      case Tools.LUMBER:return this._build('lumber',tx,ty);
      case Tools.DEPOT: return this._build('depot',tx,ty);
      case Tools.BULL:  return this._bulldoze(tx,ty);
      default: return false;
    }
  }
  _build(kind,tx,ty){
    if (this.world.buildings[ty][tx]) return false;
    this.world.buildings[ty][tx]={kind};
    return true;
  }
  _buildRoad(tx,ty){
    this.world.roads[ty][tx]=1; return true;
  }
  _bulldoze(tx,ty){
    this.world.buildings[ty][tx]=null; this.world.roads[ty][tx]=0; return true;
  }
}
