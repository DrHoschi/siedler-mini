/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.9
 *
 * Zweck:
 *  - Log-Tab UI (Filter/Badges/Suche/Kopieren/Export)
 *  - Striktes Slot-Rendering (nur in die vom Core bereitgestellten Slots)
 *  - Safety-Hook: beim Öffnen Historie laden + live streamen (CBLog oder Fallback)
 * ========================================================================== */

/* --- LOG-STREAM SAFETY HOOK -------------------------------------------------
   Holt beim Öffnen die Historie + hängt live an. Läuft auch mit Polyfill.
   -> Dieser Block darf VOR dem Modul stehen, damit er früh aktiv ist.       */
(function attachLogStreamOnce(){
  if (window.__INS_LOGS_WIRED__) return;
  window.__INS_LOGS_WIRED__ = true;

  const pumpHistory = () => {
    try {
      const buf = (window.CBLog?.getBuffer?.() || []);
      if (Array.isArray(buf) && buf.length) {
        buf.forEach(entry => window.__INSPECTOR_API__?.logs?.push?.(entry));
        window.__INSPECTOR_API__?.logs?.render?.();
      }
    } catch(_){}
  };

  // Beim Öffnen Historie übernehmen + Live-Stream (falls vorhanden)
  window.addEventListener('cb:inspector-open', () => {
    pumpHistory();
    try { window.CBLog?.LogStream?.start?.(); } catch(_){}
  });

  // Beim Schließen evtl. stoppen (Ressourcen sparen)
  window.addEventListener('cb:inspector-close', () => {
    try { window.CBLog?.LogStream?.stop?.(); } catch(_){}
  });

  // Wenn beim Laden bereits offen (AutoOpen), direkt anstoßen
  if (document.body.classList.contains('inspector-open')) {
    pumpHistory();
    try { window.CBLog?.LogStream?.start?.(); } catch(_){}
  }

  // Minimaler Fallback: console.* abgreifen, wenn kein CBLog existiert
  if (!window.CBLog) {
    ["log","info","warn","error"].forEach(k=>{
      const orig = console[k];
      console[k] = function(...args){
        try {
          window.__INSPECTOR_API__?.logs?.push?.({
            ts: Date.now(), lvl: k.toUpperCase(), src: "console",
            msg: args.map(a=>String(a)).join(" ")
          });
          window.__INSPECTOR_API__?.logs?.render?.();
        } catch(_){}
        return orig.apply(this, args);
      };
    });
  }
})();

/* --- Modul ---------------------------------------------------------------- */
(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.9";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // Hilfen
  const ok   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  // Level → CSS
  const LVL = { info:"log-info", ok:"log-ok", warn:"log-warn", err:"log-error",
                INFO:"log-info", OK:"log-ok", WARN:"log-warn", ERR:"log-error", error:"log-error" };

  function detectLevel(entry){
    if (!entry) return "info";
    if (typeof entry === "object"){
      return (entry.lvl || entry.level || "info").toString().toLowerCase();
    }
    const s = String(entry);
    if (/\bERR(OR)?\b/i.test(s)) return "err";
    if (/\bWARN(ING)?\b/i.test(s)) return "warn";
    if (/\bOK\b/i.test(s))        return "ok";
    return "info";
  }
  function toText(entry){
    if (entry == null) return "";
    if (typeof entry === "object"){
      const t = entry.t || entry.time || entry.ts || "";
      const src = entry.src || entry.source || "";
      const msg = entry.msg ?? entry.message ?? entry.text ?? JSON.stringify(entry);
      return t ? `[${t}] ${src ? src+" " : ""}${msg}` : `${src ? src+" " : ""}${msg}`;
    }
    return String(entry);
  }

  // State
  const state = {
    showInfo:true, showOk:true, showWarn:true, showErr:true,
    query:"", counts:{info:0, ok:0, warn:0, err:0}
  };
  let els = { view:null, search:null, bInfo:null, bOk:null, bWarn:null, bErr:null };

  // Rohpuffer (liest CBLog tolerant)
  let raw = [];
  let pollTimer = null;

  function readBuffer(){
    try { const b = window.CBLog?.getBuffer?.(); return Array.isArray(b) ? b.slice() : []; }
    catch(_){ return []; }
  }

  // UI -----------------------------------------------------------------------
  function qSlot(n){ return core.api.getSlot(n); }

  function buildControls(){
    const host = qSlot("logs-controls"); if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkToggle = (label, key, title)=>{
      const b = document.createElement("button");
      b.className = "ins-toggle";
      b.textContent = label;
      b.title = title||"";
      if (state[key]) b.classList.add("active");
      b.addEventListener("click", ()=>{
        state[key] = !state[key];
        b.classList.toggle("active", state[key]);
        renderList();
      });
      const badge = document.createElement("span");
      badge.className = "ins-badge";
      badge.textContent = "0";
      b.appendChild(badge);
      return {btn:b, badge};
    };

    const i = mkToggle("INFO","showInfo","Info ein/aus");  els.bInfo=i.badge;
    const o = mkToggle("OK","showOk","OK ein/aus");        els.bOk=o.badge;
    const w = mkToggle("WARN","showWarn","Warnungen ein/aus"); els.bWarn=w.badge;
    const e = mkToggle("ERR","showErr","Fehler ein/aus");  els.bErr=e.badge;

    const search = document.createElement("input");
    search.type="search"; search.placeholder="Suche…"; search.className="ins-search";
    search.addEventListener("input", ()=>{ state.query=(search.value||"").toLowerCase().trim(); renderList(); });
    els.search = search;

    const bCopy = document.createElement("button");
    bCopy.textContent = "Kopieren";
    bCopy.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(raw.map(toText).join("\n"));
        bCopy.classList.add("ins-flash"); setTimeout(()=>bCopy.classList.remove("ins-flash"),600);
      }catch{ alert("Kopieren nicht möglich."); }
    });

    const bExport = document.createElement("button");
    bExport.textContent = "Export";
    bExport.addEventListener("click", ()=>{
      const blob = new Blob([raw.map(toText).join("\n")], {type:"text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "logs.txt";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    wrap.append(i.btn, o.btn, w.btn, e.btn, search, bCopy, bExport);
    host.appendChild(wrap);
  }

  function mountView(){
    const host = qSlot("logs-view"); if (!host) return;
    host.innerHTML = "";
    const v = document.createElement("div");
    v.className = "ins-logview";
    host.appendChild(v);
    els.view = v;
  }

  // Render --------------------------------------------------------------------
  function renderList(){
    if (!els.view) return;
    const q = state.query;

    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    const frag = document.createDocumentFragment();
    for (let i=0;i<raw.length;i++){
      const entry = raw[i];
      const lvl = detectLevel(entry);
      const txt = toText(entry);

      if (lvl in state.counts) state.counts[lvl]++;

      if ((lvl==="info" && !state.showInfo) ||
          (lvl==="ok"   && !state.showOk)   ||
          (lvl==="warn" && !state.showWarn) ||
          (lvl==="err"  && !state.showErr)) continue;

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
    if (els.bInfo) els.bInfo.textContent = String(state.counts.info);
    if (els.bOk)   els.bOk.textContent   = String(state.counts.ok);
    if (els.bWarn) els.bWarn.textContent = String(state.counts.warn);
    if (els.bErr)  els.bErr.textContent  = String(state.counts.err);
  }

  function pushLine(entry){
    raw.push(entry);
    // inkrementelles Rendering (Filter beachten)
    const lvl = detectLevel(entry);
    const txt = toText(entry);
    if (lvl in state.counts) state.counts[lvl]++;

    const passLevel =
      (lvl!=="info" || state.showInfo) &&
      (lvl!=="ok"   || state.showOk)   &&
      (lvl!=="warn" || state.showWarn) &&
      (lvl!=="err"  || state.showErr);
    const passText = !state.query || txt.toLowerCase().includes(state.query);

    if (passLevel && passText && els.view){
      const line = document.createElement("div");
      line.className = LVL[lvl] || "log-info";
      line.textContent = txt;
      els.view.appendChild(line);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }

  // Stream (CBLog.on / Poll) -------------------------------------------------
  function startStream(){
    // Initial lesen
    raw = readBuffer();

    // Event-Stream, falls verfügbar
    if (typeof window.CBLog?.on === "function"){
      try {
        window.CBLog.on("append", pushLine);
        ok("Stream verbunden (append)");
        return;
      } catch(e){ warn("Stream-Setup:", e && e.message); }
    }

    // Poll-Fallback
    let last = raw.length;
    pollTimer = window.setInterval(()=>{
      const b = readBuffer();
      if (b.length !== last){
        b.slice(last).forEach(pushLine);
        last = b.length;
      }
    }, 800);
    warn("nutze Poll-Fallback (kein CBLog.on)");
  }
  function stopStream(){
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window.CBLog?.off === "function"){
      try{ window.CBLog.off("append", pushLine); }catch(_){}
    }
  }

  // --------------------------------------------------------------------------
  // Tab-Mount beim Core registrieren
  // --------------------------------------------------------------------------
  core.api.mount("logs", ()=>{
    buildControls();
    mountView();

    // Historie + erster Render
    raw = readBuffer();
    renderList();

    // Live-Stream starten
    startStream();

    // __INSPECTOR_API__.logs bereitstellen/aktualisieren (für Safety-Hook)
    if (!window.__INSPECTOR_API__) window.__INSPECTOR_API__ = {};
    window.__INSPECTOR_API__.logs = {
      push: pushLine,
      render: renderList
    };

    ok("bereit", VER);

    // Unmount
    return ()=>{ stopStream(); };
  });

})();
