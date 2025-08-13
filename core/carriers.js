// core/carriers.js  v14.2 – leichtes Gerüst für Träger
export class Carriers{
  constructor({sprite=null}={}){
    this.sprite = sprite; // Image (assets/carrier.png)
    this.list = [];       // später: {x,y,px,py,t}
  }
  update(dt, world, state){
    // Platzhalter: Hier später Wegfindung & Transport-Logik einbauen
  }
  render(ctx){
    // Optional: Marker/Debug – vorerst leer
    // for(const c of this.list){ ctx.fillStyle='#ff0'; ctx.fillRect(c.px-2,c.py-2,4,4); }
  }
}
