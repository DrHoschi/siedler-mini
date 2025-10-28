/* ============================================================================
 * Datei   : ui/inspector/inspector.api-compat.restore.js
 * Version : v25.10.28-restore
 * Zweck   : Alte Inspector-API herstellen (open/close/toggle) + body.inspector-open
 * Quelle  : Dein Monolith-Stand (setOpen + API-Restore), 1:1 kompatibel.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[insp-compat-restore]';
  const log=(m)=> (window.CBLog?.info||console.info)(MOD, m);

  // Host ermitteln (deine gängigen IDs/Selektoren)
  function host(){
    return document.getElementById('inspector')
        || document.getElementById('inspector-overlay')
        || document.querySelector('[data-role="inspector"],#ui-inspector,#inspector-root');
  }

  // Sichtbarkeit exakt wie in deinem Stand erzwingen
  function setOpen(on){
    const el = host();
    if(!el) return false;

    // Eltern sichtbar machen, falls jemand display:none/visibility:hidden gesetzt hat
    let p = el.parentElement;
    while(p){
      const cs = getComputedStyle(p);
      if (cs.display==='none')      p.style.display    = 'block';
      if (cs.visibility==='hidden') p.style.visibility = 'visible';
      p = p.parentElement;
    }

    el.removeAttribute('hidden');
    el.classList.toggle('open', !!on);
    el.style.display       = on ? 'block'  : 'none';
    el.style.visibility    = on ? 'visible': 'hidden';
    el.style.opacity       = on ? '1'      : '0';
    el.style.pointerEvents = on ? 'auto'   : 'none';

    // wichtig: dein Body-Flag
    document.body.classList.toggle('inspector-open', !!on);

    // wie im guten Stand: Logs-Tab signalisieren
    if (on) {
      window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:'logs' } }));
    }
    return true;
  }

  function open(){  if (setOpen(true))  window.dispatchEvent(new CustomEvent('cb:insp:open')); }
  function close(){ if (setOpen(false)) window.dispatchEvent(new CustomEvent('cb:insp:close')); }
  function toggle(){
    const isOpen = document.body.classList.contains('inspector-open');
    isOpen ? close() : open();
  }

  // API sanft wiederherstellen/ergänzen
  const API = { open, close, toggle, registerTab:function(){} };
  if (!window.UIInspector){
    window.UIInspector = API;
    log('UIInspector-API wiederhergestellt.');
  } else {
    window.UIInspector.open   = window.UIInspector.open   || open;
    window.UIInspector.close  = window.UIInspector.close  || close;
    window.UIInspector.toggle = window.UIInspector.toggle || toggle;
    window.UIInspector.registerTab = window.UIInspector.registerTab || function(){};
    log('UIInspector-API ergänzt (Kompat).');
  }

  // moderner Alias (stört nicht, hilft wenn Split-API aktiv war)
  window.Inspector = window.Inspector || { open, close, toggle };
})();
