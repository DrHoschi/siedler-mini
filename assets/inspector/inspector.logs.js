/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini – Inspector Logs
 * Version: v18.10.10
 *
 * Zweck
 *  - Log-Tab UI (Filter, Badges, Suche, Kopieren/Export)
 *  - Striktes Slot-Rendering: nur in vom Core bereitgestellte Slots schreiben
 *  - Safety-Hook: Historie + Live-Stream beim Öffnen, Poll-Fallback
 * -------------------------------------------------------------------------- */

(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.10";
  const core = window.__INSPECTOR_CORE__?.api;
  if (!core) { console.warn(MOD, "Core-API fehlt"); return; }

  const LVL_CLASS = { info:"log-info", ok:"log-ok", warn:"log-warn", err:"log-error", error:"log-error" };
  const logOk   = (...a)=> (window.CBLog?.ok   || console.log).apply(console,[MOD, ...a]);
  const logWarn = (...a)=> (window.CBLog?.warn || console.warn).apply(console,[MOD, ...a]);

  // ---- State ----------------------------------------------------------------
  const state = { showInfo:true, showOk:true, showWarn:true, showErr:true, query:"", counts:{info:0,ok:0,warn:0,err:0} };
  let els = { view:null, search:null, badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null };
  let raw = []; let lastLen = 0; let pollTimer = null;

  // ---- Utilities -------------------------------------------------------------
  const qSlot = (name)=> core.getSlot(name);
  const detectLevel = (x)=>{
    if (!x) return "info";
    if (typeof x === "object") return (x.lvl||x.level||"info").toString().toLowerCase();
    const s = String(x);
    if (/\bERR(OR)?\b/i.test(s)) return "err";
    if (/\bWARN(ING)?\b/i.test(s)) return "warn";
    if (/\bOK\b/i.test(s))       return "ok";
    if (/\bINFO\b/i.test(s))     return "info";
    return "info";
  };
  const toText = (x)=>{
    if (x == null) return "";
    if (typeof x === "object") {
      const t = x.t||x.time||x.ts||"";
      const src = x.src||x.source||x.scope||"";
      const msg = x.msg ?? x.message ?? x.text ?? JSON.stringify(x);
      return t ? `[${t}] ${src?src+" ": ""}${msg}` : `${src?src+" ": ""}${msg}`;
    }
    return String(x);
  };
  const readBuffer = ()=> { try { const b = window.CBLog?.getBuffer?.(); return Array.isArray(b)? b.slice(): []; } catch(_){ return []; } };

  // ---- Controls --------------------------------------------------------------
  function buildControls(){
    const host = qSlot("logs-controls"); if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div"); wrap.className = "ins-controls";

    const mkToggle = (label,key,title)=>{
      const b=document.createElement("button");
      b.className="ins-toggle"; b.dataset.key=key; b.textContent=label; b.title=title||"";
      b.classList.toggle("active", !!state[key]);
      b.addEventListener("click", ()=>{ state[key]=!state[key]; b.classList.toggle("active", !!state[key]); renderList(); });
      return b;
    };
    const mkBadge = ()=>{ const s=document.createElement("span"); s.className="ins-badge"; s.textContent="0"; return s; };

    const tInfo = mkToggle("INFO","showInfo","Info ein/aus");  els.badgeInfo = tInfo.appendChild(mkBadge());
    const tOk   = mkToggle("OK","showOk","OK ein/aus");        els.badgeOk   = tOk.appendChild(mkBadge());
    const tWarn = mkToggle("WARN","showWarn","Warnungen ein/aus"); els.badgeWarn = tWarn.appendChild(mkBadge());
    const tErr  = mkToggle("ERR","showErr","Fehler ein/aus");  els.badgeErr  = tErr.appendChild(mkBadge());

    const search = document.createElement("input");
    search.type="search"; search.placeholder="Suche…"; search.className="ins-search";
    search.addEventListener("input", ()=>{ state.query=(search.value||"").trim().toLowerCase(); renderList(); });
    els.search = search;

    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async ()=>{
      try { await navigator.clipboard.writeText(currentViewText()); flash(btnCopy); }
      catch(_){ alert("Kopieren nicht möglich (Clipboard)"); }
    });

    const btnExport = document.createElement("button");
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", ()=>{
      const blob = new Blob([currentViewText()], {type:"text/plain"});
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href=url; a.download="logs.txt"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWarn,tErr,search,btnCopy,btnExport);
    host.appendChild(wrap);
  }

  function flash(el){ el.classList.add("ins-flash"); setTimeout(()=>el.classList.remove("ins-flash"), 600); }

  // ---- View -----------------------------------------------------------------
  function mountView(){
    const host = qSlot("logs-view"); if (!host) return;
    host.innerHTML = "";
    const div = document.createElement("div"); div.className="ins-logview";
    host.appendChild(div); els.view = div;
  }

  function renderList(){
    if (!els.view) return;
    const q = state.query;
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    const frag = document.createDocumentFragment();
    for (let i=0;i<raw.length;i++){
      const entry = raw[i]; const lvl = detectLevel(entry); const txt = toText(entry);
      if (lvl in state.counts) state.counts[lvl]++;

      if ((lvl==="info" && !state.showInfo) || (lvl==="ok" && !state.showOk) ||
          (lvl==="warn" && !state.showWarn) || (lvl==="err" && !state.showErr)) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement("div");
      line.className = LVL_CLASS[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }
    els.view.innerHTML = ""; els.view.appendChild(frag); updateBadges();
    // Autoscroll an's Ende
    els.view.scrollTop = els.view.scrollHeight;
  }

  function updateBadges(){
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  function currentViewText(){
    // aus der gefilterten Sicht exportieren
    const q = state.query; const out=[];
    for (let i=0;i<raw.length;i++){
      const e=raw[i]; const lvl=detectLevel(e); const txt=toText(e).trim();
      if ((lvl==="info" && !state.showInfo) || (lvl==="ok" && !state.showOk) ||
          (lvl==="warn" && !state.showWarn) || (lvl==="err" && !state.showErr)) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;
      out.push(txt);
    }
    return out.join("\n");
  }

  // ---- Stream ---------------------------------------------------------------
  function onAppend(entry){ raw.push(entry); pushLine(entry); }
  function pushLine(entry){
    if (!els.view) return;
    const lvl=detectLevel(entry); const txt=toText(entry); const q=state.query;

    if (lvl in state.counts) state.counts[lvl]++;
    const passLvl = (lvl!=="info"||state.showInfo)&&(lvl!=="ok"||state.showOk)&&
                    (lvl!=="warn"||state.showWarn)&&(lvl!=="err"||state.showErr);
    if (passLvl && (!q || txt.toLowerCase().includes(q))){
      const d=document.createElement("div"); d.className=LVL_CLASS[lvl]||"log-info"; d.textContent=txt;
      els.view.appendChild(d); els.view.scrollTop = els.view.scrollHeight;
      updateBadges();
    } else { updateBadges(); }
  }

  function startStream(){
    // initial
    raw = readBuffer(); lastLen = raw.length; renderList();

    if (typeof window.CBLog?.on === "function"){
      try { window.CBLog.on("append", onAppend); logOk("stream via CBLog.on"); return; }
      catch(_){}
    }
    // Poll-Fallback
    pollTimer = window.setInterval(()=>{
      const buf = readBuffer();
      if (buf.length !== lastLen){
        const diff = buf.slice(lastLen); lastLen = buf.length; diff.forEach(onAppend);
      }
    }, 800);
    logWarn("nutze Poll-Fallback (kein CBLog.on)");
  }
  function stopStream(){
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window.CBLog?.off === "function"){
      try { window.CBLog.off("append", onAppend); } catch(_){}
    }
  }

  // ---- Safety-Hook: Historie & Live bei Öffnen/Schließen --------------------
  (function attachLogStreamOnce(){
    if (window.__INS_LOGS_WIRED__) return; window.__INS_LOGS_WIRED__ = true;

    window.addEventListener("cb:inspector-open", ()=>{
      try { window.CBLog?.LogStream?.start?.(); } catch(_){}
      // beim Öffnen sofort puffern, falls core schon vorher lief
      raw = readBuffer(); lastLen = raw.length; renderList();
    });

    window.addEventListener("cb:inspector-close", ()=>{
      try { window.CBLog?.LogStream?.stop?.(); } catch(_){}
    });

    // minimaler console-Fallback (wenn kein CBLog existiert)
    if (!window.CBLog){
      ["log","info","warn","error"].forEach(k=>{
        const orig = console[k];
        console[k] = function(...args){
          try {
            onAppend({ ts:Date.now(), level:k.toUpperCase(), scope:"console", msg: args.map(x=>String(x)).join(" ") });
          } catch(_){}
          return orig.apply(this, args);
        };
      });
    }
  })();

  // ---- Tab-Mount (wird vom Core EINMAL pro Lauf aufgerufen) -----------------
  core.mount("logs", ()=>{
    buildControls();
    mountView();
    startStream();
    logOk("bereit", VER);

    // optional: Unmount
    return ()=> { stopStream(); };
  });

})();
