// ui/inspector/inspector.button-bind.js – v18.9.1
(function(){
  'use strict';
  const LOG=(window.CBLog?.info||console.info).bind(console,'[insp-bind]');

  function bind(){
    let btn = document.getElementById('btn-inspector');
    if(!btn){
      btn = document.createElement('button'); btn.id='btn-inspector'; btn.title='Inspector (I)'; btn.textContent='⚙️';
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', ()=> window.Inspector?.toggle());
    window.addEventListener('keydown', e=>{
      if(e.key?.toLowerCase()==='i' && !e.altKey && !e.ctrlKey && !e.metaKey) window.Inspector?.toggle();
    });
    LOG('Button-Handler gebunden (v18.9.1)');
  }

  (document.readyState==='loading')?document.addEventListener('DOMContentLoaded',bind):bind();
})();
