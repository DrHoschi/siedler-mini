/* ============================================================================
 * Datei   : ui/inspector/inspector.paths.js
 * Projekt : Neue Siedler – Inspector (Paths-Tab)
 * Version : v25.10.28-final
 *
 * Zweck   : Entwicklertab für Wegsystem/Overlay (Trampelpfade/Heatmap)
 *           - Je EIN Toggle-Button pro Layer (Overlay, Heatmap)
 *           - Reset / Export (JSON)
 *           - Demos (sofern vorhanden)
 *           - Live-Eventprotokoll (die letzten N Meldungen)
 *
 * Abhäng. : Inspector-Core (window.__INSPECTOR_CORE__.api / window.Inspector)
 *           Path-Overlay (window.PathOverlay | window.PathHeat | __PathOverlay__)
 *           Optional GameTests (carrierTownhallDepot / doorPathTest)
 *
 * Events  : (Outbound – von diesem Tab gesendet)
 *           - cb:path:overlay:on   / cb:path:overlay:off
 *           - cb:path:heatmap:on   / cb:path:heatmap:off
 *           - cb:overlay-heat-reset
 *           - cb:overlay-toggle {on:boolean}   (Legacy-Kompatibilität)
 *
 *           (Inbound – vom Spiel/Overlay empfangen und hier geloggt)
 *           - cb:path:overlay:on   / cb:path:overlay:off
 *           - cb:path:trace {from,to,len?,id?}  (Pfadspur)
 *           - cb:overlay-toggle / cb:overlay-heat-reset
 * ============================================================================ */
(function () {
  'use strict';

  const MOD = '[inspector.paths]';
  const LOG = (window.CBLog?.info  || console.info ).bind(console, MOD);
  const OK  = (window.CBLog?.ok    || console.log  ).bind(console, MOD);
  const WRN = (window.CBLog?.warn  || console.warn ).bind(console, MOD);
  const ERR = (window.CBLog?.error || console.error).bind(console, MOD);

  // ---------------------------------------------------------------------------
  // [1] Core-Bridge (kompatibel für alle Varianten)
  // ---------------------------------------------------------------------------
  const mount = (window.__INSPECTOR_CORE__?.api?.mount
              || window.Inspector?.mount
              || window.UIInspector?.mount);
  if (!mount) { WRN('Kein Inspector-Core gefunden – Tab wird nicht registriert'); return; }

  // Kurz-Helpers
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ---------------------------------------------------------------------------
  // [2] Overlay-Adapter (verschiedene Shapes zulassen)
  // ---------------------------------------------------------------------------
  function getPO() {
    return window.PathOverlay || window.PathHeat || window.__PathOverlay__ || {};
  }
  function isOverlayOn() {
    const PO = getPO();
    try {
      if ('enabled' in PO) return !!PO.enabled;
      if ('isOn' in PO)    return !!PO.isOn;
    } catch (_) {}
    return false;
  }
  function isHeatOn() {
    const PO = getPO();
    try {
      if ('heatEnabled' in PO) return !!PO.heatEnabled;
      if ('heatOn' in PO)      return !!PO.heatOn;
    } catch (_) {}
    // Falls es keinen expliziten Status gibt, „off“ annehmen
    return false;
  }
  function dumpOverlay() {
    const PO = getPO();
    try {
      if (typeof PO.dump === 'function') return PO.dump();     // bevorzugt
      if (PO.data)    return PO.data;
      if (PO.heatmap) return { heatmap: PO.heatmap };
      if (PO.grid)    return { grid: PO.grid };
    } catch (_) {}
    return null;
  }
  function resetOverlay() {
    const PO = getPO();
    try {
      if (typeof PO.reset === 'function') return PO.reset();
      if (PO.heatmap && typeof PO.heatmap === 'object') {
        // naive Löschung
        if (Array.isArray(PO.heatmap)) PO.heatmap.length = 0;
        else Object.keys(PO.heatmap).forEach(k => delete PO.heatmap[k]);
      }
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // [3] UI-Renderer
  // ---------------------------------------------------------------------------
  mount('paths', (host) => {
    host.innerHTML = `
      <div class="insp-frame">
        <!-- Header mit Titel + Schließen -->
        <div class="insp-header">
          <h3>Wege/Overlay</h3>
          <button class="insp-close" title="Inspector schließen">×</button>
        </div>

        <div class="insp-content">
          <div class="pad">
            <!-- Toolbar: Toggle je Layer, Reset, Export, Demos -->
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <!-- EIN Toggle-Button pro Layer -->
              <button class="insp-btn" id="p-toggle-overlay">
                Overlay <span class="badge" id="p-state-overlay">…</span>
              </button>

              <button class="insp-btn" id="p-toggle-heat">
                Heatmap <span class="badge" id="p-state-heat">…</span>
              </button>

              <button class="insp-btn" id="p-reset">Heatmap zurücksetzen</button>
              <button class="insp-btn" id="p-export">Export JSON</button>

              <button class="insp-btn" id="p-demo-carrier">Carrier-Demo</button>
              <button class="insp-btn" id="p-demo-door">Tür-Pfad Test</button>

              <span id="p-hint" class="hint"></span>
            </div>

            <!-- Zustandszeile -->
            <div class="hint" id="p-status" style="margin:6px 0 10px"></div>

            <!-- Eventliste -->
            <div style="border:1px solid #444;border-radius:6px;overflow:auto;max-height:42vh">
              <table class="inspector-table" id="p-events">
                <thead>
                  <tr>
                    <th style="width:96px">Zeit</th>
                    <th>Event</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Schließen
    $('.insp-close', host)?.addEventListener('click', () => window.Inspector?.close());

    // Refs
    const ui = {
      hint:   $('#p-hint', host),
      status: $('#p-status', host),
      tbody:  $('#p-events tbody', host),
      btnOverlay: $('#p-toggle-overlay', host),
      btnHeat:    $('#p-toggle-heat', host),
      stateOverlay: $('#p-state-overlay', host),
      stateHeat:    $('#p-state-heat', host),
    };

    // kleines Badge-Styling (falls nicht in CSS definiert)
    [ui.stateOverlay, ui.stateHeat].forEach(b => {
      if (!b) return;
      b.style.display = 'inline-block';
      b.style.padding = '2px 8px';
      b.style.borderRadius = '999px';
      b.style.marginLeft = '6px';
      b.style.fontWeight = '700';
    });

    // Ringpuffer für letzte Events
    const EVBUF = [];
    const EVMAX = 50;

    function pushEvent(evt, details) {
      const row = { ts: now(), evt, details: details || '' };
      EVBUF.push(row);
      if (EVBUF.length > EVMAX) EVBUF.shift();
      renderEvents();
    }

    function renderEvents() {
      ui.tbody.innerHTML = EVBUF.slice().reverse().map(r => `
        <tr>
          <td><code>${r.ts}</code></td>
          <td>${r.evt}</td>
          <td>${typeof r.details === 'string' ? r.details : JSON.stringify(r.details)}</td>
        </tr>
      `).join('');
    }

    function flash(msg) {
      ui.hint.textContent = msg;
      setTimeout(() => (ui.hint.textContent = ''), 1200);
    }

    // Zustände in der UI aktualisieren
    function paintState() {
      const on = isOverlayOn();
      const heat = isHeatOn();

      ui.stateOverlay.textContent = on ? 'AN' : 'AUS';
      ui.stateOverlay.style.background = on ? '#1f8f4a' : '#555';
      ui.stateOverlay.style.color = '#fff';

      ui.stateHeat.textContent = heat ? 'AN' : 'AUS';
      ui.stateHeat.style.background = heat ? '#1f8f4a' : '#555';
      ui.stateHeat.style.color = '#fff';

      ui.status.innerHTML = [
        on ? '✅ Path-Overlay: <strong>AKTIV</strong>' : 'ℹ Path-Overlay: <strong>INAKTIV</strong>',
        heat ? '• Heatmap: <strong>AN</strong>' : '• Heatmap: <strong>AUS</strong>'
      ].join(' ');
    }

    // -------------------- EIN Toggle pro Layer --------------------
    // Overlay umschalten
    ui.btnOverlay.addEventListener('click', () => {
      const on = isOverlayOn();
      if (on) {
        window.dispatchEvent(new Event('cb:path:overlay:off'));
        window.dispatchEvent(new CustomEvent('cb:overlay-toggle', { detail: { on: false } })); // Legacy
        pushEvent('cb:path:overlay:off', 'Inspector → Overlay AUS');
      } else {
        window.dispatchEvent(new Event('cb:path:overlay:on'));
        window.dispatchEvent(new CustomEvent('cb:overlay-toggle', { detail: { on: true } }));  // Legacy
        pushEvent('cb:path:overlay:on', 'Inspector → Overlay AN');
      }
      paintState();
      flash('Overlay umgeschaltet');
    });

    // Heatmap umschalten
    ui.btnHeat.addEventListener('click', () => {
      const heat = isHeatOn();
      if (heat) {
        window.dispatchEvent(new Event('cb:path:heatmap:off'));
        pushEvent('cb:path:heatmap:off', 'Inspector → Heatmap AUS');
      } else {
        window.dispatchEvent(new Event('cb:path:heatmap:on'));
        pushEvent('cb:path:heatmap:on', 'Inspector → Heatmap AN');
      }
      paintState();
      flash('Heatmap umgeschaltet');
    });

    // Reset / Export / Demos
    $('#p-reset', host).addEventListener('click', () => {
      window.dispatchEvent(new Event('cb:overlay-heat-reset')); // für andere Listener
      resetOverlay();                                           // direkter Reset
      pushEvent('cb:overlay-heat-reset', 'Heatmap/Trampelpfade gelöscht');
      flash('Heatmap zurückgesetzt');
    });

    $('#p-export', host).addEventListener('click', () => {
      const dump = dumpOverlay();
      const payload = dump || { note: 'Keine Overlay-Daten gefunden' };
      const name = `paths_dump_${new Date().toISOString().replace(/[:\.]/g, '-')}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      pushEvent('export', name);
      flash('Export erstellt');
    });

    $('#p-demo-carrier', host).addEventListener('click', () => {
      try {
        window.GameTests?.carrierTownhallDepot?.();
        pushEvent('demo:carrierTownhallDepot', 'Demo ausgeführt');
        flash('Carrier-Demo gestartet');
      } catch (e) { WRN('Carrier-Demo nicht verfügbar'); }
    });

    $('#p-demo-door', host).addEventListener('click', () => {
      try {
        window.GameTests?.doorPathTest?.();
        pushEvent('demo:doorPathTest', 'Demo ausgeführt');
        flash('Tür-Pfad Test gestartet');
      } catch (e) { WRN('Tür-Pfad-Test nicht verfügbar'); }
    });

    // -------------------- Inbound-Events (von außen) -------------------------
    window.addEventListener('cb:path:overlay:on',  () => { pushEvent('cb:path:overlay:on');  paintState(); });
    window.addEventListener('cb:path:overlay:off', () => { pushEvent('cb:path:overlay:off'); paintState(); });
    window.addEventListener('cb:overlay-toggle',   (e) => { pushEvent('cb:overlay-toggle', e?.detail); paintState(); });
    window.addEventListener('cb:overlay-heat-reset', () => pushEvent('cb:overlay-heat-reset'));

    // Pfadspur-Events für das Log
    window.addEventListener('cb:path:trace', (e) => {
      const d = e?.detail || {};
      const msg = `trace ${d.id ? ('#' + d.id + ' ') : ''}(${d.from?.x},${d.from?.y}) → (${d.to?.x},${d.to?.y})` + (d.len != null ? ` len=${d.len}` : '');
      pushEvent('cb:path:trace', msg);
    });

    // Beim Tabwechsel Status auffrischen
    window.addEventListener('cb:insp:tab:change', (e) => {
      if ((e.detail?.tab || '') === 'paths') paintState();
    });

    // Initial
    paintState();
    OK('bereit v25.10.28-final');
  });
})();
