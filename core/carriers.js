// core/carriers.js  v14.2 – leichtes Gerüst (Animation optional)
export class Carriers{
  constructor({sprite=null}={}){
    this.sprite = sprite; // Image
    this.list = [];       // später: {x,y,px,py,t}
  }
  update(dt, world, state){
    // Platzhalter: hier später Wegfindung & Transport-Logik
  }
  render(ctx){
    // Optional: kleine Marker
    // for(const c of this.list){ ctx.fillStyle='#ff0'; ctx.fillRect(c.px-2,c.py-2,4,4); }
  }
}
