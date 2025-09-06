/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.11.0
 *
 * Zweck:
 *  - Logs-Tab UI (Filter, Badges, Suche, Kopieren/Export + Statuszeile)
 *  - Striktes Slot-Rendering (KEIN body-Append!)
 *  - Safety-Hook: Historie beim Öffnen + Live-Stream (CBLog.on / Poll-Fallback)
 *
 * Abhängigkeiten:
 *  - inspector.core.js → window.__INSPECTOR_CORE__.api:
 *      • mount(tabId, renderFn)
 *      • getSlot(name)
 *      • signal(name, payload?)
 *  - CBLog:
 *      • CBLog.getBuffer() -> Array<string | {t?,msg?,lvl?,src?}>
 *      • optional: CBLog.on('append', fn), .off('append', fn)
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.11.0";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  const logOk = (...a) => (window.CBLog?.ok || console.log)(MOD, ...a);
  const logWarn = (...a) => (window.CBLog?.warn || console.warn)(MOD, ...a);

  function slot(name) {
    return core.api.getSlot?.(name)
      || document.getElementById(`ins-${name}`)
      || document.querySelector(`#inspector .slot-${name}`);
  }

  // --- Safety-Hook: Historie + Live-Stream (einmalig) -----------------------
  (function attachLogStreamOnce(){
    if (window.__INS_LOGS_WIRED__) return;
    window.__INS_LOGS_WIRED__ = true;

    const pumpHistory = () => {
      try {
        const buf = (window.CBLog?.getBuffer?.() || []);
        if (Array.isArray(buf) && buf.length) {
          __pushMany(buf);
          __renderList();
        }
      } catch(_){}
    };

    // beim Öffnen Historie holen + (falls vorhanden) CBLog-Stream nutzen
    window.addEventListener('cb:inspector-open', () => {
      pumpHistory();
      try { window.CBLog?.LogStream?.start?.(); } catch(_) {}
    });

    window.addEventListener('cb:inspector-close', () => {
      try { window.CBLog?.LogStream?.stop?.(); } catch(_) {}
    });

    // falls bereits offen (AutoOpen): direkt befüllen
    if (document.body.classList.contains('inspector-open')) {
      pumpHistory();
      try { window.CBLog?.LogStream?.start?.(); } catch(_) {}
    }
  })();

  // --- Level-Mapping ---------------------------------------------------------
  const LVL = {
    info: "log-info", ok: "log-ok", warn: "log-warn", err: "log-error", error: "log-error",
    INFO: "log-info", OK: "log-ok", WARN: "log-warn", ERR: "log-error"
  };

  function detectLevel(line) {
    if (!line) return "info";
    if (typeof line === "object") {
      return (line.lvl || line.level || "info").toString().toLowerCase();
    }
    const s = String(line);
    if (/\bERR(OR)?\b/i.test(s)) return "err";
    if (/\bWARN(ING)?\b/i.test(s)) return "warn";
    if (/\bOK\b/i.test(s)) return "ok";
    if (/\bINFO\b/i.test(s)) return "info";
    return "info";
  }

  function toText(line) {
    if (!line && line !== 0) return "";
    if (typeof line === "object") {
      const t = line.t || line.time || "";
      const src = line.src || line.source || "";
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${src ? src + " " : ""}${msg}` : `${src ? src + " " : ""}${msg}`;
    }
    return String(line);
  }

  // --- State -----------------------------------------------------------------
  let raw = [];           // ungefiltert (Objekte/Strings)
  let lastLen = 0;        // Pufferlänge zuletzt
  let pollTimer = null;   // Poll-Fallback

  const state = {
    showInfo: true, showOk: true, showWarn: true, showErr: true,
    query: "",
    counts: { info:0, ok:0, warn:0, err:0 }
  };

  // DOM-Refs
  const els = {
    controls: null, view: null, status: null,
    badgeInfo: null, badgeOk: null, badgeWarn: null, badgeErr: null,
    search: null
  };

  // --- Stream/Buffer ---------------------------------------------------------
  function readBufferSafe() {
    try {
      const buf = window.CBLog?.getBuffer?.() || [];
      return Array.isArray(buf) ? buf.slice() : [];
    } catch { return []; }
  }

  function startStream() {
    // initial
    raw = readBufferSafe();
    lastLen = raw.length;

    // Live via CBLog.on
    if (typeof window.CBLog?.on === "function") {
      try {
        window.CBLog.on("append", onAppend);
        logOk("Stream verbunden (append)");
      } catch {
        startPoll();
      }
    } else {
      startPoll();
    }
  }

  function startPoll() {
    pollTimer = window.setInterval(() => {
      const buf = readBufferSafe();
      if (buf.length !== lastLen) {
        const diff = buf.slice(lastLen);
        lastLen = buf.length;
        diff.forEach(onAppend);
      }
    }, 800);
    logWarn("nutze Poll-Fallback (kein CBLog.on)");
  }

  function stopStream() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window.CBLog?.off === "function") {
      try { window.CBLog.off("append", onAppend); } catch {}
    }
  }

  function onAppend(entry) {
    raw.push(entry);
    __pushOne(entry);
  }

  // --- Controls / Badges / Status -------------------------------------------
  function buildControls() {
    const host = slot("logs-controls");
    if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkToggle = (label, key, title) => {
      const b = document.createElement("button");
      b.className = "ins-toggle";
      b.title = title || "";
      b.textContent = label;
      if (state[key]) b.classList.add("active");
      b.addEventListener("click", () => {
        state[key] = !state[key];
        b.classList.toggle("active", !!state[key]);
        __renderList();
      });
      return b;
    };
    const mkBadge = () => {
      const s = document.createElement("span");
      s.className = "ins-badge"; s.textContent = "0";
      return s;
    };

    // Toggles + Badges
    const tInfo = mkToggle("INFO", "showInfo", "Info ein/aus");
    const bInfo = mkBadge(); tInfo.appendChild(bInfo); els.badgeInfo = bInfo;

    const tOk = mkToggle("OK", "showOk", "OK ein/aus");
    const bOk = mkBadge(); tOk.appendChild(bOk); els.badgeOk = bOk;

    const tWarn = mkToggle("WARN", "showWarn", "Warnungen ein/aus");
    const bWarn = mkBadge(); tWarn.appendChild(bWarn); els.badgeWarn = bWarn;

    const tErr = mkToggle("ERR", "showErr", "Fehler ein/aus");
    const bErr = mkBadge(); tErr.appendChild(bErr); els.badgeErr = bErr;

    // Suche
    const s = document.createElement("input");
    s.type = "search"; s.placeholder = "Suche…"; s.className = "ins-search";
    s.addEventListener("input", () => { state.query = (s.value||"").toLowerCase().trim(); __renderList(); });
    els.search = s;

    // Kopieren
    const btnCopy = document.createElement("button");
    btnCopy.className = "ins-btn"; btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async () => {
      try {
        const all = __stringifyCurrentView();
        await navigator.clipboard.writeText(all);
        __flash(btnCopy);
      } catch { alert("Kopieren nicht möglich (Clipboard)"); }
    });

    // Export
    const btnExport = document.createElement("button");
    btnExport.className = "ins-btn"; btnExport.textContent = "Export";
    btnExport.addEventListener("click", () => {
      const blob = new Blob([__stringifyCurrentView()], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "logs.txt";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    wrap.append(tInfo, tOk, tWarn, tErr, s, btnCopy, btnExport);
    host.appendChild(wrap);
  }

  function buildStatusBar() {
    const host = slot("logs-status");
    if (!host) return;
    host.innerHTML = "";

    const bar = document.createElement("div");
    bar.className = "ins-statusbar";

    const mk = (cls, label, getter) => {
      const span = document.createElement("span");
      span.innerHTML = `<span class="dot ${cls}"></span>${label}: <strong>${getter()}</strong>`;
      return span;
    };

    const getTotal = () => String(raw.length);
    const getFInfo = () => String(state.counts.info);
    const getFOk   = () => String(state.counts.ok);
    const getFWarn = () => String(state.counts.warn);
    const getFErr  = () => String(state.counts.err);

    bar.append(
      document.createTextNode("Logs gesamt: "),
      (function(){ const b=document.createElement("strong"); b.textContent=getTotal(); b.dataset.key="total"; return b; })(),
      document.createTextNode("  "),
      mk("info","Info", getFInfo),
      mk("ok","OK", getFOk),
      mk("warn","Warn", getFWarn),
      mk("err","Err", getFErr),
    );

    host.appendChild(bar);
    els.status = bar;
  }

  function updateBadgesAndStatus() {
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
    // total in Status
    const totalEl = els.status?.querySelector('strong[data-key="total"]');
    if (totalEl) totalEl.textContent = String(raw.length);
  }

  // --- View Mount ------------------------------------------------------------
  function mountView() {
    const host = slot("logs-view");
    if (!host) return;
    host.innerHTML = "";
    const v = document.createElement("div");
    v.className = "ins-logview";
    host.appendChild(v);
    els.view = v;
  }

  // --- Rendering -------------------------------------------------------------
  function __clearCounts() {
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;
  }

  function __lineNode(obj) {
    const txt = toText(obj);
    const lvl = detectLevel(obj).toLowerCase();

    const line = document.createElement("div");
    line.className = `ins-logline ${LVL[lvl]||"log-info"}`;

    const icon = document.createElement("span");
    icon.className = "ins-level-icon";
    icon.textContent = (lvl==="err" ? "❌" : lvl==="warn" ? "⚠" : lvl==="ok" ? "✅" : "ℹ");

    const body = document.createElement("div");
    body.textContent = txt;

    line.append(icon, body);
    return { line, lvl, txt };
  }

  function __renderList() {
    if (!els.view) return;
    const q = state.query;
    __clearCounts();

    const frag = document.createDocumentFragment();
    for (let i=0; i<raw.length; i++){
      const obj = raw[i];
      const { line, lvl, txt } = __lineNode(obj);

      // Counter
      if (lvl in state.counts) state.counts[lvl]++;

      // Level-Filter
      if ((lvl==="info" && !state.showInfo) ||
          (lvl==="ok"   && !state.showOk)   ||
          (lvl==="warn" && !state.showWarn) ||
          (lvl==="err"  && !state.showErr)) continue;

      // Text-Filter
      if (q && !txt.toLowerCase().includes(q)) continue;

      frag.appendChild(line);
    }

    els.view.innerHTML = "";
    els.view.appendChild(frag);
    updateBadgesAndStatus();
    els.view.scrollTop = els.view.scrollHeight; // ans Ende
  }

  function __pushOne(entry) {
    // zählt IMMER total
    const lvl = detectLevel(entry).toLowerCase();
    if (lvl in state.counts) state.counts[lvl]++;

    // angezeigt nur, wenn Filter passt
    const q = state.query;
    const { line, txt } = __lineNode(entry);

    const passLevel =
      (lvl !== "info" || state.showInfo) &&
      (lvl !== "ok"   || state.showOk)   &&
      (lvl !== "warn" || state.showWarn) &&
      (lvl !== "err"  || state.showErr);

    const passText = !q || txt.toLowerCase().includes(q);

    if (passLevel && passText && els.view) {
      els.view.appendChild(line);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadgesAndStatus();
  }

  function __pushMany(arr) {
    if (!Array.isArray(arr) || !arr.length) return;
    for (let i=0;i<arr.length;i++) {
      // total-counter wird in __renderList() neu gerechnet,
      // hier nur anfügen (roh)
      // (gezählt wird beim Rendern/PushOne)
    }
    raw = arr.slice();
  }

  function __stringifyCurrentView() {
    // aktuelles Filterergebnis als Text exportieren
    const q = state.query;
    const out = [];
    for (let i=0;i<raw.length;i++){
      const obj = raw[i];
      const lvl = detectLevel(obj).toLowerCase();
      const txt = toText(obj);

      if ((lvl==="info" && !state.showInfo) ||
          (lvl==="ok"   && !state.showOk)   ||
          (lvl==="warn" && !state.showWarn) ||
          (lvl==="err"  && !state.showErr)) continue;

      if (q && !txt.toLowerCase().includes(q)) continue;
      out.push(txt);
    }
    return out.join("\n");
  }

  function __flash(el){ el.classList.add("ins-flash"); setTimeout(()=>el.classList.remove("ins-flash"), 600); }

  // --- Mount ins Tab ---------------------------------------------------------
  core.api.mount("logs", () => {
    // Slots füllen
    buildControls();
    mountView();
    buildStatusBar();

    // Initial befüllen
    raw = readBufferSafe();
    lastLen = raw.length;
    __renderList();

    // Stream starten
    startStream();

    // signal optional
    core.api?.signal?.("logs:ready", { version: VER });
    logOk("bereit", VER);

    // Unmount
    return () => stopStream();
  });

})();
