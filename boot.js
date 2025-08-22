/* =============================================================================
 * Siedler‑Mini — boot.js v1.1
 * Initialisiert UI einmalig, verdrahtet Startfenster (Zustand A),
 * Inspector‑Toast, Vollbild, „Cache leeren“, „Weiterspielen“ und „Reset“.
 *
 * Projekt‑Vorgaben:
 *  - Startfenster zuerst sichtbar
 *  - Buttons: „Neues Spiel“, „Weiterspielen“, „Reset“
 *  - „Cache leeren“ in der Toast‑Leiste (ohne Inspector auszuklappen)
 *  - Vollbild nur wenn unterstützt (iPhone ausblenden via index.html)
 *  - Debug/Inspector wird über Toast geöffnet, nicht im Startfenster
 *  - Debug‑Tools/Checker NICHT entfernen
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * =========================================================================== */

/* ----------------------------------------
 * Imports (leer – Boot ist Standalone)
 * --------------------------------------*/
// (keine)

/* ----------------------------------------
 * Konstanten
 * --------------------------------------*/
const SAVE_KEY = 'siedler:lastSave';          // JSON‑Snapshot oder Referenz
const SAVE_META_KEY = 'siedler:lastSaveMeta'; // optional: Meta‑Infos (Zeitpunkt, Map)
const BUILD_FALLBACK = 'V?.?.?';              // falls kein Build vorhanden

/* ----------------------------------------
 * Hilfsfunktionen
 * --------------------------------------*/
const $  = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// Einmal‑Guard für lokale async‑Aktionen (UI blocken, Doppel‑Klicks vermeiden)
let __busy = false;
const guard = (fn) => async (...a) => {
  if (__busy) return;
  __busy = true;
  try { await fn(...a); }
  finally { __busy = false; }
};

// Feature‑Check Fullscreen
function canFullscreen() {
  return !!(document.documentElement.requestFullscreen ||
            document.documentElement.webkitRequestFullscreen ||
            document.documentElement.msRequestFullscreen);
}
function toggleFullscreen() {
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (!req) return;
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    exit?.call(document);
  } else {
    req.call(de);
  }
}

// Build/Badge setzen
function setBuildBadge() {
  const el = $('buildBadge');
  if (!el) return;
  // Quelle priorisieren: window.__BUILD_STR__ → window.__BUILD_VER__ → Fallback mit Datum
  const build =
    (window.__BUILD_STR__) ||
    (typeof window.__BUILD_VER__ === 'string' && window.__BUILD_VER__) ||
    `${BUILD_FALLBACK} • ${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
  el.textContent = build;
}

// Quick‑Diag (sichtbar im Startscreen)
function paintDiag() {
  const box = $('quickDiag');
  if (!box) return;
  const L = [];
  const ok = (b, t, extra='') => L.push(`[${b ? 'OK' : 'FAIL'}] ${t}${extra ? (' • ' + extra) : ''}`);

  ok(!!$('stage'), 'Canvas #stage');
  ok(!!window.GameLoader, 'GameLoader vorhanden');
  ok(typeof window.GameLoader?.start === 'function', 'GameLoader.start()');
  ok(typeof window.GameLoader?.continueFrom === 'function', 'GameLoader.continueFrom()');
  ok(!!$('mapSelect'), 'Map‑Select', $('mapSelect')?.value || '—');

  // SW‑Status (optional)
  const swActive = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  ok(swActive, 'ServiceWorker aktiv', swActive ? 'Ja' : 'Nein');

  // Save‑Status
  let hasSave = false;
  try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch {}
  ok(hasSave, 'Spielstand vorhanden', hasSave ? 'Weiterspielen möglich' : '—');

  box.textContent = L.join('\n');
}

// „Weiterspielen“‑Button aktivieren/deaktivieren
function updateContinueButton() {
  const btn = $('btnContinue');
  if (!btn) return;
  let has = false;
  try { has = !!localStorage.getItem(SAVE_KEY); } catch {}
  if (has) btn.removeAttribute('disabled'); else btn.setAttribute('disabled', 'true');
}

// Confirm‑Dialoge (überschreiben / reset)
async function confirmOverwriteIfNeeded() {
  let has = false;
  try { has = !!localStorage.getItem(SAVE_KEY); } catch {}
  if (!has) return true;
  return window.confirm('Vorhandenen Spielstand überschreiben?');
}
async function confirmResetAll() {
  return window.confirm('Alle Spielstände wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.');
}

// Cache‑Bust Reload (für „Cache leeren“)
async function hardReloadWithBust() {
  try {
    // Optional: SW‑Cache leeren, falls vorhanden
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch {/* ignorieren */}
  const url = new URL(location.href);
  url.searchParams.set('v', String(Date.now()));
  location.replace(url.toString());
}

// Inspector öffnen/schließen
function openInspector() {
  const ins = $('inspector');
  if (!ins) return;
  ins.hidden = false;
}
function closeInspector() {
  const ins = $('inspector');
  if (!ins) return;
  ins.hidden = true;
}

/* ----------------------------------------
 * Klassen (nicht benötigt in boot.js)
 * --------------------------------------*/
// (keine)

/* ----------------------------------------
 * Hauptlogik (einmalig initialisieren)
 * --------------------------------------*/
(() => {
  // Doppelte Ausführung verhindern (z. B. durch mehrfaches Einbinden)
  if (window.__BOOT_INIT_DONE__) return;
  window.__BOOT_INIT_DONE__ = true;

  window.addEventListener('DOMContentLoaded', () => {
    // Startpanel sichtbar machen
    const panel = $('startPanel');
    if (panel) panel.hidden = false;

    setBuildBadge();
    paintDiag();
    updateContinueButton();

    // --- Buttons verdrahten (einmalig) ---
    const bNew    = $('btnStart');         // „Neues Spiel“
    const bCont   = $('btnContinue');      // „Weiterspielen“
    const bReset  = $('btnReset');         // „Reset“
    const bFS     = $('btnFull');          // Vollbild (im HUD)
    const bInsp   = $('btnInspector');     // Inspector öffnen
    const bInspX  = $('btnInspectorClose');// Inspector schließen
    const bCache  = $('btnCacheClear');    // Cache leeren (Toast)

    // Neues Spiel
    on(bNew, 'click', guard(async () => {
      if (!(await confirmOverwriteIfNeeded())) return;
      const url = $('mapSelect')?.value;
      if (!url) { alert('Keine Karte ausgewählt.'); return; }
      // Neues Spiel starten
      await window.GameLoader?.start(url);
      // Startpanel ausblenden
      if (panel) panel.hidden = true;
    }));

    // Weiterspielen
    on(bCont, 'click', guard(async () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) { updateContinueButton(); return; }
        const snap = JSON.parse(raw);
        await window.GameLoader?.continueFrom(snap);
        if (panel) panel.hidden = true;
      } catch (err) {
        console.error('[boot] Weiterspielen fehlgeschlagen:', err);
        // Falls Save korrupt → Button deaktivieren
        try { localStorage.removeItem(SAVE_KEY); } catch {}
        updateContinueButton();
      }
    }));

    // Reset (alle Spielstände löschen)
    on(bReset, 'click', guard(async () => {
      if (!(await confirmResetAll())) return;
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(SAVE_META_KEY);
      } catch {}
      updateContinueButton();
      paintDiag();
      // Optional: kleine Bestätigung
      const box = $('quickDiag');
      if (box) box.textContent = (box.textContent ? box.textContent + '\n' : '') + '[OK] Spielstände gelöscht.';
    }));

    // Vollbild (nur wenn unterstützt; Index blendet den Button bei no-fs aus)
    on(bFS, 'click', () => { if (canFullscreen()) toggleFullscreen(); });

    // Inspector öffnen/schließen
    on(bInsp,  'click', openInspector);
    on(bInspX, 'click', closeInspector);

    // Cache leeren (Hard‑Reload + Cache‑Bust)
    on(bCache, 'click', guard(hardReloadWithBust));

    // Einmaliges Log
    if (!window.__BOOT_UI_LOGGED__) {
      console.log('[boot] UI bereit.');
      window.__BOOT_UI_LOGGED__ = true;
    }
  });
})();

/* ----------------------------------------
 * Exports (global – optional Utilities für andere Module)
 * --------------------------------------*/
window.BootUI = Object.freeze({
  setBuildBadge,
  paintDiag,
  updateContinueButton
});

/* ----------------------------------------
 * Hinweise zur Integration (Dok):
 *  - Speichern im Spiel:
 *      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
 *      localStorage.setItem(SAVE_META_KEY, JSON.stringify({ when: Date.now(), map: currentMap }));
 *    Danach BootUI.updateContinueButton() aufrufen.
 *  - GameLoader muss bereitstellen:
 *      start(mapUrl: string): Promise<void>
 *      continueFrom(snapshot: object): Promise<void>
 *  - „Cache leeren“:
 *      nutzt CacheStorage API (wenn vorhanden) und hängt ?v=timestamp an URL.
 * --------------------------------------*/
