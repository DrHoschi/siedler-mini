/* =============================================================================
Datei: assets/inspector/inspector.compat.js
Projekt: Neue Siedler
Version: v1.1.0
Zweck:
  - Ergänzt / vereinheitlicht die API des BESTEHENDEN Inspectors:
      Inspector.toggle(), .open(), .close(), .setTab(), .isOpen()
  - Spiegelt Events zwischen neu (cb:inspector:*) und alt (cb:inspector-*, inspector:*)
  - Tastatur/Root werden NICHT geändert; DOM bleibt unverändert.
Einbindung:
  - NACH euren inspector.*.js (core/logs/tests/resources/paths/overlay.hooks)
  - VOR assets/ui/ui-bridge.js
============================================================================= */

(function(){
  const VER = "v1.1.0";
  const logI = (m)=> (window.CBLog?.info || console.log)(`[inspector.compat] ${m}`);
  const logE = (m)=> (window.CBLog?.error|| console.error)(`[inspector.compat] ${m}`);

  function emit(n, d){ try{ window.dispatchEvent(new CustomEvent(n, { detail: d||{} })); }catch(_){} }

  // Kanonische Events (neu)
  const EVT = {
    OPEN:  "cb:inspector:open",
    CLOSE: "cb:inspector:close",
    TAB:   "cb:inspector:tab:change"
  };

  // Legacy-Events, die wir hinein- und hinaus-spiegeln
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

  // Root-Heuristik (nur ABFRAGE, nichts neu bauen)
  function getRoot(){
    return (
      document.getElementById("inspector-root") ||
      document.querySelector(".inspector-root") ||
      document.getElementById("inspector") ||
      document.querySelector("[data-inspector-root]") ||
      null
    );
  }
  function isShown(r){
    if(!r) return false;
    if (r.classList.contains("is-open")) return true;
    const d = r.style?.display || getComputedStyle(r).display;
    return d && d !== "none";
  }

  // Bestehendes Objekt erweitern – NICHT ersetzen
  const I = (window.Inspector = window.Inspector || {});
  I.__compat = I.__compat || { version: VER };

  // Legacy → Neu
  if (!I.__compat._reemit){
    I.__compat._reemit = true;
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

    // Neu → Legacy
    [EVT.OPEN, EVT.CLOSE, EVT.TAB].forEach(src=>{
      window.addEventListener(src, ev=>{
        (MIRROR_OUT[src]||[]).forEach(m=> emit(m, ev.detail));
      });
    });
  }

  // API-Ergänzungen (nur wenn fehlen)
  if (typeof I.open !== "function"){
    I.open = function(from){ emit(EVT.OPEN, { from: from||"api" }); };
  }
  if (typeof I.close !== "function"){
    I.close = function(reason){ emit(EVT.CLOSE, { reason: reason||"api" }); };
  }
  if (typeof I.setTab !== "function"){
    I.setTab = function(tab){ emit(EVT.TAB, { tab: String(tab||"logs") }); };
  }
  if (typeof I.isOpen !== "function"){
    I.isOpen = function(){ return isShown(getRoot()); };
  }
  if (typeof I.toggle !== "function"){
    I.toggle = function(origin){
      const r = getRoot();
      const vis = isShown(r);
      if (vis && typeof I.close === "function") return I.close(origin||"toggle");
      if (!vis && typeof I.open === "function")  return I.open(origin||"toggle");
      // Notfalls wenigstens Event absetzen
      emit(EVT.OPEN, { from: origin||"toggle" });
    };
  }

  logI(`bereit (${VER})`);
})();
