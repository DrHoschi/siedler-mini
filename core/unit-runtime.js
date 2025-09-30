// ============================================================================
// Datei : core/unit-runtime.js
// Projekt: Neue Siedler
// Version: v1.0.0
// Zweck : Einfache Einheiten-Laufzeit (z. B. Träger). Zeichnet & bewegt Units.
// API   : Units.init(ctx, tileSize), Units.spawnCarrier({x,y}, {x,y}), Units.update(dt), Units.draw(ctx)
// Hinweise:
//   • absichtlich simpel: gerade Bewegung zum Ziel (kein Pathfinding/Collisions)
//   • Darstellung als Kreise/Emoji-Platzhalter; kann später durch Sprites ersetzt werden
// ============================================================================
(() => {
  const MOD = 'units';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  const Units = {
    _ctx: null,
    _tile: 64,
    _arr: [],    // { type:'carrier', x,y, tx,ty, speed, color }

    init(ctx, tileSize){
      this._ctx  = ctx;
      this._tile = tileSize || this._tile;
      this._arr.length = 0;
      log('init ✓', { tile:this._tile });
    },

    spawnCarrier(pos, target){
      const speed = (this._tile) * 2.0; // px pro Sek. ~2 Tile/s
      const u = {
        type:'carrier',
        x:(pos?.x ?? 0), y:(pos?.y ?? 0),
        tx:(target?.x ?? pos?.x ?? 0), ty:(target?.y ?? pos?.y ?? 0),
        speed,
        color:'#ffd166'
      };
      this._arr.push(u);
      log('spawn carrier', u);
      return u;
    },

    update(dt){
      // dt in Sekunden
      const EPS = 0.5;
      for (const u of this._arr){
        const dx = u.tx - u.x;
        const dy = u.ty - u.y;
        const dist = Math.hypot(dx, dy);
        if (dist < EPS) continue;
        const step = Math.min(u.speed * dt, dist);
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        u.x += nx * step;
        u.y += ny * step;
      }
    },

    draw(ctx){
      ctx = ctx || this._ctx;
      if (!ctx) return;
      ctx.save();
      for (const u of this._arr){
        if (u.type === 'carrier'){
          // runder Marker (später: ersetzen durch Sprite)
          ctx.beginPath();
          ctx.fillStyle = u.color;
          ctx.arc(u.x, u.y, Math.max(6, this._tile*0.15), 0, Math.PI*2);
          ctx.fill();

          // kleine Richtungslinie
          ctx.strokeStyle = 'rgba(0,0,0,.35)';
          ctx.beginPath();
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(u.x + 8, u.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  window.Units = Units;
})();
