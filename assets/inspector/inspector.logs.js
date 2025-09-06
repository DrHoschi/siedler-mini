/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.11
 *
 * Zweck:
 *  - Logs-Tab (Filter, Badges, Suche, Kopieren/Export)
 *  - Holt beim Öffnen die CBLog-Historie und hängt live an.
 *  - Fällt auf console-Hooking zurück, wenn kein CBLog-Eventstream vorhanden.
 *
 * Erwartet vom Core (inspector.core.js):
 *   window.__INSPECTOR_CORE__.api = {
 *     mount(tabId, renderFn) -> optional unmount()
 *     getSlot(name)          -> DOM-Element (z.B. 'logs-controls', 'logs-view')
 *     signal(name, payload)  -> optional
 *   }
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.11";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // ----------------------------- Helpers ------------------------------------
  const ok   = (...a) => (window.CBLog?.ok   || console.log)(MOD, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(MOD, ...a);

  const LVL_CLASS = {
    info: "log-info",
    ok:   "log-ok",
    warn: "log-warn",
    err:  "log-error",
    error:"log-error",
    INFO: "log-info",
    OK:   "log-ok",
    WARN: "log-warn",
    ERR:  "log-error",
  };

  function detectLevel(entry) {
    if (!entry && entry !== 0) return "info";
    if (typeof entry === "object") {
      return (entry.lvl || entry.level || "info").toString().toLowerCase();
    }
    const s = String(entry);
    if (/\bERR(OR)?\b/i.test(s))  return "err";
    if (/\bWARN(ING)?\b/i.test(s))return "warn";
    if (/\bOK\b/i.test(s))        return "ok";
    return "info";
  }
  function toText(entry) {
    if (!entry && entry !== 0) return "";
    if (typeof entry === "object") {
      const t   = entry.t || entry.time || entry.ts || "";
      const src = entry.src || entry.source || entry.scope || "";
      const msg = entry.msg ?? entry.message ?? entry.text ?? JSON.stringify(entry);
      return t ? `[${t}] ${src ? src + " " : ""}${msg}` : `${src ? src + " " : ""}${msg}`;
    }
    return String(entry);
  }
  function qSlot(name) {
    return (
      core.api.getSlot?.(name) ||
      document.getElementById(`ins-${name}`) ||
      document.querySelector(`#inspector .slot-${name}`)
    );
  }

  // --------------------------- State / Els ----------------------------------
  const state = {
    showInfo:true, showOk:true, showWarn:true, showErr:true,
    query:"", counts:{info:0, ok:0, warn:0, err:0}
  };
  const els = {
    view:null, search:null,
    badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null
  };

  // --------------------------- Controls UI ----------------------------------
  function buildControls(){
    const host = qSlot("logs-controls"); if(!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkToggle = (label,key,title)=>{
      const b=document.createElement("button");
      b.className="ins-toggle";
      b.dataset.key=key;
      b.textContent=label;
      b.title=title||"";
      if(state[key]) b.classList.add("active");
      b.addEventListener("click",()=>{
        state[key]=!state[key];
        b.classList.toggle("active", !!state[key]);
        renderList();
      });
      return b;
    };
    const mkBadge = ()=>{ const s=document.createElement("span"); s.className="ins-badge"; s.textContent="0"; return s; };

    const tInfo=mkToggle("INFO","showInfo","Info ein/aus"); els.badgeInfo=mkBadge(); tInfo.appendChild(els.badgeInfo);
    const tOk  =mkToggle("OK","showOk","OK ein/aus");       els.badgeOk  =mkBadge(); tOk.appendChild(els.badgeOk);
    const tWarn=mkToggle("WARN","showWarn","Warnungen ein/aus"); els.badgeWarn=mkBadge(); tWarn.appendChild(els.badgeWarn);
    const tErr =mkToggle("ERR","showErr","Fehler ein/aus"); els.badgeErr =mkBadge(); tErr.appendChild(els.badgeErr);

    const search=document.createElement("input");
    search.type="search"; search.placeholder="Suche…"; search.className="ins-search";
    search.addEventListener("input",()=>{ state.query=(search.value||"").trim().toLowerCase(); renderList(); });
    els.search=search;

    const btnCopy=document.createElement("button");
    btnCopy.textContent="Kopieren";
    btnCopy.addEventListener("click", async ()=>{
      try{ await navigator.clipboard.writeText(cache.join("\n")); flash(btnCopy); }
      catch(_){ alert("Kopieren nicht möglich (Clipboard)"); }
    });

    const btnExport=document.createElement("button");
    btnExport.textContent="Export";
    btnExport.addEventListener("click", ()=>{
      const blob=new Blob([cache.join("\n")],{type:"text/plain"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download="logs.txt";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWarn,tErr,search,btnCopy,btnExport);
    host.appendChild(wrap);
  }
  function flash(el){ el.classList.add("ins-flash"); setTimeout(()=>el.classList.remove("ins-flash"),600); }

  // --------------------------- View -----------------------------------------
  function mountView(){
    const host=qSlot("logs-view"); if(!host) return;
    host.innerHTML="";
    const panel=document.createElement("div");
    panel.className="ins-logview";
    host.appendChild(panel);
    els.view=panel;
  }

  // --------------------------- Buffer/Stream --------------------------------
  let rawBuffer=[]; let lastLen=0; let cache=[]; let pollTimer=null;

  function readBufferSafe(){
    try{ const buf=window.CBLog?.getBuffer?.(); return Array.isArray(buf)?buf.slice():[]; }
    catch(_){ return []; }
  }
  function rebuildCacheFromRaw(){ cache = rawBuffer.map(toText); }

  function pushLine(entry){
    if(!els.view) return;
    const lvl=detectLevel(entry).toLowerCase();
    const txt=toText(entry);
    if (lvl in state.counts) state.counts[lvl]++;

    const passLevel =
      (lvl!=="info"||state.showInfo) && (lvl!=="ok"||state.showOk) &&
      (lvl!=="warn"||state.showWarn) && (lvl!=="err"||state.showErr);
    const passText = !state.query || txt.toLowerCase().includes(state.query);
    if(passLevel && passText){
      const line=document.createElement("div");
      line.className = LVL_CLASS[lvl] || "log-info";
      line.textContent = txt;
      els.view.appendChild(line);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }
  function onAppend(entry){ rawBuffer.push(entry); pushLine(entry); }

  function renderList(){
    if(!els.view) return;
    state.counts.info=state.counts.ok=state.counts.warn=state.counts.err=0;

    const frag=document.createDocumentFragment();
    for(let i=0;i<rawBuffer.length;i++){
      const entry=rawBuffer[i];
      const lvl=detectLevel(entry).toLowerCase();
      const txt=toText(entry);

      if (lvl in state.counts) state.counts[lvl]++;

      if ((lvl==="info"&&!state.showInfo) || (lvl==="ok"&&!state.showOk) ||
          (lvl==="warn"&&!state.showWarn) || (lvl==="err"&&!state.showErr)) continue;
      if (state.query && !txt.toLowerCase().includes(state.query)) continue;

      const line=document.createElement("div");
      line.className = LVL_CLASS[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }
    els.view.innerHTML="";
    els.view.appendChild(frag);
    updateBadges();
  }
  function updateBadges(){
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  function startStream(){
    // Historie
    rawBuffer = readBufferSafe(); lastLen = rawBuffer.length;
    rebuildCacheFromRaw(); renderList();

    // Event-Stream (wenn vorhanden)
    if (typeof window.CBLog?.on === "function") {
      try { window.CBLog.on("append", onAppend); ok("Stream verbunden (append)"); return; }
      catch(_){}
    }
    // Fallback Poll
    pollTimer = window.setInterval(()=>{
      const buf = readBufferSafe();
      if (buf.length !== lastLen) {
        const diff = buf.slice(lastLen);
        lastLen = buf.length;
        diff.forEach(onAppend);
      }
    }, 800);
    warn("nutze Poll-Fallback (kein CBLog.on)");
  }
  function stopStream(){
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer=null;
    if (typeof window.CBLog?.off === "function") {
      try{ window.CBLog.off("append", onAppend); }catch(_){}
    }
  }

  // --------------------------- Mount Tab ------------------------------------
  core.api.mount("logs", ()=>{
    buildControls();
    mountView();
    startStream();
    core.api?.signal?.("logs:ready", { version: VER });
    ok("bereit", VER);
    return ()=> stopStream();
  });

  // --------------------- SAFETY HOOK (auch ohne CBLog.on) -------------------
  // Einmalig: Historie beim Öffnen anstoßen + optional console-Hooking
  (function attachSafetyHookOnce(){
    if (window.__INS_LOGS_WIRED__) return;
    window.__INS_LOGS_WIRED__ = true;

    const pumpHistory = ()=>{
      try{
        const buf = readBufferSafe();
        if (buf.length) buf.forEach(onAppend);
      }catch(_){}
    };

    window.addEventListener("cb:inspector-open", ()=>{
      pumpHistory();
      try{ window.CBLog?.LogStream?.start?.(); }catch(_){}
    });
    window.addEventListener("cb:inspector-close", ()=>{
      try{ window.CBLog?.LogStream?.stop?.(); }catch(_){}
    });

    // falls schon offen
    if (document.body.classList.contains("inspector-open")) pumpHistory();

    // Minimal-Fallback: console.* hooken, wenn kein CBLog existiert
    if (!window.CBLog) {
      ["log","info","warn","error"].forEach(k=>{
        const orig = console[k];
        console[k] = function(...args){
          const msg = args.map(a=>String(a)).join(" ");
          onAppend({ ts: Date.now(), level: k.toUpperCase(), scope:"console", msg });
          return orig.apply(this, args);
        };
      });
    }
  })();

})();
