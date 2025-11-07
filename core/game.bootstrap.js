/* ============================================================================
 * Datei   : core/game.bootstrap.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final
 * Zweck   : Boot ↔ Spiel verbinden, Canvas vorbereiten, sanft initialisieren
 *
 * WICHTIG
 * - Kein eigener Render-Loop hier! Der Loop gehört Game.start().
 * - Diese Datei kümmert sich NUR um: Canvas-Größe, Splash/Diag, Repaint-Impulse.
 * - KEIN Autostart. Start erfolgt ausschließlich auf cb:game:start (vom Boot).
 *
 * Lauscht  : cb:assets-ready, cb:registry:ready, cb:boot:ready, cb:game:start
 * Sendet   : cb:game:initialized, cb:request-repaint
 * Ruft     : (optional) MapRuntime.init(canvas), Render.init()
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[bootstrap]';
  const LOG  = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  const VERSION = 'v25.11.13-final';

  function EVT(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch{} }
  function getCanvas(){
    return document.getElementById('game')
        || document.querySelector('canvas[data-role="map"]')
        || document.querySelector('canvas');
  }
  function sizeCanvasToWindow(canvas){
    if (!canvas) return;
    // Canvas-Backbuffer auf sichtbare Fläche bringen (Layout bestimmt Viewport)
    const w = Math.max(1, Math.floor(canvas.clientWidth  || window.innerWidth));
    const h = Math.max(1, Math.floor(canvas.clientHeight || window.innerHeight));
    canvas.width  = w;
    canvas.height = h;
  }

  class GameBootstrap {
    constructor(){
      this.canvas = getCanvas();
      this.ctx    = this.canvas?.getContext('2d') || null;

      if (!this.canvas || !this.ctx){
        WARN('Canvas #game nicht gefunden – Bootstrap passiv.');
      } else {
        sizeCanvasToWindow(this.canvas);
        this.drawSplash('Warte auf Start …');

        this._ro = new ResizeObserver(()=>{
          sizeCanvasToWindow(this.canvas);
          EVT('cb:request-repaint');
        });
        try { this._ro.observe(document.documentElement); } catch {}
        window.addEventListener('resize',            ()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
        window.addEventListener('orientationchange', ()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
      }

      this._assetsReady   = false;
      this._registryReady = false;
      this._initialized   = false;

      window.addEventListener('cb:assets-ready', (e)=>{
        this._assetsReady = !!(e?.detail?.ok ?? true);
        INFO('assets-ready', this._assetsReady ? '✓' : '(!)');
        this.maybeInitScene();
      });

      window.addEventListener('cb:registry:ready', ()=>{
        this._registryReady = true;
        INFO('registry-ready ✓');
        this.maybeInitScene();
      });

      window.addEventListener('cb:boot:ready', ()=>{
        INFO('boot-ready ✓'); // kein Start hier – nur Info
        this.maybeInitScene();
      }, { once:true });

      // Expliziter Startschuss → nur Szene initialisieren (kein Loop hier!)
      window.addEventListener('cb:game:start', ()=>{
        INFO('game-start ✓');
        this.initSceneOnce();
      }); // NICHT once:true → unterstützt Stop/Restart
      LOG(`geladen (${VERSION})`);
    }

    drawSplash(text){
      if (!this.ctx) return;
      const { width:w, height:h } = this.canvas;
      this.ctx.clearRect(0,0,w,h);
      this.ctx.fillStyle = '#1a1d22';
      this.ctx.fillRect(0,0,w,h);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '18px Inter, system-ui, sans-serif';
      this.ctx.fillText(text || 'Lade …', 24, 40);
    }

    maybeInitScene(){
      // Sanfte Vorinitialisierung: Canvas & optionale Systeme aufsetzen,
      // aber KEIN Game.start – das passiert NUR, nachdem cb:game:start kam.
      if (!this.canvas) return;
      if (this._assetsReady && this._registryReady) this.initSceneOnce();
    }

    initSceneOnce(){
      if (this._initialized) return;
      this._initialized = true;

      // Optionale Initializer (bestandsfreundlich)
      try { window.MapRuntime?.init?.(this.canvas); } catch(e){ WARN('MapRuntime.init:', e?.message||e); }
      try { window.Render?.init?.(); }               catch(e){ WARN('Render.init:', e?.message||e); }

      try { this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height); } catch {}

      EVT('cb:game:initialized');
      EVT('cb:request-repaint');
      LOG('Szene initialisiert.');
    }
  }

  function init(){ window.__gameBootstrap = new GameBootstrap(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
