/*
  Datei: ui-build.js
  Version: v16.1.0
  Zweck:
    - Füllt das Bau-Bottom-Sheet mit Tools
    - Kümmert sich nur um UI-Auswahl; tatsächliches Platzieren macht game.js
  Erwartete Hooks in game.js:
    window.Game?.setTool(toolName)         → string | {ok:boolean, msg?:string}
*/

(function(){
  const BUILD_VERSION = '16.1.0';

  const tools = [
    { id:'road',    label:'Straße',  emoji:'🛣️' },
    { id:'path',    label:'Weg',     emoji:'🚶'  },
    { id:'bulldoze',label:'Abreißen',emoji:'🧹'  },
    { id:'house',   label:'Haus',    emoji:'🏠'  },
    { id:'factory', label:'Fabrik',  emoji:'🏭'  },
    { id:'cancel',  label:'Abbrechen', emoji:'⛔' },
  ];

  function $(s){ return document.querySelector(s); }

  function addToolButtons(){
    const wrap = $('#tools');
    wrap.innerHTML = '';
    for (const t of tools){
      const btn = document.createElement('button');
      btn.className = 'tool';
      btn.innerHTML = `<div style="font-size:24px">${t.emoji}</div><div>${t.label}</div>`;
      btn.addEventListener('click', ()=> selectTool(t.id));
      wrap.appendChild(btn);
    }
    if (window.UILog) window.UILog.ok(`Bau-Menü bereit (ui-build.js v${BUILD_VERSION})`);
  }

  function selectTool(id){
    let msg = `Tool gesetzt: ${id}`;
    if (window.Game?.setTool){
      const r = window.Game.setTool(id);
      if (typeof r === 'string') msg = r;
      else if (r && r.ok === false && r.msg){ msg = r.msg; }
    }
    window.UILog?.ok(msg);
  }

  window.addEventListener('load', addToolButtons);
})();
