/* ============================================================================
 * Datei   : ui/inspector/inspector.paths.js
 * Projekt : Neue Siedler – Inspector (Paths-Tab)
 * Version : v18.15.0 (final restore)
 *
 * Zweck   : Entwickler-/Debug-Tab für Wegsystem & Trägerbewegungen.
 *           - Overlay steuern (AN/AUS), Heatmap/Trampelpfade zurücksetzen
 *           - Export der Overlay-/Heatmap-Daten als JSON
 *           - Kleine Demos/Tests (Carrier-Demo, Tür-Pfad-Test), wenn vorhanden
 *           - Letzte Pfad-Ereignisse live protokollieren
 *
 * Abh.    : Inspector-Core (window.Inspector)
 *           Path-Overlay (core/path-overlay.js) – optional, aber empfohlen
 *           GameTests (optionale Demos: carrierTownhallDepot / doorPathTest)
 *
 * Events  : (Sender: dieses Modul)
 *           - cb:path:overlay:on            → Overlay einschalten
 *           - cb:path:overlay:off           → Overlay ausschalten
 *           - cb:path:heatmap:on|off        → (optional) Heatmap toggeln
 *           - cb:overlay-toggle {on:boolean}→ (legacy) Overlay toggeln
 *           - cb:overlay-heat-reset         → Heatmap/Trampelpfade löschen
 *
 *           (Empfänger: dieses Modul – zur Anzeige/Protokoll)
 *           - cb:path:overlay:on|off        → Status aktualisieren
 *           - cb:overlay-toggle             → Status aktualisieren
 *           - cb:overlay-heat-reset         → Meldung im Log
 *           - cb:path:trace {from,to,len?}  → Pfadspur für Log aufnehmen
 *
 * Hinweis : Alle Events sind READ-ONLY/FIRED aus Inspector-Sicht.
 *           Das eigentliche Overlay zeichnet core/path-overlay.js.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.paths]';

  /* ------------------------------ Helpers ----------------------------------- */
  const L = {
    info : (window.CBLog?.info || console.info).bind(console, MOD),
    ok   : (window.CBLog?.ok   || console.log ).bind(console, MOD),
    warn : (window.CBLog?.warn || console.warn).bind(console, MOD),
    err  : (window.CBLog?.error|| console.error).bind(console, MOD)
  };
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const now = () => new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});

  function download(name, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  // Robust auf Daten aus dem Overlay zugreifen (verschiedene Shapes zulassen)
  function dumpOverlay(){
    const PO = window.PathOverlay || window.PathHeat || window.__PathOverlay__ || {};
    try{
      if (typeof PO.dump === 'function') return PO.dump();               // bevorzugt
      if (PO.data) return PO.data;
      if (PO.heatmap) return { heatmap: PO.heatmap };
      if (PO.grid) return { grid: PO.grid };
    }catch(_){}
    return null;
  }
  function resetOverlay(){
    const PO = window.PathOverlay || window.PathHeat || window.__PathOverlay__ || {};
    try{
      if (typeof PO.reset === 'function') return PO.reset();
      if (PO.heatmap && typeof PO.heatmap === 'object'){
        // naive Löschung
        if (Array.isArray(PO.heatmap)) PO.heatmap.length = 0;
        else Object.keys(PO.heatmap).forEach(k=> delete PO.heatmap[k]);
      }
    }catch(_){}
  }
  function isOverlayOn(){
    const PO = window.PathOverlay || window.PathHeat || window.__PathOverlay__ || {};
    try{
      if ('enabled' in PO) return !!PO.enabled;
      if ('isOn' in PO)    return !!PO.isOn;
    }catch(_){}
    return false; // default
  }

  /* ------------------------------ UI / State -------------------------------- */
  window.Inspector?.mount?.('paths', (host)=>{
    host.innerHTML = `
      <div class="pad">
        <div class="toolbar" style="flex-wrap:wrap;gap:8px">
          <button class="insp-btn" id="p-on">Overlay AN</button>
          <button class="insp-btn" id="p-off">Overlay AUS</button>
          <button class="insp-btn" id="p-heat-on">Heatmap AN</button>
          <button class="insp-btn" id="p-heat-off">Heatmap AUS</button>
          <button class="insp-btn" id="p-reset">Heatmap Reset</button>
          <button class="insp-btn" id="p-export">Export JSON</button>
          <button class="insp-btn" id="p-demo-carrier">Carrier-Demo</button>
          <button class="insp-btn" id="p-demo-door">Tür-Pfad Test</button>
          <span id="p-hint" class="hint"></span>
        </div>

        <div class="hint" id="p-status" style="margin:6px 0 10px"></div>

        <div style="display:grid;grid-template-columns:1fr;gap:8px">
          <div style="border:1px solid #444;border-radius:6px;overflow:auto;max-height:42vh">
            <table class="inspector-table" id="p-events">
              <thead><tr><th style="width:96px">Zeit</th><th>Event</th><th>Details</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const ui = {
      hint:   $('#p-hint', host),
      status: $('#p-status', host),
      tbody:  $('#p-events tbody', host)
    };

    // interner Ringpuffer für letzte Events
    const EVBUF = [];
    const EVMAX = 50;

    function pushEvent(evt, details){
      const row = { ts: now(), evt, details: details||'' };
      EVBUF.push(row); if (EVBUF.length>EVMAX) EVBUF.shift();
      renderEvents();
    }
    function renderEvents(){
      ui.tbody.innerHTML = EVBUF.slice().reverse().map(r=>`
        <tr>
          <td><code>${r.ts}</code></td>
          <td>${r.evt}</td>
          <td>${typeof r.details==='string' ? r.details : JSON.stringify(r.details)}</td>
        </tr>`).join('');
    }
    function setStatus(){
      const on = isOverlayOn();
      ui.status.innerHTML = on
        ? `✅ Path-Overlay ist <strong>AKTIV</strong>. Trampelpfade / Routen werden aufgezeichnet.`
        : `ℹ Path-Overlay ist <strong>INAKTIV</strong>. (Zum Anzeigen „Overlay AN“ klicken)`;
    }
    function flash(msg){
      ui.hint.textContent = msg;
      setTimeout(()=> ui.hint.textContent='', 1200);
    }

    /* ------------------------------ Buttons --------------------------------- */
    $('#p-on', host).addEventListener('click', ()=>{
      // neue & legacy Events senden
      window.dispatchEvent(new Event('cb:path:overlay:on'));
      window.dispatchEvent(new CustomEvent('cb:overlay-toggle', { detail:{ on:true }}));
      pushEvent('cb:path:overlay:on', 'Inspector → Overlay AN');
      setStatus();
    });
    $('#p-off', host).addEventListener('click', ()=>{
      window.dispatchEvent(new Event('cb:path:overlay:off'));
      window.dispatchEvent(new CustomEvent('cb:overlay-toggle', { detail:{ on:false }}));
      pushEvent('cb:path:overlay:off', 'Inspector → Overlay AUS');
      setStatus();
    });

    $('#p-heat-on', host).addEventListener('click', ()=>{
      window.dispatchEvent(new Event('cb:path:heatmap:on'));
      pushEvent('cb:path:heatmap:on', 'Inspector → Heatmap AN');
    });
    $('#p-heat-off', host).addEventListener('click', ()=>{
      window.dispatchEvent(new Event('cb:path:heatmap:off'));
      pushEvent('cb:path:heatmap:off', 'Inspector → Heatmap AUS');
    });

    $('#p-reset', host).addEventListener('click', ()=>{
      // legacy + direkter Reset
      window.dispatchEvent(new Event('cb:overlay-heat-reset'));
      resetOverlay();
      pushEvent('cb:overlay-heat-reset', 'Heatmap/Trampelpfade gelöscht');
      flash('Heatmap zurückgesetzt');
    });

    $('#p-export', host).addEventListener('click', ()=>{
      const dump = dumpOverlay();
      const payload = dump || { note:'Keine Overlay-Daten gefunden' };
      const name = `paths_dump_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      download(name, payload);
      pushEvent('export', name);
      flash('Export erstellt');
    });

    $('#p-demo-carrier', host).addEventListener('click', ()=>{
      try{
        // Deine frühere Demo (falls vorhanden)
        window.GameTests?.carrierTownhallDepot?.();
        pushEvent('demo:carrierTownhallDepot', 'Demo ausgeführt');
        flash('Carrier-Demo gestartet');
      }catch(e){ L.warn('Carrier-Demo nicht verfügbar'); }
    });

    $('#p-demo-door', host).addEventListener('click', ()=>{
      try{
        window.GameTests?.doorPathTest?.();
        pushEvent('demo:doorPathTest', 'Demo ausgeführt');
        flash('Tür-Pfad Test gestartet');
      }catch(e){ L.warn('Tür-Pfad-Test nicht verfügbar'); }
    });

    /* ------------------------------ Event-Listener --------------------------- */
    // Status/Log aktualisieren, wenn das Overlay von außen geschaltet wird
    window.addEventListener('cb:path:overlay:on',  ()=>{ pushEvent('cb:path:overlay:on');  setStatus(); });
    window.addEventListener('cb:path:overlay:off', ()=>{ pushEvent('cb:path:overlay:off'); setStatus(); });
    window.addEventListener('cb:overlay-toggle',   (e)=>{ pushEvent('cb:overlay-toggle', e?.detail); setStatus(); });
    window.addEventListener('cb:overlay-heat-reset', ()=> pushEvent('cb:overlay-heat-reset'));
    // Pfadspur-Events (vom Overlay), z. B. wenn ein Carrier einen Pfad geht
    window.addEventListener('cb:path:trace', (e)=>{
      // erwartet detail: {from:{x,y}, to:{x,y}, len?:number, id?:string}
      const d = e?.detail || {};
      const msg = `trace ${d.id?('#'+d.id+' '):''}(${d.from?.x},${d.from?.y}) → (${d.to?.x},${d.to?.y})` + (d.len!=null?` len=${d.len}`:'');
      pushEvent('cb:path:trace', msg);
    });

    // Beim Tab-Wechsel Status auffrischen
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if ((e.detail?.tab||'') === 'paths') setStatus();
    });

    // Initial
    setStatus();
    L.ok('bereit v18.15.0');
  });

  /* --------------------------- Komfort-API (optional) ------------------------ */
  // Für alte Hotkeys/Shortcuts, falls du die mal belegt hattest:
  window.UIInspector = Object.assign(window.UIInspector||{}, {
    pathOverlay(on=true){
      window.dispatchEvent(new Event(on?'cb:path:overlay:on':'cb:path:overlay:off'));
      window.dispatchEvent(new CustomEvent('cb:overlay-toggle', { detail:{ on:!!on }}));
    },
    pathReset(){
      window.dispatchEvent(new Event('cb:overlay-heat-reset'));
    },
    pathExport(){
      const dump = (typeof (window.PathOverlay||{}).dump === 'function')
        ? window.PathOverlay.dump()
        : dumpOverlay();
      const name = `paths_dump_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      download(name, dump || { note:'Keine Overlay-Daten gefunden' });
    }
  });
})();
