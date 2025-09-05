/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.8
 *
 * Zweck:
 *  - Log-Tab UI (Filter, Badges, Suche, Kopieren/Export)
 *  - Striktes Slot-Rendering in das Inspector-Overlay (KEIN body-Append!)
 *
 * Abhängigkeit:
 *  - inspector.core.js stellt window.__INSPECTOR_CORE__ bereit:
 *      • core.api.mount(tabId, renderFn)
 *      • core.api.getSlot(name)  -> DOM-Element (z.B. 'logs-controls', 'logs-view')
 *      • core.api.signal(name, payload?)  (optional)
 *  - CBLog Polyfill/Impl:
 *      • CBLog.getBuffer() -> Array<string> oder [{t:...,lvl:'info|ok|warn|err',msg:'...'}]
 *      • optional: CBLog.on('append', fn)
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.8";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // ---------- Hilfen --------------------------------------------------------
  const logOk   = (...a) => (window.CBLog?.ok || console.log)(`${MOD}`, ...a);
  const logWarn = (...a) => (window.CBLog?.warn || console.warn)(`${MOD}`, ...a);

  function qSlot(name) {
    // akzeptiert neue Slot-Namen und ein paar defensive Fallbacks
    return (
      core.api.getSlot?.(name) ||
      document.getElementById(`ins-${name}`) ||
      document.querySelector(`#inspector .slot-${name}`)
    );
  }

  // Level-Mapping (Text -> CSS-Klasse)
  const LVL = {
    info: "log-info",
    ok:   "log-ok",
    warn: "log-warn",
    err:  "log-error",
    error:"log-error",
    // Konsole-Text-Fallbacks
    INFO: "log-info",
    OK:   "log-ok",
    WARN: "log-warn",
    ERR:  "log-error",
  };

  function detectLevel(line) {
    // Versucht, aus einem String oder Objekt den Level zu bestimmen
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
      // häufige Objektformate tolerant zusammenfassen
      const t = line.t || line.time || "";
      const src = line.src || line.source || "";
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${src ? src + " " : ""}${msg}` : `${src ? src + " " : ""}${msg}`;
    }
    return String(line);
  }

  // ---------- Log-Puffer + Stream ------------------------------------------
  let cache = [];               // komplette, gefilterte Anzeigequelle (Strings)
  let rawBuffer = [];           // Rohpuffer aus CBLog
  let lastLen = 0;              // zur Erkennung von Änderungen
  let pollTimer = null;         // Fallback-Poll

  function readBufferSafe() {
    try {
      const buf = window.CBLog?.getBuffer?.();
      if (!buf) return [];
      // Normalisieren: Strings oder Objekte akzeptieren
      return Array.isArray(buf) ? buf.slice() : [];
    } catch (_e) {
      return [];
    }
  }

  function startStream() {
    // 1) Initial lesen
    rawBuffer = readBufferSafe();
    lastLen = rawBuffer.length;

    // 2) Event-Stream, falls vorhanden
    if (typeof window.CBLog?.on === "function") {
      try {
        window.CBLog.on("append", onAppend);
        logOk(MOD, "Stream verbunden (append)");
        return; // kein Poll erforderlich
      } catch (_e) {}
    }

    // 3) Fallback: Poll
    pollTimer = window.setInterval(() => {
      const buf = readBufferSafe();
      if (buf.length !== lastLen) {
        const diff = buf.slice(lastLen);
        lastLen = buf.length;
        diff.forEach(onAppend);
      }
    }, 800);
    logWarn(MOD, "nutze Poll-Fallback (kein CBLog.on)");
  }

  function stopStream() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window.CBLog?.off === "function") {
      try { window.CBLog.off("append", onAppend); } catch (_e) {}
    }
  }

  function onAppend(entry) {
    rawBuffer.push(entry);
    // nur die UI aktualisieren; Filtering greift in renderList()
    pushLine(entry);
  }

  // ---------- UI / Filter ---------------------------------------------------
  const state = {
    showInfo: true,
    showOk:   true,
    showWarn: true,
    showErr:  true,
    query:    "",
    counts:   { info:0, ok:0, warn:0, err:0 },
  };

  let els = {
    controls: null,
    view: null,
    search: null,
    badgeInfo: null,
    badgeOk: null,
    badgeWarn: null,
    badgeErr: null,
  };

  function buildControls() {
    const host = qSlot("logs-controls");
    if (!host) return;

    // Leeren (wichtiger Fix, damit NICHT versehentlich im body doppelt landet)
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    // Helpers
    const mkToggle = (label, key, title) => {
      const b = document.createElement("button");
      b.className = "ins-toggle";
      b.dataset.key = key;
      b.textContent = label;
      b.title = title || "";
      if (state[key]) b.classList.add("active");
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

    // Toggles + Badges
    const tInfo = mkToggle("INFO", "showInfo", "Info ein/aus");
    const bInfo = mkBadge();  tInfo.appendChild(bInfo); els.badgeInfo = bInfo;

    const tOk   = mkToggle("OK", "showOk", "OK ein/aus");
    const bOk = mkBadge();    tOk.appendChild(bOk);     els.badgeOk = bOk;

    const tWarn = mkToggle("WARN", "showWarn", "Warnungen ein/aus");
    const bWarn = mkBadge();  tWarn.appendChild(bWarn); els.badgeWarn = bWarn;

    const tErr  = mkToggle("ERR", "showErr", "Fehler ein/aus");
    const bErr = mkBadge();   tErr.appendChild(bErr);   els.badgeErr = bErr;

    // Suche
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Suche…";
    search.className = "ins-search";
    search.addEventListener("input", () => {
      state.query = (search.value || "").trim().toLowerCase();
      renderList();
    });
    els.search = search;

    // Kopieren
    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async () => {
      try {
        const all = cache.join("\n");
        await navigator.clipboard.writeText(all);
        flash(btnCopy);
      } catch (_e) {
        alert("Kopieren nicht möglich (Clipboard)");
      }
    });

    // Export (.txt)
    const btnExport = document.createElement("button");
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", () => {
      const blob = new Blob([cache.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "logs.txt";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    // Zusammenbauen
    wrap.append(tInfo, tOk, tWarn, tErr, search, btnCopy, btnExport);
    host.appendChild(wrap);
  }

  function flash(el) {
    el.classList.add("ins-flash");
    setTimeout(() => el.classList.remove("ins-flash"), 600);
  }

  // ---------- Rendering ------------------------------------------------------
  function mountView() {
    const host = qSlot("logs-view");
    if (!host) return;
    host.innerHTML = "";
    const pre = document.createElement("div");
    pre.className = "ins-logview";
    host.appendChild(pre);
    els.view = pre;
  }

  function rebuildCacheFromRaw() {
    cache = rawBuffer.map(toText);
  }

  function renderList() {
    if (!els.view) return;
    const q = state.query;

    // Zähler zurücksetzen
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    // Filter + Render
    const frag = document.createDocumentFragment();
    for (let i = 0; i < rawBuffer.length; i++) {
      const obj = rawBuffer[i];
      const txt = toText(obj);
      const lvl = detectLevel(obj).toLowerCase();

      // Zähler
      if (lvl in state.counts) state.counts[lvl]++;

      // Level-Filter
      if (
        (lvl === "info" && !state.showInfo) ||
        (lvl === "ok"   && !state.showOk)   ||
        (lvl === "warn" && !state.showWarn) ||
        (lvl === "err"  && !state.showErr)
      ) continue;

      // Text-Filter
      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement("div");
      line.className = LVL[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }

    els.view.innerHTML = "";
    els.view.appendChild(frag);
    updateBadges();
  }

  function updateBadges() {
    if (els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  function pushLine(entry) {
    // neue Zeile in Ansicht einfügen (inkrementell), respektiert Filter
    const host = els.view;
    if (!host) return;

    const txt = toText(entry);
    const lvl = detectLevel(entry).toLowerCase();

    // Zählerpflege
    if (lvl in state.counts) state.counts[lvl]++;

    // Ggf. sichtbar rendern
    const q = state.query;
    const passLevel =
      (lvl !== "info" || state.showInfo) &&
      (lvl !== "ok"   || state.showOk)   &&
      (lvl !== "warn" || state.showWarn) &&
      (lvl !== "err"  || state.showErr);
    const passText = !q || txt.toLowerCase().includes(q);

    if (passLevel && passText) {
      const div = document.createElement("div");
      div.className = LVL[lvl] || "log-info";
      div.textContent = txt;
      host.appendChild(div);
      host.scrollTop = host.scrollHeight; // autoscroll ans Ende
    }

    updateBadges();
  }

  // ---------- Tab-Mount -----------------------------------------------------
  core.api.mount("logs", () => {
    // Wichtig: UI ausschließlich in Slots montieren (kein body.appendChild!)
    buildControls();
    mountView();

    // Rohpuffer initial
    rawBuffer = readBufferSafe();
    lastLen = rawBuffer.length;
    rebuildCacheFromRaw();
    renderList();

    // Stream starten
    startStream();

    // Cleanup bei Tab-Verlassen (optional, falls core.signal('tab:leave') gesendet wird)
    core.api?.signal?.("logs:ready", { version: VER });

    logOk(MOD, "bereit", VER);

    // Rückgabe: optionaler Unmount
    return () => {
      stopStream();
    };
  });

})();
