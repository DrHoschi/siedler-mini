/* ============================================================================
 * Datei   : ui/inspector/inspector.tab.events.js
 * Projekt : Neue Siedler
 * Version : v1.0.1 (2025-10-21)
 * Zweck   : Inspector-Tab "Events" – robustes Warten auf Inspector-API
 * ========================================================================== */
(function(){
  const TAB_ID   = "inspector-tab-events";
  const TAB_NAME = "Events";
  let   triedLog = false;

  // --- Mini Markdown -> HTML (wie zuvor) -----------------------------------
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }
  function mdToHtml(md){
    if(!md) return "<em>Keine Daten</em>";
    md = md.replace(/^###### (.*)$/gm, "<h6>$1</h6>")
           .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
           .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
           .replace(/^### (.*)$/gm, "<h3>$1</h3>")
           .replace(/^## (.*)$/gm, "<h2>$1</h2>")
           .replace(/^# (.*)$/gm, "<h1>$1</h1>")
           .replace(/```([\s\S]*?)```/g, (m,code)=>`<pre><code>${escapeHtml(code)}</code></pre>`)
           .replace(/`([^`]+)`/g, "<code>$1</code>");
    if(md.includes("\n|")){
      md = md.replace(/(?:^|\n)(\|.+\|)(?:\n\|[-:\s]+\|)+((?:\n\|.*\|)+)/g, (m, header, rows)=>{
        const ths = header.split("|").slice(1,-1).map(s=>s.trim()).map(h=>`<th>${h}</th>`).join("");
        const trs = rows.trim().split("\n").map(line=>{
          const tds = line.split("|").slice(1,-1).map(s=>s.trim()).map(v=>`<td>${v}</td>`).join("");
          return `<tr>${tds}</tr>`;
        }).join("");
        return `\n<table class="inspector-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>\n`;
      });
    }
    md = md.replace(/\n{2,}/g, "</p><p>");
    return `<p>${md}</p>`;
  }

  async function loadEventsMd(){
    try{
      const res = await fetch("docs/EVENTS.md", { cache: "no-cache" });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      return mdToHtml(md);
    }catch(err){
      return `<div class="warn">Konnte <code>docs/EVENTS.md</code> nicht laden (${escapeHtml(String(err))}).<br>
        Erzeuge die Datei mit <code>npm run events</code>.</div>`;
    }
  }

  function getAPI(){
    return (window.Inspector && typeof window.Inspector.registerTab === "function")
        || (window.__INSPECTOR__ && typeof window.__INSPECTOR__.registerTab === "function")
        || (window.inspector && typeof window.inspector.registerTab === "function");
  }

  function registerNow(){
    const api = window.Inspector || window.__INSPECTOR__ || window.inspector;
    if(!api || !api.registerTab) return false;

    api.registerTab({
      id: TAB_ID,
      title: TAB_NAME,
      icon: "📡",
      onShow: async (el)=>{
        el.innerHTML = `<div class="pad">Lade Event-Doku …</div>`;
        const html = await loadEventsMd();
        el.innerHTML = `
          <div class="pad">
            <div class="toolbar">
              <button id="btn-reload-events">Neu laden</button>
              <span class="hint">Erzeuge/aktualisiere per <code>npm run events</code></span>
            </div>
            <div class="md">${html}</div>
          </div>`;
        el.querySelector("#btn-reload-events")?.addEventListener("click", async (ev)=>{
          const btn = ev.currentTarget;
          btn.disabled = true; btn.textContent = "Lade …";
          const fresh = await loadEventsMd();
          el.querySelector(".md").innerHTML = fresh;
          btn.textContent = "Neu laden"; btn.disabled = false;
        });
      }
    });
    console.log("[inspector-events] Tab registriert");
    return true;
  }

  // --- Robust warten: Event-Hooks + Polling --------------------------------
  function waitAndRegister(timeoutMs = 10000){
    const start = Date.now();
    const tick  = () => {
      if(getAPI()){
        registerNow();
        return;
      }
      if(!triedLog){
        triedLog = true;
        console.warn("[inspector-events] Inspector API nicht gefunden – warte …");
      }
      if(Date.now() - start < timeoutMs){
        setTimeout(tick, 300);
      }else{
        console.warn("[inspector-events] Timeout: keine Inspector-API gefunden.");
      }
    };
    tick();
  }

  // Falls der Inspector ein eigenes Ready-Event feuert, hier abhören:
  // (wir decken mehrere mögliche Namen ab)
  ["inspector:ready","cb:inspector:ready","INSPECTOR_READY"].forEach(evt=>{
    window.addEventListener(evt, ()=> registerNow() || waitAndRegister(5000), { once:true });
  });

  // Fallback: nach DOMContentLoaded mit dem Warten beginnen
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=> waitAndRegister());
  }else{
    waitAndRegister();
  }
})();
