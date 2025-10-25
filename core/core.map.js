/* ============================================================================
 * Datei   : core/map.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : SiedlerMap – Map-Loader & Tile-Renderer (Ground-Layer, Viewport, Camera)
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 *
 * Events  :
 *   listen : cb:camera-change {x,y,zoom}, cb:assets-ready
 *   (optional emit: keine – Renderer wird direkt gezeichnet)
 *
 * Abhängigkeiten (optional):
 *   – Assets (core/asset.js): getJSON/getImage Cache; fällt sonst auf fetch zurück
 *   – GameCamera (core/camera.js): positioniert Viewport (x,y,zoom in Weltpixeln)
 * Hinweise:
 *   – Canvas läuft in CSS-Pixeln (kein DPR-Double-Scale). Transform übernimmt Zoom/Offset.
 *   – Ground-Layer: auto-fill, wenn layer.fill gesetzt ODER kein data-Raster existiert.
 * ============================================================================ */
(() => {
  'use strict';

  /* ==========================================================================
   * [Logger]
   * ========================================================================== */
  const TAG  = '[map]';
  const LOG  = (...a)=> (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error)(TAG, ...a);

  /* ==========================================================================
   * [Konstanten]
   * ========================================================================== */
  const VERSION = 'v25.10.25-final';
  const DEFAULT_TILE = 64;

  /* ==========================================================================
   * [Hilfsfunktionen – I/O]
   * ========================================================================== */
  async function fetchJSON(url){
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }
  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=>resolve(img);
      img.onerror= ()=>reject(new Error('Bild nicht erreichbar: '+src));
      img.src = src;
    });
  }
  function fromAssetsJSON(keyOrPath){
    // Versuch 1: direkter Key in Assets.getJSON
    const a = window.Assets?.getJSON?.(keyOrPath);
    if (a) return Promise.resolve(a);
    // Versuch 2: wenn key kein JSON war, als URL laden
    return fetchJSON(keyOrPath);
  }
  async function fromAssetsImage(path){
    // Assets hält Images im Cache nur, wenn explizit geladen; sonst klassisch
    const img = window.Assets?.getImage?.(path);
    if (img) return img;
    return await loadImage(path);
  }

  /* ==========================================================================
   * [Hilfsfunktionen – Keys, Fill, Rect]
   * ========================================================================== */
  const basename = p => String(p||'').replace(/\\/g,'/').split('/').pop();
  const stripExt = n => String(n||'').replace(/\.(png|webp|jpg|jpeg|gif)$/i,'');
  const canon    = n => stripExt(basename(n)).replace(/[\s-]+/g,'_');

  function ensureFilledGrid(layer, w, h){
    if (!layer || layer.type!=='tiles') return;
    // Bereits Raster? dann nichts tun
    if (Array.isArray(layer.data) && layer.data.length) return;
    const key = String(layer.fill || 'terrain_r4_c0');
    layer.data = Array.from({ length:h }, ()=> Array.from({ length:w }, ()=> key));
  }

  function rectOf(el){
    try { return el.getBoundingClientRect(); }
    catch { return { left:0, top:0, width:el?.width||0, height:el?.height||0 }; }
  }

  /* ==========================================================================
   * [Klasse SiedlerMap]
   * ========================================================================== */
  class SiedlerMap {
    constructor(canvas){
      this.canvas = canvas;
      this.ctx    = canvas?.getContext('2d') || null;

      // Kamera / Zoom (Weltpixel)
      this.camX = 0; this.camY = 0; this.zoom = 1;

      // Viewportgröße (CSS-Pixel)
      const r = canvas ? rectOf(canvas) : { width:0, height:0 };
      this.viewW = r.width|0;
      this.viewH = r.height|0;

      // Tileset & Map
      this.tileset = null; // { image, frames:{key:{x,y,w,h}}, tileSize }
      this.map     = null; // { width,height,tileSize,layers:[...] }
      this._ground = null;

      // Diagnose
      this._diagLogged = false;

      LOG('SiedlerMap bereit.', VERSION);
    }

    setSize(w,h){
      this.viewW = w|0;
      this.viewH = h|0;
    }

    onCameraChange({x,y,zoom}){
      if (typeof x==='number') this.camX = x;
      if (typeof y==='number') this.camY = y;
      if (typeof zoom==='number') this.zoom = zoom;
    }

    async _ensureTileset(){
      // Kandidaten: erst bevorzugter Pfad aus Assets-Atlas, dann Fallbacks
      const candidates = [
        'assets/tiles/tileset.terrain.json',
        'assets/tiles/tileset.json'
      ];

      let atlas=null, chosen=null;
      for (const url of candidates){
        try { atlas = await fromAssetsJSON(url); chosen = url; break; }
        catch(e){ WARN('Tileset-Kandidat verworfen:', url, '→', e.message); }
      }
      if (!atlas) throw new Error('Kein Tileset-Atlas erreichbar.');

      const imagePath = atlas?.meta?.image;
      if (!imagePath) throw new Error('Tileset.meta.image fehlt.');
      const img = await fromAssetsImage(imagePath);

      // Frames normalisieren
      const normalized = {};
      const frames = atlas.frames || {};
      for (const [key, val] of Object.entries(frames)){
        let x,y,w,h;
        if (val && typeof val==='object'){
          if (val.x!=null) ({x,y,w,h} = val);
          else if (val.frame && typeof val.frame==='object') ({x,y,w,h} = val.frame);
        }
        if ([x,y,w,h].every(Number.isFinite)) {
          normalized[key] = { x:x|0, y:y|0, w:w|0, h:h|0 };
        } else {
          WARN('Frame ignoriert (kein x/y/w/h):', key);
        }
      }

      const tileSize = atlas?.meta?.tileSize || atlas?.meta?.tile || DEFAULT_TILE;
      this.tileset = { image: img, frames: normalized, tileSize };
      OK('Tileset geladen:', chosen, `(Frames: ${Object.keys(normalized).length})`);
    }

    async loadMap(url){
      if (!this.tileset) await this._ensureTileset();

      const data = await fromAssetsJSON(url);

      // Maße tolerant lesen
      const w = Number(Array.isArray(data.size) ? data.size[0] : (data.cols ?? data.width));
      const h = Number(Array.isArray(data.size) ? data.size[1] : (data.rows ?? data.height));
      const t = Number(data.tile || data.tileSize || this.tileset?.tileSize || DEFAULT_TILE);

      this.map = {
        width:  w || 32,
        height: h || 18,
        tileSize: t,
        layers: Array.isArray(data.layers) ? data.layers.slice() : []
      };

      // Ground-Layer finden + ggf. füllen
      this._ground = (this.map.layers||[]).find(l =>
        l && l.type==='tiles' && (l.name==='ground' || l.name==='base' || l.id==='ground')
      ) || null;

      if (this._ground) {
        ensureFilledGrid(this._ground, this.map.width, this.map.height);
      } else {
        WARN('Kein Ground-Layer gefunden – es wird nichts gezeichnet.');
      }

      // Map-Tilegröße → Tileset spiegeln
      if (this.map.tileSize && this.tileset) this.tileset.tileSize = this.map.tileSize;

      OK(`Map geladen: ${this.map.width}×${this.map.height} (tile=${this.map.tileSize})`);
    }

    _frameFor(key){
      const frames = this.tileset?.frames || {};
      if (frames[key]) return frames[key];
      const k1 = basename(key);
      const k2 = stripExt(k1);
      const k3 = canon(k1);
      const k4 = canon(key);
      return frames[k1] || frames[k2] || frames[k3] || frames[k4] || null;
    }

    draw(){
      if (!this.ctx || !this.canvas) return;
      if (!this.tileset || !this.map || !this._ground) return;

      const ctx = this.ctx;
      const T   = this.map.tileSize|0;

      // Welt-Transform (Zoom + Offset in Weltpixeln)
      const s = (this.zoom || 1);
      ctx.setTransform(s, 0, 0, s, Math.floor(-this.camX * s), Math.floor(-this.camY * s));

      // Sichtfenster in Weltpixeln → zu Tile-Indizes
      const vw = (this.viewW || this.canvas.width ) / s;
      const vh = (this.viewH || this.canvas.height) / s;
      const x0 = Math.max(0, Math.floor(this.camX / T) - 1);
      const y0 = Math.max(0, Math.floor(this.camY / T) - 1);
      const x1 = Math.min(this.map.width,  Math.ceil((this.camX + vw) / T) + 1);
      const y1 = Math.min(this.map.height, Math.ceil((this.camY + vh) / T) + 1);

      // Ground-Zeichen
      let hits=0, misses=0, firstMissKey=null;
      const rows = this._ground.data || [];

      for (let r=y0; r<y1; r++){
        const row = rows[r]; if (!row) continue;
        for (let c=x0; c<x1; c++){
          const key = row[c]; if (!key) continue;
          const f = this._frameFor(key);
          if (!f){ misses++; if (!firstMissKey) firstMissKey = key; continue; }
          ctx.drawImage(this.tileset.image, f.x, f.y, f.w, f.h, c*T, r*T, T, T);
          hits++;
        }
      }

      // Einmaliges Diagnose-Log
      if (!this._diagLogged){
        this._diagLogged = true;
        LOG('draw-diag:', { hits, misses, tile:T, view:{w:this.viewW,h:this.viewH}, cam:{x:this.camX,y:this.camY,zoom:this.zoom} });
        if (misses>0) WARN('missing frame example:', firstMissKey);
      }
      window.__mapDrawDiag = { hits, misses };
    }
  }

  /* ==========================================================================
   * [Hauptlogik / Singleton-Runtime]
   * ========================================================================== */
  const MapRuntime = {
    map: null, // Instanz von SiedlerMap

    init(canvas){
      if (!canvas){
        canvas = document.getElementById('game')
              || document.querySelector('canvas[data-role="map"]')
              || document.querySelector('canvas');
      }
      if (!canvas){ WARN('init(): Kein Canvas gefunden'); return null; }
      this.map = new SiedlerMap(canvas);

      // Kamera koppeln
      window.addEventListener('cb:camera-change', (ev)=>{
        this.map?.onCameraChange(ev?.detail||{});
      });

      // Canvas-Resize beobachten (einfacher Ansatz)
      const ro = new ResizeObserver(entries=>{
        for (const e of entries){
          const r = e.contentRect;
          this.map?.setSize(r.width|0, r.height|0);
        }
      });
      try { ro.observe(canvas); } catch {}
      this._ro = ro;

      OK('MapRuntime init');
      return this.map;
    },

    async loadMap(url){
      if (!this.map) this.init();
      await this.map.loadMap(url);
    },

    draw(){
      this.map?.draw();
    },

    setSize(w,h){ this.map?.setSize(w,h); }
  };

  /* ==========================================================================
   * [Exports]
   * ========================================================================== */
  window.SiedlerMap  = SiedlerMap;   // Klasse (falls jemand eigene Instanz will)
  window.MapRuntime  = MapRuntime;   // Bequeme Singleton-Laufzeit

  // Auto-Init: wenn Canvas schon da ist
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    MapRuntime.init();
  } else {
    document.addEventListener('DOMContentLoaded', ()=>MapRuntime.init(), { once:true });
  }

  LOG('Modul geladen', VERSION);
})();
