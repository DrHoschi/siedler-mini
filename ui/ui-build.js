/* ============================================================================
 * Datei   : ui/ui-build.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-fix
 * Zweck   : BuildDock + Platziermodus (sauberer Toggle, Ghost, Confirm-Bar)
 *
 * WICHTIG (Kontrakt, vgl. Lastenheft Kap. 3 & 4):
 * - Emit:   cb:build:open|close|select|place|cancel
 * - Bridge: req:place:start (→ core.input), req:place:cancel, req:place:confirm
 * - Idempotenz: init() darf nur 1× wirksam werden (Reloads / Hot-Replace)
 * - Kein Auto-Open beim Spielstart.
 * - Nur 1 Confirm-Bar (#place-confirm-bar) – unten rechts, mobile-safe.
 * ========================================================================== */

(function () {
  // ---------------------------------------------------------------------------
  // Guard: Modul nur 1× aktivieren
  // ---------------------------------------------------------------------------
  if (window.UIBuild?.__active) {
    (window.CBLog?.info||console.info)('[build] bereits aktiv – skip init');
    return;
  }

  // ---------------------------------------------------------------------------
  // Modul-State
  // ---------------------------------------------------------------------------
  const state = {
    open: false,
    activeBuilding: null,     // { id, size:[w,h] }
    confirmBar: null,         // DOM der Confirm-Leiste
    btnBuild: null,           // #btn-build
    dock: null,               // #build-dock (Container der Kacheln)
    inited: false
  };

  // Minimaler Fallback für Logging
  const log = {
    ok:   (...a)=> (window.CBLog?.ok   || console.log   )(...a),
    info: (...a)=> (window.CBLog?.info || console.info  )(...a),
    warn: (...a)=> (window.CBLog?.warn || console.warn  )(...a),
    err:  (...a)=> (window.CBLog?.error|| console.error )(...a),
  };

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen – Events
  // ---------------------------------------------------------------------------
  const emit = (type, detail={}) => {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  };

  // ---------------------------------------------------------------------------
  // Confirm-Bar (unten rechts) – Singleton
  // ---------------------------------------------------------------------------
  function ensureConfirmBar() {
    if (state.confirmBar && document.body.contains(state.confirmBar)) return state.confirmBar;

    // Bestehende Leisten wegräumen (Verwaisungen aus älteren Builds)
    for (const old of document.querySelectorAll('#place-confirm-bar')) old.remove();

    const bar = document.createElement('div');
    bar.id = 'place-confirm-bar';
    bar.innerHTML = `
      <button class="pcb-btn pcb-ok" aria-label="Bestätigen" title="Bestätigen">✓</button>
      <button class="pcb-btn pcb-cancel" aria-label="Abbrechen" title="Abbrechen">×</button>
    `;
    document.body.appendChild(bar);

    // Clicks (mit {once:false}, aber wir binden nur 1×, da bar neu ist)
    bar.querySelector('.pcb-ok').addEventListener('click', onConfirmClick);
    bar.querySelector('.pcb-cancel').addEventListener('click', onCancelClick);

    state.confirmBar = bar;
    return bar;
  }

  function hideConfirmBar() {
    if (state.confirmBar) state.confirmBar.classList.add('is-hidden');
  }
  function showConfirmBar() {
    ensureConfirmBar().classList.remove('is-hidden');
  }

  // ---------------------------------------------------------------------------
  // Platzier-Bridge → core.input
  // ---------------------------------------------------------------------------
  function beginPlace(buildingId, size) {
    // UI-State
    state.activeBuilding = { id: buildingId, size: size || [3,3] };
    document.body.classList.add('is-placing');

    // Ghost & Input aktivieren
    emit('cb:build:select', { buildingId });
    window.dispatchEvent(new CustomEvent('req:place:start', {
      detail: { buildingId, size: state.activeBuilding.size }
    }));

    showConfirmBar();
    log.info('[build] select %s → begin %dx%d', buildingId, state.activeBuilding.size[0], state.activeBuilding.size[1]);
  }

  function cancelPlace(via='button') {
    if (!state.activeBuilding) return closeDock('cancel');
    window.dispatchEvent(new CustomEvent('req:place:cancel', { detail: { via } }));
    emit('cb:build:cancel', { via });
    state.activeBuilding = null;
    document.body.classList.remove('is-placing');
    hideConfirmBar();
  }

  function onConfirmClick() {
    // Bestätigung wird vom Input-Modul ausgelöst, wenn Cursor/Touch über Karte ist.
    // Wir senden nur den Confirm-Request. Das Game/Place-Handler emittiert anschließend cb:build:place.
    if (!state.activeBuilding) return;
    window.dispatchEvent(new CustomEvent('req:place:confirm', {
      detail: { buildingId: state.activeBuilding.id }
    }));
    // UI wartet auf cb:build:place (ok|fail). Bis dahin Leiste sichtbar lassen.
  }

  function onCancelClick() {
    cancelPlace('button');
  }

  // ---------------------------------------------------------------------------
  // Dock öffnen/schließen
  // ---------------------------------------------------------------------------
  function openDock(from='HUD') {
    if (state.open) return;
    state.open = true;
    state.dock?.classList.add('is-open');
    emit('cb:build:open', { from });
    log.info('[build] open');
  }

  function closeDock(reason='cancel') {
    if (!state.open) return;
    state.open = false;
    state.dock?.classList.remove('is-open');
    emit('cb:build:close', { reason });
    log.info('[build] close');
    cancelPlace('dock-close'); // stellt sicher, dass Ghost/Mode sauber verlassen wird
  }

  function toggleDock() { state.open ? closeDock('toggle') : openDock('toggle'); }

  // ---------------------------------------------------------------------------
  // UI verdrahten (Button & Kacheln)
  // ---------------------------------------------------------------------------
  function bindButton() {
    const btn = document.getElementById('btn-build');
    if (!btn) { log.warn('[build] #btn-build fehlt'); return; }
    state.btnBuild = btn;
    btn.removeEventListener('click', toggleDock); // Idempotenz
    btn.addEventListener('click', toggleDock, { passive:true });
  }

  function bindDock() {
    const dock = document.getElementById('build-dock');
    if (!dock) { log.warn('[build] #build-dock fehlt'); return; }
    state.dock = dock;

    // (Re)Bind: alle .build-card Buttons triggern beginPlace
    dock.querySelectorAll('[data-building-id]').forEach(el => {
      el.removeEventListener('click', el.__ns_buildClick);
      el.__ns_buildClick = () => {
        // Optional: Größe von data-size="3x3" lesen; Default 3x3
        const id = el.getAttribute('data-building-id');
        const sz = (el.getAttribute('data-size')||'3x3').split('x').map(n=>parseInt(n,10));
        beginPlace(id, sz);
      };
      el.addEventListener('click', el.__ns_buildClick);
    });

    // X-Schließen im Dock (data-close)
    dock.querySelectorAll('[data-close]').forEach(el=>{
      el.removeEventListener('click', el.__ns_close);
      el.__ns_close = ()=> closeDock('x');
      el.addEventListener('click', el.__ns_close);
    });
  }

  // ---------------------------------------------------------------------------
  // Reaktionen auf System/Engine-Events
  // ---------------------------------------------------------------------------
  function onPlaceResult(e) {
    // Erwartet vom Place-Handler: detail = { buildingId, x, y, ok, reason? }
    const d = e.detail||{};
    if (d.ok) {
      log.ok('[build] Platzierung ok %s @ %d,%d', d.buildingId, d.x|0, d.y|0);
      emit('cb:build:place', d);
      // UI aufräumen
      state.activeBuilding = null;
      document.body.classList.remove('is-placing');
      hideConfirmBar();
      closeDock('place');
    } else {
      log.warn('[build] Platzierung fehlgeschlagen: %s', d.reason||'unbekannt');
      // Ghost aktiv lassen; Confirm-Bar bleibt sichtbar
    }
  }

  function onBackEsc(e) {
    // ESC / Back-Button-Flow (Desktop/Android)
    if (document.body.classList.contains('is-placing')) {
      cancelPlace('back');
      e?.preventDefault?.();
      return;
    }
    if (state.open) {
      closeDock('back');
      e?.preventDefault?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    if (state.inited) return;
    state.inited = true;

    bindButton();
    bindDock();
    ensureConfirmBar();
    hideConfirmBar();

    // Engine/Bridge-Events
    window.removeEventListener('cb:place:result', onPlaceResult);
    window.addEventListener('cb:place:result', onPlaceResult);

    // ESC (Desktop)
    window.removeEventListener('keydown', UIKeydownGuard);
    window.addEventListener('keydown', UIKeydownGuard);

    // Android Back (optional – wenn eigenes Handling)
    window.removeEventListener('cb:back', onBackEsc);
    window.addEventListener('cb:back', onBackEsc);

    log.ok('[build] bereit');
  }

  function UIKeydownGuard(ev){
    if (ev.key === 'Escape') onBackEsc(ev);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.UIBuild = {
    __active: true,
    open: openDock,
    close: closeDock,
    toggle: toggleDock,
    beginPlace,
    cancelPlace,
    init
  };

  // Auto-Init nach DOMContentLoaded (aber KEIN Auto-Open!)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
