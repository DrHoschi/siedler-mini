/* =============================================================================
Datei: assets/inspector/inspector.api-compat.js
Version: v1.3.1
Ziel: Ergänzt NUR, falls Module keine globale API setzen.
      - Stellt Inspector.open/close/toggle/setTab bereit.
      - Spiegelt Events neu/legacy (cb:inspector:* ↔ cb:inspector-* / inspector:*)
============================================================================= */
(function(){
  const logI = (m)=> (window.CBLog?.info||console.log)(`[inspector.compat] ${m}`);
  function emit(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d||{}})); }catch(_){} }

  const CANON = { open:"cb:inspector:open", close:"cb:inspector:close", tab:"cb:inspector:tab:change" };
  const MIRROR_OUT = {
    [CANON.open]:  ["cb:inspector-open","inspector:open","inspector-open"],
    [CANON.close]: ["cb:inspector-close","inspector:close","inspector-close"],
    [CANON.tab]:   ["cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"]
  };
  [CANON.open, CANON.close, CANON.tab].forEach(src=>{
    window.addEventListener(src, ev=> (MIRROR_OUT[src]||[]).forEach(m=> emit(m, ev.detail)));
  });

  const I = (window.Inspector = window.Inspector || {});
  if (typeof I.open   !== "function") I.open   = (from)=> emit(CANON.open,  {from:from||"api"});
  if (typeof I.close  !== "function") I.close  = (why)=>  emit(CANON.close, {reason:why||"api"});
  if (typeof I.toggle !== "function") I.toggle = (o)=>    emit("cb:inspector:toggle",{from:o||"api"});
  if (typeof I.setTab !== "function") I.setTab = (t)=>    emit(CANON.tab,   {tab:String(t||"logs")});

  logI("aktiv (v1.3.1)");
})();
