// game.js – V14.2
// Welt, Bauen/Abriss, Projektionen, einfacher Road‑Pfadfinder

export class Game {
  constructor(wTiles, hTiles, tileDX, tileDY, IM, camera) {
    this.w = wTiles;
    this.h = hTiles;
    this.tileDX = tileDX;
    this.tileDY = tileDY;
    this.IM = IM;
    this.camera = camera;

    // Welt‑Daten
    this.tiles = new Array(hTiles).fill(0).map(() =>
      new Array(wTiles).fill(0).map(() => ({ ground:'grass', road:false, b:null }))
    );

    // Sprite‑Offsets für hübsches Platzieren
    this.sprite = {
      hq_stone: {ox:-64, oy:-128},
      hq_wood:  {ox:-64, oy:-128},
      lumberjack:{ox:-32, oy:-80},
      depot:     {ox:-48, oy:-96},
      road:      {ox:-32, oy:-16},
      carrier:   {ox:-16, oy:-32},
    };

    // Helper für Carriers
    this.tileStepPx = { dx: this.tileDX, dy: this.tileDY, ox: 0, oy: 0 };
  }

  // ---- Projektion
  // Isometrisch: Tile (tx,ty) -> Welt‑Pixel (wx,wy)
  tileToWorld(tx, ty) {
    const wx = (tx - ty) * (this.tileDX/2);
    const wy = (tx + ty) * (this.tileDY/2);
    return { wx, wy };
  }
  // Inverse Projektion (ungefähr)
  worldToTile(wx, wy) {
    const tx = Math.floor((wy / (this.tileDY/2) + wx / (this.tileDX/2)) / 2);
    const ty = Math.floor((wy / (this.tileDY/2) - wx / (this.tileDX/2)) / 2);
    return { tx, ty };
  }

  // Screen‑Pick über Camera
  pickAtScreen(sx, sy) {
    const wx = this.camera.screenToWorldX(sx);
    const wy = this.camera.screenToWorldY(sy);
    const {tx,ty} = this.worldToTile(wx, wy);
    if (tx<0||ty<0||tx>=this.w||ty>=this.h) return null;
    return { wx, wy, worldTileX: tx, worldTileY: ty };
  }

  centerTile() {
    const tx = Math.floor(this.w/2), ty = Math.floor(this.h/2);
    const {wx,wy} = this.tileToWorld(tx,ty);
    return { x:tx, y:ty, wx, wy };
  }

  // ---- Bauen / Abriss
  canBuildRoad(tx,ty) {
    return this.inBounds(tx,ty) && !this.tiles[ty][tx].b;
  }

  buildAtWorld(tool, tx, ty) {
    if (!this.inBounds(tx,ty)) return false;
    const cell = this.tiles[ty][tx];

    if (tool === 'road') {
      if (!this.canBuildRoad(tx,ty)) return false;
      cell.road = true;
      return true;
    }

    if (tool === 'hq') {
      if (cell.b) return false;
      cell.b = { type:'hq_wood' };
      return true;
    }

    if (tool === 'lumberjack') {
      if (cell.b) return false;
      cell.b = { type:'lumberjack' };
      return true;
    }

    if (tool === 'depot') {
      if (cell.b) return false;
      cell.b = { type:'depot' };
      return true;
    }

    return false;
  }

  demolishAtWorld(tx, ty) {
    if (!this.inBounds(tx,ty)) return false;
    const c = this.tiles[ty][tx];
    if (c.b) { c.b = null; return true; }
    if (c.road) { c.road = false; return true; }
    return false;
  }

  placeHQ(tx, ty, stone=false) {
    if (!this.inBounds(tx,ty)) return false;
    this.tiles[ty][tx].b = { type: stone ? 'hq_stone':'hq_wood' };
    return true;
  }

  inBounds(tx,ty){ return tx>=0 && ty>=0 && tx<this.w && ty<this.h; }

  // ---- einfacher Road‑Pfad (4‑Nachbarn, nur über road=true)
  findRoadPath = (fromTile, toTile) => {
    const key = (x,y)=>`${x},${y}`;
    const q = [fromTile];
    const prev = new Map();
    prev.set(key(fromTile.x,fromTile.y), null);

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const cur = q.shift();
      if (cur.x===toTile.x && cur.y===toTile.y) break;
      for (const [dx,dy] of dirs) {
        const nx = cur.x+dx, ny = cur.y+dy;
        if (!this.inBounds(nx,ny)) continue;
        const c = this.tiles[ny][nx];
        if (!c.road && !(nx===toTile.x && ny===toTile.y)) continue; // Ziel darf Gebäude sein
        const k = key(nx,ny);
        if (!prev.has(k)) { prev.set(k, cur); q.push({x:nx,y:ny}); }
      }
    }
    // Pfad rückwärts lesen
    const out = [];
    let cur = toTile;
    const tgtK = key(cur.x,cur.y);
    if (!prev.has(tgtK)) return null;
    while (cur) { out.push({x:cur.x,y:cur.y}); cur = prev.get(key(cur.x,cur.y)); }
    out.reverse();
    return out;
  }

  // ---- Update (später Produktionen etc.)
  update(dt) {
    // Platz für Game‑Logik
  }
}
