<!-- assets/inspector/inspector.js -->
<script>
/* =============================================================================
 * Inspector (Kombi-Core) — v18.4.2
 * Projekt: Siedler-Mini
 * CODE-STYLE:
 *   - Vollständig autark (keine fremden CSS-Abhängigkeiten)
 *   - Defensive Initialisierung, harte Sichtbarkeits-Garantie
 *   - Logs: robust (CBLog, Polyfill, Fallback-Poll)
 * Public API:
 *   GameUI.toggleInspector(), GameUI.openInspector(), GameUI.closeInspector()
 * Ereignisse:
 *   dispatchEvent(new CustomEvent('cb:inspector-open'))
 *   dispatchEvent(new CustomEvent('cb:inspector-close'))
 * =========================================================================== */

(function(){
  'use strict';

  // --------- Mini-Log-Helfer -------------------------------------------------
  var TAG='[inspector.core]';
  function ok(m){ try{ (window.CBLog?.ok||console.log)(TAG, m);}catch(_){ console.log(TAG, m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(TAG, m);}catch(_){ console.warn(TAG, m);} }

  // --------- State ------------------------------------------------------------
  var root=null, body=null, tabs=null, content=null, closeBtn=null;
  var activeTab='logs';
  var logEl=null, copyBtn=null, logStatusEl=null;
  var streamStopper=null, pollTimer=0, pollStarted=false;

  // --------- DOM bauen --------------------------------------------------------
  function ensureRoot(){
    if (root) return;
    root = document.createElement('div');
    root.id='inspector';
    root.setAttribute('aria-label','Inspector');
    root.style.cssText = [
      'position:fixed','inset:auto 12px 96px 12px','max-width:980px','margin:0 auto',
      'z-index:2147483600','background:rgba(20,20,22,.94)','color:#e7e7ea',
      'border:1px solid rgba(255,255,255,.08)','border-radius:14px',
      'box-shadow:0 18px 80px rgba(0,0,0,.55)','backdrop-filter:blur(8px)',
      'display:none'
    ].join(';');

    // Header
    var head=document.createElement('div');
    head.style.cssText='display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)';
    var title=document.createElement('div');
    title.textContent='Inspector';
    title.style.cssText='font-weight:700;letter-spacing:.2px';
    closeBtn=document.createElement('button');
    closeBtn.textContent='Schließen';
    closeBtn.style.cssText='margin-left:auto;border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer';
    closeBtn.onclick = close;
    head.appendChild(title); head.appendChild(closeBtn);
    root.appendChild(head);

    // Tabs
    tabs=document.createElement('div');
    tabs.style.cssText='display:flex;gap:8px;padding:10px 14px';
    ['Übersicht','Logs','Build','Pfade','Tests'].forEach(function(lbl,i){
      var id = (i===0?'overview':(lbl.toLowerCase()));
      var b=document.createElement('button');
      b.className='insp-tab'; b.dataset.tab=id; b.textContent=lbl;
      b.style.cssText='border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:13px';
      b.onclick=function(){ setTab(id); };
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    // Body
    body=document.createElement('div');
    body.style.cssText='padding:12px 14px 14px;max-height:60vh;overflow:auto';
    content=document.createElement('div');
    body.appendChild(content);
    root.appendChild(body);

    // Logs-View
    var wrap=document.createElement('div');
    wrap.id='insp-logs';
    wrap.style.display='none';
    var box=document.createElement('div');
    box.style.cssText='background:#0f1012;border:1px solid rgba(255,255,255,.06);border-radius:10px;min-height:220px;max-height:50vh;overflow:auto;padding:10px';
    logEl=document.createElement('pre');
    logEl.style.cssText='margin:0;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;font-size:12px;line-height:1.25;color:#d7d7db';
    logStatusEl=document.createElement('div');
    logStatusEl.textContent='[Log wird geladen…]';
    logStatusEl.style.cssText='opacity:.75;margin-bottom:6px;font-size:12px';
    box.appendChild(logEl);
    var foot=document.createElement('div');
    foot.style.cssText='display:flex;justify-content:flex-start;gap:8px;margin-top:10px';
    copyBtn=document.createElement('button');
    copyBtn.textContent='Kopieren';
    copyBtn.style.cssText='border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer';
    copyBtn.onclick=function(){
      try{ navigator.clipboard.writeText(logEl.textContent||''); ok('Logs kopiert'); }
      catch(e){ warn('Kopieren fehlgeschlagen: '+(e?.message||e)); }
    };
    wrap.appendChild(logStatusEl);
    wrap.appendChild(box);
    foot.appendChild(copyBtn);
    wrap.appendChild(foot);

    // Platzhalter-Container für andere Tabs
    var ov=document.createElement('div'); ov.id='insp-overview'; ov.style.display='none';
    var bd=document.createElement('div'); bd.id='insp-build'; bd.style.display='none';
    var pf=document.createElement('div'); pf.id='insp-pfade'; pf.style.display='none';
    var ts=document.createElement('div'); ts.id='insp-tests'; ts.style.display='none';

    content.appendChild(ov);
    content.appendChild(wrap);
    content.appendChild(bd);
    content.appendChild(pf);
    content.appendChild(ts);

    document.body.appendChild(root);
    ok('geladen (v18.4.2)');
  }

  // --------- Tabs -------------------------------------------------------------
  function setTab(id){
    activeTab = id;
    Array.from(tabs.querySelectorAll('button')).forEach(function(b){
      var on = (b.dataset.tab===id);
      b.style.background = on ? 'rgba(100,140,255,.30)' : 'rgba(255,255,255,.12)';
    });
    // Views umschalten
    ['overview','logs','build','pfade','tests'].forEach(function(x){
      var el = document.getElementById('insp-'+x) || (x==='logs'&&document.getElementById('insp-logs'));
      if (!el) return;
      el.style.display = (x===id) ? 'block' : 'none';
    });

    if (id==='logs') {
      startLogStream();           // sicherstellen, dass streamt
      refreshLogs(true);          // sofort befüllen
    }
  }

  // --------- Öffnen/Schließen -------------------------------------------------
  function open(){
    ensureRoot();
    root.style.display='block';
    setTab(activeTab||'logs');
    window.dispatchEvent(new CustomEvent('cb:inspector-open'));
    ok('geöffnet (v18.4.2)');
  }
  function close(){
    if (!root) return;
    root.style.display='none';
    stopLogStream();
    window.dispatchEvent(new CustomEvent('cb:inspector-close'));
    ok('geschlossen');
  }
  function toggle(){ (root && root.style.display==='block') ? close() : open(); }

  // --------- Log-Pipeline (robust) -------------------------------------------
  function currentBuffer(){
    try{
      if (window.CBLog?.getBuffer) return window.CBLog.getBuffer();
      if (Array.isArray(window.__CBLOG_BUF)) return window.__CBLOG_BUF;
      if (Array.isArray(window.CBLog?._buf))  return window.CBLog._buf;
      if (Array.isArray(window.CBLog?.buf))   return window.CBLog.buf;
    }catch(_){}
    return null;
  }

  function renderBuffer(buf){
    if (!buf || !buf.length) {
      logEl.textContent = '';
      logStatusEl.textContent='[Keine Einträge]';
      return;
    }
    try{
      var out = buf.map(function(r){
        // r kann String oder Objekt sein
        if (typeof r==='string') return r;
        var t = r.t || r.time || '';
        var lv = r.lvl || r.level || r[0] || '';
        var m = r.msg || r[1] || r.message || '';
        return (t?('['+t+'] '):'') + (lv? (String(lv).toUpperCase()+' ') : '') + (typeof m==='string'?m:JSON.stringify(m));
      }).join('\n');
      logEl.textContent = out;
      logStatusEl.textContent='';
    }catch(e){
      logEl.textContent = (buf.join?buf.join('\n'):String(buf));
      logStatusEl.textContent='';
    }
  }

  function refreshLogs(immediate){
    try{
      var buf = currentBuffer();
      if (buf && buf.length){
        renderBuffer(buf);
      } else if (immediate){
        // Sofort mindestens irgendwas zeigen, damit UI nicht „hängt“
        logEl.textContent = '';
        logStatusEl.textContent='[CBLog nicht verfügbar]';
      }
    }catch(e){
      warn('refreshLogs Fehler: '+(e?.message||e));
    }
  }

  function startLogStream(){
    if (streamStopper || pollStarted) return;

    // 1) Echte Event-Quelle?
    try{
      if (window.CBLog?.on){
        var handler = function(){ renderBuffer(currentBuffer()||[]); };
        window.CBLog.on('append', handler);
        streamStopper = function(){
          try{ window.CBLog.off?.('append', handler); }catch(_){}
          streamStopper=null;
        };
        renderBuffer(currentBuffer()||[]); // initial dump
        ok('LogStream via CBLog.on aktiviert');
        return;
      }
    }catch(_){}

    // 2) Fallback: sanftes Polling auf globale Pufferquellen
    pollStarted = true;
    var lastLen = -1;
    pollTimer = window.setInterval(function(){
      var buf = currentBuffer();
      var len = buf?buf.length:0;
      if (len!==lastLen){
        lastLen=len;
        renderBuffer(buf||[]);
      }
    }, 500);
    streamStopper = function(){
      window.clearInterval(pollTimer); pollTimer=0; pollStarted=false; streamStopper=null;
    };
    renderBuffer(currentBuffer()||[]);
    ok('LogStream via Poll aktiviert');
  }

  function stopLogStream(){
    try{ streamStopper?.(); }catch(_){}
    streamStopper=null;
    if (pollTimer){ clearInterval(pollTimer); pollTimer=0; pollStarted=false; }
  }

  // --------- Public API -------------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // --------- Auto-Init (sichtbare Garantie) ----------------------------------
  try{
    // Wenn Index oder Spiel schon steht, kurz verzögert öffnen? Nur falls qs=inspector=1
    if (location.search.indexOf('inspector=1')!==-1){
      setTimeout(open, 120);
    }
  }catch(_){}

  // Badge unten rechts, falls jemand debuggen will, warum nicht sichtbar
  // (nur anzeigen, wenn root nicht gebaut werden konnte)
  setTimeout(function(){
    if (!root){
      var badge=document.createElement('div');
      badge.textContent='Inspector lädt…';
      badge.style.cssText='position:fixed;right:16px;bottom:20px;z-index:2147483647;padding:6px 10px;border-radius:9px;background:rgba(0,0,0,.55);color:#ddd;font:12px ui-sans-serif,system-ui,sans-serif';
      document.body.appendChild(badge);
      setTimeout(function(){ badge.remove(); }, 4000);
    }
  }, 300);

  // Evtl. sofort Logs streamen, wenn CBLog schon existiert (sichtbare „Live“-Wirkung)
  ensureRoot();
  setTab('logs');
  startLogStream();
  refreshLogs(true);
  ok('bereit (v18.4.2)');

})();</script>
