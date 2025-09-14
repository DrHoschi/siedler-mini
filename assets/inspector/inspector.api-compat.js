/* =============================================================================
Datei: assets/inspector/inspector.api-compat.js
Projekt: Neue Siedler
Version: v1.0.0
Zweck:
  - API-Kompatibilitätsschicht für den bestehenden Inspector.
  - Vereinheitlicht Methoden & Events:
      * Methoden: toggle(), open(), close(), setTab(tab), isOpen()
      * Events (kanonisch): cb:inspector:open|close|tab:change
        + Legacy-Spiegelung: cb:inspector-open|close|tab-change, inspector:*, inspector-*
  - Überschreibt NICHT deine Implementierung; ergänzt nur, was fehlt.
Hinweise:
  - Nach allen Inspector-Teilmodulen laden (core/logs/tests/resources/paths/overlay.hooks)
  - Vor ui-bridge.js laden (damit die Bridge saubere APIs vorfindet)
============================================================================= */

(function(){
  const COMPAT_VERSION = "v1.0.0";

  /* --------------------- Logging --------------------- */
  const L = {
    i: (m)=> (window.CBLog?.info  || console.log)(`[inspector.compat] ${m}`),
    w: (m)=> (window.CBLog?.warn  || console.warn)(`[inspector.compat] ${m}`),
    e: (m)=> (window.CBLog?.error || console.error)(`[inspector.compat] ${m}`),
  };

  /* --------------------- Utilities --------------------- */
  function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }catch(_){/*noop*/} }

  // Alle bekannten Event-Namen (neu & legacy)
  const EVT_CANON = {
    open:        ["cb:inspector:open"],
    close:       ["cb:inspector:close"],
    tabChange:   ["cb:inspector:tab:change"]
  };
  const EVT_MIRRORS = [
    // legacy / alternative Schreibweisen
    "cb:inspector-open","cb:inspector-close","cb:inspector-tab-change",
    "inspector:open","inspector:close","inspector:tab:change",
    "inspector-open","inspector-close","inspector-tab-change"
  ];

  // Root-Element finden (versch. Historien möglich)
  function findRoot(){
    return (
      document.getElementById("inspector-root") ||
      document.querySelector(".inspector-root") ||
      document.getElementById("inspector") ||
      document.querySelector("[data-inspector-root]") ||
      null
    );
  }
  function visibleByClass(root){
    return !!root && root.classList.contains("is-open");
  }
  function showRoot(root){
    if(!root) return;
    root.style.display = "block";
    root.classList.add("is-open");
  }
  function hideRoot(root){
    if(!root) return;
    root.classList.remove("is-open");
    // display auf leer lassen, falls CSS via Klasse steuert; sonst minimal schließen:
    if(!root.classList.contains("is-open")) root.style.display = "none";
  }

  /* --------------------- Inspector-Objekt sichern --------------------- */
  const I = (window.Inspector = window.Inspector || {});
  I.__compat = I.__compat || {};
  I.__compat.version = COMPAT_VERSION;

  /* --------------------- Event-Spiegelung (Bridge) --------------------- */
  // Wenn eure bestehenden Module bereits „irgendwelche“ Events feuern,
  // spiegeln wir sie auf die kanonischen Events – und umgekehrt.
  // So bleibt alles kompatibel, ohne doppelte UIs zu bauen.

  const REEMIT_MAP = new Map([
    // Quelle → Ziel (kanonisch)
    ["cb:inspector-open",       "cb:inspector:open"],
    ["inspector:open",          "cb:inspector:open"],
    ["inspector-open",          "cb:inspector:open"],

    ["cb:inspector-close",      "cb:inspector:close"],
    ["inspector:close",         "cb:inspector:close"],
    ["inspector-close",         "cb:inspector:close"],

    ["cb:inspector-tab-change", "cb:inspector:tab:change"],
    ["inspector:tab:change",    "cb:inspector:tab:change"],
    ["inspector-tab-change",    "cb:inspector:tab:change"],
  ]);

  // Nur einmal anhängen
  if (!I.__compat._reemitterAttached
