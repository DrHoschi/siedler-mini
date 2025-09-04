/* ============================================================================
 * assets/inspector/inspector.build.js — v18.10.4
 * Build-Tab (liest window.BUILD_CATEGORIES; Fallback vorhanden)
 * ========================================================================== */
(function(){
  "use strict";
  const Core = window.__InspectorCore__; if (!Core) return;

  function render(body/*, footer*/){
    const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES))
      ? window.BUILD_CATEGORIES
      : [
          { id:"general", title:"Allg.", items:[
            { id:"hq", label:"Hauptquartier" },
            { id:"depot", label:"Depot" },
            { id:"house", label:"Haus" }
          ]},
          { id:"production", title:"Produktion", items:[
            { id:"farm", label:"Farm" },
            { id:"fischer", label:"Fischer" }
          ]}
        ];

    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";
    body.appendChild(wrap);

    const mkH = (t)=>{ const x=document.createElement("div"); x.textContent=t; x.style.cssText="opacity:.85;font-weight:700;margin-top:6px"; return x; };
    const mkPill=(txt,dis)=>{
      const b=document.createElement("button");
      b.className="ins-btn"; b.style.borderRadius="999px";
      b.textContent=txt; b.disabled=!!dis;
      b.style.background = dis?"rgba(255,255,255,.06)":"rgba(255,255,255,.12)";
      b.style.opacity = dis?".55":"1";
      return b;
    };

    cats.forEach(cat=>{
      wrap.appendChild(mkH(cat.title||cat.id));
      const row=document.createElement("div");
      row.style.cssText="display:flex;flex-wrap:wrap;gap:6px";
      (cat.items||[]).forEach(it=>{
        const btn = mkPill(it.label||it.id, !!it.todo);
        if(!it.todo){
          btn.addEventListener("click", ()=>{
            try{ window.dispatchEvent(new CustomEvent("cb:build-select", { detail:{ type: it.id } })); }catch{}
            (window.CBLog?.log||console.log)("[Build] Auswahl:", it.id);
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });
  }

  Core.registerTab("build","Build", render);
})();
