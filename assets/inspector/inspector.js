/* =============================================================================
   assets/inspector/inspector.js — v18.6.0
   Projekt: Neue Siedler
   CODE-STYLE / VORGABEN
   - Monolithische, selbsteinbettende Datei (keine externen Abhängigkeiten).
   - Stabile Log-Pipeline: zieht bestehende CBLog-Einträge + hört Live-Events.
   - Fallbacks: funktioniert auch ohne CBLog (interne Console-Proxy-Bridge).
   - Öffnen/Schließen via window.GameUI.toggleInspector() (FAB-Buttons).
   - Tabs: Übersicht | Logs | Build | Pfade | Tests  (nur Logs gefüllt).
   - Klare, deutsche Logs beim Init, mit Versionsangabe.
   - Z-Index / Pointer-Events: Inspector ist immer bedienbar.
   ========================================================================== */

(function () {
  "use strict";

  const VERSION = "v18.6.0";
  const ID_PANEL = "inspector-panel";
  const ID_TEXT  = "inspector-log-text";
  const ID_TABS  = "inspector-tabs";
  const E = (sel, root = document) => root.querySelector(sel);
  const EA = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const log = (...a) => (window.CBLog?.info || console.log)("[inspector.core]", ...a);

  // ---------------------------------------------------------------------------
  // 0) Einfache, robuste Mini-CSS-Injektion (nur falls keine inspector.css vorliegt)
  // ---------------------------------------------------------------------------
  (function ensureBaseStyles() {
    if (document.getElementById("inspector-inline-style")) return;
    const css = `
      /* Basis, falls inspector.css fehlt */
      #${ID_PANEL}{
        position:fixed; left:50%; top:12%;
        transform:translateX(-50%);
        width:min(980px, 92vw); max-height:76vh; overflow:hidden;
        background:#121416; color:#e7e7e7;
        border:1px solid rgba(255,255,255,.09);
        border-radius:14px;
        box-shadow:0 28px 120px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.03) inset;
        z-index:2147483000; display:none;
      }
      #${ID_PANEL}.open{ display:block; }
      #${ID_PANEL} .ins-head{
        display:flex; align-items:center; gap:12px;
        padding:14px 16px; background:linear-gradient(#191b1e,#17191c);
        border-bottom:1px solid rgba(255,255,255,.06);
      }
      #${ID_PANEL} .ins-title{
        font-weight:800; letter-spacing:.3px; margin-right:8px;
      }
      #${ID_PANEL} .ins-ver{ opacity:.55; font-size:12px; margin-right:auto; }
      #${ID_PANEL} .ins-close{
        border:none; border-radius:10px; padding:6px 10px;
        background:rgba(255,255,255,.10); color:#fff; cursor:pointer;
      }
      #${ID_TABS}{
        display:flex; gap:10px; padding:10px 14px;
        border-bottom:1px solid rgba(255,255,255,.06);
        background:linear-gradient(#17191c,#15171a);
      }
      #${ID_TABS} .tab{
        border:none; border-radius:999px; padding:6px 12px;
        background:rgba(255,255,255,.10); color:#e7e7e7; cursor:pointer;
        font-size:13px;
      }
      #${ID_TABS} .tab.active{ background:rgba(120,200,130,.22); }
      .ins-body{ padding:14px; }
      .ins-section{ display:none; }
      .ins-section.active{ display:block; }
      /* Logs */
      #${ID_TEXT}{
        width:100%; height:48vh; resize:vertical;
        background:#0f1113; color:#d6d6d6; border:1px solid rgba(255,255,255,.08);
        border-radius:8px; padding:10px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        line-height:1.35; white-space:pre; overflow:auto;
      }
      .ins-foot{
        padding:10px 14px; border-top:1px solid rgba(255,255,255,.06);
        background:linear-gradient(#15171a,#14161a);
        display:flex; gap:10px; justify-content:flex-start;
      }
      .ins-btn{
        border:none; border-radius:10px; padding:8px 12px;
        background:rgba(255,255,255,.10); color:#fff; cursor:pointer;
      }
      .ins-hint{ opacity:.65; font-size:12px; margin-left:auto; }
    `;
    const s = document.createElement("style");
    s.id = "inspector-inline-style";
    s.textContent = css;
    document.head.appendChild(s);
  })();

  // ---------------------------------------------------------------------------
  // 1) DOM aufbauen (Panel, Tabs, leere Sektionen)
  // ---------------------------------------------------------------------------
  function buildDOM() {
    let panel = document.getElementById(ID_PANEL);
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = ID_PANEL;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Inspector");

    panel.innerHTML = `
      <header class="ins-head">
        <div class="ins-title">Inspector</div>
        <div class="ins-ver">${VERSION}</div>
        <button class="ins-close" type="button" aria-label="Schließen">Schließen</button>
      </header>

      <nav id="${ID_TABS}" class="ins-tabs">
        <button class="tab" data-tab="overview">Übersicht</button>
        <button class="tab active" data-tab="logs">Logs</button>
        <button class="tab" data-tab="build">Build</button>
        <button class="tab" data-tab="paths">Pfade</button>
        <button class="tab" data-tab="tests">Tests</button>
      </nav>

      <main class="ins-body">
        <section class="ins-section" data-id="overview">
          <div style="opacity:.75">[Übersicht wird vorbereitet …]</div>
        </section>

        <section class="ins-section active" data-id="logs">
          <textarea id="${ID_TEXT}" spellcheck="false" aria-label="Log-Ausgabe">[Log wird geladen…]</textarea>
        </section>

        <section class="ins-section" data-id="build">
          <div style="opacity:.75">[Build-Tab — Platzhalter]</div>
        </section>

        <section class="ins-section" data-id="paths">
          <div style="opacity:.75">[Pfade-Tab — Platzhalter]</div>
        </section>

        <section class="ins-section" data-id="tests">
          <div style="opacity:.75">[Tests-Tab — Platzhalter]</div>
        </section>
      </main>

      <footer class="ins-foot">
        <button class="ins-btn" data-cmd="copy">Kopieren</button>
        <button class="ins-btn" data-cmd="clear">Leeren</button>
        <button class="ins-btn" data-cmd="refresh">Aktualisieren</button>
        <div class="ins-hint" id="inspector-hint"></div>
      </footer>
    `;
    document.body.appendChild(panel);

    // Tab-Handling
    const tabs = EA(".tab", panel);
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const id = btn.dataset.tab;
        EA(".ins-section", panel).forEach(sec => {
          sec.classList.toggle("active", sec.dataset.id === id);
        });
        if (id === "logs") refreshLogs(/*silent*/true);
      }, { passive: true });
    });

    // Buttons unten
    panel.querySelector(".ins-close")
      .addEventListener("click", () => close(), { passive: true });

    panel.querySelector('[data-cmd="copy"]')
      .addEventListener("click", copyLogs);

    panel.querySelector('[data-cmd="clear"]')
      .addEventListener("click", () => {
        _logBuffer.length = 0;
        refreshLogs();
      });

    panel.querySelector('[data-cmd="refresh"]')
      .addEventListener("click", () => refreshLogs());

    return panel;
  }

  // ---------------------------------------------------------------------------
  // 2) Log-Pipeline (CBLog → Inspector) mit Fallback
  // ---------------------------------------------------------------------------

  /** Interner Log-Puffer, immer als Quelle für die Textarea. */
  const _logBuffer = [];

  /** Formatiert einen Log-Eintrag einheitlich. */
  function fmt(entry) {
    // zugelassen: Strings, CBLog-Objekte {t, ts, level, tag, msg}, Arrays
    if (typeof entry === "string") return entry;
    try {
      if (entry && typeof entry === "object") {
        const ts = entry.ts || Date.now();
        const time = new Date(ts).toLocaleTimeString([], { hour12: false });
        const lvl = (entry.level || entry.lvl || "LOG").toString().toUpperCase();
        const tag = entry.tag ? ` [${entry.tag}]` : "";
        const msg = (entry.msg ?? entry.message ?? JSON.stringify(entry.data ?? entry));
        return `[${time}] ${lvl}${tag} ${msg}`;
      }
      return String(entry);
    } catch {
      return String(entry);
    }
  }

  /** Schreibt in den Puffer + hält ihn begrenzt. */
  function pushLog(entry) {
    _logBuffer.push(fmt(entry));
    if (_logBuffer.length > 5000) _logBuffer.splice(0, _logBuffer.length - 5000);
  }

  /** Versucht, vorhandenen CBLog-Puffer einzulesen. */
  function drainExistingBuffer() {
    try {
      const buf =
        (window.CBLog?.getBuffer?.()) ||
        (window.CBLog?._buf) ||
        (window.CBLog?.buf) ||
        [];
      if (Array.isArray(buf)) {
        buf.forEach(pushLog);
        log("bestehender Log-Puffer übernommen:", buf.length, "Einträge");
      }
    } catch (e) {
      console.warn("[inspector.core] Buffer-Übernahme fehlgeschlagen:", e?.message);
    }
  }

  /** Live-Events von CBLog abonnieren (oder Fallback aktivieren). */
  function attachLiveStream() {
    // A) offizieller Weg: Events von Polyfill/CBLog
    let attached = false;
    try {
      window.addEventListener("cb:log", (ev) => {
        // Event-Formate: ev.detail | ev.data | ev
        const d = ev?.detail ?? ev?.data ?? ev;
        pushLog(d);
        scheduleAutoPaint();
      });
      attached = true;
    } catch { /* ignore */ }

    // B) Callback-Hook (falls Polyfill so arbeitet)
    try {
      if (window.CBLog && typeof window.CBLog.on === "function") {
        window.CBLog.on((entry) => {
          pushLog(entry);
          scheduleAutoPaint();
        });
        attached = true;
      }
    } catch { /* ignore */ }

    // C) Hard-Fallback: Console-Proxy, falls A/B nicht greifen
    if (!attached) {
      const orig = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
      };
      ["log", "info", "warn", "error"].forEach((m) => {
        console[m] = function (...args) {
          try {
            const msg = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
            pushLog({ level: m, tag: "console", msg, ts: Date.now() });
            scheduleAutoPaint();
          } catch { /* ignore */ }
          return orig[m].apply(console, args);
        };
      });
      pushLog("[inspector] Hinweis: CBLog-Events nicht gefunden – Console-Proxy aktiv.");
    }
  }

  // ---------------------------------------------------------------------------
  // 3) Log-UI pflegen
  // ---------------------------------------------------------------------------
  let _paintScheduled = false;
  function scheduleAutoPaint() {
    if (_paintScheduled) return;
    _paintScheduled = true;
    requestAnimationFrame(() => {
      _paintScheduled = false;
      const ta = document.getElementById(ID_TEXT);
      if (!ta || !isOpen()) return;
      const txt = _logBuffer.length ? _logBuffer.join("\n") : "[Keine Log-Einträge vorhanden]";
      if (ta.value !== txt) {
        const scrolledToBottom = Math.abs(ta.scrollTop + ta.clientHeight - ta.scrollHeight) < 8;
        ta.value = txt;
        if (scrolledToBottom) ta.scrollTop = ta.scrollHeight;
      }
    });
  }

  function refreshLogs(silent = false) {
    try {
      const ta = document.getElementById(ID_TEXT);
      if (!ta) return;
      const txt = _logBuffer.length ? _logBuffer.join("\n") : "[Keine Log-Einträge vorhanden]";
      ta.value = txt;
      ta.scrollTop = ta.scrollHeight;
      if (!silent) hint("Log aktualisiert");
    } catch { /* ignore */ }
  }

  async function copyLogs() {
    try {
      const ta = document.getElementById(ID_TEXT);
      if (!ta) return;
      await navigator.clipboard?.writeText(ta.value);
      hint("Log in Zwischenablage kopiert");
    } catch (e) {
      hint("Kopieren nicht möglich");
      console.warn(e);
    }
  }

  function hint(text) {
    const el = document.getElementById("inspector-hint");
    if (!el) return;
    el.textContent = text || "";
    if (!text) return;
    setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 1800);
  }

  // ---------------------------------------------------------------------------
  // 4) Öffnen/Schließen/Toggle + GameUI-Bridge
  // ---------------------------------------------------------------------------
  function open() {
    const panel = buildDOM();
    panel.classList.add("open");
    refreshLogs(true);
    log("geöffnet", `(${VERSION})`);
  }

  function close() {
    const panel = buildDOM();
    panel.classList.remove("open");
    log("geschlossen");
  }

  function toggle(force) {
    const panel = buildDOM();
    const toOpen = force === true || (force == null && !panel.classList.contains("open"));
    if (toOpen) open(); else close();
  }

  // Exponieren für FAB/UX:
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // ---------------------------------------------------------------------------
  // 5) Initialisierung
  // ---------------------------------------------------------------------------
  (function init() {
    try {
      buildDOM();
      drainExistingBuffer();
      attachLiveStream();
      scheduleAutoPaint();

      // Auto-Open via Query: ?inspector=1
      if (/\binspector=1\b/.test(location.search)) {
        setTimeout(open, 80);
      }

      // „Bereit“-Log
      log("bereit", `(${VERSION})`);
    } catch (e) {
      console.error("[inspector.core] Init-Fehler:", e?.message || e);
    }
  })();

  // Hilfsfunktion
  function isOpen() {
    return document.getElementById(ID_PANEL)?.classList.contains("open");
  }

})();
