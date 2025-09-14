/* optionaler Shim: ergänzt Inspector.toggle(), falls nicht vorhanden */
(function(){
  if(!window.Inspector) return;
  if(typeof window.Inspector.toggle === "function") return;
  window.Inspector.toggle = function(){
    try{
      const root = document.getElementById("inspector-root") || document.querySelector(".inspector-root");
      const shown = !!root && root.classList.contains("is-open");
      if(shown && typeof window.Inspector.close==="function") return window.Inspector.close("toggle");
      if(!shown && typeof window.Inspector.open==="function")  return window.Inspector.open("toggle");
    }catch(e){ (window.CBLog?.error||console.error)("[inspector.compat] "+(e?.message||e)); }
  };
  (window.CBLog?.info||console.log)("[inspector.compat] toggle() ergänzt.");
})();
