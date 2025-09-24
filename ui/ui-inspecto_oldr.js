/* =============================================================================
Datei: assets/ui/ui-inspector.js
Projekt: Neue Siedler
Version: v18.0.0
Zweck: Ein einheitliches Inspector-API bereitstellen:
       window.UIInspector.open/close/toggle()
       – nutzt bestehende Inspector-Module, oder zeigt einen Fallback-Inspector.
Events: cb:inspector:open|close (+ legacy: cb:inspector-open|close)
Tabs:  Logs | Tests | Ressourcen | Pfade (Fallback-UI)
============================================================================= */

window.addEventListener('cb:log', (ev)=>{
  const { level, msg, t } = ev.detail;
  Inspector.logs.push({level, msg, t});
  Inspector.renderLogs();
});

(function(){
  const INSPECTOR_VERSION = "v18.0.0";
  function LOK(m){(window.CBLog?.ok||console.log)(`[ui-inspector] ${m}`);}
  function LIN(m){(window.CBLog?.info||console.log)(`[ui-inspector] ${m}`);}
  function LER(m){(window.CBLog?.error||console.error)(`[ui-inspector] ${m}`);}
  function emit(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d||{}})); }catch(e){} }
  function emitBoth(base,detail){ emit(`cb:inspector:${base}`,detail); emit(`cb:inspector-${base}`,detail); }
// beim Init des Inspector:
window.addEventListener('cb:log', (ev)=>{
  const {level, msg, t} = ev.detail;
  // in deine Logliste pushen + rendern
});
  /* ---------- DOM Fallback ---------- */
  function ensureRoot(){
    let r = document.getElementById("inspector-root") || document.querySelector(".inspector-root");
    if (!r){
      r = document.createElement("div");
      r.id = "inspector-root";
      r.className = "inspector-root"; // deine bestehende CSS kann diese Klasse stylen
      r.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(8,12,18,.92);color:#cfe0f2;display:none;";
      r.setAttribute("role","dialog");
      r.setAttribute("aria-modal","true");

      // Kopf
      const head = document.createElement("div");
      head.className = "inspector-head";
      head.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);";
      const hTitle = document.createElement("div");
      hTitle.textContent = "Inspector";
      hTitle.style.cssText = "font-weight:700;font-size:16px;";
      const spacer = document.createElement("div"); spacer.style.flex = "1";
      const btnClose = document.createElement("button");
      btnClose.textContent = "✕";
      btnClose.setAttribute("aria-label","Inspector schließen (ESC)");
      btnClose.style.cssText = "background:#263346;color:#cfe0f2;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;";
      btnClose.addEventListener("click", ()=> UIInspector.close("button"));
      head.append(hTitle, spacer, btnClose);

      // Tabs
      const tabs = document.createElement("div");
      tabs.className = "inspector-tabs";
      tabs.style.cssText = "display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06);";
      const tabNames = ["Logs","Tests","Ressourcen","Pfade"];
      tabNames.forEach((name,idx)=>{
        const t = document.createElement("button");
        t.textContent = name;
        t.dataset.tab = name.toLowerCase();
        t.style.cssText = "background:#314259;color:#e8f2ff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;";
        if(idx===0) t.classList.add("is-active");
        t.addEventListener("click", ()=>{
          tabs.querySelectorAll("button").forEach(b=>b.classList.remove("is-active"));
          t.classList.add("is-active");
          setTab(t.dataset.tab);
        });
        tabs.appendChild(t);
      });

      // Body
      const body = document.createElement("div");
      body.id = "inspector-body";
      body.style.cssText = "padding:12px;max-height:calc(100vh - 110px);overflow:auto;";

      r.append(head, tabs, body);
      document.body.appendChild(r);

      // ESC schließt
      window.addEventListener("keydown", (ev)=>{ if(r.style.display!=="none" && ev.key==="Escape") UIInspector.close("esc"); });
    }
    return r;
  }

  function setTab(tab){
    const body = document.getElementById("inspector-body");
    if(!body) return;
    if (tab === "logs"){
      body.innerHTML = "<div>Log-Stream aktiv. (Dies ist der Fallback-Inspector – deine echten Logs kommen von inspector.logs.js)</div>";
    } else if (tab === "tests"){
      body.innerHTML = `
        <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">
          <button onclick="window.dispatchEvent(new CustomEvent('cb:test:paths:toggle'))">Pfade-Overlay umschalten</button>
          <button onclick="window.dispatchEvent(new CustomEvent('cb:test:heatmap:toggle'))">Heatmap umschalten</button>
          <button onclick="window.dispatchEvent(new CustomEvent('cb:test:perf:tick'))">Perf-Tick</button>
        </div>`;
    } else if (tab === "ressourcen"){
      body.innerHTML = "<div>Ressourcen-Übersicht (Fallback). Echtansicht liefert inspector.resources.js</div>";
    } else if (tab === "pfade"){
      body.innerHTML = "<div>Pfad-Tools (Fallback). Echte Tools liefert inspector.paths.js</div>";
    } else {
      body.innerHTML = "<div>Wähle einen Tab.</div>";
    }
    emit("cb:inspector:tab:change", { tab });
    emit("cb:inspector-tab-change", { tab }); // legacy
  }

  /* ---------- Öffnen/Schließen ---------- */
  function doOpen(origin){
    // 1) Falls es bereits eine „echte“ API gibt, nutzen
    if (window.Inspector?.open) { window.Inspector.open(); return; }

    // 2) Fallback-Overlay
    const r = ensureRoot();
    r.style.display = "block";
    r.classList.add("is-open");
    setTab("logs");
    emitBoth("open",{ from: origin||"UI" });
    LOK("geöffnet ("+INSPECTOR_VERSION+")");
  }
  function doClose(reason){
    if (window.Inspector?.close) { window.Inspector.close(); return; }

    const r = ensureRoot();
    r.style.display = "none";
    r.classList.remove("is-open");
    emitBoth("close",{ reason: reason||"cancel" });
    LOK("geschlossen");
  }
  function doToggle(){
    if (window.Inspector?.toggle) { window.Inspector.toggle(); return; }

    const r = ensureRoot();
    if (r.style.display==="none" || !r.style.display) doOpen("toggle");
    else doClose("toggle");
  }

  /* ---------- Export ---------- */
  window.UIInspector = {
    open: doOpen,
    close: doClose,
    toggle: doToggle,
    version: INSPECTOR_VERSION
  };

  // Auto-Init: Nichts sichtbar machen; nur Root anlegen, falls keins existiert
  document.addEventListener("DOMContentLoaded", ()=>{ ensureRoot(); LIN("bereit ("+INSPECTOR_VERSION+")"); });

})();
