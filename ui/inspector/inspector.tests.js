/* ============================================================================
 * Datei   : ui/inspector/inspector.tests.js
 * Projekt : Neue Siedler – Inspector (Tests-Tab)
 * Version : v25.10.29-final
 *
 * Zweck
 *  - Entwicklertests & Diagnosen direkt aus dem Inspector starten:
 *      • Event-Scan aller geladenen Skripte (cb:/req:/emit:)
 *      • Engine-/Game-Aktionen (Ping, Reset, HUD-Reload, Assets-Reload)
 *      • Logausgabe & Fortschrittsanzeige
 *
 * Abhängigkeiten
 *  - Inspector-Core (mount)
 *  - Optional: window.EventScan (tools/gen-event-doc.js)
 *  - Optional: window.Game / window.Assets / window.HUD
 *
 * Sendet / nutzt Events:
 *  - cb:tests:eventscan:start / cb:tests:eventscan:done
 *  - cb:tests:engine:ping
 *  - cb:tests:engine:reset
 * ========================================================================== */
(function(){
  'use strict';

  const MOD='[inspector.tests]';
  const LOG=(window.CBLog?.info  || console.info ).bind(console, MOD);
  const OK =(window.CBLog?.ok    || console.log  ).bind(console, MOD);
  const WRN=(window.CBLog?.warn  || console.warn ).bind(console, MOD);
  const ERR=(window.CBLog?.error || console.error).bind(console, MOD);

  // ---------------------------------------------------------------------------
  // [1] Core-Bridge (kompatibel)
  // ---------------------------------------------------------------------------
  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.UIInspector || {};
    return {
      mount(id, onShow){
        const fn = ins.registerTab || ins.addTab;
        return fn ? fn({id,title:id,onShow}) : null;
      },
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      }
    };
  })();

  // Kurze DOM-Helfer
  const el=(tag,cls,html)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n;};
  const btn=(lbl,fn)=>{const b=el('button','insp-btn',lbl);b.addEventListener('click',fn);return b;};

  // ---------------------------------------------------------------------------
  // [2] Mount – Tab wird registriert
  // ---------------------------------------------------------------------------
  core.mount('tests',(host)=>{
    host.innerHTML=`
      <div class="insp-frame">
        <div class="insp-header">
          <h3>Tests / Tools</h3>
          <button class="insp-close" title="Inspector schließen">×</button>
        </div>

        <div class="insp-content">
          <div class="pad">

            <!-- Abschnitt: Event-Scanner -->
            <h4>Event-Scanner</h4>
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <button class="insp-btn" id="t-scan">Scan starten</button>
              <button class="insp-btn" id="t-dl" disabled>Download MD</button>
              <span id="t-status" class="hint"></span>
            </div>
            <div id="t-result" style="max-height:38vh;overflow:auto;border:1px solid #444;padding:6px;border-radius:6px;font-family:monospace;font-size:12px;white-space:pre-wrap"></div>

            <!-- Abschnitt: Engine -->
            <h4>Engine / Game</h4>
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <button class="insp-btn" id="t-ping">Engine Ping</button>
              <button class="insp-btn" id="t-reset">Welt zurücksetzen</button>
              <button class="insp-btn" id="t-hud">HUD neu laden</button>
              <button class="insp-btn" id="t-assets">Assets reload</button>
            </div>

            <!-- Logausgabe -->
            <div id="t-log" style="margin-top:10px;border:1px solid #444;border-radius:6px;padding:6px;min-height:32px;font-size:12px;opacity:.9"></div>
          </div>
        </div>
      </div>
    `;

    // -------------------------------------------------------------------------
    // [3] UI-Referenzen
    // -------------------------------------------------------------------------
    const ui={
      close : host.querySelector('.insp-close'),
      scan  : host.querySelector('#t-scan'),
      dl    : host.querySelector('#t-dl'),
      stat  : host.querySelector('#t-status'),
      res   : host.querySelector('#t-result'),
      log   : host.querySelector('#t-log'),
      ping  : host.querySelector('#t-ping'),
      reset : host.querySelector('#t-reset'),
      hud   : host.querySelector('#t-hud'),
      assets: host.querySelector('#t-assets')
    };

    ui.close.addEventListener('click',()=>window.Inspector?.close());

    // kleine Logzeile unten
    function setLog(msg,color){
      ui.log.style.color=color||'#ccc';
      ui.log.textContent=`${new Date().toLocaleTimeString()}  ${msg}`;
    }

    // -------------------------------------------------------------------------
    // [4] Event-Scan-Feature
    // -------------------------------------------------------------------------
    ui.scan.addEventListener('click',async ()=>{
      if(!window.EventScan){ WRN('EventScan nicht vorhanden'); setLog('❌ EventScan-API fehlt','#f66'); return; }

      ui.scan.disabled=true; ui.dl.disabled=true; ui.stat.textContent='Starte Scan…';
      ui.res.innerHTML=''; setLog('Event-Scan läuft …','#6cf');
      dispatchEvent(new Event('cb:tests:eventscan:start'));

      try{
        const rows=await window.EventScan.run((i,n,file,err)=>{
          ui.stat.textContent=err?`(${i}/${n}) ⚠ ${file}`:`(${i}/${n}) ${file}`;
        });
        const md=window.EventScan.lastMD||'';
        ui.res.innerHTML=`<pre>${md.replace(/</g,'&lt;')}</pre>`;
        ui.stat.textContent=`Fertig: ${rows.length} Treffer`;
        ui.dl.disabled=rows.length===0;
        dispatchEvent(new CustomEvent('cb:tests:eventscan:done',{detail:{count:rows.length}}));
        setLog(`✅ Event-Scan abgeschlossen (${rows.length})`,'#3bd16f');
      }catch(e){
        ERR('EventScan',e);
        ui.stat.textContent='Fehler beim Scan';
        setLog(`❌ Fehler: ${e?.message||e}`,'#f66');
      }finally{
        ui.scan.disabled=false;
      }
    });

    ui.dl.addEventListener('click',()=>{
      try{ window.EventScan?.download?.(); setLog('📦 Markdown exportiert','#6cf'); }
      catch(e){ setLog('Fehler beim Download','#f66'); }
    });

    // -------------------------------------------------------------------------
    // [5] Engine-/Game-Tests
    // -------------------------------------------------------------------------
    ui.ping.addEventListener('click',()=>{
      try{
        window.Game?.ping?.(); setLog('✅ Engine-Ping erfolgreich','#3bd16f');
        dispatchEvent(new Event('cb:tests:engine:ping'));
      }catch(e){ setLog('❌ Ping fehlgeschlagen','#f66'); }
    });

    ui.reset.addEventListener('click',()=>{
      try{
        window.Game?.reset?.(); setLog('⚠️ Welt-Reset angefordert','#ffb74a');
        dispatchEvent(new Event('cb:tests:engine:reset'));
      }catch(e){ setLog('Fehler bei Reset','#f66'); }
    });

    ui.hud.addEventListener('click',()=>{
      try{
        window.HUD?.reload?.() || window.HUD?.init?.();
        setLog('HUD neu geladen','#3bd16f');
      }catch(e){ setLog('HUD-Neustart fehlgeschlagen','#f66'); }
    });

    ui.assets.addEventListener('click',()=>{
      try{
        window.Assets?.reloadAll?.() || window.Assets?.loadAll?.();
        setLog('Assets neu geladen','#3bd16f');
      }catch(e){ setLog('Fehler beim Asset-Reload','#f66'); }
    });

    // -------------------------------------------------------------------------
    // [6] Style-Optimierung (einmalig)
    // -------------------------------------------------------------------------
    if (!document.getElementById('insp-tests-style')){
      const css=`
        #t-result pre{margin:0;white-space:pre-wrap;}
        #t-log{font-family:monospace;}
        #t-status{min-width:160px;}
      `;
      const s=document.createElement('style'); s.id='insp-tests-style'; s.textContent=css;
      document.head.appendChild(s);
    }

    OK('bereit v25.10.29-final');
  });
})();
