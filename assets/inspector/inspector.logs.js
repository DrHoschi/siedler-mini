/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.9
 *
 * Zweck:
 *  - Log-Tab UI (Filter, Badges, Suche, Kopieren/Export)
 *  - Striktes Slot-Rendering in das Inspector-Overlay (KEIN body-Append!)
 *  - Safety-Hooks: Historie + Live-Stream + Fallback auf console.*,
 *    wenn CBLog fehlt / kein .on('append') bietet.
 *
 * Abhängigkeiten:
 *  - inspector.core.js stellt window.__INSPECTOR_CORE__ bereit:
 *      • core.api.mount(tabId, renderFn)
 *      • core.api.getSlot(name)  -> DOM-Element ('logs-controls', 'logs-view')
 *      • core.api.signal(name, payload?)  (optional)
 *  - CBLog (Polyfill/Impl):
 *      • CBLog.getBuffer() -> Array<string|object>
 *      • optional: CBLog.on('append', fn) / CBLog.off('append', fn)
 * ========================================================================== */

/* --- SAFETY-HOOK (einmalig) -------------------------------------------------
   Holt Historie beim Öffnen & versucht Live-Stream zu starten. Wenn CBLog
   fehlt, wird console.* sanft gespiegelt, sodass trotzdem Logs sichtbar sind.
   -> Dieser Block ist bewusst VOR dem Modul platziert und läuft einmal. */
(function attachLogStreamOnce(){
  if (window.__INS_LOGS_WIRED__) return;
  window.__INS_LOGS_WIRED__ = true;

  const hasCBLog = !!window.CBLog;

  // Historie (falls vorhanden) in die spätere Log-Ansicht pumpen
  function pumpHistory() {
    try {
      const buf =
        (window.CBLog?.getBuffer?.() ||
         window.CBLog?.buffer ||
         window.__CBLOG_BUFFER ||
         []);
      if (Array.isArray(buf) && buf.length) {
        const api = window.__INSPECTOR_API__?.logs;
        if (api && typeof api.push === "function") {
          buf.forEach(entry => api.push(entry));
          api.render?.();
        }
      }
    } catch(_){}
  }

  // Bei Öffnen: Historie + Live-Start (falls vorhanden)
  window.addEventListener('cb:inspector-open', () => {
    try { pumpHistory(); } catch(_){}
    try { window.CBLog?.LogStream?.start?.(); } catch(_){}
  });

  // Bei Schließen: Live-Stop (schont Akku)
  window.addEventListener('cb:inspector-close', () => {
    try { window.CBLog?.LogStream?.stop?.(); } catch(_){}
  });

  // Falls direkt schon offen (AutoOpen)
  if (document.body.classList.contains('inspector-open')) {
    try { pumpHistory(); } catch(_){}
    try { window.CBLog?.LogStream?.start?.(); } catch(_){}
  }

  // Fallback: console.* spiegeln, falls kein CBLog existiert
  if (!hasCBLog) {
    ['log','info','warn','error'].forEach(k=>{
      const orig = console[k];
      console[k] = function(...args){
        try {
          const api = window.__INSPECTOR_API__?.logs;
          api?.push?.({
            ts: Date.now(),
            level: k.toUpperCase(),
            scope: 'console',
            msg: args.map(a => {
              try { return typeof a === 'string' ? a : JSON.stringify(a); }
              catch(_) { return String(a); }
            }).join(' ')
          });
          api?.render?.();
        } catch (_){}
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

  // Hilfslogger (sanft)
  const logOk   = (...a) => (window.CBLog?.ok   || console.log  )(`${MOD}`, ...a);
  const logWarn = (...a) => (window.CBLog?.warn || console.warn )(`${MOD}`, ...a);

  // Slot-Resolver (neue Slots + defensive Fallbacks)
  function qSlot(name) {
    return (
      core.api.getSlot?.(name) ||
      document.getElementById(`ins-${name}`) ||
      document.querySelector(`#inspector .slot-${name}`)
    );
  }

  // Level-Mapping für CSS
  const LVL = {
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

  function detectLevel(line) {
    if (!line) return "info";
    if (typeof line === "object") {
      return (line.lvl || line.level || "info").toString().toLowerCase();
    }
    const s = String(line);
    if (/\bERR(OR)?\b/i.test(s)) return "err";
    if (/\bWARN(ING)?\b/i.test(s)) return "warn";
    if (/\bOK\b/i.test(s))       return "ok";
    if (/\bINFO\b/i.test(s))     return "info";
    return "info";
  }

  function toText(line) {
    if (!line && line !== 0) return "";
    if (typeof line === "object") {
      const t   = line.t || line.time || line.ts || "";
      const src = line.src || line.source || line.scope || "";
      const msg = line.msg ?? line.message ?? line.text ?? (()=>{
        try { return JSON.stringify(line); } catch(_) { return String(line); }
      })();
      return t ? `[${t}] ${src ? src + " " : ""}${msg}` : `${src ? src + " " : ""}${msg}`;
    }
    return String(line);
  }

  // ----- Quellenzugriff (robust) -------------------------------------------
  function readBufferSafe() {
    try {
      const buf =
        window.CBLog?.getBuffer?.() ||
        window.CBLog?.buffer ||
        window.__CBLOG_BUFFER ||
        [];
      return Array.isArray(buf) ? buf.slice() : [];
    } catch (_e) {
      return [];
    }
  }

  // ----- State --------------------------------------------------------------
  let rawBuffer = [];     // Rohdaten aller Logs
  let lastLen   = 0;      // Pufferlänge für Poll
  let pollTimer = null;   // Poll-Fallback

  const state = {
    showInfo: true,
    showOk:   true,
    showWarn: true,
    showErr:  true,
    query:    "",
    counts:   { info:0, ok:0, warn:0, err:0 },
  };

  let els = {
    view: null,
    search: null,
    badgeInfo: null,
    badgeOk: null,
    badgeWarn: null,
    badgeErr: null,
  };

  // ----- Controls -----------------------------------------------------------
  function buildControls() {
    const host = qSlot("logs-controls");
    if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkToggle = (label, key, title) => {
      const b = document.createElement("button");
      b.className = "ins-toggle";
      b.dataset.key = key;
      b.textContent = label;
      b.title = title || "";
      b.classList.toggle("active", !!state[key]);
      b.addEventListener("click", () => {
        state[key] = !state[key];
        b.classList.toggle("active", !!state[key]);
        renderList();
      });
      return b;
    };
    const mkBadge = () => {
      const s = document.createElement("span");
      s.className = "ins-badge";
      s.textContent = "0";
      return s;
    };

    const tInfo = mkToggle("INFO", "showInfo", "Info ein/aus");
    const bInfo = mkBadge();  tInfo.appendChild(bInfo); els.badgeInfo = bInfo;

    const tOk   = mkToggle("OK", "showOk", "OK ein/aus");
    const bOk   = mkBadge();  tOk.appendChild(bOk);     els.badgeOk   = bOk;

    const tWarn = mkToggle("WARN","showWarn","Warnungen ein/aus");
    const bWarn = mkBadge();  tWarn.appendChild(bWarn); els.badgeWarn = bWarn;

    const tErr  = mkToggle("ERR", "showErr", "Fehler ein/aus");
    const bErr  = mkBadge();  tErr.appendChild(bErr);   els.badgeErr  = bErr;

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Suche…";
    search.className = "ins-search";
    search.addEventListener("input", () => {
      state.query = (search.value || "").trim().toLowerCase();
      renderList();
    });
    els.search = search;

    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async () => {
      try {
        const text = rawBuffer.map(toText).join("\n");
        await navigator.clipboard.writeText(text);
        flash(btnCopy);
      } catch (_e) {
        alert("Kopieren nicht möglich (Clipboard)");
      }
    });

    const btnExport = document.createElement("button");
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", () => {
      const blob = new Blob([rawBuffer.map(toText).join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "logs.txt";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    wrap.append(tInfo, tOk, tWarn, tErr, search, btnCopy, btnExport);
    host.appendChild(wrap);
  }

  function flash(el) {
    el.classList.add("ins-flash");
    setTimeout(() => el.classList.remove("ins-flash"), 600);
  }

  // ----- View ---------------------------------------------------------------
  function mountView() {
    const host = qSlot("logs-view");
    if (!host) return;
    host.innerHTML = "";
    const pre = document.createElement("div");
    pre.className = "ins-logview";
    host.appendChild(pre);
    els.view = pre;

    // API-Bridge für den Safety-Hook (oben)
    window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
    window.__INSPECTOR_API__.logs = {
      push(entry){ onAppend(entry); },
      render(){ renderList(); }
    };
  }

  // ----- Stream -------------------------------------------------------------
  function startStream() {
    rawBuffer = readBufferSafe();
    lastLen = rawBuffer.length;

    // Initial render
    renderList();

    // Live via CBLog.on
    if (typeof window.CBLog?.on === "function") {
      try {
        window.CBLog.on("append", onAppend);
        logOk("Stream verbunden (append)");
        return;
      } catch (_e) {}
    }

    // Poll-Fallback
    pollTimer = window.setInterval(() => {
      const buf = readBufferSafe();
      if (!Array.isArray(buf)) return;
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
      try { window.CBLog.off("append", onAppend); } catch(_e) {}
    }
  }

  function onAppend(entry) {
    rawBuffer.push(entry);
    pushLine(entry);
  }

  // ----- Renderlogik --------------------------------------------------------
  function renderList() {
    if (!els.view) return;

    const q = state.query;
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < rawBuffer.length; i++) {
      const obj = rawBuffer[i];
      const txt = toText(obj);
      const lvl = detectLevel(obj).toLowerCase();

      if (lvl in state.counts) state.counts[lvl]++;

      if (
        (lvl === "info" && !state.showInfo) ||
        (lvl === "ok"   && !state.showOk)   ||
        (lvl === "warn" && !state.showWarn) ||
        (lvl === "err"  && !state.showErr)
      ) continue;

      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement("div");
      line.className = LVL[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }

    els.view.innerHTML = "";
    els.view.appendChild(frag);
    updateBadges();
    // ans Ende scrollen
    els.view.scrollTop = els.view.scrollHeight || 0;
  }

  function updateBadges() {
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  function pushLine(entry) {
    if (!els.view) return;

    const txt = toText(entry);
    const lvl = detectLevel(entry).toLowerCase();

    if (lvl in state.counts) state.counts[lvl]++;

    const passLevel =
      (lvl !== "info" || state.showInfo) &&
      (lvl !== "ok"   || state.showOk)   &&
      (lvl !== "warn" || state.showWarn) &&
      (lvl !== "err"  || state.showErr);

    const passText = !state.query || txt.toLowerCase().includes(state.query);
    if (passLevel && passText) {
      const div = document.createElement("div");
      div.className = LVL[lvl] || "log-info";
      div.textContent = txt;
      els.view.appendChild(div);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }

  // ----- Tab-Mount ----------------------------------------------------------
  core.api.mount("logs", () => {
    buildControls();
    mountView();
    startStream();

    core.api?.signal?.("logs:ready", { version: VER });
    logOk(MOD, "bereit", VER);

    return () => { stopStream(); };
  });

})();
