/* ============================================================================
   Siedler-Mini – game.js
   Version: v16.0.9
   Inhalte:
     - Logging mit Status-Icons (✅⚠️❌)
     - Canvas-Setup & Resize
     - GameLoader.start(mapPath)
     - Fallback-Renderer (zeigt Grid/Platzhalter, wenn Terrain-Renderer nicht aktiv)
     - Editor/Inspector-Hooks (Dummy, falls Modul fehlt)
     - Overlay-Placement für Bau-Objekte (Sprite-Emojis) – sofort sichtbar
   ========================================================================== */

(() => {
  const VER = 'v16.0.9';
  const ICON = { ok:'✅', warn:'⚠️', err:'❌' };

  const Game = {
    ver: VER,
    canvas: null,
    ctx: null,
    dpr: 1,
    width: 0,
    height: 0,
    logBox: null,
    logLines: [],
    overlays: [], // platzierte Objekte (Bauen)
    grid: { w:64, h:64 },

    __wireDOM({canvas, logBox, buildBar, buildRow}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.logBox = logBox;
      this.buildBar = buildBar;
      this.buildRow = buildRow;
      this._bindResize();
      this._tick();
      this.logOK(`game.js initialisiert (Index meldet ${VER})`);
    },

    // --------- Logging ----------
    _pushLog(level, msg) {
      const now = new Date();
      const t = now.toTimeString().slice(0,8);
      const line = `[${t}] ${ICON[level]} (${level}) ${msg}`;
      this.logLines.push({ level, line });
      const el = document.createElement('div');
      el.textContent = line;
      el.className = `row ${level}`;
      this.logBox?.appendChild(el);
      this.logBox?.scrollTo(0, this.logBox.scrollHeight);
      // auch in Console
      (level==='ok' ? console.log : level==='warn' ? console.warn : console.error)(line);
    },
    logOK (msg){ this._pushLog('ok',   msg); },
    logWARN(msg){ this._pushLog('warn', msg); },
    logERR(msg){ this._pushLog('err',  msg); },

    copyLog(){
      const text = this.logLines.map(x=>x.line).join('\n');
      navigator.clipboard.writeText(text).then(()=>{
        this.logOK('Log in Zwischenablage');
      }).catch(e=>this.logERR('Clipboard fehlgeschlagen: ' + e.message));
    },
    clearLog(){
      this.logLines = [];
      if (this.logBox) this.logBox.innerHTML = '';
    },
    toggleLog(){
      const dock = document.getElementById('logDock');
      if (!dock) return;
      dock.style.display = dock.style.display === 'none' ? '' : 'none';
    },

    // --------- Caches ----------
    async clearCaches() {
      try {
        // Origin-private Cache
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const k of keys) await caches.delete(k);
        }
        // Storage (local/session)
        localStorage.clear(); sessionStorage.clear();
        this.logOK('Cache/Storage geleert – Seite ggf. neu laden');
      } catch(e) {
        this.logERR('Cache leeren fehlgeschlagen: ' + e.message);
      }
    },

    // --------- Size & Render Loop ----------
    _bindResize(){
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;
        const rectW = this.canvas.clientWidth || this.canvas.parentElement.clientWidth;
        const rectH = this.canvas.clientHeight || this.canvas.parentElement.clientHeight;
        this.width = Math.max(1, Math.floor(rectW * dpr));
        this.height = Math.max(1, Math.floor(rectH * dpr));
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.logOK(`Canvas ${rectW}x${rectH} dpr:${dpr}`);
      };
      new ResizeObserver(resize).observe(this.canvas.parentElement);
      window.addEventListener('orientationchange', resize, {passive:true});
      resize();
    },

    _tick(){
      const loop = () => {
        this._render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    // Einfacher Hintergrundrenderer + Overlay-Zeichnung
    _render(){
      const ctx = this.ctx;
      if (!ctx) return;
      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      // Terrain-Hintergrund (grün)
      ctx.fillStyle = '#2b5b47';
      ctx.fillRect(0,0, this.width/this.dpr, this.height/this.dpr);

      // optionale Grid-Hilfe
      this._drawGrid(ctx);

      // platzierte Objekte (Overlays)
      for (const o of this.overlays){
        this._drawOverlay(ctx, o);
      }

      // Wasserzeichen oben links
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#cfeee0';
      ctx.font = '12px ui-monospace';
      ctx.fillText('PLACEHOLDER-RENDER (game.js)', 10, 18);
      ctx.restore();
    },

    _drawGrid(ctx){
      const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
      const tw = this.grid.w, th = this.grid.h;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x=0; x<=W; x+=tw){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      for (let y=0; y<=H; y+=th){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
    },

    _drawOverlay(ctx, o){
      const { x, y, w, h, type, label } = o;
      // Grundkörper
      ctx.fillStyle = ({
        road:'#3c463c', path:'#3e5a3e', bulldoze:'#6b2b2b',
        house:'#1f5a7a', factory:'#5a3f1f'
      }[type]) || '#2e4f43';
      ctx.fillRect(x, y, w, h);
      // Rahmen
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
      // Icon/Label
      ctx.font = '20px system-ui, emoji';
      ctx.fillStyle = '#e8fff2';
      const icon = ({
        road:'🛣️', path:'🚶', bulldoze:'🧨',
        house:'🏠', factory:'🏭'
      }[type]) || '⬛';
      ctx.fillText(icon, x+8, y+26);
      ctx.font = '12px ui-monospace';
      ctx.fillText(label || type, x+8, y+h-8);
    },

    // Hilfsfunktionen fürs Bau-Overlay
    worldToCell(px, py){
      const tw=this.grid.w, th=this.grid.h;
      return { cx: Math.floor(px/tw), cy: Math.floor(py/th) };
    },
    cellToWorld(cx, cy){
      const tw=this.grid.w, th=this.grid.h;
      return { x: cx*tw, y: cy*th, w: tw, h: th };
    },

    place(type, cx, cy){
      const {x,y,w,h} = this.cellToWorld(cx, cy);
      // Abreißen löscht top-most auf der Zelle
      if (type==='bulldoze'){
        for (let i=this.overlays.length-1;i>=0;i--){
          const o=this.overlays[i];
          if (o.x===x && o.y===y) { this.overlays.splice(i,1); break; }
        }
        this.logOK(`Bulldoze @ (${cx},${cy})`);
        return;
      }
      this.overlays.push({ x,y,w,h, type, label:type });
      this.logOK(`Platziert: ${type} @ (${cx},${cy})`);
    }
  };

  // Expose
  window.Game = Game;

  // ---------------- GameLoader ----------------
  const GameLoader = {
    async start(mapPath){
      Game.logOK(`Start gedrückt → ${mapPath}`);
      // Hier könnte Terrain/Tileset geladen werden; wir loggen kompatibel weiter:
      Game.logOK(`GameLoader.start ${mapPath}`);
      // Dummy-Checks – in echt würdest du hier Map/Atlas validieren
      if (typeof Game.ctx !== 'object') throw new Error('Canvas-Context fehlt');
      Game.logOK('Game started');
      return true;
    }
  };
  window.GameLoader = GameLoader;

  // -------- Dummy-Inspector/Editor (verhindert WARN) --------
  window.GameInspector = window.GameInspector || {
    _visible:false,
    toggle(){ this._visible=!this._visible; Game.logOK(this._visible?'Inspector: an':'Inspector: aus'); }
  };
  window.GameEditor = window.GameEditor || {
    open(){ Game.logOK('Editor geöffnet (Dummy)'); }
  };

  Game.logOK(`game.js geladen, ${ICON.ok} game.js ${VER}`);
})();
