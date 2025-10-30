/* ============================================================================
 * Datei   : inspector/ui-inspector.content-v1.js
 * Version : v25.11.01
 * Zweck   : Baut NUR die sichtbare Shell (Tabs + leere Panels).
 *           → JEDER Tab liefert seine Logik/Controls selbst (eigene Datei).
 * ========================================================================== */
(() => {
  const host = () => document.querySelector("#inspector, #inspector-overlay");

  function buildShell(){
    const h=host(); if(!h){ console.warn("[insp.content] Kein Host gefunden"); return; }
    // Aktiven Tab ermitteln und einmalig anzeigen (damit Logs direkt mounten)
const activeBtn = h.querySelector(".insp-tab.active");
const activeId = activeBtn?.getAttribute("data-tab") || "logs";
window.dispatchEvent(new CustomEvent("cb:insp:tab:change", { detail: { tab: activeId } }));
    if(h.querySelector(".insp-shell")) return; // idempotent

    // Tabs definieren (Button-Reihenfolge)
    const TABS = [
      {id:"logs",      title:"Logs"},
      {id:"build",     title:"Build"},
      {id:"resources", title:"Ressourcen"},
      {id:"paths",     title:"Pfade"},
      {id:"tests",     title:"Tests"},
      {id:"editor",    title:"Editoren"},
      {id:"ui",        title:"UI"},
    ];

    const tabsHTML = TABS.map((t,i)=>
      `<button class="insp-tab ${i===0?"active":""}" data-tab="${t.id}" role="tab" aria-selected="${i===0}">${t.title}</button>`
    ).join("");

    const sections = TABS.map((t,i)=>
      `<section data-panel="${t.id}" ${i===0?"":"hidden"}></section>`
    ).join("");

    h.innerHTML = `
      <div class="insp-shell" role="dialog" aria-label="Inspector">
        <div class="insp-header">
          <div class="insp-tabs" role="tablist">${tabsHTML}</div>
        </div>
        <div class="insp-content">
          ${sections}
        </div>
      </div>`;

    // Tabs schalten
    h.querySelector(".insp-tabs")?.addEventListener("click", (ev)=>{
      const btn = ev.target?.closest?.(".insp-tab"); if(!btn) return;
      const id = btn.getAttribute("data-tab");
      h.querySelectorAll(".insp-tab").forEach(b=>{
        const active = (b===btn);
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });
      h.querySelectorAll("[data-panel]").forEach(sec=>{
        sec.toggleAttribute("hidden", sec.getAttribute("data-panel")!==id);
      });
      window.dispatchEvent(new CustomEvent("cb:insp:tab:change",{detail:{tab:id}}));
    });

    // Meldung: Content bereit
    window.dispatchEvent(new CustomEvent("cb:insp:content:ready"));
    console.log("[insp] Content bereit (Shell).");
  }

  document.addEventListener("DOMContentLoaded", buildShell);
})();
