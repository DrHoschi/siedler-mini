/* ============================================================================
 * Datei   : core/game.bootstrap.js
 * Projekt : Neue Siedler
 * Version : v25.11.06-final (aus v25.10.25-final)
 * Zweck   : Boot ↔ Spiel verbinden, Canvas vorbereiten, sanft initialisieren
 *
 * WICHTIG
 * - Kein eigener Render-Loop hier! Der Loop gehört Game.start().
 * - Diese Datei sorgt nur für: Canvas-Größe, einen Splash, Repaint anstoßen.
 *
 * Lauscht  : cb:assets-ready, cb:registry:ready, cb:boot:ready, cb:game-start
 * Sendet   : cb:game:initialized, cb:request-repaint
 * Aufrufer : MapRuntime.init?/Render.init? (optional, try/catch)
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[bootstrap]';
  const LOG  = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  const VERSION = 'v25.11.06-final';

  function EVT(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch{} }
  function getCanvas(){
    return document.getElementById('game')
        || document.querySelector('canvas[data-role="map"]')
        || document.querySelector('canvas');
  }
  function sizeCanvasToWindow(canvas){
    if (!canvas) return;
    canvas.width  = Math.max(1, Math.floor(window.innerWidth));
    canvas.height = Math.max(1, Math.floor(window.innerHeight));
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

        this._ro = new ResizeObserver(()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
        try { this._ro.observe(document.documentElement); } catch {}
        window.addEventListener('resize',            ()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
        window.addEventListener('orientationchange', ()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
      }

      this._assetsReady   = false;
      this._registryReady = false;

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
        INFO('boot-ready ✓'); this.maybeInitScene();
      }, { once:true });

      // „expliziter“ Startschuss – hier nur Initialisierung (kein Loop!)
      window.addEventListener('cb:game-start', ()=>{
        INFO('game-start ✓'); this.initSceneOnce();
      }, { once:true });

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
      // Wir initialisieren sanft, sobald Canvas da und Assets/Registry bereit sind.
      if (!this.canvas) return;
      if (this._assetsReady && this._registryReady) this.initSceneOnce();
    }

    initSceneOnce(){
      if (this._initialized) return;
      this._initialized = true;

      // Optionale Initializer (bestandsfreundlich)
      try { window.MapRuntime?.init?.(this.canvas); } catch(e){ WARN('MapRuntime.init:', e?.message||e); }
      try { window.Render?.init?.(); } catch(e){ WARN('Render.init:', e?.message||e); }

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
