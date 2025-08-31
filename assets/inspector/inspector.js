/* inspector.js — v16.2.9  |  Siedler-Mini
 * - Live/Logs Tabs
 * - Logs-Tab liest CBLog.buffer + Echtzeit-Append
 * - ES5, keine Module
 */
(function(){
  'use strict';

  var VER = 'v16.2.9';
  var d = document, w = window;

  function $(s, c){ return (c||d).querySelector(s); }
  function el(t, c, txt){ var e=d.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; return e; }
  function timeStr(){ var n=new Date(); return '['+n.toTimeString().slice(0,8)+']'; }

  // CBLog Fallback
  var CB = w.CBLog = w.CBLog || (function(){
    var buf = [];
    function push(tag, args){
      try { buf.push(timeStr() + ' ' + tag + ' ' + Array.prototype.slice.call(args).join(' ')); }
      catch(_){ buf.push(timeStr() + ' ' + tag); }
      if (buf.length > 2000) buf.shift();
      if (typeof CB._onappend === 'function') CB._onappend();
    }
    var CB = {
      buffer: buf,
      ok:   function(){ push('LOG', arguments);  console.log.apply(console, arguments); },
      warn: function(){ push('WARN', arguments); console.warn.apply(console, arguments); },
      err:  function(){ push('ERR', arguments);  console.error.apply(console, arguments); },
      clear: function(){ buf.length=0; if (typeof CB._onchange==='function') CB._onchange(); },
      _onappend: null,
      _onchange: null
    };
    return CB;
  })();

  // Button (unten rechts existiert bei dir schon – falls nicht, erstellen wir einen)
  function ensureFloatingButton(){
    var btn = $('#inspector-fab');
    if (btn) return btn;
    btn = el('button','inspector-fab');
    btn.id='inspector-fab';
    btn.textContent='🔧';
    btn.style.position='fixed';
    btn.style.right='16px';
    btn.style.bottom='16px';
    btn.style.zIndex='50';
    btn.style.width='56px';
    btn.style.height='56px';
    btn.style.border='0';
    btn.style.borderRadius='28px';
    btn.style.background='rgba(30,40,35,.8)';
    btn.style.color='#fff';
    btn.style.fontSize='24px';
    btn.style.boxShadow='0 6px 28px rgba(0,0,0,.35)';
    btn.onclick = togglePanel;
    d.body.appendChild(btn);
    return btn;
  }

  // Panel
  var panel=null, tabLiveBtn=null, tabLogsBtn=null, liveBox=null, logsBox=null, copyBtn, exportBtn, clearBtn;

  function buildPanel(){
    if (panel) return panel;

    panel = el('div','insp-panel');
    panel.style.position='fixed';
    panel.style.left='6%';
    panel.style.right='6%';
    panel.style.bottom='100px';
    panel.style.minHeight='180px';
    panel.style.maxHeight='60vh';
    panel.style.padding='14px';
    panel.style.borderRadius='18px';
    panel.style.background='rgba(15,25,20,.90)';
    panel.style.backdropFilter='blur(8px)';
    panel.style.webkitBackdropFilter='blur(8px)';
    panel.style.color='#e9f7e7';
    panel.style.zIndex='40';
    panel.style.display='none';

    // Header
    var hdr = el('div', 'insp-hdr');
    hdr.style.display='flex';
    hdr.style.alignItems='center';
    hdr.style.gap='10px';
    hdr.style.marginBottom='10px';
    var title = el('div', '', 'Inspector ('+VER+')');
    title.style.fontSize='18px';
    title.style.fontWeight='700';
    hdr.appendChild(title);

    var tabs = el('div','insp-tabs');
    tabs.style.marginLeft='auto';
    tabLiveBtn = el('button','insp-tab','Live');
    tabLogsBtn = el('button','insp-tab','Logs');
    [tabLiveBtn,tabLogsBtn].forEach(function(b){
      b.type='button';
      b.style.marginLeft='6px';
      b.style.border='0';
      b.style.borderRadius='14px';
      b.style.padding='6px 12px';
      b.style.background='rgba(26,36,32,.9)';
      b.style.color='#d9ead7';
    });
    tabs.appendChild(tabLiveBtn); tabs.appendChild(tabLogsBtn);
    hdr.appendChild(tabs);
    panel.appendChild(hdr);

    // Bodies
    liveBox = el('pre','insp-live');
    logsBox = el('pre','insp-logs');
    [liveBox, logsBox].forEach(function(p){
      p.style.margin='0';
      p.style.padding='10px';
      p.style.background='rgba(0,0,0,.15)';
      p.style.borderRadius='12px';
      p.style.maxHeight='38vh';
      p.style.overflow='auto';
      p.style.font='13px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    });
    panel.appendChild(liveBox);
    panel.appendChild(logsBox);

    // Footer buttons
    var foot = el('div','insp-foot');
    foot.style.display='flex';
    foot.style.gap='10px';
    foot.style.marginTop='10px';
    copyBtn   = el('button','insp-btn','Kopieren');
    exportBtn = el('button','insp-btn','Export (.txt)');
    clearBtn  = el('button','insp-btn','Leeren');
    [copyBtn,exportBtn,clearBtn].forEach(function(b){
      b.type='button';
      b.style.border='0';
      b.style.borderRadius='12px';
      b.style.padding='8px 12px';
      b.style.background='rgba(26,36,32,.9)';
      b.style.color='#d9ead7';
    });
    foot.appendChild(copyBtn); foot.appendChild(exportBtn); foot.appendChild(clearBtn);
    panel.appendChild(foot);

    d.body.appendChild(panel);

    // Tab-Logik
    tabLiveBtn.onclick = function(){ setTab('live'); };
    tabLogsBtn.onclick = function(){ setTab('logs'); };

    // Footer Aktionen
    copyBtn.onclick = function(){
      try{ navigator.clipboard.writeText(CB.buffer.join('\n')); }catch(_){}
    };
    exportBtn.onclick = function(){
      try{
        var blob = new Blob([CB.buffer.join('\n')], {type:'text/plain;charset=utf-8'});
        var a = el('a'); a.href = URL.createObjectURL(blob); a.download='siedler-logs.txt'; a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
      }catch(_){}
    };
    clearBtn.onclick = function(){ CB.clear(); renderLogs(); };

    // Erstanzeige
    setTab('logs');
    renderLogs();
    renderLive();

    // CBLog Echtzeit
    CB._onappend = function(){ if (panel && panel.style.display!=='none') appendLastLog(); };
    return panel;
  }

  function setTab(which){
    if (!panel) buildPanel();
    var live = which==='live';
    liveBox.style.display = live ? 'block' : 'none';
    logsBox.style.display = live ? 'none'  : 'block';
    tabLiveBtn.style.opacity = live ? '1' : '.8';
    tabLogsBtn.style.opacity = live ? '.8' : '1';
  }

  function renderLive(){
    var info = [
      'index ' + (w.VERSION_INDEX || '-'),
      'game  ' + (w.GameLoader && w.GameLoader.version ? w.GameLoader.version : '-'),
      'dpr   ' + (window.devicePixelRatio||1)
    ].join(' · ');
    liveBox.textContent = info;
  }

  function renderLogs(){
    logsBox.textContent = CB.buffer.join('\n') || '(noch keine Logs)';
    logsBox.scrollTop = logsBox.scrollHeight;
  }
  function appendLastLog(){
    if (!CB.buffer.length) return;
    var last = CB.buffer[CB.buffer.length-1];
    logsBox.textContent += (logsBox.textContent ? '\n' : '') + last;
    logsBox.scrollTop = logsBox.scrollHeight;
  }

  function togglePanel(){
    if (!panel) buildPanel();
    var show = panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show){ renderLive(); renderLogs(); }
  }

  // Bootstrap
  ensureFloatingButton();

  // Expose optional API
  w.InspectorUI = w.InspectorUI || {};
  w.InspectorUI.toggle = togglePanel;

  // init-log
  if (w.CBLog && CBLog.ok) CBLog.ok('[inspector] Modul geladen ('+VER+')');

})();
