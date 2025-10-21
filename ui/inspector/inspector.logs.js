/* ============================================================================
 * ui/inspector/inspector.logs.js – v18.14.5
 *  - Logs-Tab (Filter, Suche, Kopieren/Export)
 *  - Sofortige Füllung beim Öffnen + Live-Stream (CBLog.on / Poll-Fallback)
 *  - Strict Slot-Rendering (nie an <body> anhängen)
 * ========================================================================== */
(function(){
  "use strict";
  const MOD="[inspector.logs]"; const VER="v18.14.5";
  const core = window.__INSPECTOR_CORE__?.api; if(!core){ console.warn(MOD,"core fehlt"); return; }

  // ---- State ---------------------------------------------------------------
  const LVL_CLASS = { info:"log-info log-line", ok:"log-ok log-line", warn:"log-warn log-line", err:"log-error log-line", error:"log-error log-line" };
  let raw=[]; let poll=null;
  const state={ info:true, ok:true, warn:true, err:true, q:"", counts:{info:0,ok:0,warn:0,err:0} };

  // ---- Helpers -------------------------------------------------------------
  const toText = (line)=>{
    if (line==null) return "";
    if (typeof line==="object"){
      const t=line.t||line.ts||line.time||""; const scope=line.src||line.source||line.scope||"";
      const msg=line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${scope?scope+" ":""}${msg}` : `${scope?scope+" ":""}${msg}`;
    }
    return String(line);
  };
  const levelOf = (line)=>{
    if (typeof line==="object") return String(line.lvl||line.level||"info").toLowerCase();
    const s=String(line);
    if (/\berr(or)?\b/i.test(s)) return "err";
    if (/\bwarn(ing)?\b/i.test(s)) return "warn";
    if (/\bok\b/i.test(s)) return "ok";
    return "info";
  };

  // ---- UI Elements ---------------------------------------------------------
  let elView, elBad = {info:null,ok:null,warn:null,err:null}, elSearch;

  function buildControls(){
    const host = core.getSlot("logs-controls"); if (!host) return;
    host.innerHTML="";
    const row=document.createElement("div"); row.className="ins-controls";

    const mkToggle=(label,key)=>{
      const b=document.createElement("button"); b.type="button"; b.className="ins-toggle"; b.innerHTML=`<span class="tbox">${label}</span>`;
      if (state[key]) b.classList.add("active");
      b.addEventListener("click", ()=>{ state[key]=!state[key]; b.classList.toggle("active",state[key]); renderList(); });
      return b;
    };
    const mkBadge=()=>{ const s=document.createElement("span"); s.className="ins-badge"; s.textContent="0"; return s; };

    const tInfo=mkToggle("INFO","info");  elBad.info=mkBadge(); tInfo.appendChild(elBad.info);
    const tOk  =mkToggle("OK","ok");      elBad.ok  =mkBadge(); tOk.appendChild(elBad.ok);
    const tWar =mkToggle("WARN","warn");  elBad.warn=mkBadge(); tWar.appendChild(elBad.warn);
    const tErr =mkToggle("ERR","err");    elBad.err =mkBadge(); tErr.appendChild(elBad.err);

    elSearch=document.createElement("input"); elSearch.type="search"; elSearch.className="ins-search"; elSearch.placeholder="Suche…";
    elSearch.addEventListener("input", ()=>{ state.q=(elSearch.value||"").toLowerCase().trim(); renderList(); });

    const btnCopy=document.createElement("button"); btnCopy.className="ins-btn"; btnCopy.textContent="Kopieren";
    btnCopy.addEventListener("click", async()=>{
      try{ await navigator.clipboard.writeText(raw.map(toText).join("\n")); btnCopy.classList.add("ins-flash"); setTimeout(()=>btnCopy.classList.remove("ins-flash"),500); }
      catch(_){ alert("Clipboard nicht verfügbar"); }
    });

    const btnExport=document.createElement("button"); btnExport.className="ins-btn"; btnExport.textContent="Export";
    btnExport.addEventListener("click", ()=>{
      const blob=new Blob([raw.map(toText).join("\n")],{type:"text/plain"}); const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download="logs.txt"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    row.append(tInfo,tOk,tWar,tErr,elSearch,btnCopy,btnExport);
    host.appendChild(row);
  }

  function mountView(){
    const host = core.getSlot("logs-view"); if (!host) return;
    host.innerHTML=""; elView=document.createElement("div"); elView.className="slot-logs-view"; host.appendChild(elView);
  }

  // ---- Rendering -----------------------------------------------------------
  function renderList(){
    if (!elView) return;
    // Zähler reset
    state.counts.info=state.counts.ok=state.counts.warn=state.counts.err=0;
    const q=state.q;

    const frag=document.createDocumentFragment();
    for (let i=0;i<raw.length;i++){
      const obj = raw[i];
      const txt = toText(obj);
      const lvl = levelOf(obj);
      // counters
      if (lvl in state.counts) state.counts[lvl]++;
      // filters
      if ((lvl==="info" && !state.info) || (lvl==="ok"&&!state.ok) || (lvl==="warn"&&!state.warn) || (lvl==="err"&&!state.err)) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;

      const div=document.createElement("div");
      div.className = LVL_CLASS[lvl] || LVL_CLASS.info;
      div.textContent = txt;
      frag.appendChild(div);
    }
    elView.innerHTML=""; elView.appendChild(frag);
    // badges
    if (elBad.info) elBad.info.textContent=String(state.counts.info);
    if (elBad.ok)   elBad.ok.textContent  =String(state.counts.ok);
    if (elBad.warn) elBad.warn.textContent=String(state.counts.warn);
    if (elBad.err)  elBad.err.textContent =String(state.counts.err);
    // autoscroll an Ende
    elView.scrollTop=elView.scrollHeight;
  }

  function pushLine(entry){
    raw.push(entry);
    // inkrementelles Zeichnen (respektiert Filter)
    if (!elView) return;
    const txt=toText(entry); const lvl=levelOf(entry);
    const passLvl = (lvl!=="info"||state.info)&&(lvl!=="ok"||state.ok)&&(lvl!=="warn"||state.warn)&&(lvl!=="err"||state.err);
    const passTxt = !state.q || txt.toLowerCase().includes(state.q);
    if (passLvl && passTxt){
      const div=document.createElement("div"); div.className=LVL_CLASS[lvl]||LVL_CLASS.info; div.textContent=txt; elView.appendChild(div);
      elView.scrollTop=elView.scrollHeight;
    }
    // badges hochzählen
    if (lvl in state.counts){ state.counts[lvl]++; const m=elBad[lvl]; if (m) m.textContent=String(state.counts[lvl]); }
  }

  // ---- Log-Stream ----------------------------------------------------------
  function readBuffer(){ try{ const b=window.CBLog?.getBuffer?.(); return Array.isArray(b)? b.slice() : []; } catch(_){ return []; } }
  function startStream(){
    raw = readBuffer();
    if (typeof window.CBLog?.on==="function"){
      try{ window.CBLog.on("append", pushLine); (window.CBLog?.ok||console.log)(MOD,"Stream ok"); return; } catch(_){}
    }
    // Poll-Fallback
    let lastLen=raw.length;
    poll = setInterval(()=>{
      const buf=readBuffer();
      if (buf.length!==lastLen){
        const diff=buf.slice(lastLen); lastLen=buf.length; diff.forEach(pushLine);
      }
    },800);
    (window.CBLog?.warn||console.warn)(`${MOD} nutze Poll-Fallback (kein CBLog.on)`);
  }
  function stopStream(){ if (poll){ clearInterval(poll); poll=null; } if (typeof window.CBLog?.off==="function"){ try{ window.CBLog.off("append", pushLine); }catch(_){}} }

  // beim Öffnen Historie nachschieben (Safety-Hook)
  window.addEventListener("cb:inspector-open", ()=>{
    if (!raw.length) raw = readBuffer();
    renderList();
    try{ window.CBLog?.LogStream?.start?.(); }catch(_){}
  });
  window.addEventListener("cb:inspector-close", ()=>{ try{ window.CBLog?.LogStream?.stop?.(); }catch(_){} });

  // ---- Mount ---------------------------------------------------------------
  core.mount("logs", ()=>{
    buildControls();
    mountView();
    raw = readBuffer();
    renderList();
    startStream();
    (window.CBLog?.ok||console.log)(`${MOD} bereit ${VER}`);
    return ()=> stopStream();
  });
})();
