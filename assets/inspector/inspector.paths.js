/* ============================================================================
 * assets/inspector/inspector.paths.js
 * Version: v18.10.6
 * Zweck:
 *   - Inspector-Tab "Pfade": Overlay an/aus, Heatmap reset
 *   - Statusanzeige (on/off) liest optional window.__cb.pathsEnabled
 *
 * Abhängigkeiten:
 *   - __INSPECTOR_CORE__ (aus inspector.core.js)
 *   - Engine/Renderer, die Events bedienen:
 *       • 'cb:paths:toggle'
 *       • 'cb:paths:reset'
 *   - Optional: window.__cb.pathsEnabled (boolean)
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.paths]';
  var VER='v18.10.6';
  var Core=window.__INSPECTOR_CORE__;
  if(!Core){ (console.warn||console.log)(MOD+' Core fehlt – Modul beendet.'); return; }

  function logOk(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }

  function mkButton(label, cls, onClick){
    var b=document.createElement('button');
    b.className = 'ins-btn '+(cls||'');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  function mkBadge(txt, kind){
    var s=document.createElement('span');
    s.className='ins-badge '+(kind||'muted');
    s.textContent=txt;
    return s;
  }

  function getStatus(){
    try { return !!(window.__cb && window.__cb.pathsEnabled); } catch(_){ return false; }
  }

  function mount(slot){
    var wrap=document.createElement('div');
    wrap.className='ins-vert';

    // Kopfzeile mit Status
    var head=document.createElement('div');
    head.className='ins-row';
    var title=document.createElement('div');
    title.className='ins-title';
    title.textContent='Pfade / Debug';
    var status = mkBadge(getStatus()? 'AN':'AUS', getStatus()?'ok':'muted');
    status.id='ins-paths-status';
    head.appendChild(title);
    head.appendChild(status);
    wrap.appendChild(head);

    // Buttons
    var row=document.createElement('div');
    row.className='ins-rowgap';
    row.appendChild(mkButton('Overlay umschalten','primary', function(){
      try{ window.dispatchEvent(new CustomEvent('cb:paths:toggle')); }catch(_){}
      setTimeout(function(){
        var on = getStatus();
        status.textContent = on?'AN':'AUS';
        status.className = 'ins-badge ' + (on?'ok':'muted');
        Core.flash('Pfade-Overlay: '+(on?'AN':'AUS'));
      }, 60);
    }));
    row.appendChild(mkButton('Heatmap zurücksetzen','', function(){
      try{ window.dispatchEvent(new CustomEvent('cb:paths:reset')); }catch(_){}
      Core.flash('Heatmap zurückgesetzt');
    }));
    wrap.appendChild(row);

    // Hinweis
    var hint=document.createElement('div');
    hint.className='ins-hint';
    hint.textContent='Erfordert OverlayHooks.draw(ctx, cam) im Renderer.';
    wrap.appendChild(hint);

    slot.body.innerHTML='';
    slot.body.appendChild(wrap);
  }

  Core.registerTab('paths', {
    title:'Pfade',
    mount: mount,
    unmount: function(){ /* nichts */ }
  });

  logOk('geladen ('+VER+')');
})();
