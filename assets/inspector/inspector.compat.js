// === assets/inspector/inspector.compat.js ===
// Ziel: Den bestehenden (gesplitteten) Inspector NICHT ändern, aber
//       eine stabile API unter window.Inspector anbieten, falls sie fehlt.

(function(){
  const LOG = (window.CBLog?.info) ? (...a)=>window.CBLog.info('[inspector.compat]', ...a)
                                   : (...a)=>console.log('[inspector.compat]', ...a);

  if (window.Inspector && ['open','close','toggle'].every(k => typeof window.Inspector[k] === 'function')) {
    LOG('vorhanden – keine Kompat-Schicht nötig');
    return;
  }

  let _open = false;
  function emit(evt){ window.dispatchEvent(new CustomEvent(`inspector:${evt}`)); window.dispatchEvent(new CustomEvent(`cb:inspector-${evt}`)); }

  // Brücke ruft diese API; darunter reagieren die echten Inspector-Module über Events
  window.Inspector = {
    open(){ emit('open');  _open = true; },
    close(){ emit('close'); _open = false; },
    toggle(){ emit('toggle'); _open = !_open; },
    isOpen(){ return _open; }
  };

  // Falls der echte Inspector eigene Events zurücksendet:
  window.addEventListener('inspector:opened', ()=>{ _open = true;  });
  window.addEventListener('inspector:closed', ()=>{ _open = false; });

  LOG('Kompat-Schicht aktiv (API bereitgestellt)');
})();
