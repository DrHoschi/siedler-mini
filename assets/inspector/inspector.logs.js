/* ============================================================================
 * Inspector Logs – v18.13.1
 *  - Sofort-Pump aus CBLog.getBuffer() beim Öffnen
 *  - Live-Stream (CBLog.on('append')) mit Fallback-Poll
 *  - Slots: 'logs-controls', 'logs-view'
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.13.1";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD,"core API fehlt – breche ab."); return;
  }

  const LVL = { info:"log-info", ok:"log-ok", warn:"log-warn", err:"log-error", error:"log-error" };
  const qSlot = n => core.api.getSlot(n);

  let view, controls;
  let raw = [];        // Rohdaten
  let poll = 0;

  const detectLevel = line=>{
    if (!line) return "info";
    if (typeof line==="object") return (line.lvl||line.level||"info").toString().toLowerCase();
    const s=String(line); if(/\bERR(OR)?\b/i.test(s))return"err";
    if(/\bWARN(ING)?\b/i.test(s))return"warn";
    if(/\bOK\b/i.test(s))return"ok"; return"info";
  };
  const toText = line=>{
    if (line==null) return "";
    if (typeof line==="object"){
      const t=line.t||line.time||""; const src=line.src||line.source||""; const msg=line.msg??line.message??line.text??JSON.stringify(line);
      return t?`[${t}] ${src?src+" ":""}${msg}`:`${src?src+" ":""}${msg}`;
    }
    return String(line);
  };

  function renderAll(){
    if (!view) return;
    view.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const entry of raw){
      const txt = toText(entry);
      const lvl = detectLevel(entry);
      const div = document.createElement("div");
      div.className = `log-line ${LVL[lvl]||"log-info"}`;
      div.textContent = txt;
      frag.appendChild(div);
    }
    view.appendChild(frag);
    view.scrollTop = view.scrollHeight;
  }

  function onAppend(entry){
    raw.push(entry);
    if (!view) return;
    const txt = toText(entry);
    const lvl = detectLevel(entry);
    const div = document.createElement("div");
    div.className = `log-line ${LVL[lvl]||"log-info"}`;
    div.textContent = txt;
    view.appendChild(div);
    view.scrollTop = view.scrollHeight;
  }

  function readBufferSafe(){
    try {
      const buf = window.CBLog?.getBuffer?.();
      return Array.isArray(buf)? buf.slice() : [];
    } catch(_) { return []; }
  }

  function start(){
    // 1) Historie pumpen
    raw = readBufferSafe();
    renderAll();

    // 2) Live-Stream
    if (typeof window.CBLog?.on === "function"){
      try { window.CBLog.on("append", onAppend); return; } catch(_){}
    }
    // 3) Poll-Fallback
    poll = window.setInterval(()=>{
      const buf = readBufferSafe();
      if (buf.length>raw.length){
        buf.slice(raw.length).forEach(onAppend);
        raw = buf;
      }
    }, 800);
  }
  function stop(){
    if (poll){ clearInterval(poll); poll=0; }
    if (typeof window.CBLog?.off === "function"){
      try { window.CBLog.off("append", onAppend); } catch(_){}
    }
  }

  // Mount ins Tab
  core.api.mount("logs", ()=>{
    controls = qSlot("logs-controls");
    view     = qSlot("logs-view");
    // Minimal-UI in Controls, falls leer (damit was zu sehen ist)
    if (controls && !controls.firstChild){
      controls.innerHTML = `
        <button class="ins-btn" id="logs-copy">Kopieren</button>
        <button class="ins-btn" id="logs-export">Export</button>`;
      controls.querySelector("#logs-copy")?.addEventListener("click", async ()=>{
        try{ await navigator.clipboard.writeText( (raw||[]).map(toText).join("\n") ); }catch(_){}
      });
      controls.querySelector("#logs-export")?.addEventListener("click", ()=>{
        const blob = new Blob([(raw||[]).map(toText).join("\n")],{type:"text/plain"});
        const url = URL.createObjectURL(blob); const a=document.createElement("a");
        a.href=url; a.download="logs.txt"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      });
    }
    (window.CBLog?.ok || console.log)(MOD,"bereit",VER);

    // Lifecycle am Inspector
    window.addEventListener("cb:inspector-open", start);
    window.addEventListener("cb:inspector-close", stop);
  });

})();
