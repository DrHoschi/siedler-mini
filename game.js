/* =========================================================
   Siedler-Mini • GAME CORE • game.js
   Kompatibel zu index v16.0.4 – stellt window.GameLoader bereit.
   - Minimaler Loader (Platzhalter), robust und fehlerarm
   - Loggt über BootUI ✅⚠️❌, fällt bei fehlendem BootUI auf console zurück
   ========================================================= */

(function(){
  const L = {
    ok:   (m)=> (window.BootUI?.logOK ? BootUI.logOK(m)   : console.log('OK:', m)),
    warn: (m)=> (window.BootUI?.logWARN? BootUI.logWARN(m): console.warn('WARN:', m)),
    err:  (m)=> (window.BootUI?.logERR ? BootUI.logERR(m) : console.error('ERR:', m)),
  };

  // --- Public API -----------------------------------------------------------
  const GameLoader = {
    /**
     * Startet das Spiel.
     * @param {Object} opt
     * @param {HTMLCanvasElement} opt.canvas  Ziel-Canvas
     * @param {string} opt.mapUrl             Map-JSON Pfad
     * @param {Function} opt.onReady          Callback, wenn "spielbereit"
     */
    start(opt){
      if (!opt || !opt.canvas) { L.err('Canvas fehlt'); return; }
      const canvas = opt.canvas;

      // Canvas DPI fit
      const fitCanvas = ()=>{
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        const w = Math.floor(window.innerWidth  * dpr);
        const h = Math.floor((window.innerHeight) * dpr);
        canvas.width = w; canvas.height = h;
        canvas.style.width = '100vw';
        canvas.style.height = '100dvh';
        L.ok(`Canvas ${w/dpr|0}x${h/dpr|0} dpr:${dpr}`);
      };
      fitCanvas();
      window.addEventListener('resize', fitCanvas, {passive:true});

      // Platzhalter-Render: füllt den Hintergrund (bis echte Renderpipe aktiv ist)
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2e5c33';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.font = `${Math.max(14, canvas.width*0.02|0)}px ui-sans-serif, system-ui`;
      ctx.fillText('PLACEHOLDER-RENDER (game.js)', 20, 36);

      // Simulierter "Load" → hier Map/Tileset wieder einbauen
      const mapUrl = opt.mapUrl || 'assets/maps/map-mini.json';
      L.ok(`Game start pipeline – map: ${mapUrl}`);

      // Erfolgs-Callback
      try { opt.onReady && opt.onReady(); } catch(e){ L.err('onReady error: '+e.message); }
    }
  };

  // Global machen
  window.GameLoader = GameLoader;
  L.ok('game.js initialisiert (GameLoader verfügbar)');
})();
