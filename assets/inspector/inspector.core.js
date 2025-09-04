/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.6
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Kern des Inspectors (Overlay, Tabs, API, Fallbacks)
 *   - Bietet window.__INSPECTOR_API__ (open/close/toggle/registerTab/switchTab)
 *   - Öffnet NICHT automatisch; UI-Bridge/FAB steuert toggle()
 *   - Zeigt Fallback-Logs, falls inspector.logs.js noch nicht geladen ist
 *
 * CODE-STYLE:
 *   - Keine externen Abhängigkeiten
 *   - Sanfte Logs via CBLog (fällt auf console.* zurück)
 *   - Defensive Inline-Styles (falls inspector.css fehlt)
 * ========================================================================== */
(function(){
  "use strict";

  var VERSION = "v18.10.6";
  var MOD = "[inspector.core]";
  var log  = function(){ try{ (window.CBLog?.info||console.log).apply(console, [MOD].concat([].slice.call(arguments))); }catch(_){ console.log.apply(console, [MOD].concat(arguments)); } };
  var warn = function(){ try{ (window.CBLog?.warn||console.warn).apply(console, [MOD].concat([].slice.call(arguments))); }catch(_){ console.warn.apply(console, [MOD].concat(arguments)); } };

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------
  function el(tag, cls, txt){
    var e=document.createElement(tag);
    if (cls) e.className=cls;
    if (txt!=null) e.textContent=txt;
    return e;
  }
  function css(e, s){ e.style.cssText = s; return e; }

  // ---------------------------------------------------------------------------
  // State & Registry
  // ---------------------------------------------------------------------------
  var root      = null;   // #inspector
  var headEl    = null;   // Kopf (Titel, Close)
  var tabsEl    = null;   // Tab-Leiste
  var bodyEl    = null;   // Inhalt
  var footEl    = null;   // Fuß (Optionen)
  var isOpen    = false;
  var tabs      = [];     // [{id,title,render,order}]
  var activeId  = null;

  // ---------------------------------------------------------------------------
  // Build Overlay Skeleton (defensive / CSS-Fallback)
  // ---------------------------------------------------------------------------
  function ensureRoot(){
    if (root) return root;

    root = el("div", "inspector");
    root.id = "inspector";
    // Falls CSS fehlt: Inline-Fallback, damit das Layout nie „kaputt“ wirkt
    css(root,
      "position:fixed;inset:0;z-index:2147483646;display:none;"+
      "background:rgba(10,12,14,.72);backdrop-filter:blur(4px);"+
      "color:#e5e7eb;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
    );

    var panel = el("div", "inspector-panel");
    css(panel,
      "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);"+
      "width:min(1024px,90vw);height:min(84vh,90vh);"+
      "background:linear-gradient(180deg,rgba(24,28,31,.98),rgba(20,23,26,.98));"+
      "border:1px solid rgba(255,255,255,.08);border-radius:12px;"+
      "box-shadow:0 24px 64px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;"
    );

    // Header
    headEl = el("div","inspector-head");
    css(headEl,
      "display:flex;align-items:center;gap:12px;padding:12px 12px;"+
      "border-bottom:1px solid rgba(255,255,255,.08);"
    );
    var title = el("div","inspector-title","Inspector");
    css(title,"font-weight:700;letter-spacing:.2px;opacity:.92;");
    var spacer = el("div"); css(spacer,"flex:1;");
    var btnClose = el("button","inspector-close","×");
    css(btnClose,
      "position:relative;margin:0;padding:6px 10px;border:none;border-radius:8px;"+
      "background:rgba(255,255,255,.08);color:#e5e7eb;cursor:pointer;font-size:16px;"+
      "line-height:1;min-width:36px;min-height:32px;"
    );
    btnClose.title = "Schließen (Esc)";
    btnClose.addEventListener("click", close);

    headEl.appendChild(title);
    headEl.appendChild(spacer);
    headEl.appendChild(btnClose);

    // Tabs
    tabsEl = el("div","inspector-tabs");
    css(tabsEl,"display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px 0 12px;");

    // Body
    bodyEl = el("div","inspector-body");
    css(bodyEl,"flex:1;min-height:0;overflow:auto;padding:12px;");

    // Footer
    footEl = el("div","inspector-foot");
    css(footEl,
      "display:flex;align-items:center;gap:8px;padding:10px 12px;"+
      "border-top:1px solid rgba(255,255,255,.08);opacity:.85;font-size:12px;"
    );
    var ver = el("div", null, "core "+VERSION);
    footEl.appendChild(ver);

    panel.appendChild(headEl);
    panel.appendChild(tabsEl);
    panel.appendChild(bodyEl);
    panel.appendChild(footEl);
    root.appendChild(panel);
    document.body.appendChild(root);

    // ESC schließt
    window.addEventListener("keydown", function(ev){
      if (!isOpen) return;
      if (ev.key === "Escape"){ close(); }
    });

    // Fallback Diagnose: meldet, dass Core aktiv ist
    log("bereit ("+VERSION+")");
    return root;
  }

  // ---------------------------------------------------------------------------
  // Tab-Handling
  // ---------------------------------------------------------------------------
  function renderTabs(){
    tabsEl.innerHTML = "";
    // Sort by order, then title
    var sorted = tabs.slice().sort(function(a,b){
      var ao=(a.order|0), bo=(b.order|0);
      if (ao!==bo) return ao-bo;
      return String(a.title||a.id).localeCompare(String(b.title||b.id));
    });
    sorted.forEach(function(t){
      var b = el("button","inspector-tab", t.title || t.id);
      css(b,
        "border:none;border-radius:999px;padding:6px 12px;cursor:pointer;"+
        "background:rgba(255,255,255,.10);color:#e5e7eb;"
      );
      if (t.id === activeId){
        b.classList.add("active");
        b.style.background = "rgba(120,200,255,.22)";
      }
      b.addEventListener("click", function(){ switchTab(t.id); });
      tabsEl.appendChild(b);
    });
  }

  function switchTab(id){
    var t = tabs.find(function(x){ return x.id===id; });
    if (!t){ warn("Tab nicht gefunden:", id); return; }
    activeId = id;
    renderTabs();
    try{
      bodyEl.innerHTML = "";
      footEl.style.display = ""; // module kann hide aktivieren wenn nötig
      t.render({ bodyEl: bodyEl, footEl: footEl, api: __INSPECTOR_API__ });
    }catch(e){
      warn("Tab-Render Fehler:", e && e.message);
      bodyEl.textContent = "Fehler beim Rendern des Tabs.";
    }
  }

  function registerTab(def){
    // def: { id, title, order?, render(body) }
    if (!def || !def.id || !def.render){ warn("Ungültiger Tab:", def); return; }
    var exists = tabs.some(function(t){ return t.id===def.id; });
    if (exists){
      // Update (z.B. Logs-Tab überschreibt Fallback)
      for (var i=0;i<tabs.length;i++){ if (tabs[i].id===def.id){ tabs[i]=def; break; } }
    } else {
      tabs.push(def);
    }
    // Wenn noch kein aktiver Tab -> diesen setzen (Logs zuerst attraktiv)
    if (!activeId){
      activeId = def.id;
    }
    // Wenn offen, Tabs neu zeichnen und ggf. aktiv neu rendern
    if (isOpen){
      renderTabs();
      if (activeId === def.id) switchTab(def.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function open(){
    ensureRoot();
    if (isOpen) return;
    isOpen = true;
    root.style.display = "block";
    renderTabs();
    // Falls noch kein Tab aktiv, setze auf ersten
    if (!activeId && tabs.length){ activeId = tabs[0].id; }
    if (activeId) switchTab(activeId);
    window.dispatchEvent(new CustomEvent("cb:inspector-open"));
    log("geöffnet ("+VERSION+")");
  }

  function close(){
    if (!root || !isOpen) return;
    isOpen = false;
    root.style.display = "none";
    window.dispatchEvent(new CustomEvent("cb:inspector-close"));
    log("geschlossen");
  }

  function toggle(force){
    var willOpen = (force==null) ? !isOpen : !!force;
    willOpen ? open() : close();
  }

  // API-Objekt global bereitstellen
  var __INSPECTOR_API__ = (window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {});
  __INSPECTOR_API__.open       = open;
  __INSPECTOR_API__.close      = close;
  __INSPECTOR_API__.toggle     = toggle;
  __INSPECTOR_API__.registerTab= registerTab;
  __INSPECTOR_API__.switchTab  = switchTab;
  __INSPECTOR_API__.version    = VERSION;

  // ---------------------------------------------------------------------------
  // Minimaler Logs-Fallback (falls inspector.logs.js noch nicht geladen ist)
  // wird beim ersten Open angezeigt und später automatisch von logs.js ersetzt
  // ---------------------------------------------------------------------------
  registerTab({
    id: "logs",
    title: "Logs",
    order: 10,
    render: function(ctx){
      var wrap = el("div", null, "");
      var hint = el("div", null, "Logs werden initialisiert …");
      css(hint, "opacity:.8;margin-bottom:8px");
      var pre = el("pre", null, "");
      css(pre, "margin:0;padding:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:8px;white-space:pre-wrap;");

      // Fülle mit CBLog-Buffer, falls vorhanden
      try{
        var buf = (window.CBLog && Array.isArray(CBLog._buffer)) ? CBLog._buffer : null;
        if (buf && buf.length){
          pre.textContent = buf.map(function(line){ return line.ts+" "+line.level+" "+line.msg; }).join("\n");
          hint.textContent = "Logs (Fallback) — werden ersetzt, sobald inspector.logs.js geladen ist.";
        }else{
          pre.textContent = "Noch keine Logs …";
        }
      }catch(_){
        pre.textContent = "Noch keine Logs …";
      }

      wrap.appendChild(hint);
      wrap.appendChild(pre);
      ctx.bodyEl.appendChild(wrap);
    }
  });

  // Panel vorbereiten, aber nicht automatisch öffnen (FAB/Bridge steuert)
  ensureRoot();
})();
