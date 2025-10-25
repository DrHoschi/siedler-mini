/* ============================================================================
 * Datei   : core/game.bootstrap.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : Boot ↔ Spiel verbinden, Canvas vorbereiten, Map/Render sanft starten
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klasse → Hauptlogik → Exports
 *
 * Events (listen):
 *   • cb:boot:ready         – Boot-Phase abgeschlossen (UI/DOM steht)
 *   • cb:assets-ready       – Assets geladen (Stub/real, detail.ok:boolean)
 *   • cb:registry:ready     – Registry bereit
 *   • cb:game-start         – expliziter Startschuss (optional)
 *
 * Events (emit):
 *   • cb:game:initialized   – Szene initialisiert (Canvas ok, Map/Render bereit)
 *   • cb:request-repaint    – nach Resize/Init einen Frame zeichnen
 *
 * Hinweise:
 *   – Kein Platzier-Controller hier! → Das macht core/input.js.
 *   – Kein eigener Render-Loop; Render-Shim zeichnet nur auf Nachfrage.
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[bootstrap]';
  const LOG  = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  const VERSION = 'v25.10.25-final';

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------
  function EVT(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch{} }

  function getCanvas(){
    return document.getElementById('game')
        || document.querySelector('canvas[data-role="map"]')
        || document.querySelector('canvas');
  }

  function sizeCanvasToWindow(canvas){
    if (!canvas) return;
    // Canvas in CSS-Pixeln, Map-Renderer kümmert sich um Transform/Zoom
    canvas.width  = Math.max(1, Math.floor(window.innerWidth));
    canvas.height = Math.max(1, Math.floor(window.innerHeight));
  }

  // ---------------------------------------------------------------------------
  // Bootstrap-Klasse
  // ---------------------------------------------------------------------------
  class GameBootstrap {
    constructor(){
      this.canvas = getCanvas();
      this.ctx    = this.canvas?.getContext('2d') || null;

      if (!this.canvas || !this.ctx){
        WARN('Canvas #game nicht gefunden – Bootstrap bleibt passiv.');
      } else {
        sizeCanvasToWindow(this.canvas);
        this.drawSplash('Warte auf Start …');
        // Resize mitnehmen
        this._ro = new ResizeObserver(()=> {
          sizeCanvasToWindow(this.canvas);
          EVT('cb:request-repaint');
        });
        try { this._ro.observe(document.documentElement); } catch {}
        window.addEventListener('resize', ()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
        window.addEventListener('orientationchange', ()=>{ sizeCanvasToWindow(this.canvas); EVT('cb:request-repaint'); });
      }

      // Warten auf Boot/Assets/Registry; Start flexibel
      this._assetsReady   = false;
      this._registryReady = false;

      window.addEventListener('cb:assets-ready', (e)=>{
        this._assetsReady = !!(e?.detail?.ok ?? true);
        INFO('assets-ready', this._assetsReady ? '✓' : '(!)');
        this.maybeStart();
      });

      window.addEventListener('cb:registry:ready', ()=>{
        this._registryReady = true;
        INFO('registry-ready ✓');
        this.maybeStart();
      });

      window.addEventListener('cb:boot:ready', ()=>{
        INFO('boot-ready ✓');
        this.maybeStart();
      }, { once:true });

      // Expliziter Startschuss (optional extern getriggert)
      window.addEventListener('cb:game-start', ()=>{
        INFO('game-start ✓');
        this.startScene();
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

    maybeStart(){
      // Strategie: Starten, sobald Canvas existiert **und**
      // (Assets & Registry bereit) ODER (es kommt ein explizites cb:game-start).
      if (!this.canvas) return;
      if (this._assetsReady && this._registryReady){
        this.startScene();
      }
    }

    startScene(){
      if (this._started) return;
      this._started = true;

      // 1) Init Map/Render sanft
      try { window.MapRuntime?.init?.(this.canvas); } catch(e){ WARN('MapRuntime.init:', e?.message||e); }
      try { window.Render?.init?.(); } catch(e){ WARN('Render.init:', e?.message||e); }

      // 2) Erstes Clear
      try {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      } catch {}

      // 3) Szene signalieren
      EVT('cb:game:initialized');

      // 4) Falls es eine Game.start() gibt, aufrufen (optional)
      try { window.Game?.start?.(); } catch(e){ WARN('Game.start:', e?.message||e); }

      // 5) Einen Frame anfordern
      EVT('cb:request-repaint');

      LOG('Szene gestartet.');
    }
  }

  // ---------------------------------------------------------------------------
  // Auto-Init
  // ---------------------------------------------------------------------------
  function init(){
    window.__gameBootstrap = new GameBootstrap();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
