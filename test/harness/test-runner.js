/* ============================================================
   Datei: test/harness/test-runner.js
   Projekt: Neue Siedler – Prüf-Template
   Version: v1.0.0 (2025-09-24)
   Zweck:
     - Lädt ein beliebiges UI-Modul (ESM) dynamisch
     - Bindet optional dessen CSS
     - Lädt Testdaten (JSON) ODER nutzt Inline-Dummy
     - Ruft die angegebene Init-/Render-Funktion auf
     - Liefert robuste Logs/Fehlerausgabe für "nur Überschrift"-Fälle
   Nutzungsbeispiel (Query):
     ?module=ui/ui-build.js&init=UIBuild.render&css=ui/css/ui-build.css&data=test/samples/ui-build.sample.json
   ============================================================ */

const q = new URLSearchParams(location.search);

/** Hilfs-Log ins Diagnose-Feld + Konsole */
function log(...args) {
  console.log("[test-runner]", ...args);
  const el = document.getElementById("diag");
  if (el) el.textContent += args.map(String).join(" ") + "\n";
}

/** Fehler anzeigen (sichtbar) */
function showError(msg) {
  console.error("[test-runner:ERROR]", msg);
  const el = document.getElementById("diag");
  if (el) {
    el.textContent += "\n❌ ERROR: " + msg + "\n";
  }
  // Optional: roten Rahmen setzen
  document.getElementById("mount")?.classList.add("test-error");
}

/** Meta anzeigen (welches Modul, CSS, Init etc.) */
function setMeta(info) {
  const el = document.getElementById("meta");
  if (!el) return;
  el.innerHTML = [
    `<strong>Modul</strong>: ${info.module || "—"}`,
    `<strong>Init</strong>: ${info.init || "—"}`,
    `<strong>CSS</strong>: ${info.css || "—"}`,
    `<strong>Data</strong>: ${info.data || "—"}`
  ].join(" &nbsp;|&nbsp; ");
}

/** CSS dynamisch einbinden */
function ensureCSS(href) {
  return new Promise((resolve) => {
    if (!href) return resolve(false);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => { log("CSS geladen:", href); resolve(true); };
    link.onerror = () => { showError("CSS konnte nicht geladen werden: " + href); resolve(false); };
    document.head.appendChild(link);
  });
}

/** JSON-Daten laden (optional) */
async function loadJSON(path) {
  if (!path) return null;
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    log("Daten geladen:", path);
    return json;
  } catch (e) {
    showError("Konnte JSON nicht laden: " + path + " → " + e.message);
    return null;
  }
}

/** Dummy-Fallback-Daten (falls nichts geliefert wird) */
function fallbackData() {
  return [
    { id: "b.hq", name: "HQ", icon: "assets/icons/hq.png" },
    { id: "b.lumber", name: "Holzfäller", icon: "assets/icons/lumberjack.png" },
    { id: "b.fisher", name: "Fischerhütte", icon: "assets/icons/fisher.png" }
  ];
}

(async function main() {
  const modulePath = q.get("module");
  const initPath   = q.get("init");   // z.B. "UIBuild.render" oder "UIStart.init"
  const cssPath    = q.get("css");
  const dataPath   = q.get("data");

  setMeta({ module: modulePath, init: initPath, css: cssPath, data: dataPath });

  if (!modulePath || !initPath) {
    showError("Fehlende Parameter: 'module' und/oder 'init'. Beispiel: ?module=ui/ui-build.js&init=UIBuild.render");
    return;
  }

  // 1) CSS (optional)
  await ensureCSS(cssPath);

  // 2) Modul laden
  let mod = null;
  try {
    mod = await import(relative(modulePath));
    log("Modul geladen:", modulePath);
  } catch (e) {
    showError("Modul konnte nicht geladen werden: " + modulePath + " → " + e.message);
    return;
  }

  // 3) Init-Funktion auflösen (z.B. "UIBuild.render")
  const initFn = resolveExportPath(mod, initPath);
  if (typeof initFn !== "function") {
    showError("Init-Funktion nicht gefunden oder kein Function-Type: " + initPath);
    log("Verfügbare Exports:", Object.keys(mod));
    return;
  }

  // 4) Daten organisieren
  let data = await loadJSON(dataPath);
  if (!data) {
    data = fallbackData();
    log("Nutze Fallback-Daten (keine oder fehlerhafte data=…)");
  }

  // 5) Mount finden
  const mount = document.getElementById("mount");
  if (!mount) {
    showError("#mount nicht gefunden.");
    return;
  }

  // 6) Init aufrufen
  try {
    // Konvention: init(container, data)
    const res = initFn.call(null, mount, data);
    log("Init aufgerufen:", initPath, "→ Result:", typeof res);
  } catch (e) {
    showError("Init-Funktion warf einen Fehler: " + e.message);
  }
})();

/** Hilfen */
function relative(path) {
  // Erlaubt sowohl absolute als auch relative Pfade; hier simpel belassen.
  return path;
}

function resolveExportPath(mod, path) {
  // Pfad wie "UIBuild.render" in echte Funktion auflösen
  const segs = path.split(".");
  let cur = mod;
  for (const s of segs) {
    cur = cur?.[s];
  }
  return cur;
}
