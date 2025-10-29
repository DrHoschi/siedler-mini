/* ============================================================================
 * Datei   : inspector/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v1.0.0-core
 * Autor   : Mann / ChatGPT-5
 * Zweck   : Inspector-CORE (ohne UI-Markup) – Öffnen/Schließen, Flags, Events,
 *           FAB-Bindung, ESC-Schließen, ARIA, Komfort-APIs (Export, PathOverlay)
 *
 * Struktur: IMPORTS → KONSTANTEN → HELFER → KLASSE → HAUPTLOGIK → EXPORTS
 *
 * Hinweise:
 *  - Diese Datei liefert NUR die Steuerlogik (kein HTML-Markup für Tabs/Panels).
 *  - UI-Markup kommt entweder aus ui/ui-inspector.content.js (defer) ODER
 *    via Inline-Bootstrap am Ende der index.demo.html (Safari-Fallback).
 *  - Events sind konsolidiert auf: cb:insp:open / cb:insp:close / cb:insp:tab:change
 *  - Body-Flags: .is-inspector (neu) + .inspector-open (Legacy, kompatibel)
 *  - Host: #inspector ODER #inspector-overlay (beide werden unterstützt)
 *
 * Konventionen:
 *  - Niemals Debug/Komfort-Funktionen entfernen (Projektpräferenz).
 *  - Kommentarstil ausführlich für spätere Wartung/Portierungen.
 * ========================================================================== */


/* ============================================================================
 * [IMPORTS]
 * (Kein Modul-Import nötig; Datei wird mit <script defer src="..."> geladen.)
 * ========================================================================== */


/* ============================================================================
 * [KONSTANTEN]
 * ========================================================================== */
const INSP = {
  // IDs für den Host (Overlay)
  HOST_IDS: ["inspector", "inspector-overlay"],

  // Body-Flags: neu + legacy (werden synchron gehalten)
  CLASS_ACTIVE_NEW: "is-inspector",
  CLASS_ACTIVE_LEGACY: "inspector-open",

  // Selektor des optionalen FAB-Buttons (Toggle)
  FAB_ID: "btn-inspector",

  // Event-Namen (einheitlich, keine cb:inspector:* mehr)
  EVT_OPEN:  "cb:insp:open",
  EVT_CLOSE: "cb:insp:close",
  EVT_TAB:   "cb:insp:tab:change",

  // Schutz: Maximale Wartezeit bis DOM fertig (ms)
  DOM_READY_FAILSAFE_MS: 8000
};


/* ============================================================================
 * [HILFSFUNKTIONEN]
 *  - Kleine Utilities, bewusst unabhängig von Frameworks.
 * ========================================================================== */

/** Schnelle Query-Helfer */
function $(sel, root = document)      { return root.querySelector(sel); }
function $all(sel, root = document)   { return Array.from(root.querySelectorAll(sel)); }

/** Den Inspector-Host (#inspector oder #inspector-overlay) ermitteln */
function getInspectorHost() {
  for (const id of INSP.HOST_IDS) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

/** Setzt/entfernt Body-Flags und ARIA-Attribute am Host */
function setInspectorActive(active) {
  const host = getInspectorHost();
  // Body-Flags (neu + legacy) synchronisieren
  document.body.classList.toggle(INSP.CLASS_ACTIVE_NEW, active);
  document.body.classList.toggle(INSP.CLASS_ACTIVE_LEGACY, active);
  // ARIA am Host aktualisieren (wenn Host existiert)
  if (host) host.setAttribute("aria-hidden", active ? "false" : "true");
}

/** Prüft den aktuellen Offen-Status – nur über Body-Flag */
function isInspectorActive() {
  return document.body.classList.contains(INSP.CLASS_ACTIVE_NEW)
      || document.body.classList.contains(INSP.CLASS_ACTIVE_LEGACY);
}

/** Sende ein offenes/zuschließendes Event (nur einmalig, Doppelfeuer vermeiden) */
function dispatchStateEvent(open) {
  const evtName = open ? INSP.EVT_OPEN : INSP.EVT_CLOSE;
  try {
    window.dispatchEvent(new CustomEvent(evtName));
  } catch (_) {
    // Falls CustomEvent geblockt: Fallback – nicht kritisch
    window.dispatchEvent(new Event(evtName));
  }
}

/** Safeguard: Entfernt beim Start evtl. „hängengebliebene“ Flags */
function resetFlagsOnBoot() {
  document.body.classList.remove(INSP.CLASS_ACTIVE_NEW, INSP.CLASS_ACTIVE_LEGACY);
  const host = getInspectorHost();
  if (host) host.setAttribute("aria-hidden", "true");
}

/** FAB-Button (unten rechts) an die Toggle-Funktion binden – nicht verpflichtend */
function bindFabIfPresent() {
  const fab = document.getElementById(INSP.FAB_ID);
  if (!fab) return; // FAB ist optional (API funktioniert trotzdem)
  fab.addEventListener("click", () => UIInspector.toggle(), { passive: true });
}

/** ESC schließt den Inspector, wenn offen */
function bindEscToClose() {
  window.addEventListener("keydown", (ev) => {
    // ESC: key === "Escape" (Cross-Browser: keyCode 27 alt)
    if (ev.key === "Escape" || ev.keyCode === 27) {
      if (isInspectorActive()) {
        UIInspector.close();
        // ESC soll das Spiel nicht ungewollt beeinflussen → nicht stopPropagation
      }
    }
  });
}

/** Kleinformatierte Uhrzeit für Logs (Komfort) */
function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

/** Minimal-Logger in die Konsole (bleibt bewusst schlicht) */
function logInfo(msg)  { try { console.log(`[insp ${nowStr()}] ${msg}`); } catch(_){} }
function logWarn(msg)  { try { console.warn(`[insp ${nowStr()}] ${msg}`); } catch(_){} }
function logError(msg) { try { console.error(`[insp ${nowStr()}] ${msg}`); } catch(_){} }


/* ============================================================================
 * [KLASSE] UIInspector – öffentliche API
 *  - Eine globale API-Oberfläche ohne Duplikate.
 *  - open() / close() / toggle() / isOpen() / getHost()
 * ========================================================================== */
class UIInspector {

  /** Liefert den aktiven Host (oder null) */
  static getHost() {
    return getInspectorHost();
  }

  /** Ist der Inspector offen? */
  static isOpen() {
    return isInspectorActive();
  }

  /** Öffnet den Inspector robust (setzt Flags/ARIA, feuert Event, Fokus bleibt bei dir) */
  static open() {
    if (isInspectorActive()) return; // bereits offen
    const host = getInspectorHost();
    if (!host) {
      logWarn("open(): Kein Host (#inspector / #inspector-overlay) vorhanden.");
      // Flags trotzdem konsistent halten – verhindert UI-Drift:
      setInspectorActive(true);
      dispatchStateEvent(true);
      return;
    }
    setInspectorActive(true);
    dispatchStateEvent(true);
    logInfo("Inspector geöffnet.");
  }

  /** Schließt den Inspector (Flags/ARIA, Event) */
  static close() {
    if (!isInspectorActive()) return; // bereits zu
    setInspectorActive(false);
    dispatchStateEvent(false);
    logInfo("Inspector geschlossen.");
  }

  /** Toggle open/close */
  static toggle() {
    if (isInspectorActive()) UIInspector.close();
    else UIInspector.open();
  }
}


/* ============================================================================
 * [HAUPTLOGIK] – Initialisierung beim Laden
 *  - Wird mit <script defer> idealerweise NACH dem DOM-Parsing ausgeführt.
 *  - Failsafe, falls defer nicht gesetzt ist.
 * ========================================================================== */
(function bootstrapInspectorCore(){
  // 1) Flags auf definierten Startzustand bringen
  resetFlagsOnBoot();

  // 2) Wenn DOM bereits bereit ist, sofort initialisieren – sonst bei DOMContentLoaded
  const init = () => {
    // Host-Existenz ist für die API nicht zwingend, aber schön zu haben:
    const host = getInspectorHost();
    if (!host) {
      logWarn("Kein Inspector-Host gefunden (#inspector / #inspector-overlay). API läuft, UI erfordert Markup.");
    } else {
      // Initial sicher: im geschlossenen Zustand starten
      host.setAttribute("aria-hidden", "true");
    }

    // FAB binden (falls vorhanden) & ESC-Schließen aktivieren
    bindFabIfPresent();
    bindEscToClose();

    // Debug-Hinweis
    logInfo("Inspector-Core bereit (API + Flags + Events).");
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    // DOM steht bereits
    init();
  } else {
    // Warten auf DOMContentLoaded (failsafe Timeout)
    let done = false;
    const onReady = () => { if (!done) { done = true; init(); } };
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
    setTimeout(onReady, INSP.DOM_READY_FAILSAFE_MS);
  }
})();


/* ============================================================================
 * [KOMFORT-APIs] – Add-ons an UIInspector (keine zweite „Core-Klasse“!)
 *  - Export-Funktionen & Brücken (PathOverlay/Heatmap).
 *  - Diese Funktionen hängen wir bewusst AN die UIInspector-API.
 * ========================================================================== */

/**
 * Exportiert die aktuelle Log-Tabelle (falls vorhanden) als reinen Text in die
 * Zwischenablage. Fällt elegant auf einen Hinweis zurück, wenn nicht vorhanden.
 * Erwartet (optional) eine Tabelle mit id="insp-log-table".
 */
UIInspector.exportLogsToClipboard = async function exportLogsToClipboard() {
  try {
    const host = getInspectorHost();
    const tbody = host?.querySelector?.("#insp-log-table tbody");
    if (!tbody) {
      await navigator.clipboard.writeText(`[Inspector Logs @ ${nowStr()}]\n(Keine Log-Tabelle im DOM gefunden)`);
      logWarn("Keine Log-Tabelle im DOM gefunden – es wurde ein Hinweis kopiert.");
      return;
    }
    const rows = Array.from(tbody.querySelectorAll("tr")).map(tr => {
      const tds = tr.querySelectorAll("td");
      return Array.from(tds).map(td => td.textContent.trim()).join("\t");
    }).join("\n");
    await navigator.clipboard.writeText(rows || "(Log ist leer)");
    logInfo("Logs in die Zwischenablage kopiert.");
  } catch (err) {
    logError("Clipboard-Export fehlgeschlagen: " + (err?.message || err));
  }
};

/**
 * Exportiert die Log-Tabelle als JSON-Blob zum Download.
 * Fällt zurück, wenn keine Tabelle vorhanden ist.
 */
UIInspector.exportLogsJSON = function exportLogsJSON(filename = "inspector-logs.json") {
  try {
    const host = getInspectorHost();
    const tbody = host?.querySelector?.("#insp-log-table tbody");
    let data = [];
    if (tbody) {
      data = Array.from(tbody.querySelectorAll("tr")).map(tr => {
        const [time, type, msg] = Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim());
        return { time, type, msg };
      });
    } else {
      data = [{ time: nowStr(), type: "info", msg: "Keine Log-Tabelle im DOM gefunden." }];
      logWarn("Keine Log-Tabelle im DOM gefunden – JSON enthält Hinweis.");
    }
    UIInspector.exportJSON(data, filename);
  } catch (err) {
    logError("ExportLogsJSON fehlgeschlagen: " + (err?.message || err));
  }
};

/**
 * Helfer: Beliebiges Objekt als JSON-Datei herunterladen.
 */
UIInspector.exportJSON = function exportJSON(obj, filename = "export.json") {
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logInfo(`JSON exportiert → ${filename}`);
  } catch (err) {
    logError("exportJSON fehlgeschlagen: " + (err?.message || err));
  }
};

/**
 * PathOverlay/Heatmap-Brücken:
 *  - Diese senden nur Steuer-Events; Implementierung liegt in den jeweiligen Tools.
 *  - Events bleiben neutral und projektweit nutzbar.
 */
UIInspector.pathOverlay = function pathOverlay(on = true) {
  try {
    const evt = on ? "cb:path:overlay:on" : "cb:path:overlay:off";
    window.dispatchEvent(new CustomEvent(evt));
    logInfo(`PathOverlay → ${on ? "an" : "aus"}`);
  } catch (err) {
    logError("pathOverlay fehlgeschlagen: " + (err?.message || err));
  }
};

UIInspector.heatmap = function heatmap(on = true) {
  try {
    const evt = on ? "cb:path:heatmap:on" : "cb:path:heatmap:off";
    window.dispatchEvent(new CustomEvent(evt));
    logInfo(`Heatmap → ${on ? "an" : "aus"}`);
  } catch (err) {
    logError("heatmap fehlgeschlagen: " + (err?.message || err));
  }
};


/* ============================================================================
 * [EXPORTS]
 *  - Eine EINZIGE globale API-Oberfläche.
 *  - Keine zweite „Bridge“-Klasse, kein Duplikat von Events/Flags!
 * ========================================================================== */
window.UIInspector = UIInspector;

/* ============================= EOF ui/ui-inspector.js ===================== */
