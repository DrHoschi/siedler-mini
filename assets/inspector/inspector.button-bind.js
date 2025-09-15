/*!
 * inspector.button-bind.js
 * Erzwingt ein funktionierendes Toggle für den Inspector-Button – unabhängig davon,
 * ob andere Scripte GameUI überschrieben/verbogen haben.
 * Reihenfolge: NACH deinen Inspector-Modulen, VOR ui-bridge/ui-start/ui-build laden.
 */
(function () {
  // Minimaler Logger (unabhängig von CBLog)
  var log = function(m){ try{ (console.log)("["+ "insp-bind" +"] " + m); }catch(_){ } };

  // Alle bekannten Root-Selektoren einmal abdecken (alt/neu)
  var ROOTS = [
    "#inspector", "#inspector-root", "#inspectorOverlay", "#ui-inspector",
    "#overlay-inspector", ".inspector-root", ".inspector-overlay", "[data-inspector-root]"
  ];
  function findRoot(){
    for (var i=0;i<ROOTS.length;i++){
      var el = document.querySelector(ROOTS[i]);
      if (el) return el;
    }
    return null;
  }

  // Sanfte API-Helfer (verwenden vorhandene APIs, wenn sie existieren)
  function callAPI(){
    if (window.UIInspector && typeof window.UIInspector.toggle === "function"){
      log("via UIInspector.toggle()");
      return window.UIInspector.toggle();
    }
    if (window.Inspector && typeof window.Inspector.toggle === "function"){
      log("via Inspector.toggle()");
      return window.Inspector.toggle();
    }
    // Events feuern (alt/legacy/neu)
    ["inspector:toggle","cb:inspector-toggle","cb:inspector:toggle"].forEach(function(n){
      try{ window.dispatchEvent(new CustomEvent(n,{detail:{from:"insp-bind"}})); }catch(_){}
    });
    log("Toggle-Events gefeuert");
    // Letzter Fallback: Root direkt toggeln
    var r = findRoot();
    if (!r){ log("Kein Inspector-Root gefunden"); return; }
    var vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
    if (vis){ r.classList.remove("is-open"); r.style.display="none";  log("Root → close (fallback)"); }
    else    { r.classList.add("is-open");   r.style.display="flex";  log("Root → open (fallback)"); }
  }

  // Button-Klick binden – robust gegen spätes DOM
  function bindButton(){
    var btn = document.querySelector('#btn-inspector button,[data-action="toggle-inspector"],[aria-label="Inspector"]');
    if (btn && !btn.__inspBound){
      btn.addEventListener("click", function(ev){ ev.preventDefault(); try{ callAPI(); }catch(e){ console.error(e); } }, true);
      btn.__inspBound = true;
      log("Button-Handler gebunden");
    }
  }

  // Zusätzlich: GameUI wieder herleiten, falls es zerschossen wurde
  function ensureGameUI(){
    window.GameUI = window.GameUI || {};
    if (typeof window.GameUI.toggleInspector !== "function"){
      window.GameUI.toggleInspector = callAPI;
      log("GameUI.toggleInspector gesetzt (bind)");
    }
  }

  // Start
  document.addEventListener("DOMContentLoaded", function(){
    ensureGameUI();
    bindButton();
  });
  // Späte DOM-/Script-Fälle abdecken
  setTimeout(function(){ ensureGameUI(); bindButton(); }, 0);
  setTimeout(function(){ ensureGameUI(); bindButton(); }, 300);
  setTimeout(function(){ ensureGameUI(); bindButton(); }, 1200);
})();
