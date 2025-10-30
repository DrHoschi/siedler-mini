/* ============================================================================
 * Datei   : inspector/ui-inspector.content-v1.js
 * Zweck   : UI-Aufbau (Tabs/Panels), Konsolen-Hook, Ressourcen-Anzeige
 * ========================================================================= */
(() => {
  const host = () => document.querySelector("#inspector, #inspector-overlay");
  const now  = () => new Date().toLocaleTimeString();

  /* --- LogSink ------------------------------------------------------------ */
  const LogSink = {
    tbody:null,
    init(){ this.tbody=document.querySelector("#insp-log-body"); this.hook(); },
    hook(){
      const c=console, orig={log:c.log.bind(c),warn:c.warn.bind(c),error:c.error.bind(c)};
      ["log","warn","error"].forEach(k=>{
        c[k]=(...a)=>{ try{this.push(k,a.join(" "));}catch{}; orig[k](...a); };
      });
    },
    push(type,msg){
      const tb=this.tbody; if(!tb)return;
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${now()}</td><td>${type}</td><td>${msg}</td>`;
      tb.appendChild(tr); tb.scrollTop=tb.scrollHeight;
    }
  };

  /* --- Shell erzeugen ----------------------------------------------------- */
  function buildShell(){
    const h=host(); if(!h)return;
    if(h.querySelector(".insp-shell"))return;
    h.innerHTML=`
      <div class="insp-shell">
        <div class="insp-header">
          <div class="insp-tabs">
            <button class="insp-tab active" data-tab="logs">Logs</button>
            <button class="insp-tab" data-tab="build">Build</button>
            <button class="insp-tab" data-tab="resources">Ressourcen</button>
            <button class="insp-tab" data-tab="paths">Pfade</button>
            <button class="insp-tab" data-tab="tests">Tests</button>
          </div>
        </div>
        <div class="insp-content">
          <section data-panel="logs"><table class="insp-table">
            <thead><tr><th>Zeit</th><th>Typ</th><th>Nachricht</th></tr></thead>
            <tbody id="insp-log-body"></tbody></table></section>
          <section data-panel="build" hidden><div id="insp-build"></div></section>
          <section data-panel="resources" hidden><table id="insp-res">
            <thead><tr><th>Ressource</th><th>Menge</th></tr></thead><tbody></tbody></table></section>
          <section data-panel="paths" hidden><div id="insp-paths">–</div></section>
          <section data-panel="tests" hidden><div id="insp-tests">–</div></section>
        </div>
      </div>`;
    window.dispatchEvent(new CustomEvent("cb:insp:content:ready"));
  }

  /* --- Tabs --------------------------------------------------------------- */
  function bindTabs(){
    const h=host(); if(!h)return;
    h.querySelectorAll(".insp-tab").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const id=btn.dataset.tab;
        h.querySelectorAll(".insp-tab").forEach(b=>b.classList.toggle("active",b===btn));
        h.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==id);
        window.dispatchEvent(new CustomEvent("cb:insp:tab:change",{detail:{tab:id}}));
      });
    });
  }

  /* --- Ressourcen-Updater ------------------------------------------------- */
  window.addEventListener("cb:res:change",(e)=>{
    const data=e.detail?.list||{}, tb=document.querySelector("#insp-res tbody");
    if(!tb)return;
    tb.innerHTML="";
    Object.entries(data).forEach(([k,v])=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${k}</td><td>${v}</td>`; tb.appendChild(tr);
    });
  });

  /* --- Start -------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded",()=>{
    buildShell(); bindTabs(); LogSink.init();
    console.log("[insp] Content bereit.");
  });
})();
