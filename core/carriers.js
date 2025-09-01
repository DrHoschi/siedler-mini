// core/carriers.js — v16.4.0
// Minimaler Carrier-Manager: Pfad holen, entlanglaufen, zeichnen als Overlay.
// Public: window.Carriers.spawn(job), window.Carriers.clear(), window.Carriers.setSpeed(pxPerSec)

(function () {
  'use strict';

  var VERSION = 'v16.4.0';
  var log = (window.CBLog && CBLog.ok) ? CBLog.ok : console.log;
  var warn = (window.CBLog && CBLog.warn) ? CBLog.warn : console.warn;

  var carriers = []; // {x,y,px,py,path[],idx,speed}
  var running = false;
  var speedPX = 60; // px pro Sekunde
  var tilePX = 64; // default; wird bei init aus Game ermittelt

  function getTilePX() {
    try {
      if (window.Game && typeof Game.getTileSize === 'function') {
        return Game.getTileSize() || 64;
      }
    } catch (_) {}
    return 64;
  }

  function toWorld(tx, ty) { return { x: tx * tilePX + tilePX / 2, y: ty * tilePX + tilePX / 2 }; }

  function stepCarrier(c, dt) {
    if (!c.path || c.path.length < 2) return true;

    var target = toWorld(c.path[c.idx].x, c.path[c.idx].y);
    var dx = target.x - c.px;
    var dy = target.y - c.py;
    var dist = Math.sqrt(dx * dx + dy * dy);

    var step = c.speed * dt;
    if (dist <= step) {
      // Knoten erreicht
      c.px = target.x; c.py = target.y;
      c.idx++;
      if (c.idx >= c.path.length) {
        // Ziel erreicht
        return true;
      }
    } else {
      c.px += (dx / dist) * step;
      c.py += (dy / dist) * step;
    }
    return false;
  }

  // simple Overlay (eigenes Canvas über dem Spiel)
  var overlay = null, octx = null, viewW = 0, viewH = 0;

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('canvas');
    overlay.id = 'carrier-overlay';
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = 200; // über Game, unter UI
    document.body.appendChild(overlay);
    octx = overlay.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    var w = Math.max(320, Math.floor(window.innerWidth || document.documentElement.clientWidth || 800));
    var h = Math.max(240, Math.floor(window.innerHeight || document.documentElement.clientHeight || 600));
    overlay.width = w; overlay.height = h;
    overlay.style.width = w + 'px'; overlay.style.height = h + 'px';
    viewW = w; viewH = h;
  }

  function worldToScreen(wx, wy) {
    // hole Kamera aus Game
    if (window.Game && typeof Game.getCamera === 'function') {
      var cam = Game.getCamera();
      // cam: {x,y,zoom}
      var sx = Math.floor((wx - cam.x) * cam.zoom);
      var sy = Math.floor((wy - cam.y) * cam.zoom);
      return { x: sx, y: sy, ok: true };
    }
    return { x: wx, y: wy, ok: false };
  }

  function draw() {
    if (!octx) return;
    octx.clearRect(0, 0, overlay.width, overlay.height);

    octx.save();
    for (var i = 0; i < carriers.length; i++) {
      var c = carriers[i];
      var s = worldToScreen(c.px, c.py);
      // kleiner Kreis
      octx.globalAlpha = 0.9;
      octx.beginPath();
      octx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      octx.closePath();
      octx.fillStyle = '#ffe08a';
      octx.fill();
      octx.lineWidth = 2;
      octx.strokeStyle = '#6b4f1d';
      octx.stroke();
    }
    octx.restore();
  }

  var lastTS = 0;
  function loop(ts) {
    if (!running) return;
    if (!lastTS) lastTS = ts;
    var dt = (ts - lastTS) / 1000;
    lastTS = ts;

    // updaten
    for (var i = carriers.length - 1; i >= 0; i--) {
      var done = stepCarrier(carriers[i], dt);
      if (done) carriers.splice(i, 1);
    }
    draw();
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true; lastTS = 0;
    requestAnimationFrame(loop);
  }

  function spawn(job) {
    // job: {from:{x,y}, to:{x,y}}
    if (!window.PathFinder || !PathFinder.find) {
      warn('[carriers] PathFinder fehlt.');
      return null;
    }
    var path = PathFinder.find(job.from, job.to, { preferRoads: true });
    if (!path || path.length < 2) {
      warn('[carriers] kein Pfad gefunden', job);
      return null;
    }
    var startW = toWorld(path[0].x, path[0].y);
    var c = {
      path: path,
      idx: 1,
      px: startW.x,
      py: startW.y,
      speed: speedPX
    };
    carriers.push(c);
    start();
    return c;
  }

  function clearAll() { carriers.length = 0; draw(); }

  // Init, nachdem Game da ist
  function init() {
    ensureOverlay();
    tilePX = getTilePX();
    log('[carriers] bereit', VERSION);
  }

  // auto-init (nach kurzer Wartezeit, damit Game existiert)
  setTimeout(init, 0);

  // Public API
  window.Carriers = {
    spawn: spawn,
    clear: clearAll,
    setSpeed: function (pxPerSec) { speedPX = Math.max(10, pxPerSec | 0); },
    version: VERSION
  };
})();
