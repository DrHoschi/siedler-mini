// ---------- Core-Bridge (robust gegen API-Varianten) ------------------------
const core = (function(){
  // mögliche Inspector-APIs in deinen Ständen
  const api = window.__INSPECTOR_CORE__?.api
           || window.Inspector
           || window.__INSPECTOR__
           || {};

  // Hole (oder erzeuge) einen generischen Content-Slot
  function getSlot(name='generic-view'){
    // 1) Bevorzugte Selektoren aus deinen Ständen
    return document.querySelector(`#inspector [data-slot="${name}"]`)
        || document.querySelector(`[data-inspector-slot="${name}"]`)
        || document.getElementById(`ins-${name}`)
        || ensureDefaultSlot();
  }

  function ensureDefaultSlot(){
    // Fallback: wir erzeugen eine Section im Inspector-Content
    const content = document.querySelector('#inspector .insp-content')
                 || document.querySelector('#inspector [data-slot="content"]')
                 || document.querySelector('#inspector');
    let sec = document.getElementById('ins-generic-view');
    if (!sec){
      sec = document.createElement('section');
      sec.id = 'ins-generic-view';
      sec.dataset.tab = 'ui';           // Tab-ID, damit deine Tab-Logik sie aktivieren kann
      sec.className = 'active';         // beim ersten Mount sichtbar
      content && content.appendChild(sec);
    }
    return sec;
  }

  // Register-Funktion abstrahieren (verschiedene Cores akzeptieren andere Felder)
  function registerTab(def){
    const fn = api.registerTab || api.addTab || null;
    if (typeof fn === 'function'){
      // Versuche „offizielle“ Registrierung
      return fn(def);
    }
    // Fallback: Wir bauen selbst einen Tab-Button + Klick-Handler
    const tabs = document.querySelector('#inspector .insp-tabs');
    const btn  = document.createElement('button');
    btn.className = 'insp-tab';
    btn.dataset.tab = def.id;
    btn.textContent = def.title || def.id;
    btn.addEventListener('click', ()=>{
      // simple Tab-Schaltung
      document.querySelectorAll('#inspector .insp-content > section').forEach(s=>s.classList.remove('active'));
      const host = getSlot('generic-view');
      host.classList.add('active');
      // onShow immer mit einem Host aufrufen
      try{ def.onShow && def.onShow(host); }catch(e){ console.error('[ui-tab] onShow error', e); }
      // btn-Active
      document.querySelectorAll('#inspector .insp-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      // Event-Kompatibilität
      window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:def.id } }));
    });
    tabs && tabs.appendChild(btn);
    return btn;
  }

  // Öffentliche, einheitliche Mount-API
  function mount(id, onShow){
    const title = id.toUpperCase();
    registerTab({ id, title, onShow });
    // Sofortiger First-Paint (selbst wenn Core onShow keinen Host liefert)
    const host = getSlot('generic-view');
    try{ onShow && onShow(host); }catch(e){ console.error('[ui-tab] initial onShow error', e); }
    return host;
  }

  return { registerTab, getSlot, mount };
})();
