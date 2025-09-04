/* ============================================================================
   Datei: assets/inspector/inspector.logs.js
   Projekt: Neue Siedler – Inspector (Split)
   Version: v18.10.6
   Zweck: "Logs"-Tab – CBLog-Puffer anzeigen, filtern, kopieren/exportieren
   Abhängigkeiten: 
     - inspector.core.js (stellt window.__INSPECTOR_API__ bereit)
     - optional CBLog (Polyfill oder Echt)
   CODE-STYLE:
     - Keine Frameworks, nur DOM
     - Defensiv (läuft auch ohne CBLog → zeigt Hinweis)
     - Keine globalen Leaks (nur Registrierung am __INSPECTOR_API__)
   ============================================================================ */

(function () {
  "use strict";

  const VERSION = "v18.10.6";
  const API_NAME = "__INSPECTOR_API__";

  // ------------------------------------------------------------
  // Hilfsfunktionen (defensiv)
  // ------------------------------------------------------------
  const cblog = () => (window.CBLog || window.__CBLog || null);

  function nowTime() {
    const d = new Date();
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    const ss = `${d.getSeconds()}`.padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function normalizeEntries(raw) {
    // Akzeptiere diverse Formen: Array von Strings/Objekten, String mit \n …
    if (!raw) return [];
    if (typeof raw === "string") {
      return raw.split(/\r?\n/).filter(Boolean);
    }
    if (Array.isArray(raw)) {
      // Objekt -> versuche msg/level/time-Felder zu formen
      return raw.map((entry) => {
        if (typeof entry === "string") return entry;
        try {
          const t = entry.time || entry.ts || entry.t || nowTime();
          const lvl = (entry.level || entry.lvl || entry.type || "LOG").toString().toUpperCase();
          const src = entry.tag || entry.source || entry.src || "";
          const msg = entry.msg || entry.message || entry.text || JSON.stringify(entry);
          return `[${t}] ${lvl} ${src ? `[${src}] ` : ""}${msg}`;
        } catch {
          return String(entry);
        }
      });
    }
    // Objekt mit .buf / .buffer / .getBuffer
    try {
      if (typeof raw.getBuffer === "function") return normalizeEntries(raw.getBuffer());
      if (raw.buffer) return normalizeEntries(raw.buffer);
      if (raw.buf) return normalizeEntries(raw.buf);
    } catch {}
    return [];
  }

  function fetchLogEntries() {
    // Versuche alle bekannten Quellen in stabiler Reihenfolge
    try {
      const L = cblog();
      if (L?.getEntries) return normalizeEntries(L.getEntries());
      if (L?.getBuffer)  return normalizeEntries(L.getBuffer());
      if (L?.dump)       return normalizeEntries(L.dump());
      if (L?.buf)        return normalizeEntries(L.buf);
    } catch {}
    // Fallback auf evtl. globale Buffer
    try { if (Array.isArray(window.__CBLOG_BUF__)) return normalizeEntries(window.__CBLOG_BUF__); } catch {}
    try { if (Array.isArray(window.__cblog?.buf))  return normalizeEntries(window.__cblog.buf); } catch {}
    return [];
  }

  function clearLog() {
    try {
      const L = cblog();
      if (L?.clear) return L.clear();
      if (L?.reset) return L.reset();
      if (Array.isArray(window.__CBLOG_BUF__)) window.__CBLOG_BUF__.length = 0;
      if (Array.isArray(window.__cblog?.buf)) window.__cblog.buf.length = 0;
    } catch {}
  }

  // ------------------------------------------------------------
  // UI – Renderer
  // ------------------------------------------------------------
  function renderLogsTab(ctx) {
    // ctx wird vom Core geliefert:
    // { rootEl, headEl, bodyEl, footerEl, setStatus(text), version }
    const { bodyEl, footerEl, setStatus } = ctx;

    // Grundlayout
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";

    const tools = document.createElement("div");
    tools.className = "ins-tools";

    // Filter: Level
    const levelWrap = document.createElement("div");
    levelWrap.className = "ins-levels";
    const LEVELS = ["ALL", "INFO", "LOG", "WARN", "ERROR"];
    let activeLevel = "ALL";
    LEVELS.forEach((lv) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ins-badge" + (lv === "ALL" ? " active" : "");
      b.dataset.level = lv;
      b.textContent = lv;
      b.addEventListener("click", () => {
        levelWrap.querySelectorAll(".ins-badge").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeLevel = lv;
        refresh();
      });
      levelWrap.appendChild(b);
    });

    // Suche
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Suche (Regex/Teilwort)…";
    search.className = "ins-search";
    let query = "";
    search.addEventListener("input", () => {
      query = search.value.trim();
      refresh();
    });

    // Buttons
    const btnCopy = document.createElement("button");
    btnCopy.type = "button";
    btnCopy.textContent = "Kopieren";
    btnCopy.className = "ins-btn";
    btnCopy.addEventListener("click", () => {
      navigator.clipboard
        .writeText(pre.textContent || "")
        .then(() => setStatus("Logs kopiert."))
        .catch(() => setStatus("Kopieren nicht möglich."));
    });

    const btnClear = document.createElement("button");
    btnClear.type = "button";
    btnClear.textContent = "Leeren";
    btnClear.className = "ins-btn";
    btnClear.addEventListener("click", () => {
      clearLog();
      refresh(true);
    });

    const btnRefresh = document.createElement("button");
    btnRefresh.type = "button";
    btnRefresh.textContent = "Aktualisieren";
    btnRefresh.className = "ins-btn";
    btnRefresh.addEventListener("click", () => refresh());

    const btnExport = document.createElement("button");
    btnExport.type = "button";
    btnExport.textContent = "Export (.txt)";
    btnExport.className = "ins-btn";
    btnExport.addEventListener("click", () => {
      const blob = new Blob([pre.textContent || ""], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `inspector-log-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    tools.appendChild(levelWrap);
    tools.appendChild(search);
    bodyEl.appendChild(tools);

    // Hinweis + Log-View
    const note = document.createElement("div");
    note.className = "ins-note";
    note.textContent = "Logs werden initialisiert …";
    bodyEl.appendChild(note);

    const pre = document.createElement("pre");
    pre.className = "ins-pre";
    pre.textContent = "[Noch keine Logs …]";
    bodyEl.appendChild(pre);

    // Footer-Buttons
    footerEl.appendChild(btnCopy);
    footerEl.appendChild(btnClear);
    footerEl.appendChild(btnRefresh);
    footerEl.appendChild(btnExport);

    // Live-Refresh minimal (stoppt, wenn Tab gewechselt wird – Core ruft onHide())
    let timer = null;
    function startLive() {
      stopLive();
      timer = setInterval(() => refresh(false, true), 800);
    }
    function stopLive() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    ctx.onHide = stopLive;

    // Render-Funktion
    function refresh(justCleared = false, silent = false) {
      const list = fetchLogEntries();
      const rx = query ? new RegExp(query, "i") : null;

      const filtered = list.filter((line) => {
        // Level-Filter rudimentär: prüfe auf „ INFO “, „ WARN “ etc. im String
        if (activeLevel !== "ALL") {
          if (!new RegExp(`\\b${activeLevel}\\b`).test(line)) return false;
        }
        if (rx && !rx.test(line)) return false;
        return true;
      });

      pre.textContent = filtered.join("\n") || (justCleared ? "[Log geleert]" : "[Keine Log-Einträge vorhanden]");
      if (!silent) setStatus(`Log-Zeilen: ${filtered.length}`);
      note.style.display = list.length ? "none" : "block";
    }

    // Initial
    refresh();
    startLive();
  }

  // ------------------------------------------------------------
  // Registrierung am Core (defensiv, auch bei verzögerter Core-Ladung)
  // ------------------------------------------------------------
  function attach() {
    const api = window[API_NAME];
    if (!api || typeof api.registerTab !== "function") return false;
    api.registerTab({
      id: "logs",
      title: "Logs",
      onShow: renderLogsTab
    });
    (api.log || console.log)(`[inspector.logs] registriert (${VERSION})`);
    return true;
  }

  if (!attach()) {
    // Core noch nicht da → später erneut versuchen
    const i = setInterval(() => {
      if (attach()) clearInterval(i);
    }, 100);
    setTimeout(() => clearInterval(i), 10000);
  }
})();
