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
  const logW = (m)=> (window.CBLog?.warn || console.warn)(`[inspector.compat] ${m}`);
  const logE = (m)=> (window.CBLog?.error|| console.error)(`[inspector.compat] ${m}`);

  function emit(n, d){ try{ window.dispatchEvent(new CustomEvent(n, { detail: d||{} })); }catch(_){ } }

  // Kanonische Events laut Vorgaben
  const EVT_CANON = {
    open:      "cb:inspector:open",
    close:     "cb:inspector:close",
    tabChange: "cb:inspector:tab:change"
  };
  // Legacy-/Alternative Varianten, die wir spiegeln
  const EVT_MIRROR_IN  = [
    "cb:inspector-open", "inspector:open", "inspector-open",
    "cb:inspector-close","inspector:close","inspector-close",
    "cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"
  ];
  const EVT_MIRROR_OUT = [
    // Beim Senden spiegeln wir zusätzlich diese Varianten raus,
    // damit alter Code, der darauf hört, weiterhin reagiert.
    {canon: EVT_CANON.open,      mirrors:["cb:inspector-open","inspector:open","inspector-open"]},
    {canon: EVT_CANON.close,     mirrors:["cb:inspector-close","inspector:close","inspector-close"]},
    {canon: EVT_CANON.tabChange, mirrors:["cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"]}
  ];

  // Root-Heuristik (wir fassen euer DOM nicht an – nur abfragen)
  function findRoot(){
    return (
      document.getElementById("inspector-root") ||
      document.querySelector(".inspector-root") ||
      document.getElementById("inspector") ||
      document.querySelector("[data-inspector-root]") ||
      null
    );
  }
  function isShown(root){
    if(!root) return false;
    if (root.classList.contains("is-open")) return true;
    // fallback: style display
    const d = root.style?.display || getComputedStyle(root).display;
    return d && d !== "none";
  }

  // Euer Inspector-Objekt sichern
  const I = (window.Inspector = window.Inspector || {});
  I.__compat = I.__compat || { version: VER };

  // ---- Event-Re-Emitter (nur einmal anschließen) ----
  if (!I.__compat._reemitter) {
    I.__compat._reemitter = true;

    // Legacy → Canonical
    EVT_MIRROR_IN.forEach(src=>{
      window.addEventListener(src, (ev)=>{
        const map = {
          "cb:inspector-open":       EVT_CANON.open,
          "inspector:open":          EVT_CANON.open,
          "inspector-open":          EVT_CANON.open,
          "cb:inspector-close":      EVT_CANON.close,
          "inspector:close":         EVT_CANON.close,
          "inspector-close":         EVT_CANON.close,
          "cb:inspector-tab-change": EVT_CANON.tabChange,
          "inspector:tab:change":    EVT_CANON.tabChange,
          "inspector-tab-change":    EVT_CANON.tabChange
        };
        const target = map[src];
        if (target) emit(target, ev.detail);
      });
    });

    // Canonical → Legacy
    [EVT_CANON.open, EVT_CANON.close, EVT_CANON.tabChange].forEach(src=>{
      window.addEventListener(src, (ev)=>{
        const mirrors = EVT_MIRROR_OUT.find(x=>x.canon===src)?.mirrors || [];
        mirrors.forEach(m => emit(m, ev.detail));
      });
    });
  }

  // ---- API-Ergänzungen (nicht überschreiben, nur hinzufügen) ----
  // toggle()
  if (typeof I.toggle !== "function"){
    I.toggle = function(origin){
      try{
        const root = findRoot();
        const shown = isShown(root);
        if (shown && typeof I.close === "function") return I.close(origin||"toggle");
        if (!shown && typeof I.open === "function")  return I.open(origin||"toggle");
        // Wenn open/close nicht existieren, wenigstens Events feuern
        emit(EVT_CANON.open, { from: origin||"toggle" });
      }catch(e){ logE(e?.message||e); }
    };
  }
  // open()
  if (typeof I.open !== "function"){
    I.open = function(origin){
      emit(EVT_CANON.open, { from: origin||"api" });
    };
  }
  // close()
  if (typeof I.close !== "function"){
    I.close = function(reason){
      emit(EVT_CANON.close, { reason: reason||"api" });
    };
  }
  // setTab(tab)
  if (typeof I.setTab !== "function"){
    I.setTab = function(tab){
      emit(EVT_CANON.tabChange, { tab: String(tab||"logs") });
    };
  }
  // isOpen()
  if (typeof I.isOpen !== "function"){
    I.isOpen = function(){
      return isShown(findRoot());
    };
  }

  logI(`bereit (${VER})`);
})();
