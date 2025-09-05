<script>
/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.8
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Vollbild-Overlay (Inspektor) mit Tabsystem
 *   - Öffentliche API auf window.__INSPECTOR_API__
 *   - Events: cb:inspector-open / cb:inspector-close
 * Code-Style:
 *   - Defensive, keine harten Throws, sanfte Logs über CBLog/console
 *   - Keine CSS-Abhängigkeit notwendig (Inline-Styles als Fallback)
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const ok   = (...a)=> (window.CBLog?.info||console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn)(MOD, ...a);

  // DOM einmalig aufbauen
  let root, panel, headEl, tabsEl, bodyEl, footerEl, closeBtn;
  let isOpen = false;
  let currentTab = null;
  const renderers = Object.create(null);   // id -> fn(ctx)
  const disposers = Object.create(null);   // id -> () => void

  function ensureDOM(){
    if (root) return;
    // Root (Vollbild, klicksicher)
    root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-label","Inspector");
    root.style.cssText = [
      "position:fixed","inset:0","z-index:2147483646","display:none",
      "background:rgba(0,0,0,.50)","backdrop-filter:blur(2px)"
    ].join(";");
    // Panel (zentrales Dock)
    panel = document.createElement("div");
    panel.style.cssText = [
      "position:absolute","left:50%","top:50%","transform:translate(-50%,-50%)",
      "width:min(940px,96vw)","height:min(80vh,90vh)","display:flex",
      "flex-direction:column","background:rgba(18,18,22,.96)","color:#e6e7ea",
      "border:1px solid rgba(255,255,255,.08)","border-radius:12px",
      "box-shadow:0 24px 80px rgba(0,0,0,.55)","overflow:hidden"
    ].join(";");
    root.appendChild(panel);

    // Kopf (Titel+Tabs+Close)
    headEl = document.createElement("div");
    headEl.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)";
    const title = document.createElement("div");
    title.textContent = "Inspector";
    title.style.cssText = "font-weight:800;letter-spacing:.3px;opacity:.9";
    tabsEl = document.createElement("div");
    tabsEl.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-left:auto";
    closeBtn = document.createElement("button");
    closeBtn.textContent = "Schließen";
    closeBtn.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer";
    closeBtn.addEventListener("click", close);
    headEl.append(title, tabsEl, closeBtn);
    panel.appendChild(headEl);

    // Body / Footer
    bodyEl = document.createElement("div");
    bodyEl.style.cssText = "flex:1;overflow:auto;padding:12px";
    footerEl = document.createElement("div");
    footerEl.style.cssText = "display:flex;gap:8px;align-items:center;padding:8px 12px;border-top:1px solid rgba(255,255,255,.08)";
    panel.append(bodyEl, footerEl);

    document.body.appendChild(root);
    ok("bereit (v18.10.8)");
  }

  function open(){
    ensureDOM();
    if (isOpen) return;
    isOpen = true;
    root.style.display = "block";
    window.dispatchEvent(new CustomEvent("cb:inspector-open"));
  }

  function close(){
    if (!root || !isOpen) return;
    isOpen = false;
    root.style.display = "none";
    window.dispatchEvent(new CustomEvent("cb:inspector-close"));
  }

  function toggle(force){
    (force == null ? !isOpen : !!force) ? open() : close();
  }

  function setActiveTab(id){
    if (!id || !renderers[id]) return;
    // Tabs optisch
    Array.from(tabsEl.children).forEach(el=>{
      el.classList.toggle("active", el.dataset.id === id);
      el.style.background = el.classList.contains("active")
        ? "rgba(120,200,255,.16)" : "rgba(255,255,255,.10)";
    });
    // bisherigen Tab sauber abbauen
    if (currentTab && typeof disposers[currentTab] === "function"){
      try{ disposers[currentTab](); }catch(_){}
      disposers[currentTab] = null;
    }
    currentTab = id;
    // Body/Foot leeren und Renderer aufrufen
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";
    try{
      const ctx = {
        bodyEl, footerEl,
        onDispose: (fn)=>{ disposers[id] = fn; },
      };
      renderers[id](ctx);
    }catch(e){
      warn("Renderer-Fehler in Tab:", id, e?.message);
      bodyEl.textContent = "Tab konnte nicht gerendert werden.";
    }
  }

  function mountTab(id, renderFn, meta){
    ensureDOM();
    if (!id || typeof renderFn!=="function") return;
    renderers[id] = renderFn;
    // Tab-Button anlegen (wenn noch nicht vorhanden)
    let btn = tabsEl.querySelector(`[data-id="${id}"]`);
    if (!btn){
      btn = document.createElement("button");
      btn.dataset.id = id;
      btn.textContent = (meta?.title || id);
      btn.style.cssText = "border:none;border-radius:999px;padding:6px 12px;color:#fff;cursor:pointer;background:rgba(255,255,255,.10)";
      btn.addEventListener("click", ()=> setActiveTab(id));
      tabsEl.appendChild(btn);
    }
    // Falls dies der erste Tab ist → aktivieren
    if (!currentTab) setActiveTab(id);
  }

  // Public API
  window.__INSPECTOR_API__ = {
    open, close, toggle,
    mountTab,
    selectTab: setActiveTab,
    getNodes: ()=>({ root, panel, headEl, tabsEl, bodyEl, footerEl }),
  };

  // Optional: Fallback-Badge entfernen, wenn vorhanden
  setTimeout(()=>{ try{ document.getElementById("inspector-probe")?.remove(); }catch(_){}} , 50);

})();
</script>
