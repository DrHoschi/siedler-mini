/* =============================================================================
   Datei: ui/inspector/inspector.force-toggle.js
   Zweck: Erzwingt funktionierendes Inspector-Toggle – ALT (UIInspector),
          NEU (Inspector), Events, Root-Fallback. Bringt eigene Logs mit.
   Hinweis: Überschreibt KEIN UI. Setzt nur GameUI.toggleInspector sicher.
============================================================================= */
(function(){
  // --- einfache Logger (unabhängig von CBLog) ---
  const I = (m)=> console.log("[insp-force]", m);
  const W = (m)=> console.warn("[insp-force]", m);
  const E = (m)=> console.error("[insp-force]", m);

  // --- bekannte Toggle-Events (alt/legacy/neu) ---
  const TOGGLE_EVENTS = ["inspector:toggle","cb:inspector-toggle","cb:inspector:toggle"];

  // --- üblich benutzte Root-Selektoren (alt & neu & Varianten) ---
  const ROOT_SELECTORS = [
    "#inspector-root", "#inspectorOverlay", "#inspector", "#ui-inspector",
    "#overlay-inspector", ".inspector-root", ".inspector-overlay", "[data-inspector-root]"
  ];

  function findRoot(){
    for (const sel of ROOT_SELECTORS){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function fireAllToggleEvents(from){
    for (const ev of TOGGLE_EVENTS){
      try{ window.dispatchEvent(new CustomEvent(ev,{detail:{from}})); }catch(_) {}
    }
    I(`Toggle-Events gefeuert (${TOGGLE_EVENTS.join(", ")})`);
  }

  function rootToggleFallback(){
    const r = findRoot();
    if (!r){ E("Kein Inspector-Root im DOM – Fallback kann nicht greifen."); return false; }
    const visible = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
    if (visible){ r.classList.remove("is-open"); r.style.display = "none";  I("Root → close (Fallback)"); }
    else        { r.classList.add("is-open");   r.style.display = "block"; I("Root → open (Fallback)"); }
    return true;
  }

  function toggleInspector(){
    // 1) ALT: monolithische API
    if (window.UIInspector){
      try{
        if (typeof window.UIInspector.toggle === "function"){ I("via UIInspector.toggle()"); return window.UIInspector.toggle(); }
        const r = findRoot();
        const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
        if (vis && typeof window.UIInspector.close === "function"){ I("via UIInspector.close()"); return window.UIInspector.close("toggle"); }
        if (!vis && typeof window.UIInspector.open  === "function"){ I("via UIInspector.open()");  return window.UIInspector.open("toggle");  }
        W("UIInspector vorhanden, aber keine nutzbare toggle/open/close – versuche Events …");
      }catch(err){ W("UIInspector-Call Fehler: "+(err?.message||err)); }
    }

    // 2) NEU: gesplittete API
    if (window.Inspector){
      try{
        if (typeof window.Inspector.toggle === "function"){ I("via Inspector.toggle()"); return window.Inspector.toggle(); }
        const r = findRoot();
        const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
        if (vis && typeof window.Inspector.close === "function"){ I("via Inspector.close()"); return window.Inspector.close("toggle"); }
        if (!vis && typeof window.Inspector.open  === "function"){ I("via Inspector.open()");  return window.Inspector.open("toggle");  }
        W("Inspector vorhanden, aber keine nutzbare toggle/open/close – versuche Events …");
      }catch(err){ W("Inspector-Call Fehler: "+(err?.message||err)); }
    }

    // 3) Events
    fireAllToggleEvents("force");

    // 4) letzter Fallback: Root direkt toggeln
    if (rootToggleFallback()) return;

    // 5) Diagnose
    E("Inspector nicht erreichbar – prüfe Script-Reihenfolge oder sag mir den exakten Root-Selektor (ID/Klasse).");
  }

  // --- GameUI anbinden (erzwingt funktionierenden Button-Klick) ---
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggleInspector;

  // --- Sicherheitsnetz: Klick auf FAB sucht den Button im DOM & bindet onClick ---
  function attachButtonClick(){
    const btn = document.querySelector('#btn-inspector button,[aria-label="Inspector"],[title="Inspector öffnen/schließen"]');
    if (btn && !btn.__inspBound){
      btn.addEventListener("click", (ev)=>{ ev.preventDefault(); try{ toggleInspector(); }catch(err){ E(err); } });
      btn.__inspBound = true;
      I("Button-Handler gebunden (Sicherheitsnetz).");
    }
  }
  document.addEventListener("DOMContentLoaded", attachButtonClick);
  setTimeout(attachButtonClick, 0);
  setTimeout(attachButtonClick, 300);
  setTimeout(attachButtonClick, 1000);

  // --- kleine Diagnose-Hilfe im Window ---
  window.__forceInspectorDiag = function(){
    const r = findRoot();
    return {
      ver: "inspector.force-toggle.js",
      has_UIInspector: !!window.UIInspector,
      has_Inspector: !!window.Inspector,
      root_found: !!r,
      root_selector: r ? (r.id?("#"+r.id):(r.className?("."+String(r.className).split(" ").join(".")):"[custom]")) : null
    };
  };

  I("aktiv – Force-Toggle bereit.");
})();
