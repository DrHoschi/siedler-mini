/* ============================================================================
 * Datei   : tools/inspector.force-toggle.js
 * Version : v25.10.28-clean
 * Zweck   : Robustes Toggle – funktioniert auch, wenn nur Aliasse feuern.
 *           Reihenfolge: UIInspector.toggle() → Events → Root-Fallback
 * ========================================================================= */
(function(){
  function rootFallbackToggle(){
    // Minimaler Fallback direkt auf dem Host + Body-Flags
    const host = document.querySelector('#inspector') || (()=>{
      const h=document.createElement('div'); h.id='inspector'; h.hidden=true; document.body.appendChild(h); return h;
    })();
    const open = !(document.body.classList.contains('is-inspector') || document.body.classList.contains('inspector-open'));
    if (open){ document.body.classList.add('is-inspector','inspector-open'); }
    else     { document.body.classList.remove('is-inspector','inspector-open'); }
    return open;
  }

  function toggle(){
    if (window.UIInspector?.toggle){ window.UIInspector.toggle(); return; }
    // Wenn der Core noch nicht da ist, versuche Events (werden vom Core gehört)
    dispatchEvent(new CustomEvent('req:insp:toggle'));
    dispatchEvent(new CustomEvent('req:inspector:toggle'));
    // und als allerletztes: Root-Fallback
    rootFallbackToggle();
  }

  // Aliasse als Eingänge akzeptieren (falls Buttons nur Events schicken)
  ['req:insp:toggle','req:inspector:toggle'].forEach(n=>{
    addEventListener(n, ()=> {
      if (!window.UIInspector?.toggle) rootFallbackToggle();
    });
  });

  // Diagnose-Hilfe (Konsole)
  window.__forceInspectorDiag = function(){
    return {
      has_UIInspector: !!window.UIInspector,
      has_Inspector:   !!window.Inspector,
      root_found:      !!document.querySelector('#inspector'),
      body_flags:      [...document.body.classList].filter(c=>/insp/.test(c))
    };
  };
})();
