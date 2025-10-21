/* =============================================================================
   Datei: ui/inspector/inspector.compat.js
   Zweck: Falls Inspector keine API global anbietet, ergänze sie
============================================================================= */

(function(){
  if(window.Inspector && typeof window.Inspector.toggle==="function"){
    return; // existiert schon
  }

  let _open = false;
  function emit(evt){ window.dispatchEvent(new CustomEvent("inspector:"+evt)); }

  window.Inspector = {
    open(){ emit("open"); _open=true; },
    close(){ emit("close"); _open=false; },
    toggle(){ _open ? this.close() : this.open(); },
    isOpen(){ return _open; }
  };

  console.log("[inspector.compat] Fallback-API aktiv");
})();
