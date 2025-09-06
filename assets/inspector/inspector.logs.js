/* ============================================================================
 * Inspector Logs – v18.11.4
 * - Filter (INFO/OK/WARN/ERR) mit deutlichem aktiv/inaktiv-Style
 * - Suche, Kopieren, Export
 * - CBLog-Stream (on:append) + Poll-Fallback
 * - Slot-Rendering nur innerhalb des Overlays
 * ========================================================================== */
(function () {
  "use strict";
  const MOD = "[inspector.logs]";
  const VER = "v18.11.4";
  const core = window.__INSPECTOR_CORE__;
  if (!core?.api?.mount) { console.warn(MOD, "core api fehlt"); return; }

  const LVL_CLASS = { info:"log-info", ok:"log-ok", warn:"log-warn", err:"log-error" };

  const state = { showInfo:true, showOk:true, showWarn:true, showErr:true, query:"", counts:{info:0,ok:0,warn:0,err:0} };
  let els = { view:null, badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null, search:null };
  let raw = [], lastLen = 0, poll=null;

  function levelOf(entry){
    if (entry && typeof entry==="object") return String(entry.lvl||entry.level||"info").toLowerCase();
    const s = String(entry||"");
    if (/\berr(or)?\b/i.test(s)) return "err";
    if (/\bwarn(ing)?\b/i.test(s)) return "warn";
    if (/\bok\b/i.test(s)) return "ok";
    return "info";
  }
  function textOf(entry){
    if (!entry && entry!==0) return "";
    if (typeof entry==="object"){
      const t = entry.t || entry.time || "";
      const src = entry.src || entry.source || "";
      const msg = entry.msg ?? entry.message ?? entry.text ?? JSON.stringify(entry);
      return t ? `[${t}] ${src?src+" ":""}${msg}` : `${src?src+" ":""}${msg}`;
    }
    return String(entry);
  }
  function readBuf(){ try{ const b = window.CBLog?.getBuffer?.()||[]; return Array.isArray(b)?b.slice():[]; }catch(_){return [];} }

  function buildControls(){
    const host = core.api.getSlot("logs-controls"); if (!host) return;
    host.innerHTML = "";
    const wrap = document.createElement("div"); wrap.className = "ins-controls";

    const mkToggle = (label, key, hint) => {
      const btn = document.createElement("button");
      btn.className = "ins-toggle";
      btn.dataset.key = key;
      btn.innerHTML = `<span class="tbox">${label}</span><span class="ins-badge">0</span>`;
      btn.title = hint || "";
      btn.setAttribute("aria-pressed", state[key] ? "true":"false");
      btn.addEventListener("click", () => {
        state[key] = !state[key];
        btn.classList.toggle("active", state[key]);
        btn.setAttribute("aria-pressed", state[key] ? "true":"false");
        render();
      });
      // Start-State
      btn.classList.toggle("active", state[key]);
      return btn;
    };

    const tInfo = mkToggle("INFO","showInfo","Info ein/aus");
    const tOk   = mkToggle("OK","showOk","OK ein/aus");
    const tWarn = mkToggle("WARN","showWarn","Warnungen ein/aus");
    const tErr  = mkToggle("ERR","showErr","Fehler ein/aus");

    els.badgeInfo = tInfo.querySelector(".ins-badge");
    els.badgeOk   = tOk  .querySelector(".ins-badge");
    els.badgeWarn = tWarn.querySelector(".ins-badge");
    els.badgeErr  = tErr .querySelector(".ins-badge");

    const search = document.createElement("input");
    search.type="search"; search.placeholder="Suche…"; search.className="ins-search";
    search.addEventListener("input", ()=>{ state.query=(search.value||"").trim().toLowerCase(); render(); });
    els.search = search;

    const btnCopy = document.createElement("button");
    btnCopy.className = "ins-btn";
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async ()=>{
      try{ await navigator.clipboard.writeText(renderedLines().join("\n")); flash(btnCopy);}catch(_){ alert("Clipboard nicht verfügbar"); }
    });

    const btnExport = document.createElement("button");
    btnExport.className = "ins-btn";
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", ()=>{
      const blob = new Blob([renderedLines().join("\n")],{type:"text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="logs.txt"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo, tOk, tWarn, tErr, search, btnCopy, btnExport);
    host.appendChild(wrap);
  }

  function flash(el){ el.classList.add("ins-flash"); setTimeout(()=>el.classList.remove("ins-flash"), 550); }

  function mountView(){
    const host = core.api.getSlot("logs-view"); if (!host) return;
    host.innerHTML = "";
    const v = document.createElement("div");
    v.className = "ins-logview";
    host.appendChild(v);
    els.view = v;
  }

  function updateBadges(){
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk  .textContent = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr .textContent = String(state.counts.err);
  }

  function renderedLines(){
    const q = state.query;
    const out = [];
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    for (let i=0;i<raw.length;i++){
      const e = raw[i];
      const lvl = levelOf(e);
      const txt = textOf(e);
      if (lvl in state.counts) state.counts[lvl]++;

      const passLvl =
        (lvl!=="info" || state.showInfo) &&
        (lvl!=="ok"   || state.showOk)   &&
        (lvl!=="warn" || state.showWarn) &&
        (lvl!=="err"  || state.showErr);

      if (!passLvl) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;

      out.push({ lvl, txt });
    }
    return out.map(o => o.txt);
  }

  function render(){
    if (!els.view) return;
    const q = state.query;
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    const frag = document.createDocumentFragment();
    for (let i=0;i<raw.length;i++){
      const e = raw[i];
      const lvl = levelOf(e);
      const txt = textOf(e);
      if (lvl in state.counts) state.counts[lvl]++;

      const passLvl =
        (lvl!=="info" || state.showInfo) &&
        (lvl!=="ok"   || state.showOk)   &&
        (lvl!=="warn" || state.showWarn) &&
        (lvl!=="err"  || state.showErr);
      if (!passLvl) continue;

      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement("div");
      line.className = "log-line " + (LVL_CLASS[lvl]||"log-info");
      line.textContent = txt;
      frag.appendChild(line);
    }
    els.view.innerHTML = "";
    els.view.appendChild(frag);
    els.view.scrollTop = els.view.scrollHeight;
    updateBadges();
  }

  function onAppend(e){ raw.push(e); render(); }

  function startStream(){
    raw = readBuf(); lastLen = raw.length;
    if (typeof window.CBLog?.on === "function"){
      try{ window.CBLog.on("append", onAppend); return; }catch(_){}
    }
    // Poll-Fallback
    poll = setInterval(()=>{
      const b = readBuf();
      if (b.length !== lastLen){ b.slice(lastLen).forEach(onAppend); lastLen = b.length; }
    }, 800);
  }
  function stopStream(){
    if (poll) clearInterval(poll), poll=null;
    try{ window.CBLog?.off?.("append", onAppend); }catch(_){}
  }

  // Safety-Hook: wenn Overlay geöffnet wird und Logs noch leer sind → initial laden
  (function hookOnce(){
    if (window.__INS_LOGS_WIRED__) return; window.__INS_LOGS_WIRED__ = true;
    window.addEventListener("cb:inspector-open", ()=>{ if (!raw.length){ raw = readBuf(); render(); } startStream(); }, {passive:true});
    window.addEventListener("cb:inspector-close", ()=>{ stopStream(); }, {passive:true});
  })();

  // Mount im Core
  core.api.mount("logs", ()=>{
    buildControls();
    mountView();
    raw = readBuf(); lastLen = raw.length;
    render();
    startStream();
    (window.CBLog?.ok || console.log)(`${MOD} bereit ${VER}`);
    return ()=> stopStream();
  });
})();
