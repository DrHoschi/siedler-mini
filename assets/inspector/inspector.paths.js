/* ============================================================================
 * Datei: assets/inspector/inspector.paths.js
 * Projekt: Siedler-Mini
 * Version: v18.11.0
 *
 * Zweck:
 *   - Pfade-Tab mit:
 *       • Overlay umschalten  (cb:paths:toggle)
 *       • Heatmap zurücksetzen (cb:paths:reset)
 *       • Live-Status + kleine Statistik (Heatmap-Max, "letzte Pfade")
 *
 * Events/Bridge:
 *   Eingehend (vom UI):
 *     - cb:paths:toggle
 *     - cb:paths:reset
 *   Optional aus Engine:
 *     - window.__cb.pathsEnabled (bool)
 *     - window.__cb.pathStats { heatMax:number, recent:[{from:[x,y],to:[x,y],len:number}] }
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[inspector.paths]";
  const VER = "v18.11.0";

  const core = window.__INSPECTOR_CORE__;
  if (!core?.api?.mount){
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }
  const ok = (...a)=> (window.CBLog?.ok || console.log)(MOD, ...a);

  function qSlot(name){
    return core.api.getSlot?.(name)
        || document.getElementById(`ins-${name}`)
        || document.querySelector(`#inspector .slot-${name}`)
        || document.querySelector(`#inspector .ins-body`);
  }

  function pathsEnabled(){
    try{ return !!(window.__cb && window.__cb.pathsEnabled); }catch(_){}
    return false;
  }
  function pathStats(){
    try{ return window.__cb?.pathStats || {}; }catch(_){}
    return {};
  }

  function render(){
    const host = qSlot("paths-body");
    if (!host) return;
    host.innerHTML = "";

    // Controls
    const ctr = document.createElement("div");
    ctr.className = "ins-controls";

    const btnToggle = document.createElement("button");
    btnToggle.className = "ins-toggle active";
    btnToggle.textContent = "Overlay umschalten";
    btnToggle.addEventListener("click", ()=>{
      try{ window.dispatchEvent(new CustomEvent("cb:paths:toggle")); }catch(_){}
      setTimeout(refresh, 60);
    });

    const btnReset = document.createElement("button");
    btnReset.textContent = "Heatmap zurücksetzen";
    btnReset.addEventListener("click", ()=>{
      try{ window.dispatchEvent(new CustomEvent("cb:paths:reset")); }catch(_){}
      setTimeout(refresh, 60);
    });

    const badge = document.createElement("span");
    badge.className = "ins-badge";
    badge.id = "paths-badge";
    badge.textContent = pathsEnabled() ? "AN" : "AUS";

    ctr.append(btnToggle, btnReset, badge);
    host.appendChild(ctr);

    // Statusbox
    const box = document.createElement("div");
    box.className = "ins-grid";
    const add = (k,v,id)=>{
      const row = document.createElement("div");
      row.className = "kv";
      const l = document.createElement("div"); l.className = "k"; l.textContent = k;
      const r = document.createElement("div"); r.className = "v"; r.textContent = v; if (id) r.id=id;
      row.append(l,r); box.appendChild(row);
    };
    add("Overlay", pathsEnabled() ? "AN" : "AUS", "paths-state");
    add("Heatmap-Max", String(pathStats().heatMax ?? 0), "paths-heatmax");

    host.appendChild(box);

    // Letzte Pfade
    const recWrap = document.createElement("div");
    recWrap.style.marginTop = "10px";
    const recTitle = document.createElement("div");
    recTitle.style.opacity = ".85"; recTitle.style.fontWeight = "700";
    recTitle.textContent = "Letzte Pfade:";
    const list = document.createElement("div");
    list.id = "paths-recent";
    list.style.maxHeight = "30vh";
    list.style.overflow = "auto";
    list.style.padding = "6px 0";
    host.append(recTitle, list);

    refresh();
  }

  function refresh(){
    // Badge + Status
    const on = pathsEnabled();
    const badge = document.getElementById("paths-badge");
    const st    = document.getElementById("paths-state");
    if (badge) badge.textContent = on ? "AN" : "AUS";
    if (st)    st.textContent    = on ? "AN" : "AUS";

    const s = pathStats();
    const hm = document.getElementById("paths-heatmax");
    if (hm) hm.textContent = String(s.heatMax ?? 0);

    const list = document.getElementById("paths-recent");
    if (list){
      list.innerHTML = "";
      const items = Array.isArray(s.recent) ? s.recent.slice(-20).reverse() : [];
      items.forEach((p,i)=>{
        const row = document.createElement("div");
        row.className = "log-ok";
        const from = Array.isArray(p.from)? p.from.join(","): String(p.from);
        const to   = Array.isArray(p.to)  ? p.to.join(",")  : String(p.to);
        row.textContent = `#${i+1}  ${from} → ${to}  (len: ${p.len ?? "?"})`;
        list.appendChild(row);
      });
    }
  }

  core.api.mount("paths", ()=>{
    render();
    // kleiner Status-Update-Loop, falls Engine __cb.pathStats aktualisiert
    const t = setInterval(refresh, 1000);
    core.api?.signal?.("paths:ready", { version: VER });
    ok("bereit", VER);
    return ()=> clearInterval(t);
  });

})();
