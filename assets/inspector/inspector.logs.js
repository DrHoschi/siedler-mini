/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.11
 *
 * Zweck:
 *  - Log-Tab UI (Filter, Badges, Suche, Kopieren/Export)
 *  - Slot-Rendering (KEIN body-Append!)
 *  - Persistente Filter + Suche (localStorage)
 *  - Auto-Scroll + Pause
 *  - Rehydrate beim Tab-Wechsel
 * Abhängigkeit:
 *  - inspector.core.js stellt window.__INSPECTOR_CORE__.api bereit:
 *      • api.mount(tabId, renderFn)
 *      • api.getSlot(name)              -> DOM-Element
 *      • api.signal(name, payload?)     -> optional
 *  - CBLog:
 *      • CBLog.getBuffer() -> Array<string|object>
 *      • optional: CBLog.on('append', fn)/off
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.11";
  const core = window.__INSPECTOR_CORE__;
  if (!core?.api?.mount) { console.warn(MOD, "core API fehlt – breche ab."); return; }

  // ---------- Storage Keys ---------------------------------------------------
  const LS_KEY = "ins.logs.state.v1";

  // ---------- Hilfen ---------------------------------------------------------
  const logOk   = (...a) => (window.CBLog?.ok   || console.log)(...a);
  const logWarn = (...a) => (window.CBLog?.warn || console.warn)(...a);

  const qSlot = (name) =>
    core.api.getSlot?.(name) ||
    document.getElementById(`ins-${name}`) ||
    document.querySelector(`#inspector .slot-${name}`);

  const LVL = {
    info: "log-info", ok: "log-ok", warn: "log-warn", err: "log-error", error: "log-error",
    INFO: "log-info", OK: "log-ok", WARN: "log-warn", ERR: "log-error",
  };

  const detectLevel = (line) => {
    if (!line) return "info";
    if (typeof line === "object") return String(line.lvl || line.level || "info").toLowerCase();
    const s = String(line);
    if (/\bERR(OR)?\b/i.test(s))  return "err";
    if (/\bWARN(ING)?\b/i.test(s))return "warn";
    if (/\bOK\b/i.test(s))        return "ok";
    if (/\bINFO\b/i.test(s))      return "info";
    return "info";
  };

  const toText = (line) => {
    if (!line && line !== 0) return "";
    if (typeof line === "object") {
      const t = line.t || line.time || line.ts || "";
      const src = line.src || line.source || line.scope || "";
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${src ? src + " " : ""}${msg}` : `${src ? src + " " : ""}${msg}`;
    }
    return String(line);
  };

  // ---------- Log-Puffer + Stream ------------------------------------------
  let rawBuffer = [];
  let lastLen = 0;
  let pollTimer = null;

  const readBufferSafe = () => {
    try { const buf = window.CBLog?.getBuffer?.(); return Array.isArray(buf) ? buf.slice() : []; }
    catch { return []; }
  };

  function onAppend(entry) {
    rawBuffer.push(entry);
    if (!state.paused) pushLine(entry);
  }

  function startStream() {
    rawBuffer = readBufferSafe();
    lastLen = rawBuffer.length;

    if (typeof window.CBLog?.on === "function") {
      try { window.CBLog.on("append", onAppend); logOk(MOD, "Stream verbunden"); return; } catch {}
    }
    // Fallback-Poll
    pollTimer = window.setInterval(() => {
      const buf = readBufferSafe();
      if (buf.length !== lastLen) {
        buf.slice(lastLen).forEach(onAppend);
        lastLen = buf.length;
      }
    }, 800);
    logWarn(MOD, "nutze Poll-Fallback (kein CBLog.on)");
  }
  function stopStream() {
    if (pollTimer) clearInterval(pollTimer), (pollTimer = null);
    try { window.CBLog?.off?.("append", onAppend); } catch {}
  }

  // ---------- State/UI -------------------------------------------------------
  const defaults = { showInfo: true, showOk: true, showWarn: true, showErr: true, query: "", autoscroll: true, paused: false };
  const loadState = () => { try { return { ...defaults, ...(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) }; } catch { return { ...defaults }; } };
  const saveState = () => { try { localStorage.setItem(LS_KEY, JSON.stringify({ showInfo:state.showInfo, showOk:state.showOk, showWarn:state.showWarn, showErr:state.showErr, query:state.query, autoscroll:state.autoscroll })); } catch {} };

  const state = loadState();
  const counts = { info:0, ok:0, warn:0, err:0 };

  const els = { controls:null, view:null, search:null, badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null, btnPause:null, btnAuto:null };

  function buildControls() {
    const host = qSlot("logs-controls"); if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkToggle = (label, key, title) => {
      const b = document.createElement("button");
      b.className = "ins-toggle"; b.dataset.key = key; b.title = title || "";
      b.textContent = label; b.classList.toggle("active", !!state[key]);
      b.addEventListener("click", () => { state[key] = !state[key]; b.classList.toggle("active", !!state[key]); saveState(); renderList(); });
      return b;
    };
    const mkBadge = () => { const s = document.createElement("span"); s.className = "ins-badge"; s.textContent = "0"; return s; };

    const tInfo = mkToggle("INFO","showInfo","Info ein/aus"); const bInfo = mkBadge(); tInfo.appendChild(bInfo); els.badgeInfo = bInfo;
    const tOk   = mkToggle("OK","showOk","OK ein/aus");        const bOk   = mkBadge(); tOk.appendChild(bOk);   els.badgeOk   = bOk;
    const tWarn = mkToggle("WARN","showWarn","Warnungen");      const bWarn = mkBadge(); tWarn.appendChild(bWarn); els.badgeWarn = bWarn;
    const tErr  = mkToggle("ERR","showErr","Fehler");           const bErr  = mkBadge(); tErr.appendChild(bErr); els.badgeErr  = bErr;

    const search = document.createElement("input");
    search.type = "search"; search.placeholder = "Suche…"; search.className = "ins-search"; search.value = state.query || "";
    search.addEventListener("input", () => { state.query = (search.value||"").trim().toLowerCase(); saveState(); renderList(); });
    els.search = search;

    // Pause
    const btnPause = document.createElement("button");
    btnPause.textContent = state.paused ? "Weiter" : "Pause";
    btnPause.addEventListener("click", () => {
      state.paused = !state.paused;
      btnPause.textContent = state.paused ? "Weiter" : "Pause";
      if (!state.paused) renderList(); // beim Fortsetzen re-rendern
    });
    els.btnPause = btnPause;

    // Auto-Scroll
    const btnAuto = document.createElement("button");
    btnAuto.textContent = state.autoscroll ? "Auto-Scroll: AN" : "Auto-Scroll: AUS";
    btnAuto.addEventListener("click", () => {
      state.autoscroll = !state.autoscroll; saveState();
      btnAuto.textContent = state.autoscroll ? "Auto-Scroll: AN" : "Auto-Scroll: AUS";
    });
    els.btnAuto = btnAuto;

    // Kopieren
    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async () => {
      try {
        const txt = Array.from(els.view?.querySelectorAll(":scope > div")||[]).map(d=>d.textContent||"").join("\n");
        await navigator.clipboard.writeText(txt);
        flash(btnCopy);
      } catch { alert("Kopieren nicht möglich (Clipboard)"); }
    });

    // Export
    const btnExport = document.createElement("button");
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", () => {
      const txt = Array.from(els.view?.querySelectorAll(":scope > div")||[]).map(d=>d.textContent||"").join("\n");
      const blob = new Blob([txt], { type: "text/plain" }); const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href:url, download:"logs.txt" }); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWarn,tErr,search,btnPause,btnAuto,btnCopy,btnExport);
    host.appendChild(wrap);
  }

  const flash = (el) => { el.classList.add("ins-flash"); setTimeout(()=>el.classList.remove("ins-flash"), 600); };

  function mountView() {
    const host = qSlot("logs-view"); if (!host) return;
    host.innerHTML = "";
    const pre = document.createElement("div"); pre.className = "ins-logview";
    host.appendChild(pre); els.view = pre;
  }

  function updateBadges() {
    els.badgeInfo && (els.badgeInfo.textContent = String(counts.info));
    els.badgeOk   && (els.badgeOk.textContent   = String(counts.ok));
    els.badgeWarn && (els.badgeWarn.textContent = String(counts.warn));
    els.badgeErr  && (els.badgeErr.textContent  = String(counts.err));
  }

  function renderList() {
    if (!els.view) return;

    // reset counts
    counts.info = counts.ok = counts.warn = counts.err = 0;
    const q = state.query;

    const frag = document.createDocumentFragment();
    for (let i=0;i<rawBuffer.length;i++){
      const obj = rawBuffer[i];
      const txt = toText(obj);
      const lvl = detectLevel(obj);

      // count
      if (lvl in counts) counts[lvl]++;

      // filter
      if ((lvl==="info" && !state.showInfo) || (lvl==="ok" && !state.showOk) || (lvl==="warn" && !state.showWarn) || (lvl==="err" && !state.showErr)) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement("div");
      line.className = LVL[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }
    els.view.innerHTML = "";
    els.view.appendChild(frag);
    updateBadges();

    if (state.autoscroll) els.view.scrollTop = els.view.scrollHeight;
  }

  function pushLine(entry) {
    if (!els.view) return;

    const txt = toText(entry);
    const lvl = detectLevel(entry);
    if (lvl in counts) counts[lvl]++;

    // filter
    const q = state.query;
    const passLevel = (lvl!=="info" || state.showInfo) && (lvl!=="ok" || state.showOk) && (lvl!=="warn" || state.showWarn) && (lvl!=="err" || state.showErr);
    const passText  = !q || txt.toLowerCase().includes(q);
    if (!passLevel || !passText) { updateBadges(); return; }

    const div = document.createElement("div");
    div.className = LVL[lvl] || "log-info";
    div.textContent = txt;
    els.view.appendChild(div);
    updateBadges();

    if (state.autoscroll) els.view.scrollTop = els.view.scrollHeight;
  }

  // ---------- SAFETY HOOK (History beim Öffnen + Fallback console.*) --------
  (function attachLogStreamOnce(){
    if (window.__INS_LOGS_WIRED__) return;
    window.__INS_LOGS_WIRED__ = true;

    const pumpHistory = () => {
      try {
        const buf = (window.CBLog?.getBuffer?.() || []);
        if (Array.isArray(buf) && buf.length) { rawBuffer = buf.slice(); lastLen = buf.length; renderList(); }
      } catch {}
    };

    window.addEventListener('cb:inspector-open', () => { pumpHistory(); try{ window.CBLog?.LogStream?.start?.(); }catch{} }, { passive:true });
    window.addEventListener('cb:inspector-close', () => { try{ window.CBLog?.LogStream?.stop?.(); }catch{} }, { passive:true });

    if (document.body.classList.contains('inspector-open')) { pumpHistory(); try{ window.CBLog?.LogStream?.start?.(); }catch{} }

    if (!window.CBLog) {
      ['log','info','warn','error'].forEach(k=>{
        const orig = console[k];
        console[k] = function(...args){
          try {
            const entry = { ts: Date.now(), level: k.toUpperCase(), scope: 'console', msg: args.map(a=>String(a)).join(' ') };
            rawBuffer.push(entry); if (!state.paused) pushLine(entry);
          } catch {}
          return orig.apply(this, args);
        };
      });
    }
  })();

  // ---------- Tab-Mount -----------------------------------------------------
  core.api.mount("logs", () => {
    buildControls();
    mountView();

    // initial
    rawBuffer = readBufferSafe(); lastLen = rawBuffer.length; renderList();
    startStream();

    // wenn ein anderer Tab aktiv war und wir zurückkehren → rehydrate
    window.addEventListener("ins:tab:enter:logs", () => { rawBuffer = readBufferSafe(); lastLen = rawBuffer.length; renderList(); }, { passive:true });

    logOk(MOD, "bereit", VER);
    return () => { stopStream(); };
  });

})();
