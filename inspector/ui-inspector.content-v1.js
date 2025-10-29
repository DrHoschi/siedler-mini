/* ============================================================================
 * Datei   : inspector/ui-inspector.content.js
 * Projekt : Neue Siedler
 * Version : v25.10.31-final-content
 * Autor   : Mann / ChatGPT-5
 * Zweck   : Inspector-UI (Tabs/Panels) – sichtbares Markup, Tab-Logik, Konsole-
 *           Mitschnitt, Ressourcen-Table, Testhaken. Kein Core/Flags/ARIA hier!
 *
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → MODUL → HAUPTLOGIK → EXPORTS
 *
 * WICHTIG:
 *  - Diese Datei erwartet, dass der Inspector-Core (ui/ui-inspector.js)
 *    bereits geladen ist und window.UIInspector bereitsteht.
 *  - Kein doppeltes Open/Close/Event-Handling – das macht der Core!
 *  - Idempotent: Wenn Markup bereits existiert, wird NICHT erneut injiziert.
 *  - Host-Unterstützung: #inspector ODER #inspector-overlay (beides erlaubt)
 *
 * TODO-Hooks:
 *  - Panel "Editoren" (später) kann über UIInspectorContent.registerPanel(...) ergänzt werden.
 *  - Build/Registry: cb:build:* / cb:registry:* hier andocken, wenn verfügbar.
 * ========================================================================== */


/* ============================================================================
 * [IMPORTS]
 * (Keine ES-Module. Einbindung via <script defer src="...">)
 * ========================================================================== */


/* ============================================================================
 * [KONSTANTEN]
 * ========================================================================== */
const INSP_UI = {
  HOST_IDS: ["inspector", "inspector-overlay"],  // unterstützte Host-IDs
  VERSION: "v25.10.31-final-content",

  // UI-Tab-Liste (Default)
  DEFAULT_TABS: [
    { id: "logs",      title: "Logs"       },
    { id: "build",     title: "Build"      },
    { id: "resources", title: "Ressourcen" },
    { id: "paths",     title: "Pfade"      },
    { id: "tests",     title: "Tests"      },
  ],

  // Selectors/Klassen im Markup
  CLS_SHELL: "insp-shell",
  CLS_TABS : "insp-tabs",
  CLS_TAB  : "insp-tab",

  // Events (nur UI-Info – Core sendet die Open/Close!)
  EVT_TAB: "cb:insp:tab:change"
};


/* ============================================================================
 * [HILFSFUNKTIONEN]
 * ========================================================================== */
function q(sel, root = document)    { return root.querySelector(sel); }
function qa(sel, root = document)   { return Array.from(root.querySelectorAll(sel)); }
function hostEl() {
  for (const id of INSP_UI.HOST_IDS) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}
function nowStr() {
  const d = new Date(), p = n => String(n).padStart(2,"0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

// Kleiner Log-Sink (nur hier lokal für das Logs-Panel)
const LogSink = (() => {
  let tbody = null;
  function ensure() {
    if (!tbody) {
      const h = hostEl();
      tbody = q("#insp-log-table tbody", h);
    }
  }
  function push(type, message) {
    ensure(); if (!tbody) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${nowStr()}</td><td class="${type}">${type}</td><td>${message}</td>`;
    tbody.appendChild(tr);
    const sc = tbody.parentElement?.parentElement;
    sc?.scrollTo?.(0, sc.scrollHeight);
  }
  function hookConsole() {
    const c = window.console; if (!c) return;
    const orig = {
      log: c.log?.bind(c),
      warn: c.warn?.bind(c),
      error: c.error?.bind(c),
    };
    c.log   = (...a)=>{ try{ push("info",  a.map(String).join(" ")); }catch{}; orig.log?.(...a);   };
    c.warn  = (...a)=>{ try{ push("warn",  a.map(String).join(" ")); }catch{}; orig.warn?.(...a);  };
    c.error = (...a)=>{ try{ push("error", a.map(String).join(" ")); }catch{}; orig.error?.(...a); };
  }
  return { push, hookConsole };
})();


/* ============================================================================
 * [MODUL] UIInspectorContent – baut Markup & verdrahtet UI
 * ========================================================================== */
const UIInspectorContent = {

  /**
   * Injiziert die Shell + Header + Standard-Panels, falls noch nicht vorhanden.
   * Rückgabe: true wenn injiziert, false wenn bereits vorhanden/kein Host.
   */
  ensureMarkup() {
    const host = hostEl();
    if (!host) {
      console.warn("[insp.content] Kein Host (#inspector / #inspector-overlay) gefunden.");
      return false;
    }
    if (q(`.${INSP_UI.CLS_SHELL}`, host)) {
      // Bereits vorhanden → nicht erneut erzeugen
      return false;
    }

    // Tabs aus Konfiguration (später erweiterbar)
    const tabsHTML = INSP_UI.DEFAULT_TABS.map((t, i) =>
      `<button class="${INSP_UI.CLS_TAB} ${i===0?"active":""}" data-insp-tab="${t.id}" role="tab" aria-selected="${i===0?"true":"false"}">${t.title}</button>`
    ).join("");

    host.innerHTML = `
      <div class="${INSP_UI.CLS_SHELL}" role="dialog" aria-label="Inspector">
        <div class="insp-header">
          <div class="${INSP_UI.CLS_TABS}" role="tablist" aria-label="Inspector Tabs">
            ${tabsHTML}
          </div>
          <span class="hint">Inspector ${INSP_UI.VERSION}</span>
        </div>

        <div class="insp-content">
          <!-- Logs -->
          <section data-panel="logs">
            <div class="toolbar">
              <strong>Konsole</strong>
              <button type="button" id="insp-clear-log">Leeren</button>
              <span class="hint muted">Erfasst console.log/warn/error + ausgewählte cb:* Events</span>
            </div>
            <table class="inspector-table" id="insp-log-table">
              <thead><tr><th style="width:110px">Zeit</th><th style="width:70px">Typ</th><th>Nachricht</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>

          <!-- Build -->
          <section data-panel="build" hidden>
            <div class="toolbar"><strong>Build</strong><span class="hint muted">Wartet auf cb:build:* / Datenquelle</span></div>
            <div id="insp-build-info" class="pad muted">Keine Daten empfangen.</div>
          </section>

          <!-- Ressourcen -->
          <section data-panel="resources" hidden>
            <div class="toolbar"><strong>Ressourcen</strong><span class="hint muted">Aktualisiert bei cb:res:change</span></div>
            <table class="inspector-table" id="insp-res-table">
              <thead><tr><th>Ressource</th><th>Menge</th></tr></thead>
              <tbody></tbody>
            </table>
          </section>

          <!-- Pfade -->
          <section data-panel="paths" hidden>
            <div class="toolbar"><strong>Pfade</strong><span class="hint muted">PathOverlay/Heatmap via UIInspector.*</span></div>
            <div class="pad">Noch keine Daten injiziert.</div>
          </section>

          <!-- Tests -->
          <section data-panel="tests" hidden>
            <div class="toolbar">
              <strong>Tests</strong>
              <button type="button" id="insp-test-open">Open</button>
              <button type="button" id="insp-test-close">Close</button>
              <button type="button" id="insp-test-toggle">Toggle</button>
              <span class="hint muted">UIInspector API-Schnelltest</span>
            </div>
            <div class="pad" id="insp-test-info">Bereit.</div>
          </section>
        </div>
      </div>
    `;
    return true;
  },

  /**
   * Verdrahtet UI-Interaktionen (Tabs, Buttons) & Ereignislistener.
   * Idempotent: doppelte Listener werden vermieden.
   */
  bindUI() {
    const host = hostEl(); if (!host) return;

    // Tabs wechseln
    host.addEventListener("click", (ev) => {
      const btn = ev.target?.closest?.(`.${INSP_UI.CLS_TAB}`);
      if (!btn) return;
      const tab = btn.getAttribute("data-insp-tab");

      // Visuelle Umschaltung
      qa(`.${INSP_UI.CLS_TAB}`, host).forEach((b) => {
        const active = (b === btn);
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      qa(".insp-content > section", host).forEach((sec) => {
        sec.toggleAttribute("hidden", sec.getAttribute("data-panel") !== tab);
      });

      // Info-Event (reines Info-Event – Core sendet Open/Close)
      try { window.dispatchEvent(new CustomEvent(INSP_UI.EVT_TAB, { detail: { tab } })); } catch {}
      LogSink.push("info", `Tab → ${tab}`);
    }, { passive: true });

    // Log leeren
    q("#insp-clear-log", host)?.addEventListener("click", () => {
      const tb = q("#insp-log-table tbody", host);
      if (tb) tb.innerHTML = "";
    });

    // Mini-API-Tests (ruft NUR den Core auf)
    q("#insp-test-open", host)?.addEventListener("click",  () => window.UIInspector?.open());
    q("#insp-test-close", host)?.addEventListener("click", () => window.UIInspector?.close());
    q("#insp-test-toggle", host)?.addEventListener("click",() => window.UIInspector?.toggle());
  },

  /**
   * Verdrahtet Kern-Events aus dem Spiel (nur die, die wir sicher kennen).
   * - cb:res:change    → Ressourcen-Tabelle füllen
   * - cb:build:*       → einfache Anzeige im Build-Panel (optional)
   * - cb:insp:open/close → Logeinträge
   */
  bindCoreEvents() {
    // Ressourcen-Änderungen
    window.addEventListener("cb:res:change", (e) => {
      try {
        const list = e?.detail?.list || e?.detail || {};
        const host = hostEl();
        const tbody = q("#insp-res-table tbody", host);
        if (!tbody) return;
        tbody.innerHTML = "";
        Object.entries(list).forEach(([key, val]) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${key}</td><td>${val}</td>`;
          tbody.appendChild(tr);
        });
      } catch {}
    });

    // optionale Build-Infos (catch-all, falls vorhanden)
    const buildInfo = (msg) => {
      const host = hostEl();
      const box = q("#insp-build-info", host);
      if (box) box.textContent = typeof msg === "string" ? msg : JSON.stringify(msg);
    };
    window.addEventListener("cb:build:ready",   (e)=> buildInfo("Build bereit"));
    window.addEventListener("cb:build:update",  (e)=> buildInfo(e?.detail ?? "Build update"));
    window.addEventListener("cb:registry:ready",(e)=> LogSink.push("info", "Registry bereit"));

    // Open/Close-Info (vom Core)
    window.addEventListener("cb:insp:open",  ()=> LogSink.push("info", "Inspector geöffnet (Core)"));
    window.addEventListener("cb:insp:close", ()=> LogSink.push("info", "Inspector geschlossen (Core)"));
  },

  /**
   * Öffentliche Erweiterung: weitere Panels (z. B. "Editoren") registrieren.
   * panels: Array von { id, title, html }
   * - Wird nur ergänzt, wenn Shell bereits vorhanden ist.
   */
  registerPanels(panels = []) {
    const host = hostEl(); if (!host) return false;
    const content = q(".insp-content", host);
    const tabs = q(`.${INSP_UI.CLS_TABS}`, host);
    if (!content || !tabs) return false;

    panels.forEach((p) => {
      // neuen Tab-Button
      const btn = document.createElement("button");
      btn.className = INSP_UI.CLS_TAB;
      btn.setAttribute("data-insp-tab", p.id);
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", "false");
      btn.textContent = p.title || p.id;
      tabs.appendChild(btn);

      // neues Panel
      const sec = document.createElement("section");
      sec.setAttribute("data-panel", p.id);
      sec.setAttribute("hidden", ""); // unsichtbar bis selektiert
      sec.innerHTML = p.html || `<div class="pad muted">(${p.id}) – kein Inhalt</div>`;
      content.appendChild(sec);
    });

    return true;
  }
};


/* ============================================================================
 * [HAUPTLOGIK] – Autostart bei DOMContentLoaded
 * ========================================================================== */
(function bootstrapInspectorContent(){
  const start = () => {
    const host = hostEl();
    if (!host) {
      console.warn("[insp.content] Abbruch – kein Host vorhanden.");
      return;
    }
    const injected = UIInspectorContent.ensureMarkup();

    // Konsole erst hooken, wenn Markup da ist:
    LogSink.hookConsole();

    // UI und Core-Events verdrahten (idempotent)
    UIInspectorContent.bindUI();
    UIInspectorContent.bindCoreEvents();

    // Beim Start: falls Core bereits offen ist → Logs-Tab „sichtbar“ halten
    if (window.UIInspector?.isOpen?.()) {
      // nur Info-Event feuern; UI-Panel-Anzeige steuern wir über Tabs
      try { window.dispatchEvent(new CustomEvent(INSP_UI.EVT_TAB, { detail: { tab: "logs" } })); } catch {}
    }

    console.log(`[insp.content] UI bereit (${INSP_UI.VERSION}) – Markup ${injected ? "injiziert" : "vorhanden"}.`);
  };

  // Defer lädt nach DOM; trotzdem robust:
  if (document.readyState === "complete" || document.readyState === "interactive") {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();


/* ============================================================================
 * [EXPORTS]
 *  - Eine (!) öffentliche Oberfläche für Content-Erweiterungen.
 * ========================================================================== */
window.UIInspectorContent = UIInspectorContent;

/* ======================= EOF ui/ui-inspector.content.js =================== */
