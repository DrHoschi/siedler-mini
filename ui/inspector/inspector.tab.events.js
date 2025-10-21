/* ============================================================================
 * Datei   : ui/inspector.tab.events.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-10-21)
 * Zweck   : Inspector-Tab "Events" – lädt docs/EVENTS.md und zeigt es an
 * Abhäng. : ui/ui-inspector.js (liefert window.Inspector API)
 * ========================================================================== */

(function(){
  const TAB_ID   = "inspector-tab-events";
  const TAB_NAME = "Events";

  // Minimaler Markdown→HTML Converter (nur das Nötigste)
  function mdToHtml(md){
    if(!md) return "<em>Keine Daten</em>";
    // Headline # -> <h1>, ## -> <h2>, ...
    md = md.replace(/^###### (.*)$/gm, "<h6>$1</h6>")
           .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
           .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
           .replace(/^### (.*)$/gm, "<h3>$1</h3>")
           .replace(/^## (.*)$/gm, "<h2>$1</h2>")
           .replace(/^# (.*)$/gm, "<h1>$1</h1>");
    // Code-Fences
    md = md.replace(/```([\s\S]*?)```/g, (m,code)=>`<pre><code>${escapeHtml(code)}</code></pre>`);
    // Inline-Code
    md = md.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Tabellen (einfach rendern, Zeilenumbrüche <br> innerhalb der Zellen bleiben erhalten)
    // | a | b | -> <table>...
    if(md.includes("\n|")) {
      md = md.replace(/(?:^|\n)(\|.+\|)(?:\n\|[-:\s]+\|)+((?:\n\|.*\|)+)/g, (m, header, rows)=>{
        const ths = header.split("|").slice(1,-1).map(s=>s.trim()).map(h=>`<th>${h}</th>`).join("");
        const trs = rows.trim().split("\n").map(line=>{
          const tds = line.split("|").slice(1,-1).map(s=>s.trim()).map(v=>`<td>${v}</td>`).join("");
          return `<tr>${tds}</tr>`;
        }).join("");
        return `\n<table class="inspector-table">${`<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody>`}</table>\n`;
      });
    }
    // Absätze / Zeilenumbrüche
    md = md.replace(/\n{2,}/g, "</p><p>");
    md = `<p>${md}</p>`;
    return md;
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  }

  async function loadEventsMd(){
    try{
      const res = await fetch("docs/EVENTS.md", { cache: "no-cache" });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      return mdToHtml(md);
    }catch(err){
      return `<div class="warn">Konnte <code>docs/EVENTS.md</code> nicht laden (${escapeHtml(String(err))}).<br>
      Starte vorher <code>npm run events</code>.</div>`;
    }
  }

  // Tab beim Inspector registrieren
  function register(){
    if(!window.Inspector || !window.Inspector.registerTab){
      console.warn("[inspector-events] Inspector API nicht gefunden – lade später erneut.");
      return setTimeout(register, 500);
    }
    window.Inspector.registerTab({
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
        const btn = el.querySelector("#btn-reload-events");
        btn?.addEventListener("click", async ()=>{
          btn.disabled = true;
          btn.textContent = "Lade …";
          const fresh = await loadEventsMd();
          el.querySelector(".md").innerHTML = fresh;
          btn.textContent = "Neu laden";
          btn.disabled = false;
        });
      }
    });
    console.log("[inspector-events] Tab registriert");
  }

  register();
})();
