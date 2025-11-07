/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.11.07-final (Autostart entfernt; Start nur per Button)
 * Zweck   : Startfenster + Splash-Hintergrund (vor Spielstart sichtbar).
 *
 * Sendet  : cb:ui-ready (GENAU 1× beim Aufbau des Startpanels)
 *           req:game:start      (nur auf Button-Klick "Spiel starten")
 *           req:game:continue   (nur auf Button-Klick "Weiterspielen")
 *           req:game:reset      (nur auf Button-Klick "Reset")
 *
 * Lauscht : cb:game:start  → Panel schließen, body.is-playing setzen
 *           cb:game:paused → Panel öffnen,  body.is-playing entfernen
 *
 * Hinweise:
 * - KEIN Autostart mehr im Init! (frühere Zeile wurde entfernt)
 * - Startpanel bleibt sichtbar bis der Nutzer aktiv startet/fortsetzt.
 * - cb:ui-ready wird exakt 1× emittiert (für Layout/HUD-Init).
 * ========================================================================== */
(function () {
  'use strict';
  const TAG  = '[ui-start]';
  const log  = (m, ...a) => (window.CBLog?.info  || console.info )(TAG, m, ...a);
  const warn = (m, ...a) => (window.CBLog?.warn  || console.warn )(TAG, m, ...a);

  // ---------------------------- Run-Once Guard ------------------------------
  if (window.__UI_START_INIT__) { warn('Doppel-Init verhindert.'); return; }
  window.__UI_START_INIT__ = true;

  const html = document.documentElement;
  const root = document.getElementById('ui-root') || document.body;

  // Panel zum Start sichtbar machen (Spiel noch NICHT aktiv)
  html.classList.add('panel-open');
  document.body.classList.remove('is-playing');

  // ------------------------------ Splash-Image ------------------------------
  // Minimaler Splash-Hintergrund, Quelle kommt aus :root --start-bg
  (function ensureSplash() {
    if (document.getElementById('start-splash')) return;
    const splash = document.createElement('div');
    splash.id = 'start-splash';
    document.body.appendChild(splash);

    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--start-bg').trim();
    const m   = cssVar.match(/url\((['"]?)(.*?)\1\)/);
    const url = m ? m[2] : '../../assets/ui/start-bg.jpg';
    const img = new Image();
    img.onerror = () => warn('Splash-Bild nicht gefunden:', url);
    img.src = url;

    // Splash weich ausblenden, sobald das Spiel WIRKLICH startet
    window.addEventListener('cb:game:start', () => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 280);
    }, { once: true });
  })();

  // ------------------------------ Panel-UI ---------------------------------
  const panel = document.createElement('div');
  panel.id = 'start-panel';
  panel.style.display = 'grid';
  panel.innerHTML = `
    <div class="box wood-frame">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start">Spiel starten</button>
        <button id="btn-continue">Weiterspielen</button>
        <button id="btn-reset">Reset</button>
        <button id="btn-fullscreen">Vollbild</button>
      </div>
    </div>`;
  (root || document.body).appendChild(panel);

  // Hilfsfunktionen für Sichtbarkeit/State
  function closePanel() {
    panel.style.display = 'none';
    html.classList.remove('panel-open');
    document.body.classList.add('is-playing');
  }
  function openPanel()  {
    panel.style.display = 'grid';
    html.classList.add('panel-open');
    document.body.classList.remove('is-playing');
  }

  async function toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.call(el));
      } else {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    } catch {
      warn('Vollbild evtl. durch iOS/Safari eingeschränkt.');
    }
  }

  // ------------------------------ Button-Events -----------------------------
  // WICHTIG: Kein Autostart im Init – nur per Klick!

  // a) "Spiel starten" → neues Spiel
  panel.querySelector('#btn-start')?.addEventListener('click', () => {
    // UI bereit (nur 1×, falls noch nicht passiert)
    if (!window.__UI_READY_EMITTED__) {
      window.__UI_READY_EMITTED__ = true;
      window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { ok: true } }));
    }
    // Spielstart anfordern (JETZT erst!)
    window.dispatchEvent(new CustomEvent('req:game:start', { detail: { mode: 'new' } }));
    // Panel NICHT hart sofort schließen – wir warten auf cb:game:start.
    // (Damit bleibt der Übergang robust, falls Start asynchron ist.)
  });

  // b) "Weiterspielen" → Fortsetzen
  panel.querySelector('#btn-continue')?.addEventListener('click', () => {
    if (!window.__UI_READY_EMITTED__) {
      window.__UI_READY_EMITTED__ = true;
      window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { ok: true } }));
    }
    window.dispatchEvent(new CustomEvent('req:game:continue', { detail: { mode: 'continue' } }));
    // Schließen ebenfalls erst, wenn das Spiel signalisiert, dass es läuft.
  });

  // c) "Reset" → Speicher löschen + Reset-Event
  panel.querySelector('#btn-reset')?.addEventListener('click', () => {
    try { localStorage.clear(); } catch {}
    window.dispatchEvent(new CustomEvent('req:game:reset'));
    // Panel bleibt offen – der Nutzer entscheidet danach, was er macht.
  });

  // d) "Vollbild" toggeln
  panel.querySelector('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);

  // ------------------------------ Event-Brücken -----------------------------
  // Spiel läuft → Panel schließen
  window.addEventListener('cb:game:start', closePanel);

  // Spiel pausiert → Panel öffnen
  window.addEventListener('cb:game:paused', openPanel);

  // ESC → Pause anfordern (falls nicht von Game abgefangen)
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('req:game:pause'));
      // Fallback: wenn kein Panel geöffnet wurde, dann öffnen
      setTimeout(() => { if (!html.classList.contains('panel-open')) openPanel(); }, 60);
    }
  });

  // ------------------------------ UI Ready ---------------------------------
  // Wichtig: cb:ui-ready GENAU 1× beim Panel-Aufbau (früh) – dein Layout/HUD hört darauf.
  if (!window.__UI_READY_EMITTED__) {
    window.__UI_READY_EMITTED__ = true;
    window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { ok: true } }));
    log('Startpanel bereit → cb:ui-ready');
  }

  // KEIN Autostart hier! (frühere Zeile wurde absichtlich entfernt)
})();
