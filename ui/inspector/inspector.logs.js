/* ============================================================================
 * Datei   : ui/inspector/inspector.logs.js
 * Version : v25.10.28-clean
 * Zweck   : Logs-/Events-Tab
 * ========================================================================= */
(function(){
  const TAB_NAME = 'Logs';

  function init(panel, api){
    panel.innerHTML = `
      <h3>Logs & Events</h3>
      <p class="muted">Einträge über <code>UIInspector.log()</code> und Ereignisse
      <code>req:insp|inspector:*</code>, <code>cb:insp|inspector:*</code>.</p>
      <table>
        <thead><tr><th>Zeit</th><th>Typ</th><th>Nachricht</th></tr></thead>
        <tbody></tbody>
      </table>`;
    const tbody = panel.querySelector('tbody');

    const addRow = (t,type,msg)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="muted">${t}</td><td>${type}</td><td>${msg}</td>`;
      tbody.prepend(tr);
    };

    // Vorhandene Logs
    (api._logs||[]).forEach(({time,type='log',message=''})=> addRow(time,type,message));

    // Live-Update
    panel.addEventListener('insp:logs:add', ev=>{
      const {type='log', message=''} = ev.detail||{};
      addRow(new Date().toLocaleTimeString(), type, message);
    });

    // Event-Aliasse mithören
    [
      'req:insp:open','req:insp:close','req:insp:toggle',
      'req:inspector:open','req:inspector:close','req:inspector:toggle',
      'cb:insp:open','cb:insp:close','cb:inspector:open','cb:inspector:close'
    ].forEach(n=> addEventListener(n, ()=> addRow(new Date().toLocaleTimeString(),'event',n)));

    api.log({type:'info', message:'Logs-Tab bereit'});
  }

  window.UIInspector?.registerTab?.(TAB_NAME, init);
})();
