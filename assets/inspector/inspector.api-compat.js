/* =============================================================================
Datei: assets/inspector/inspector.api-compat.js
Projekt: Neue Siedler
Version: v1.0.0
Zweck:
  API-Kompatibilität für den bestehenden Inspector:
   - vereinheitlichte Methoden: toggle(), open(), close(), setTab(tab), isOpen()
   - Event-Spiegelung: cb:inspector:open|close|tab:change  <→>  alte Varianten
Hinweis:
  - Diese Datei ersetzt NICHT euren Inspector – sie ergänzt nur fehlende Methoden/Events.
  - Einbinden NACH euren inspector.*.js, ABER VOR der ui-bridge.js.
============================================================================= */

(function(){
  const VER = "v1.0.0";
  const logI = (m)=> (window.CBLog?.info || console.log)(`[inspector.compat] ${m}`);
  const logE = (m)=> (window.CBLog?.error|| console.error)(`[inspector.compat] ${m}`);

  function emit(n, d){ try{ window.dispatchEvent(new CustomEvent(n, { detail: d||{} })); }catch(_){ } }

  // Kanonische Events
  const EVT = {
    OPEN:  "cb:inspector:open",
    CLOSE: "cb:inspector:close",
    TAB:   "cb:inspector:tab:change"
  };
  // Legacy-Spiegel
  const MIRROR_IN  = [
    "cb:inspector-open","inspector:open","inspector-open",
    "cb:inspector-close","inspector:close","inspector-close",
    "cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"
  ];
  const MIRROR_OUT = {
    [EVT.OPEN]:  ["cb:inspector-open","inspector:open","inspector-open"],
    [EVT.CLOSE]: ["cb:inspector-close","inspector:close","inspector-close"],
    [EVT.TAB]:   ["cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"]
  };

  // Root-Heuristik (nur abfragen, nicht verändern)
  function root(){
    return document.getElementById("inspector-root")
        || document.querySelector(".inspector-root")
        || document.getElementById("inspector")
        || document.querySelector("[data-inspector-root]")
        || null;
  }
  function isShown(r){
    if(!r) return false;
    if (r.classList?.contains("is-open")) return true;
    const d = r.style?.display || getComputedStyle(r).display;
    return d && d !== "none";
  }

  // Altes Inspector-Objekt erweitern (nicht ersetzen)
  const I = (window.Inspector = window.Inspector || {});
  I.__compat = I.__compat || { version: VER };

  // Legacy → Canonical
  if(!I.__compat._reemitter){
    I.__compat._reemitter = true;
    MIRROR_IN.forEach(src=>{
      window.addEventListener(src, ev=>{
        const map = {
          "cb:inspector-open":       EVT.OPEN,
          "inspector:open":          EVT.OPEN,
          "inspector-open":          EVT.OPEN,
          "cb:inspector-close":      EVT.CLOSE,
          "inspector:close":         EVT.CLOSE,
          "inspector-close":         EVT.CLOSE,
          "cb:inspector-tab-change": EVT.TAB,
          "inspector:tab:change":    EVT.TAB,
          "inspector-tab-change":    EVT.TAB
        };
        const trg = map[src];
        if (trg) emit(trg, ev.detail);
      });
    });

    // Canonical → Legacy
    [EVT.OPEN, EVT.CLOSE, EVT.TAB].forEach(src=>{
      window.addEventListener(src, ev=>{
        (MIRROR_OUT[src]||[]).forEach(m=> emit(m, ev.detail));
      });
    });
  }

  // API ergänzen (falls in Alt bereits vorhanden, NICHT überschreiben)
  if (typeof I.toggle !== "function"){
    I.toggle = function(origin){
      try{
        const r = root();
        const shown = isShown(r);
        if (shown && typeof I.close === "function") return I.close(origin||"toggle");
        if (!shown && typeof I.open === "function")  return I.open(origin||"toggle");
        emit(EVT.OPEN, { from: origin||"toggle" });
      }catch(e){ logE(e?.message||e); }
    };
  }
  if (typeof I.open !== "function"){
    I.open = function(origin){ emit(EVT.OPEN, { from: origin||"api" }); };
  }
  if (typeof I.close !== "function"){
    I.close = function(reason){ emit(EVT.CLOSE, { reason: reason||"api" }); };
  }
  if (typeof I.setTab !== "function"){
    I.setTab = function(tab){ emit(EVT.TAB, { tab: String(tab||"logs") }); };
  }
  if (typeof I.isOpen !== "function"){
    I.isOpen = function(){ return isShown(root()); };
  }

  logI(`bereit (${VER})`);
})();
