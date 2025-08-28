/* ==============================================================
   Inspector – Fullscreen Test-Cockpit
   Version: v16.1.4
   Ziele:
    - Per Button (unten rechts) ein/ausblendbar
    - Enthält integrierte Log-Anzeige (liest UI.getLog())
    - Cache-Booster & Log kopieren
    - Ressourcen-Testknöpfe (optional Hook)
   KEINE Karten-Startbuttons mehr! (Start ist im Start-Screen)
   ============================================================== */
(function(global){
  const Inspector = {};
  const s = {
    open: false,
    version: "v?.?.?",
    getLogText: () => "",
    onCopyLog: null,
    onClearCache: null,
    onAddResources: null
  };

  function $id(id){ return document.getElementById(id); }

  function refreshLog(){
    const box = $id('log-box');
    if (box) box.textContent = s.getLogText?.() || "";
  }

  Inspector.open = function(){
    const ov = $id('inspector');
    if (!ov) return;
    ov.style.display = 'block';
    ov.setAttribute('aria-hidden','false');
    s.open = true;
    refreshLog();
  };
  Inspector.close = function(){
    const ov = $id('inspector');
    if (!ov) return;
    ov.style.display = 'none';
    ov.setAttribute('aria-hidden','true');
    s.open = false;
  };
  Inspector.toggle = function(){
    return s.open ? Inspector.close() : Inspector.open();
  };

  Inspector.copyLog = function(){
    s.onCopyLog?.();
  };
  Inspector.clearCache = function(){
    s.onClearCache?.();
  };

  Inspector.init = function(opts){
    s.version = opts?.version || s.version;
    s.getLogText   = opts?.getLogText || s.getLogText;
    s.onCopyLog    = opts?.onCopyLog;
    s.onClearCache = opts?.onClearCache;
    s.onAddResources = opts?.onAddResources;

    const iv = $id('inspector-version'); if (iv) iv.textContent = s.version;

    // Buttons im Overlay
    $id('ins-close')?.addEventListener('click', Inspector.close);
    $id('ins-close-2')?.addEventListener('click', Inspector.close);
    $id('ins-copylog')?.addEventListener('click', Inspector.copyLog);
    $id('ins-clear')?.addEventListener('click', Inspector.clearCache);

    document.querySelectorAll('[data-add-res]').forEach(btn=>{
      btn.addEventListener('click', () => {
        const v = Number(btn.getAttribute('data-add-res')||0);
        s.onAddResources?.(v);
      });
    });

    // Live-Refresh, falls sich Logs ändern, wenn Inspector offen ist
    setInterval(()=>{ if (s.open) refreshLog(); }, 800);
  };

  global.Inspector = Inspector;
})(window);
