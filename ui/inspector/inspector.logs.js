<script>
/* ============================================================================
 * Datei   : ui/inspector/inspector.logs.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.28-final
 * Zweck   : Logs-/Events-Tab: zeigt UIInspector.log() und sammelt Event-Aliasse.
 * ============================================================================
 */

(function(){
  const TAB_NAME = 'Logs';

  function init(panel, api){
    panel.innerHTML = `
      <h3>Logs & Events</h3>
      <p class="muted">Hier erscheinen Einträge über <code class="k">UIInspector.log()</code> 
      und empfangene Ereignisse <span class="k">req:insp|inspector:* / cb:insp|inspector:*</span>.</p>
      <table>
        <thead><tr><th>Zeit</th><th>Typ</th><th>Nachricht</th></tr></thead>
        <tbody></tbody>
      </table>
    `;
    const tbody = panel.querySelector('tbody');

    function addRow(t, type, msg){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="muted">${t}</td><td>${type}</td><td>${msg}</td>`;
      tbody.prepend(tr);
    }

    // Vorhandene Logs rendern
    (api._logs||[]).forEach(({time, type='log', message=''})=>{
      addRow(time, type, message);
    });

    // Live-Updates bei api.log()
    panel.addEventListener('insp:logs:add', ev=>{
      const {type='log', message=''} = ev.detail||{};
      addRow(new Date().toLocaleTimeString(), type, message);
    });

    // Events mitschneiden (nur alias-relevant)
    const allEvt = ['req:insp:open','req:insp:close','req:insp:toggle',
                    'req:inspector:open','req:inspector:close','req:inspector:toggle',
                    'cb:insp:open','cb:insp:close','cb:inspector:open','cb:inspector:close'];
    allEvt.forEach(n=>{
      addEventListener(n, ()=> addRow(new Date().toLocaleTimeString
