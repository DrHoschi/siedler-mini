/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini — Inspector (Logs-Tab)
 * Version: v18.10.6
 *
 * Zweck
 *  - Robuste Log-Ansicht inkl. Filter (Badges), Suche, Kopieren & Export.
 *  - Hängt sich *automatisch* in das Inspector-Panel ein (bei Open-Event).
 *  - Liest CBLog-Puffer (Polyfill oder echtes CBLog) — fällt auf Polling zurück.
 *
 * Einbindung
 *  - Nach inspector.core.js laden.
 *  - Keine weiteren Abhängigkeiten.
 *
 * Events
 *  - hört:  'cb:inspector-open', 'cb:inspector-close'
 *  - sendet: keine
 *
 * Sicherheit / Fallbacks
 *  - Findet Panel dynamisch (#inspector .ins-panel). Setzt es zur Not auf
 *    position:relative, damit die Toolbar absolut im Panel positioniert werden kann.
 *  - Liest Log-Puffer über mehrere mögliche Quellen (CBLog.getBuffer, __CBLOG, …).
 *  - Wenn kein Live-Event erhältlich ist, wird im 1s-Intervall sanft gepollt.
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.6";

  // -- kleine Logger ----------------------------------------------------------
  const log  = (t, ...a) => (window.CBLog?.ok   || console.log   )(`${MOD} ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn  )(`${MOD} ${t}`, ...a);

  // -- State ------------------------------------------------------------------
  let mounted = false;
  let dom = { panel:null, body:null, pre:null, bar:null, search:null };
  let pollTimer = null;

  // Filter-State (Level → sichtbar?)
  const filt = {
    ERR: true,
    WARN: true,
    OK: true,
    INFO: true,
    DBG: false
  };
  let query = "";

  // -- Hilfen: Inspector-Panel suchen -----------------------------------------
  function findPanel() {
    const root = document.getElementById("inspector");
    if (!root) return null;
    // bekannte Struktur: .ins-panel (Panel), .ins-body (Inhalt)
    const panel = root.querySelector(".ins-panel") || root;
    const body  = root.querySelector(".ins-body")  || root;
    // pre-Element (Logausgabe) suchen oder anlegen
    let pre = body.querySelector("pre");
    if (!pre) {
      pre = document.createElement("pre");
      pre.setAttribute("aria-label", "Protokollausgabe");
      body.appendChild(pre);
    }
    // relative Position sicherstellen (für die Logbar)
    if (getComputedStyle(panel).position === "static") {
      panel.style.position = "relative";
    }
    return { panel, body, pre };
  }

  // -- Toolbar erzeugen -------------------------------------------------------
  function mkBadge(key, label, title) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ins-badge";
    b.dataset.key = key;
    b.title = title || label;
    b.textContent = label;
    b.setAttribute("aria-pressed", String(!!filt[key]));
    if (filt[key]) b.classList.add("on");
    b.addEventListener("click", () => {
      filt[key] = !filt[key];
      b.classList.toggle("on", filt[key]);
      b.setAttribute("aria-pressed", String(filt[key]));
      render();
    });
    return b;
  }

  function createBar(where) {
    const bar = document.createElement("div");
    bar.className = "ins-logbar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Log-Filter und Aktionen");

    // Badges
    const left = document.createElement("div");
    left.className = "ins-logbar-left";
    left.append(
      mkBadge("ERR", "ERR", "Fehler anzeigen"),
      mkBadge("WARN","WARN","Warnungen anzeigen"),
      mkBadge("OK",  "OK",  "OK/Erfolg anzeigen"),
      mkBadge("INFO","INFO","Info anzeigen"),
      mkBadge("DBG", "DBG", "Debug anzeigen")
    );

    // Suche
    const mid = document.createElement("div");
    mid.className = "ins-logbar-mid";
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Suche…";
    input.className = "ins-logsearch";
    input.addEventListener("input", () => {
      query = (input.value || "").trim().toLowerCase();
      render();
    });
    mid.appendChild(input);

    // Aktionen
    const right = document.createElement("div");
    right.className = "ins-logbar-right";

    const btnCopy = document.createElement("button");
    btnCopy.type = "button";
    btnCopy.className = "ins-btn";
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", doCopy);

    const btnExport = document.createElement("button");
    btnExport.type = "button";
    btnExport.className = "ins-btn";
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", doExport);

    right.append(btnCopy, btnExport);

    bar.append(left, mid, right);
    where.appendChild(bar);

    dom.bar = bar;
    dom.search = input;
  }

  // -- Log-Puffer lesen (robust) ----------------------------------------------
  function readBuffer() {
    // bevorzugt: CBLog.getBuffer()
    try {
      if (typeof window.CBLog?.getBuffer === "function") {
        return window.CBLog.getBuffer() || [];
      }
    } catch (_) {}

    // alternativer Namespace (__CBLOG oder __cblog)
    try {
      const alt = window.__CBLOG || window.__cblog || window.__cblog_buf || window.__buf;
      if (Array.isArray(alt)) return alt;
      if (alt && Array.isArray(alt.buf)) return alt.buf;
    } catch (_) {}

    // kein Buffer → leer
    return [];
  }

  // Level ableiten aus Eintrag (best effort)
  function entryLevel(e) {
    const s = (e && (e.level || e[1] || e.tag || "")).toString().toUpperCase();
    if (s.includes("ERR"))  return "ERR";
    if (s.includes("WARN")) return "WARN";
    if (s.includes("OK"))   return "OK";
    if (s.includes("INFO")) return "INFO";
    if (s.includes("DBG") || s.includes("DEBUG")) return "DBG";
    return "INFO";
  }

  // Text erzeugen (best effort)
  function entryText(e) {
    // Varianten: {ts, level, scope, msg} … oder String/Array
    if (typeof e === "string") return e;
    if (Array.isArray(e)) return e.join(" ");
    const ts = e.ts || e.time || "";
    const lvl = e.level || e.tag || "";
    const scope = e.scope || e.mod || e.src || "";
    const msg = e.msg || e.text || e.message || "";
    const t = ts ? `[${ts}] ` : "";
    const L = lvl ? `${String(lvl).toUpperCase()}` : "";
    const S = scope ? ` [${scope}]` : "";
    const M = msg ? ` ${msg}` : "";
    return `${t}${L}${S}${M}`.trim();
  }

  // Filter anwenden + zeichnen
  function render() {
    if (!dom.pre) return;
    const buf = readBuffer();

    const lines = [];
    for (let i = 0; i < buf.length; i++) {
      const e = buf[i];
      const lvl = entryLevel(e);
      if (!filt[lvl]) continue;

      const text = entryText(e);
      if (query && !text.toLowerCase().includes(query)) continue;

      lines.push(text);
    }

    dom.pre.textContent = lines.length ? lines.join("\n") : "[Noch keine passenden Logs …]";
  }

  // -- Aktionen ---------------------------------------------------------------
  async function doCopy() {
    const txt = dom.pre?.textContent || "";
    try {
      await navigator.clipboard.writeText(txt);
      toast("Logs kopiert.");
    } catch (e) {
      warn("Clipboard fehlgeschlagen: " + (e && e.message));
      // Fallback: Auswahl markieren
      window.getSelection().removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(dom.pre);
      window.getSelection().addRange(r);
      toast("Markiert – zum Kopieren drücken.");
    }
  }

  function doExport() {
    const blob = new Blob([dom.pre?.textContent || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toast(msg) {
    try {
      const t = document.createElement("div");
      t.className = "ins-toast";
      t.textContent = msg;
      (dom.panel || document.body).appendChild(t);
      setTimeout(() => t.remove(), 1600);
    } catch (_) {}
  }

  // -- Mount/Unmount ----------------------------------------------------------
  function mount() {
    if (mounted) return;
    const found = findPanel();
    if (!found) return;
    dom.panel = found.panel;
    dom.body  = found.body;
    dom.pre   = found.pre;

    // vorhandene, alte "schwebende" Leisten einsammeln
    document.querySelectorAll(".ins-logbar, .ins-floating-logbar").forEach(el => el.remove());
    createBar(dom.panel);

    // erster Render
    render();

    // Live-Events (falls CBLog Event-API besitzt)
    try {
      if (typeof window.CBLog?.on === "function") {
        window.CBLog.on("append", render); // eigener Eventname im Polyfill
      }
    } catch (_) {}

    // Poll als Fallback
    pollTimer = setInterval(render, 1000);

    mounted = true;
    log("Log-UI montiert (" + VER + ").");
  }

  function unmount() {
    mounted = false;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (dom.bar && dom.bar.parentNode) dom.bar.parentNode.removeChild(dom.bar);
    dom = { panel:null, body:null, pre:null, bar:null, search:null };
    log("Log-UI demontiert.");
  }

  // -- Events verdrahten ------------------------------------------------------
  window.addEventListener("cb:inspector-open", mount, { passive:true });
  window.addEventListener("cb:inspector-close", unmount, { passive:true });

  // Falls der Inspector bereits offen ist (z. B. Auto-Open): sofort versuchen
  setTimeout(() => {
    if (document.getElementById("inspector")) mount();
  }, 50);

  log("bereit (" + VER + ").");
})();
