// /core/carriers.js
export class Carrier {
  constructor(path){
    this.path = path;        // Array von {x,y} (Weltpixel) – bereits entlang Straße
    this.t = 0;              // Segment‑Index float
    this.speed = 55;         // px/s
    this.dead = false;
  }
  update(dt){
    if(this.dead || this.path.length<2) return;
    let left = this.speed*dt;
    while(left>0 && !this.dead){
      const i = Math.min(Math.floor(this.t), this.path.length-2);
      const a = this.path[i], b = this.path[i+1];
      const seg = Math.hypot(b.x-a.x, b.y-a.y) || 1;
      const segLeft = (1-(this.t-i))*seg;
      const use = Math.min(left, segLeft);
      this.t += use/seg;
      left -= use;
      if(this.t>=this.path.length-1){ this.dead=true; break; }
    }
  }
  get pos(){
    const i = Math.min(Math.floor(this.t), this.path.length-2);
    const a = this.path[i], b = this.path[i+1];
    const f = this.t - i;
    return { x: a.x + (b.x-a.x)*f, y: a.y + (b.y-a.y)*f };
  }
}
