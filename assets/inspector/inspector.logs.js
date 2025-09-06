/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.12
 *
 * Zweck:
 *   - Logs-Tab (Filter, Badges, Suche, Kopieren/Export)
 *   - Sauberes Slot-Rendering (keine body-Appends)
 *   - Safety-Hook: Historie beim Öffnen + Live-Stream (CBLog.on oder Poll)
 * ========================================================================== */

/* --- LOG-STREAM SAFETY HOOK (global, vor dem Modul) ---------------------- */
(function attachLogStreamOnce(){
  if (window.__INS_LOGS_WIRED__) return;
  window.__INS_LOGS_WIRED__ = true;

  const pumpHistory = () => {
    try{
      const buf = (window.CBLog?.getBuffer?.() || []);
      if (Array.isArray(buf) && buf.length){
        buf.forEach(entry => {
          try{ window.__INS_LOG_PUSH__?.(entry); }catch(_){}
        });
        try{ window.__INS_LOG_RENDER__?.(); }catch(_){}
      }
    }catch(_){}
  };

  window.addEventListener('cb:inspector-opened', ()=>{
    pumpHistory();
    try{ window.CBLog?.LogStream?.start?.(); }catch(_){}
  });
  window.addEventListener('cb:inspector-closed', ()=>{
    try{ window.CBLog?.LogStream?.stop?.(); }catch(_){}
  });

  // Falls bereits offen (z.B. Auto-Open)
  if (document.body.classList.contains('inspector-open')){
    pumpHistory();
    try{ window.CBLog?.LogStream?.start?.(); }catch(_){}
  }

  // Minimaler Fallback ohne CBLog: console hooken
  if (!window.CBLog){
    ['log','info','warn','error'].forEach(k=>{
      const orig = console[k];
      console[k] = function(...args){
        try{
          const line = {
            t: Date.now(),
            lvl: k === 'error' ? 'err' : (k==='warn'?'warn':(k==='info'?'info':'ok')),
            src: 'console',
            msg: args.map(a=> String(a)).join(' ')
          };
          window.__INS_LOG_PUSH__?.(line);
          window.__INS_LOG_RENDER__?.();
        }catch(_){}
        return orig.apply(this, args);
      };
    });
  }
})();

/* --- LOGS-MODUL ----------------------------------------------------------- */
(function(){
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.12";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function"){
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  const info = (...a)=>(window.CBLog?.info||console.log)(MOD, ...a);
  const warn = (...a)=>(window.CBLog?.warn||console.warn)(MOD, ...a);

  // Slots
  function $slot(name){
    return core.api.getSlot(name);
  }

  // Level → CSS
  const LVL = {
    info:"log-info", ok:"log-ok", warn:"log-warn", err:"log-error",
    INFO:"log-info", OK:"log-ok", WARN:"log-warn", ERR:"log-error", error:"log-error"
  };

  function detectLevel(line){
    if (!line) return "info";
    if (typeof line === "object"){
      return (line.lvl || line.level || "info").toString().toLowerCase();
    }
    const s = String(line);
    if (/\bERR(OR)?\b/i.test(s)) return "err";
    if (/\bWARN(ING)?\b/i.test(s)) return "warn";
    if (/\bOK\b/i.test(s))   return "ok";
    if (/\bINFO\b/i.test(s)) return "info";
    return "info";
  }
  function toText(line){
    if (!line && line!==0) return "";
    if (typeof line === "object"){
      const t = line.t || line.time || "";
      const src = line.src || line.source || "";
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${src?src+" ":""}${msg}` : `${src?src+" ":""}${msg}`;
    }
    return String(line);
  }

  // Buffer/State
  let raw = [];          // Rohpuffer (Objekte/Strings)
  let lastLen = 0;
  let poll = null;

  const state = {
    showInfo:true, showOk:true, showWarn:true, showErr:true,
    query:"", counts:{info:0, ok:0, warn:0, err:0}
  };
  const els = { view:null, badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null };

  // Controls
  function buildControls(){
    const host = $slot("logs-controls"); if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkT = (label, key, title)=>{
      const b = document.createElement("button");
      b.className = "ins-toggle"; b.dataset.key = key; b.title = title||"";
      b.textContent = label; if (state[key]) b.classList.add("active");
      b.addEventListener("click", ()=>{
        state[key] = !state[key];
        b.classList.toggle("active", !!state[key]);
        renderList();
      });
      return b;
    };
    const mkBadge = ()=>{ const s=document.createElement("span"); s.className="ins-badge"; s.textContent="0"; return s; };

    const tInfo = mkT("INFO","showInfo","Info ein/aus"); const bInfo=mkBadge(); tInfo.appendChild(bInfo); els.badgeInfo=bInfo;
    const tOk   = mkT("OK","showOk","OK ein/aus");       const bOk  =mkBadge(); tOk.appendChild(bOk);   els.badgeOk=bOk;
    const tWarn = mkT("WARN","showWarn","Warnungen");    const bWarn=mkBadge(); tWarn.appendChild(bWarn);els.badgeWarn=bWarn;
    const tErr  = mkT("ERR","showErr","Fehler");         const bErr =mkBadge(); tErr.appendChild(bErr);  els.badgeErr=bErr;

    const search = document.createElement("input");
    search.type="search"; search.className="ins-search"; search.placeholder="Suche…";
    search.addEventListener("input", ()=>{ state.query=(search.value||"").trim().toLowerCase(); renderList(); });

    const btnCopy = document.createElement("button");
    btnCopy.textContent="Kopieren";
    btnCopy.addEventListener("click", async ()=>{
      try{
        const all = raw.map(toText).join("\n");
        await navigator.clipboard.writeText(all);
        flash(btnCopy);
      }catch(_){ alert("Kopieren nicht möglich."); }
    });

    const btnExport = document.createElement("button");
    btnExport.textContent="Export";
    btnExport.addEventListener("click", ()=>{
      const blob = new Blob([raw.map(toText).join("\n")], {type:"text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="logs.txt";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo, tOk, tWarn, tErr, search, btnCopy, btnExport);
    host.appendChild(wrap);
  }

  function flash(el){
    el.classList.add("ins-flash");
    setTimeout(()=>el.classList.remove("ins-flash"), 600);
  }

  // View
  function mountView(){
    const host = $slot("logs-view"); if (!host) return;
    host.innerHTML = "";
    const v = document.createElement("div");
    v.className = "ins-logview";
    host.appendChild(v);
    els.view = v;
  }

  // Render
  function renderList(){
    if (!els.view) return;
    // reset counts
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    const q = state.query;
    const frag = document.createDocumentFragment();

    for (let i=0;i<raw.length;i++){
      const o = raw[i];
      const txt = toText(o);
      const lvl = detectLevel(o);

      // counts
      if (lvl in state.counts) state.counts[lvl]++;

      // level filter
      if ((lvl==="info" && !state.showInfo) ||
          (lvl==="ok"   && !state.showOk)   ||
          (lvl==="warn" && !state.showWarn) ||
          (lvl==="err"  && !state.showErr)) continue;

      // text filter
      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement("div");
      line.className = LVL[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }

    els.view.innerHTML = "";
    els.view.appendChild(frag);
    updateBadges();
    els.view.scrollTop = els.view.scrollHeight;
  }

  function updateBadges(){
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  // Streaming
  function readBufferSafe(){
    try{
      const buf = window.CBLog?.getBuffer?.();
      return Array.isArray(buf) ? buf.slice() : [];
    }catch(_){ return []; }
  }
  function onAppend(entry){
    raw.push(entry);
    pushLine(entry);
  }
  function startStream(){
    raw = readBufferSafe();
    lastLen = raw.length;
    renderList();

    if (typeof window.CBLog?.on === "function"){
      try{ window.CBLog.on("append", onAppend); info("Stream verbunden (append)"); return; }catch(_){}
    }
    // Poll-Fallback
    poll = window.setInterval(()=>{
      const buf = readBufferSafe();
      if (buf.length !== lastLen){
        const diff = buf.slice(lastLen);
        lastLen = buf.length;
        diff.forEach(onAppend);
      }
    }, 800);
    (window.CBLog?.warn||console.warn)(MOD, "nutze Poll-Fallback (kein CBLog.on)");
  }
  function stopStream(){
    if (poll) window.clearInterval(poll);
    poll = null;
    if (typeof window.CBLog?.off === "function"){
      try{ window.CBLog.off("append", onAppend); }catch(_){}
    }
  }
  function pushLine(entry){
    if (!els.view) return;
    const txt = toText(entry);
    const lvl = detectLevel(entry);

    // counts
    if (lvl in state.counts) state.counts[lvl]++;

    // live-Filter
    const q = state.query;
    const passLevel =
      (lvl!=="info" || state.showInfo) &&
      (lvl!=="ok"   || state.showOk)   &&
      (lvl!=="warn" || state.showWarn) &&
      (lvl!=="err"  || state.showErr);
    const passText = !q || txt.toLowerCase().includes(q);

    if (passLevel && passText){
      const div = document.createElement("div");
      div.className = LVL[lvl] || "log-info";
      div.textContent = txt;
      els.view.appendChild(div);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }

  // Exporte für Safety-Hook (oben)
  window.__INS_LOG_PUSH__   = onAppend;
  window.__INS_LOG_RENDER__ = renderList;

  // Mount beim Core registrieren
  core.api.mount("logs", ()=>{
    buildControls();
    mountView();
    startStream();
    info("bereit", VER);

    // Unmount-Cleanup
    return ()=>{ stopStream(); };
  });

})();
