(function(){
  // … (Build-Kram ggf. wie gehabt) …

  // Sehr breite Root-Suche, falls du Sichtbarkeit brauchst:
  function findInspectorRoot(){
    return document.getElementById("inspector-root")
        || document.getElementById("inspector")
        || document.querySelector(".inspector-root,#overlay-inspector,[data-inspector-root]")
        || null;
  }

  const TOGGLE_EVENTS = [
    "inspector:toggle",          // <- dein alter Stand
    "cb:inspector-toggle",       // legacy
    "cb:inspector:toggle"        // neu
  ];

  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = function(){
    // 1) Bevorzugt echte API, wenn vorhanden
    if (window.Inspector && typeof window.Inspector.toggle === "function"){
      window.Inspector.toggle();
      return;
    }
    // 2) Events für alte & neue Stände feuern
    TOGGLE_EVENTS.forEach(e => window.dispatchEvent(new CustomEvent(e,{detail:{from:"ui-bridge"}})));

    // 3) letzter sanfter Fallback: Root sichtbar/unsichtbar schalten (kein neues UI)
    const r = findInspectorRoot();
    if (r){
      const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
      if (vis){ r.classList.remove("is-open"); r.style.display="none"; }
      else    { r.style.display="block";       r.classList.add("is-open"); }
    }
  };
})();
