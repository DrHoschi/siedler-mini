/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.6
 * Zweck:
 *   - Zentrales Overlay (#inspector-root) erzeugen (immer mittig, fullscreen)
 *   - Tabs/Slots verwalten (Logs/Build/Pfade/Tests etc.)
 *   - Stabiles API unter window.__INSPECTOR_API__ (open/close/toggle)
 *   - Fallback-sicher (wenn CSS fehlt → minimal inline)
 * Events:
 *   sendet:  cb:inspector-open / cb:inspector-close
 *   erwartet: Slots registrieren sich auf window.__INSPECTOR_SLOTS__
 * ========================================================================== */
(function(){
  "use strict";

  var MOD = "[inspector.core]";
  var VER = "v18.10.6";
  var log = (m)=> (window.CBLog?.info||console.log)(`${MOD} ${m}`);

  // ---------- Slot-Registry --------------------------------------------------
  window.__INSPECTOR_SLOTS__ = window.__INSPECTOR_SLOTS__ || {};
  // Erwartete Keys: logs, build, paths, tests
  function getSlot(name){
    var s = window.__INSPECTOR_SLOTS__ && window.__INSPECTOR_SLOTS__[name];
    return s && typeof s.mount==="function" ? s : null;
  }

  // ---------- Root-Erzeugung -------------------------------------------------
  var root, backdrop, panel, head, tabs, body, footer;
  var currentTab = "logs";

  function cssIfMissing(){
    // Minimal-Absicherung falls inspector.css nicht geladen ist
    if (getComputedStyle(document.documentElement).getPropertyValue("--ins-z") === "") {
      // Nichts definieren – unsere CSS-Datei liefert die Optik.
      // Falls sie fehlt, greift das Inline-Fallback unter ui-bridge bereits.
    }
  }

  function el(tag, cls, txt){
    var e=document.createElement(tag);
    if (cls) e.className = cls;
    if (txt!=null) e.textContent = txt;
    return e;
  }

  function buildDom(){
    if (root) return;
    root = el("div","inspector-root");  // Vollbild-Overlay
    // Safety inline (falls CSS fehlt):
    root.style.position="fixed"; root.style.inset="0";
    root.style.zIndex="2147483646"; root.style.display="none";

    backdrop = el("div","inspector-backdrop");
    panel    = el("div","inspector-panel");
    head     = el("div","inspector-head");
    tabs     = el("div","inspector-tabs");
    body     = el("div","inspector-body");
    footer   = el("div","inspector-footer");

    // Head: Titel + Close
    var title = el("div","ins-title","Inspector");
    var spacer = el("div","ins-spacer");
    var btnClose = el("button","ins-btn ins-close","×");
    btnClose.title="Schließen (Esc)";

    btnClose.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    window.addEventListener("keydown", (ev)=>{ if (ev.key==="Escape") close(); });

    head.appendChild(title);
    head.appendChild(spacer);
    head.appendChild(btnClose);

    // Tabs
    var tabList = [
      ["logs","Logs"],
      ["build","Build"],
      ["paths","Pfade"],
      ["tests","Tests"]
    ];
    tabList.forEach(function(t){
      var b = el("button","ins-tab",t[1]);
      b.dataset.tab = t[0];
      b.addEventListener("click", ()=> switchTab(t[0]));
      tabs.appendChild(b);
    });

    // Footer (rechts: Version)
    var ver = el("div","ins-version", VER);
    footer.appendChild(ver);

    panel.appendChild(head);
    panel.appendChild(tabs);
    panel.appendChild(body);
    panel.appendChild(footer);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Anfangszustand: Logs
    switchTab("logs");
  }

  // ---------- Tab-Wechsel ----------------------------------------------------
  function activateTabButton(name){
    var bs = tabs.querySelectorAll(".ins-tab");
    bs.forEach((b)=> b.classList.toggle("active", b.dataset.tab===name));
  }

  function switchTab(name){
    currentTab = name;
    activateTabButton(name);
    // Body leeren und Slot mounten
    body.innerHTML = "";
    footer.style.display = ""; // Slot kann Footer ausblenden
    var slot = getSlot(name);
    if (slot){
      try { slot.mount({ root, head, tabs, body, footer, version:VER }); }
      catch(e){ (window.CBLog?.err||console.error)(`${MOD} Slot '${name}' Fehler:`, e); }
    } else {
      body.textContent = "Tab noch nicht implementiert.";
    }
  }

  // ---------- API ------------------------------------------------------------
  function open(){
    buildDom(); cssIfMissing();
    root.style.display = "flex"; root.classList.add("is-open");
    // Zentrieren: stellt inspector.css sicher (flex-center). Fallback: inline:
    root.style.display = "flex"; root.style.alignItems="center"; root.style.justifyContent="center";
    window.dispatchEvent(new CustomEvent("cb:inspector-open"));
    log(`geöffnet (${VER})`);
  }
  function close(){
    if (!root) return;
    root.style.display = "none"; root.classList.remove("is-open");
    window.dispatchEvent(new CustomEvent("cb:inspector-close"));
    log("geschlossen");
  }
  function toggle(force){
    if (!root || root.style.display==="none") return open();
    if (force===true) return open();
    if (force===false) return close();
    return (root.style.display==="none") ? open() : close();
  }

  window.__INSPECTOR_API__ = { open, close, toggle, switchTab };

  // ---------- Auto-Init (nur DOM warten, sonst nichts) ----------------------
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", buildDom, { once:true });
  } else {
    buildDom();
  }

  log(`bereit (${VER})`);
})();
