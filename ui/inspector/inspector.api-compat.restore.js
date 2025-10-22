/* ============================================================================
 * Datei   : ui/inspector/inspector.api-compat.restore.js
 * Zweck   : Stellt die alte Inspector-API wieder her (open/close/toggle/registerTab)
 * Hinweis : Minimal-invasiv. Greift nur, wenn die API fehlt.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[insp-compat-restore]';
  const log=(m)=> (window.CBLog?.info||console.info)(MOD, m);

  // 1) Host ermitteln
  function host(){
    return document.getElementById('inspector')
        || document.getElementById('inspector-overlay')
        || document.querySelector('[data-role="inspector"],#ui-inspector,#inspector-root');
  }

  // 2) Sichtbarkeit setzen (hard fallback, falls Core es nicht tut)
  function setOpen(on){
  const el = document.getElementById('inspector');
  if(!el) return false;

  // Elternkette hoch: alles sichtbar schalten (falls ein Parent display:none war)
  let p = el.parentElement;
  while(p){
    if(getComputedStyle(p).display === 'none'){ p.style.display = 'block'; }
    if(getComputedStyle(p).visibility === 'hidden'){ p.style.visibility = 'visible'; }
    p = p.parentElement;
  }

  // eigene Sichtbarkeit erzwingen
  el.removeAttribute('hidden');
  el.classList.toggle('open', !!on);
  el.style.display       = on ? 'block'  : 'none';
  el.style.visibility    = on ? 'visible': 'hidden';
  el.style.opacity       = on ? '1'      : '0';
  el.style.pointerEvents = on ? 'auto'   : 'none';
  document.body.classList.toggle('inspector-open', !!on);

  // Debug-Kennzeichen (gelber Outline-Rahmen)
  el.setAttribute('data-insp-debug', on ? 'on' : 'off');

  return true;
}

  // 3) API nur ergänzen, wenn sie fehlt
  const insp = (window.Inspector ||= {});
  if (typeof insp.open !== 'function'){
    insp.open = function(tab){
      setOpen(true);
      if (tab) window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab } }));
      window.dispatchEvent(new Event('cb:insp:open'));
      log('open()');
    };
  }
  if (typeof insp.close !== 'function'){
    insp.close = function(){
      setOpen(false);
      window.dispatchEvent(new Event('cb:insp:close'));
      log('close()');
    };
  }
  if (typeof insp.toggle !== 'function'){
    insp.toggle = function(tab){
      const el = host(); const vis = !!el && (el.classList.contains('open') || getComputedStyle(el).display!=='none');
      vis ? insp.close() : insp.open(tab);
    };
  }

  // 4) registerTab vorhanden machen (alter Split erwartet das oft)
  if (typeof insp.registerTab !== 'function'){
    insp.registerTab = function(def){
      // Dein Core hat id/title/onShow-Semantik → sofort in Slot rendern, wenn vorhanden:
      const slot = document.querySelector(`[data-slot="${def.id}-view"]`)
                || document.getElementById(`${def.id}-view`)
                || document.querySelector('[data-slot="tests-view"]') // meist für Tests
                || host();
      if (slot && typeof def.onShow === 'function') def.onShow(slot);
    };
  }

  // 5) Ready-Event feuern (daran hingen früher oft Erweiterungen)
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')), 0);

  log('API hergestellt (open/close/toggle/registerTab)');
})();
