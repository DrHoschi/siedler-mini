/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v17.2.0
 * Zweck:
 *   - Inspector-Core (UI-Fenster mit Tabs)
 *   - Zeigt Logs & Debug-Infos
 *   - Reagiert auf cb:inspector-open / cb:inspector-close
 *   - Erweiterbar (Tabs für Ressourcen, Entities, Pfade, Tests via Add-ons)
 * ============================================================================
 */
(function () {
  'use strict';

  var MOD = '[inspector.core]';
  function ok(){ try{ (window.CBLog?.ok||console.log)(...arguments);}catch(_){console.log(...arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn)(...arguments);}catch(_){console.warn(...arguments);} }

  var root=null, tabs=null, open=false;

  // ---------- Core bauen ----------
  function buildCore(){
    if (root) return root;

    root = document.createElement('div');
    root.id = 'inspector';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-label','Inspector');
    root.style.position='fixed';
    root.style.right='12px'; root.style.bottom='80px';
    root.style.width='400px'; root.style.maxWidth='90vw';
    root.style.maxHeight='70vh'; root.style.overflow='auto';
    root.style.background='rgba(20,20,20,.94)';
    root.style.border='1px solid #333'; root.style.borderRadius='8px';
    root.style.boxShadow='0 14px 40px rgba(0,0,0,.45)';
    root.style.backdropFilter='blur(6px)';
    root.style.color='#eaeaea';
    root.style.font='14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    root.style.zIndex='100001';
    root.style.display='none';

    // Kopf
    var head=document.createElement('div');
    head.style.display='flex'; head.style.alignItems='center'; head.style.justifyContent='space-between';
    head.style.padding='10px 12px'; head.style.borderBottom='1px solid #2d2d2d';
    var title=document.createElement('div'); title.textContent='Inspector';
    title.style.fontWeight='700';
    var close=document.createElement('button'); close.textContent='✕';
    close.style.background='transparent'; close.style.border='1px solid #3a3a3a';
    close.style.borderRadius='4px'; close.style.color='#ddd'; close.style.cursor='pointer';
    close.onclick=function(){ toggle(false); };
    head.appendChild(title); head.appendChild(close);
    root.appendChild(head);

    // Tabs
    tabs=document.createElement('div');
    tabs.id='inspector-tabs';
    tabs.style.display='block';
    tabs.style.padding='8px 10px';
    root.appendChild(tabs);

    document.body.appendChild(root);
    ok(MOD+' gebaut (v17.2.0)');
    return root;
  }

  // ---------- Tabs ----------
  function addLogTab(){
    var tab=document.createElement('div');
    tab.id='inspector-logs';
    tab.style.padding='6px';
    tab.style.fontFamily='monospace';
    tab.style.fontSize='12px';
    tab.style.whiteSpace='pre-wrap';
    tab.style.maxHeight='200px';
    tab.style.overflowY='auto';
    tab.textContent='[Inspector Logs]\n';
    tabs.appendChild(tab);

    // CBLog-Hook
    if (window.CBLog){
      var orig=window.CBLog.push;
      window.CBLog.push=function(type,msg){
        try{
          var line='['+type.toUpperCase()+'] '+msg;
          tab.textContent+=line+'\n';
          tab.scrollTop=tab.scrollHeight;
        }catch(_){}
        return orig.call(this,type,msg);
      };
    }
  }

  // ---------- Toggle ----------
  function toggle(show){
    buildCore();
    open=!!show;
    root.style.display=open?'block':'none';
    try {
      window.dispatchEvent(new CustomEvent(open?'cb:inspector-open':'cb:inspector-close'));
    }catch(_){}
    ok(MOD+' '+(open?'geöffnet':'geschlossen')+' (v17.2.0)');
  }

  // ---------- Init ----------
  window.addEventListener('cb:inspector-open', function(){ toggle(true); });
  window.addEventListener('cb:inspector-close', function(){ toggle(false); });

  // Export API
  window.Inspector = { toggle:toggle };

  // Core initial bauen + Tab hinzufügen
  buildCore();
  addLogTab();

})();
