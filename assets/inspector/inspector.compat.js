/* =============================================================================
Datei: assets/inspector/inspector.compat.js
Version: v1.2.0
Zweck:
  - Ergänzt/vereinheitlicht die API des BESTEHENDEN Inspectors:
      Inspector.toggle(), .open(), .close(), .setTab(), .isOpen()
  - Spiegelt Events in ALLE Richtungen:
      neu:     cb:inspector:open|close|tab:change
      kurz:    cb:insp:open|close|tab:change
      legacy:  cb:inspector-open|close|tab-change, inspector:*, inspector-*
Einbindung:
  - NACH euren inspector.*.js (core/logs/tests/resources/paths/overlay.hooks)
  - VOR assets/ui/ui-bridge.js
============================================================================= */

(function(){
  const VER = "v1.2.0";
  const logI = (m)=> (window.CBLog?.info||console.log)(`[inspector.compat] ${m}`);
  const logE = (m)=> (window.CBLog?.error||console.error)(`[inspector.compat] ${m}`);

  function emit(n, d){ try{ window.dispatchEvent(new CustomEvent(n, { detail: d||{} })); }catch(_){} }

  // Kanonisch & Kurzform
  const EVT = {
    OPEN_CANON:  "cb:inspector:open",
    CLOSE_CANON: "cb:inspector:close",
    TAB_CANON:   "cb:inspector:tab:change",
    OPEN_SHORT:  "cb:insp:open",
    CLOSE_SHORT: "cb:insp:close",
    TAB_SHORT:   "cb:insp:tab:change"
  };

  // Legacy-Varianten, die wir auf Kanon/Kurz spiegeln
  const MIRROR_IN = [
    "cb:inspector-open","inspector:open","inspector-open",
    "cb:inspector-close","inspector:close","inspector-close",
    "cb:inspector-tab-change","inspector:tab:change","inspector-tab-change",
    // Kurzform legacy (falls vorhanden)
    "cb:insp-open","insp:open","insp-open",
    "cb:insp-close","insp:close","insp-close",
    "cb:insp-tab-change","insp:tab:change","insp-tab-change"
  ];

  // Beim Senden geben wir ALLE Varianten raus (maximale Rückwärtskompat.)
  const OUT_MAP = {
    [EVT.OPEN_CANON]:  [EVT.OPEN_SHORT,"cb:inspector-open","inspector:open","inspector-open"],
    [EVT.CLOSE_CANON]: [EVT.CLOSE_SHORT,"cb:inspector-close","inspector:close","inspector-close"],
    [EVT.TAB_CANON]:   [EVT.TAB_SHORT,"cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"],
    [EVT.OPEN_SHORT]:  ["cb:inspector-open","inspector:open","inspector-open"],
    [EVT.CLOSE_SHORT]: ["cb:inspector-close","inspector:close","inspector-close"],
    [EVT.TAB_SHORT]:   ["cb:inspector-tab-change","inspector:tab:change","inspector-tab-change"]
  };

  // Root-Heuristik (nur abfragen, nichts neu bauen)
  function getRoot(){
    return (
      document.getElementById("inspector-root") ||
      document.querySelector(".inspector-root") ||
      document.getElementById("inspectorOverlay") ||         // mögliche Alt-IDs
      document.getElementById("inspector") ||
      document.querySelector("[data-inspector-root]") ||
      document.querySelector("#overlay-inspector") ||
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

  // Re-Emitter nur 1x anstöpseln
  if (!I.__compat._reemitter){
    I.__compat._reemitter = true;

    // Legacy/Kurz → Kanon/Kurz
    MIRROR_IN.forEach(src=>{
      window.addEventListener(src, ev=>{
        const map = {
          // → OPEN
          "cb:inspector-open": EVT.OPEN_CANON, "inspector:open": EVT.OPEN_CANON, "inspector-open": EVT.OPEN_CANON,
          "cb:insp-open":      EVT.OPEN_SHORT, "insp:open":       EVT.OPEN_SHORT, "insp-open":       EVT.OPEN_SHORT,

          // → CLOSE
          "cb:inspector-close":EVT.CLOSE_CANON,"inspector:close":EVT.CLOSE_CANON,"inspector-close":EVT.CLOSE_CANON,
          "cb:insp-close":     EVT.CLOSE_SHORT,"insp:close":     EVT.CLOSE_SHORT,"insp-close":     EVT.CLOSE_SHORT,

          // → TAB
          "cb:inspector-tab-change": EVT.TAB_CANON, "inspector:tab:change": EVT.TAB_CANON, "inspector-tab-change": EVT.TAB_CANON,
          "cb:insp-tab-change":      EVT.TAB_SHORT, "insp:tab:change":      EVT.TAB_SHORT, "insp-tab-change":      EVT.TAB_SHORT
        };
        const trg = map[src];
        if (trg) emit(trg, ev.detail);
      });
    });

    // Kanon/Kurz → Legacy (alle Varianten raussenden)
    Object.keys(OUT_MAP).forEach(src=>{
      window.addEventListener(src, ev=> OUT_MAP[src].forEach(m=> emit(m, ev.detail)));
    });
  }

  // API-Ergänzungen (nur wenn fehlen)
  if (typeof I.open !== "function"){  I.open  = (from)=> emit(EVT.OPEN_CANON,  { from: from||"api" }); }
  if (typeof I.close !== "function"){ I.close = (why)=> emit(EVT.CLOSE_CANON, { reason: why||"api" }); }
  if (typeof I.setTab !== "function"){I.setTab= (tab)=> emit(EVT.TAB_CANON,   { tab: String(tab||"logs") });}
  if (typeof I.isOpen !== "function"){I.isOpen= ()=> isShown(getRoot()); }

  if (typeof I.toggle !== "function"){
    I.toggle = function(origin){
      const r = getRoot();
      const vis = isShown(r);
      if (vis && typeof I.close === "function") return I.close(origin||"toggle");
      if (!vis && typeof I.open  === "function") return I.open(origin||"toggle");
      emit(EVT.OPEN_CANON, { from: origin||"toggle" });
    };
  }

  logI(`bereit (${VER})`);
})();
