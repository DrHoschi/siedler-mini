/* =============================================================================
 * game.js • v1.0
 * - Lädt Map-JSON (oder baut Demo-Map)
 * - Zeichnet Karte: Tileset (falls vorhanden) ODER farbige Platzhalter sofort
 * - Baumenü-Tools: Weg/Hütte/Holzfäller/Steinmetz → Klick aufs Grid platziert
 * - Snapshot/Continue kompatibel zu boot.js
 * - Setzt Asset.texturesReady auf true, sobald Tileset geladen (oder Fallback)
 * =========================================================================== */

(function(){
  const CANVAS_ID = 'stage';

  // --- einfache Farben für Platzhalter-Tiles ---
  const TILE_COLORS = {
    0: '#1a2735',   // Wasser
    1: '#2c3e2f',   // Wald
    2: '#4a5b2f',   // Wiese
    3: '#6f5b2f',   // Sand
    4: '#666666'    // Fels
  };

  // --- Map laden oder Demo erzeugen ---
  async function loadMap(url){
    try{
      const res = await fetch(url, {cache:'no-cache'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const j = await res.json();
      // Erwartete Felder (tolerant)
      return {
        width:  j.width  || j.w || 32,
        height: j.height || j.h || 18,
        tileSize: j.tileSize || j.tile || 32,
        tileset: j.tileset || null, // z.B. "./assets/tiles/atlas.png"
        // tiles: 2D oder 1D; wir normalisieren auf 1D
        tiles: (Array.isArray(j.tiles) ? j.tiles.flat() : []) || []
      };
    }catch(e){
      console.warn('[game] Map laden fehlgeschlagen, verwende Demo:', e);
      // Demo-Map (farbig)
      const width=32, height=18, tileSize=32;
      const tiles = new Array(width*height).fill(0).map((_,i)=>{
        const x = i % width, y = (i/width)|0;
        if (y<4) return 0;                 // Wasser oben
        if (y>height-4) return 4;          // Fels unten
        if ((x+y)%7===0) return 1;         // Wald sprenkelig
        if ((x*y)%11===0) return 3;        // Sand flecken
        return 2;                          // Wiese
      });
      return { width, height, tileSize, tileset:null, tiles };
    }
  }

  // --- World-Objekt ---
  class World {
    constructor(canvas, mapData){
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.time = 0;
      this.running = true;

      this.state = {
        mapUrl: null,
        time: 0,
        player: {x: 0, y: 0} // optional
      };

      // Map
      this.map = mapData;
      this.tileSize = mapData.tileSize || 32;
      this.tiles = mapData.tiles && mapData.tiles.length
        ? mapData.tiles
        : new Array(mapData.width*mapData.height).fill(2);

      // Tileset-Grafik (optional)
      this.tileset = null;     // Image
      this.tsCols = 8;         // Annahme: 8 Spalten im Atlas (falls vorhanden)
      this.tsTile = this.tileSize;

      // Buildings
      this.buildings = [];     // {type, tx, ty}

      // Input/Tools
      this.currentTool = null;

      // Intern
      this._raf = null;
      this.texturesReady = false;

      this._bindInput();
      this._resize();
      window.addEventListener('resize', ()=>this._resize(), {passive:true});
    }

    async init(mapUrl){
      this.state.mapUrl = mapUrl || this.state.mapUrl;
      // Tileset optional laden
      if (this.map.tileset){
        try{
          this.tileset = await window.Asset.loadImage('tileset', this.map.tileset);
          this.texturesReady = true;
          window.Asset.markTexturesReady(true);
        }catch(e){
          console.warn('[game] Tileset fehlgeschlagen, nutze Platzhalter:', e);
          this.texturesReady = true; // wir zeichnen trotzdem (Platzhalter)
          window.Asset.markTexturesReady(true);
        }
      }else{
        // Kein Tileset → sofort "ready", wir zeichnen Platzhalter
        this.texturesReady = true;
        window.Asset.markTexturesReady(true);
      }
      this.play();
    }

    play(){
      if (this._raf) return;
      const tick = (t)=>{
        this._raf = requestAnimationFrame(tick);
        if (!this.running) return;
        this.time += 1/60;
        this.state.time = this.time;
        this._draw();
      };
      this._raf = requestAnimationFrame(tick);
    }
    pause(){ this.running = false; }
    // optional used by Inspector button to resume
    get running(){ return this._running; }
    set running(v){ this._running = !!v; }

    snapshot(){
      return {
        mapUrl: this.state.mapUrl,
        time: this.time,
        buildings: this.buildings
      };
    }
    async restore(snap){
      if (!snap) return;
      if (snap.mapUrl && snap.mapUrl !== this.state.mapUrl){
        // Map wechseln und dann platzieren
        const mapData = await loadMap(snap.mapUrl);
        this.map = mapData;
        this.tiles = mapData.tiles && mapData.tiles.length
          ? mapData.tiles
          : new Array(mapData.width*mapData.height).fill(2);
        await this.init(snap.mapUrl);
      }
      this.buildings = Array.isArray(snap.buildings) ? snap.buildings.slice() : [];
      this.time = Number(snap.time||0);
    }

    _resize(){
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      this.canvas.width  = Math.floor(w*dpr);
      this.canvas.height = Math.floor(h*dpr);
      this.canvas.style.width  = w+'px';
      this.canvas.style.height = h+'px';
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    _bindInput(){
      // Baumenü-Tool übernehmen (aus index.html Buttons)
      const tools = document.querySelectorAll('#buildTools .tool');
      tools.forEach(btn=>{
        btn.addEventListener('click', ()=>{
          this.currentTool = btn.dataset.tool || null;
        });
      });
      // Platzieren bei Klick/Tap
      this.canvas.addEventListener('click', (ev)=>{
        if (!this.currentTool) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx<0 || ty<0 || tx>=this.map.width || ty>=this.map.height) return;
        this.buildings.push({type:this.currentTool, tx, ty});
      });
    }

    _draw(){
      const {ctx, tileSize} = this;
      const W=this.map.width, H=this.map.height;

      // Hintergrund füllen
      ctx.clearRect(0,0, this.canvas.width, this.canvas.height);

      // Karte rendern
      if (this.tileset){
        // Tileset-Modus: wir nehmen an, dass Tile-ID direkt auf Atlas-Index zeigt
        for (let ty=0; ty<H; ty++){
          for (let tx=0; tx<W; tx++){
            const id = this.tiles[ty*W+tx] | 0;
            const sx = (id % this.tsCols) * this.tsTile;
            const sy = Math.floor(id / this.tsCols) * this.tsTile;
            ctx.drawImage(this.tileset, sx, sy, this.tsTile, this.tsTile, tx*tileSize, ty*tileSize, tileSize, tileSize);
          }
        }
      }else{
        // Platzhalter-Modus (sofort sichtbar)
        for (let ty=0; ty<H; ty++){
          for (let tx=0; tx<W; tx++){
            const id = this.tiles[ty*W+tx] | 0;
            ctx.fillStyle = TILE_COLORS[id] || '#2a2a2a';
            ctx.fillRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
            // leichte Grid-Linie
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.strokeRect(tx*tileSize, ty*tileSize, tileSize, tileSize);
          }
        }
      }

      // Buildings (vereinfacht)
      for (const b of this.buildings){
        const x = b.tx*tileSize, y = b.ty*tileSize, s = tileSize;
        switch(b.type){
          case 'road':
            ctx.fillStyle = '#8c7a57';
            ctx.fillRect(x+2, y+s*0.4, s-4, s*0.2);
            break;
          case 'hut':
            ctx.fillStyle = '#b08968';
            ctx.fillRect(x+4, y+8, s-8, s-12);
            ctx.fillStyle = '#6b4f3f';
            ctx.fillRect(x+8, y+4, s-16, 8);
            break;
          case 'lumber':
            ctx.fillStyle = '#2f5d2e';
            ctx.beginPath();
            ctx.arc(x+s/2, y+s/2, s*0.32, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#3c6b3a';
            ctx.fillRect(x+s*0.45, y+s*0.2, s*0.1, s*0.6);
            break;
          case 'mason':
            ctx.fillStyle = '#9aa0a6';
            ctx.fillRect(x+6, y+6, s-12, s-12);
            ctx.fillStyle = '#7d8186';
            ctx.fillRect(x+s*0.4, y+4, s*0.2, s*0.2);
            break;
          default:
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(x+6, y+6, s-12, s-12);
        }
      }
    }
  }

  // --- GameLoader (API wie von boot.js erwartet) ---
  const GameLoader = {
    _world: null,

    async start(mapUrl){
      // Map-JSON laden
      const mapData = await loadMap(mapUrl);
      // Canvas
      const canvas = document.getElementById(CANVAS_ID);
      const world = new World(canvas, mapData);
      this._world = world;
      await world.init(mapUrl);
      // Inspector-Refresh (falls offen)
      window.BootUI?.paintInspectorBasic?.();
    },

    async continueFrom(snap){
      // Map-Daten evtl neu laden
      const mapData = await loadMap(snap?.mapUrl);
      const canvas = document.getElementById(CANVAS_ID);
      const world = new World(canvas, mapData);
      this._world = world;
      await world.init(snap?.mapUrl);
      await world.restore(snap);
      window.BootUI?.paintInspectorBasic?.();
    }
  };

  window.GameLoader = GameLoader;
})();
