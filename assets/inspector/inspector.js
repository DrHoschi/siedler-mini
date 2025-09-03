/* ============================================================================
 * assets/inspector/inspector.js — v17.4.1
 * Kombi: Core-Fenster + Logs-Tab + Tests-Tab (Pfad/Entity Toggle, Ressourcen)
 * Robuster Auto-Build: reagiert auf cb:inspector-open/ -toggle,
 * baut sich selbst und setzt display:block – auch wenn sehr früh getriggert.
 * ============================================================================ */
(function () {
  'use strict';
  var MOD='[inspector.core]', root=null, tabs=null, built=false, logsTabEl=null, hook=false;

  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }
  function byId(id,host){ return (host||document).getElementById(id); }
  function mk(tag, attrs, css){ var el=document.createElement(tag);
    if(attrs) for(let k in attrs){ if(k==='text') el.textContent=attrs[k]; else el.setAttribute(k, attrs[k]); }
    if(css) for(let c in css){ el.style[c]=css[c]; } return el; }

  function buildCore(){
    if (built && root && tabs) return root;
    root = byId('inspector') || mk('div',{id:'inspector',role:'dialog','aria-label':'Inspector'},{
      position:'fixed',right:'12px',bottom:'80px',width:'400px',maxWidth:'90vw',maxHeight:'70vh',overflow:'auto',
      background:'rgba(20,20,20,.94)',border:'1px solid #333',borderRadius:'8px',boxShadow:'0 14px 40px rgba(0,0,0,.45)',
      backdropFilter:'blur(6px)',color:'#eaeaea',font:'14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      zIndex:100001,display:'none'
    });
    if (!root.parentNode) document.body.appendChild(root);

    var head=mk('div',null,{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #2d2d2d'});
    var title=mk('div'); title.textContent='Inspector'; title.style.fontWeight='700';
    var close=mk('button'); close.textContent='✕'; Object.assign(close.style,{background:'transparent',border:'1px solid #3a3a3a',borderRadius:'4px',color:'#ddd',cursor:'pointer'});
    close.onclick=()=>toggle(false); head.appendChild(title); head.appendChild(close); root.appendChild(head);

    tabs=byId('inspector-tabs',root)||mk('div',{id:'inspector-tabs'},{display:'block',padding:'8px 10px'}); if(!tabs.parentNode) root.appendChild(tabs);

    // Logs
    if (!byId('inspector-logs',tabs)){
      logsTabEl=mk('div',{id:'inspector-logs'},{padding:'6px',fontFamily:'monospace',fontSize:'12px',whiteSpace:'pre-wrap',maxHeight:'200px',overflowY:'auto',background:'rgba(0,0,0,.08)',border:'1px solid #2a2a2a',borderRadius:'4px'});
      logsTabEl.textContent='[Inspector Logs]\n'; tabs.appendChild(logsTabEl);
      try{
        if(!hook && window.CBLog?.push){
          const orig=window.CBLog.push.bind(window.CBLog);
          window.CBLog.push=function(type,msg){ try{
            if(logsTabEl){ logsTabEl.textContent+='['+String(type||'log').toUpperCase()+'] '+String(msg||'')+'\n'; logsTabEl.scrollTop=logsTabEl.scrollHeight; }
          }catch(_){} return orig(type,msg); };
          hook=true;
        }
      }catch(_){}
    }

    // Tests
    if (!byId('inspector-tests',tabs)){
      const panel=mk('div',{id:'inspector-tests','aria-label':'Inspector Tests'},{padding:'10px',borderTop:'1px dashed #3a3a3a',background:'rgba(0,0,0,.12)',marginTop:'8px'});
      const title2=mk('div'); title2.textContent='Tests'; title2.style.fontWeight='700'; title2.style.margin='0 0 8px'; panel.appendChild(title2);
      const row=(id,text,ev)=>{ const r=mk('div',null,{display:'flex',alignItems:'center',gap:'8px',margin:'6px 0 8px'});
        const c=mk('input',{type:'checkbox',id}); c.checked=!!window[id.toUpperCase().replaceAll('-','_')];
        const l=mk('label',{for:id}); l.textContent=text;
        c.addEventListener('change',()=>{ const enabled=!!c.checked; window[id.toUpperCase().replaceAll('-','_')]=enabled;
          try{ window.dispatchEvent(new CustomEvent(ev,{detail:{enabled}})); }catch(_){}
          ok('[inspector] '+id+' '+(enabled?'AN':'AUS')); try{ requestAnimationFrame(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
        }); r.appendChild(c); r.appendChild(l); return r; };
      panel.appendChild(row('dbg-path-overlay',   'Pfad-Overlay anzeigen',   'cb:toggle-path-overlay'));
      panel.appendChild(row('dbg-entity-overlay', 'Entity-Overlay anzeigen', 'cb:toggle-entity-overlay'));

      const grid=mk('div',null,{display:'grid',gridTemplateColumns:'1fr 110px',gap:'6px',margin:'6px 0'});
      const t=mk('input',{type:'text',id:'res-type',placeholder:'Typ (wood, stone, …)',autocomplete:'off'},{padding:'6px 8px',background:'#181818',border:'1px solid #333',color:'#eee'}); t.value='wood';
      const n=mk('input',{type:'number',id:'res-amount',min:'1',step:'1',placeholder:'Menge'},{padding:'6px 8px',background:'#181818',border:'1px solid #333',color:'#eee'}); n.value='10';
      grid.appendChild(t); grid.appendChild(n); panel.appendChild(grid);
      const act=mk('div',null,{display:'flex',alignItems:'center',gap:'8px'});
      const btn=mk('button'); btn.textContent='Ressourcen hinzufügen'; Object.assign(btn.style,{padding:'6px 10px',background:'#2b6cb0',border:'1px solid #2a4365',color:'#fff',borderRadius:'4px',cursor:'pointer'});
      const status=mk('div',{id:'res-status'},{flex:'1',minHeight:'1.2em'});
      btn.addEventListener('click',()=>{ const type=String(t.value||'').trim(); const amount=Math.max(1, parseInt(n.value||'0',10)||0);
        if(!type){ status.textContent='Bitte Ressourcentyp angeben.'; status.style.color='#f6ad55'; warn('[inspector] add-res: fehlender Typ'); return; }
        try{ window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}})); }catch(_){}
        let direct=false; try{ if(window.Game?.addResources){ Game.addResources(type,amount); direct=true; } }catch(_){}
        if(direct){ status.textContent='+'+amount+' '+type; status.style.color='#68d391'; ok('[inspector] add-res OK: +'+amount+' '+type); }
        else { status.textContent='Event gesendet: +'+amount+' '+type+' (Game.addResources nicht gefunden)'; status.style.color='#63b3ed'; warn('[inspector] add-res: Event gesendet, direkte API nicht verfügbar'); }
      });
      act.appendChild(btn); act.appendChild(status); panel.appendChild(act);
      tabs.appendChild(panel);
    }

    built=true; ok(MOD+' gebaut (v17.4.1)');
    return root;
  }

  function toggle(show){ buildCore(); root.style.display = show?'block':'none'; }

  // reagiert auf beide Ereignisse
  window.addEventListener('cb:inspector-open',  ()=>{ buildCore(); toggle(true);  });
  window.addEventListener('cb:inspector-toggle', e=>{ buildCore(); toggle(!!(e&&e.detail&&e.detail.open)); });
  window.addEventListener('cb:inspector-close', ()=>{ buildCore(); toggle(false); });
  window.addEventListener('cb:game-started',    ()=>{ buildCore(); });

  // globale API
  window.Inspector = { toggle: toggle };

  // vorbereitet, aber geschlossen
  buildCore(); toggle(false);
})();
