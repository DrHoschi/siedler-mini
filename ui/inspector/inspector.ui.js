/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Version : v25.10.28-clean
 * Zweck   : UI/Layers-Tab (kleine Demo-Tools fürs Overlay/DOM)
 * ========================================================================= */
(function(){
  const TAB_NAME = 'UI / Layers';

  function domList(){
    // sehr einfache Demo-Liste der Top-Level-UI-Blöcke
    return [
      {sel:'#start',       label:'Startpanel'},
      {sel:'#game-root',   label:'Game Root'},
      {sel:'#hud-top',     label:'HUD Top'},
      {sel:'#inspector',   label:'Inspector Host'}
    ];
  }

  function init(panel, api){
    panel.innerHTML = `
      <h3>UI / Layers</h3>
      <p class="muted">Ein-/Ausblenden einiger UI-Blöcke (Demo).</p>
      <div class="ui-list"></div>
    `;
    const wrap = panel.querySelector('.ui-list');

    const entries = domList();
    entries.forEach(row=>{
      const el = document.createElement('div');
      el.style.display = 'flex'; el.style.alignItems='center'; el.style.gap='8px'; el.style.margin='6px 0';
      el.innerHTML = `
        <code>${row.sel}</code>
        <span style="flex:1">${row.label}</span>
        <button type="button" data-act="show">zeigen</button>
        <button type="button" data-act="hide">verbergen</button>
        <button type="button" data-act="toggle">toggle</button>
      `;
      el.addEventListener('click', (ev)=>{
        const act = ev.target?.dataset?.act; if (!act) return;
        const node = document.querySelector(row.sel); if (!node) return;
        if (act==='show')    node.removeAttribute('hidden');
        if (act==='hide')    node.setAttribute('hidden','');
        if (act==='toggle')  node.hasAttribute('hidden') ? node.removeAttribute('hidden') : node.setAttribute('hidden','');
        api.log({type:'ui', message:`${row.label}: ${act}`});
      });
      wrap.appendChild(el);
    });

    api.log({type:'info', message:'UI/Layers-Tab bereit'});
  }

  window.UIInspector?.registerTab?.(TAB_NAME, init);
})();
