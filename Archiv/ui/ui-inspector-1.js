/* ============================================================================
 * Datei: ui/ui-inspector.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Inspector – Tabs: Logs, Tests, Ressourcen, Pfade, Editor.
 * Datum: 2025-09-21
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 * ============================================================================ */

// --- CBLog (Fallback) --------------------------------------------------------
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

const UIINSP_VERSION="v1.0.0";
function setTabActive(name){
  document.querySelectorAll('#insp-tabs button[data-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===name));
  const cont=document.getElementById('insp-content');
  if(name==='Logs') cont.innerHTML = "<pre>[Logs] – CBLog in Console</pre>";
  if(name==='Tests') cont.innerHTML = '<button id="btn-run-tests">Alle Tests starten</button>';
  if(name==='Ressourcen') cont.innerHTML = '<button id="btn-refill">Alle auffüllen</button> <button id="btn-reset-res">Alle auf 0</button>';
  if(name==='Pfade') cont.innerHTML = '<label><input id="chk-overlay" type="checkbox"> Overlay</label> <label><input id="chk-heatmap" type="checkbox"> Heatmap</label>';
  if(name==='Editor') cont.innerHTML = '<em>Editor-Stub</em>';
  window.dispatchEvent(new CustomEvent('cb:insp:tab:change',{ detail:{ tab:name } }));
}
(function initInspector(){
  CBLog.ok("[ui-inspector] Modul geladen ("+UIINSP_VERSION+")");
  const insp=document.getElementById('inspector');
  const inspClose=document.getElementById('insp-close');
  const btn=document.getElementById('btn-inspector');
  const tabs=document.querySelectorAll('#insp-tabs button[data-tab]');
  function open(tab='Logs'){ insp.style.display="block"; setTabActive(tab); window.dispatchEvent(new CustomEvent('cb:insp:open',{ detail:{ tab } })); }
  function close(){ insp.style.display="none"; window.dispatchEvent(new CustomEvent('cb:insp:close',{ detail:{} })); }
  btn?.addEventListener('click',()=>open('Logs'));
  inspClose?.addEventListener('click',close);
  tabs.forEach(b=>b.addEventListener('click',()=>setTabActive(b.dataset.tab)));
  document.addEventListener('change',(ev)=>{
    if(ev.target?.id==='chk-overlay') window.dispatchEvent(new CustomEvent(ev.target.checked?'cb:path:overlay:on':'cb:path:overlay:off',{ detail:{ active: ev.target.checked } }));
    if(ev.target?.id==='chk-heatmap') window.dispatchEvent(new CustomEvent(ev.target.checked?'cb:path:heatmap:on':'cb:path:heatmap:off',{ detail:{ active: ev.target.checked } }));
  });
  document.addEventListener('click',(ev)=>{
    if(ev.target?.id==='btn-run-tests') window.dispatchEvent(new CustomEvent('cb:path:test:start',{ detail:{ cases:1 } }));
    if(ev.target?.id==='btn-refill'){ ['wood','stone','fish'].forEach(r=>window.dispatchEvent(new CustomEvent('cb:res:change',{ detail:{ res:r, delta:10, source:'insp' } }))); }
    if(ev.target?.id==='btn-reset-res'){ ['wood','stone','fish'].forEach(r=>window.dispatchEvent(new CustomEvent('cb:res:change',{ detail:{ res:r, delta:-(window.STATE_RES?.[r]||0), source:'insp' } }))); }
  });
  window.UIInspector = { open, close, setTabActive };
})();
