/* ==========================================================
   game.js v16.0.5
   - Globales Game-Objekt mit Logger (✅⚠️❌ + Sektionsfilter)
   - GameLoader.start(canvas,mapUrl,onReady)
   - Placeholder-Renderer (grüner Hintergrund + Wasserzeichen)
   - Editor-Hook (stub) über window.Editor.open
   ========================================================== */

(function(){
  const GV = 'game.js 16.0.5';

  // ---------- Logger ----------
  function now(){const d=new Date(); return '['+d.toTimeString().slice(0,8)+']';}
  const _entries = [];
  const logger = {
    ok(msg, scope='game'){ push('ok',msg,scope); },
    warn(msg, scope='game'){ push('warn',msg,scope); },
    err(msg, scope='game'){ push('err',msg,scope); },
    all(){ return _entries.slice(); },
    size(){ return _entries.length; }
  };
  function ico(k){ return k==='ok'?'✅':(k==='warn'?'⚠️':'❌'); }
  function push(kind, msg, scope){
    const line = `${now()} ${ico(kind)} (${kind}) ${msg}`;
    _entries.push({kind,scope,line});
    // Mirror to UI log if available
    if (window._UILog){
      const f = kind==='ok'?_UILog.ok:kind==='warn'?_UILog.warn:_UILog.err;
      f(msg, scope||'game');
    }
  }

  // ---------- Public Game namespace ----------
  const Game = {
    version: GV,
    logger,
    log: (k,m,scope)=>{ (k==='ok'?logger.ok:k==='warn'?logger.warn:logger.err)(m,scope); }
  };
  window.Game = Game;
  window.dispatchEvent(new Event('GameLoggerReady'));
  logger.ok(`game.js geladen (${GV})`);

  // ---------- Editor-Hook (stub) ----------
  window.Editor = window.Editor || {};
  if (typeof window.Editor.open !== 'function'){
    window.Editor.open = function(opts){
      logger.ok('Editor.open() aufgerufen (Hook; später verbinden)','editor');
      alert('Editor-Start ist hier noch ein Platzhalter.');
    };
  }

  // ---------- Asset helpers ----------
  async function fetchJSON(url){
    const r = await fetch(url, {cache:'no-store'});
    if (!r.ok) throw new Error(`Map fetch FAIL ${r.status}  ${url}`);
    return await r.json();
  }

  // ---------- Minimal Renderer (placeholder) ----------
  function drawPlaceholder(ctx, w, h){
    ctx.save();
    ctx.fillStyle = '#2c5e3f'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.font = '14px ui-monospace,monospace';
    ctx.fillText('PLACEHOLDER-RENDER (game.js)', 10, 20);
    ctx.restore();
  }

  // ---------- GameLoader ----------
  window.GameLoader = {
    async start({canvas, mapUrl, onReady}){
      try{
        logger.ok(`GameLoader.start ${mapUrl}`);
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio||1));
        const rect = canvas.getBoundingClientRect();
        const cw = Math.max(320, Math.round(rect.width||window.innerWidth));
        const ch = Math.max(200, Math.round(rect.height||window.innerHeight));
        canvas.width = cw * dpr; canvas.height = ch * dpr;
        canvas.style.width = cw+'px'; canvas.style.height = ch+'px';
        const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
        logger.ok(`Canvas ${cw}x${ch} dpr:${dpr}`);

        // Map laden (als Smoke-Test); tolerant: wenn width/height fehlen → trotzdem rendern
        let map=null;
        try{
          map = await fetchJSON(mapUrl);
        }catch(e){
          logger.warn(`${e.message||e}`); // weiterlaufen – Placeholder rendern
        }
        if (map && map.width && map.height && map.tileSize){
          logger.ok(`Map OK size ${map.width}x${map.height} tile ${map.tileSize}`);
        }else{
          logger.warn('Map-Metadaten unvollständig – continue with placeholder');
        }

        // Placeholder zeichnen
        drawPlaceholder(ctx, canvas.width/dpr, canvas.height/dpr);

        logger.ok('Game started');
        if (typeof onReady==='function') onReady();
      }catch(err){
        logger.err(`Start FAIL ${err.message||err}`);
        alert('Fehler beim Start: '+(err.message||err));
      }
    }
  };

})();
