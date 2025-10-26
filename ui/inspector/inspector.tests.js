/* ============================================================================
 * Datei   : ui/inspector/inspector.tests.js
 * Projekt : Neue Siedler – Inspector (Tests-Tab)
 * Version : v25.10.29+hitmap-final
 *
 * Zweck
 *  - Entwicklertests & Diagnosen direkt aus dem Inspector starten:
 *      • Event-Scan aller geladenen Skripte (cb:/req:/emit:)
 *      • Engine-/Game-Aktionen (Ping, Reset, HUD-Reload, Assets-Reload)
 *      • NEU: Hitmap / Click-Profiler (zeigt live, was Klicks trifft,
 *        pointer-events, stacking context, z-index, Listener-Hinweise)
 *
 * Öffentliche Events (nur Info/Hook, alles optional):
 *  - cb:tests:eventscan:start / cb:tests:eventscan:done {count}
 *  - cb:tests:engine:ping / cb:tests:engine:reset
 *  - cb:tests:hitmap:start / cb:tests:hitmap:stop / cb:tests:hitmap:click {el}
 *
 * Abhängigkeiten
 *  - Inspector-Core (mount)
 *  - Optional: window.EventScan (tools/gen-event-doc.js)
 *  - Optional: window.Game / window.Assets / window.HUD
 * ========================================================================== */
(function(){
  'use strict';

  const MOD='[inspector.tests]';
  const LOG=(window.CBLog?.info  || console.info ).bind(console, MOD);
  const OK =(window.CBLog?.ok    || console.log  ).bind(console, MOD);
  const WRN=(window.CBLog?.warn  || console.warn ).bind(console, MOD);
  const ERR=(window.CBLog?.error || console.error).bind(console, MOD);

  // ---------------------------------------------------------------------------
  // [1] Core-Bridge (kompatibel zu älteren Inspector-Builds)
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

  // ---------------------------------------------------------------------------
  // [2] Mount – Tab registrieren
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
            <!-- =========================================================== -->
            <!-- Abschnitt: Hitmap / Click-Profiler                         -->
            <!-- =========================================================== -->
            <h4>Hitmap / Click-Profiler</h4>
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <button class="insp-btn" id="hm-toggle">Hitmap: AUS</button>
              <label class="hint" style="display:inline-flex;align-items:center;gap:6px">
                <input id="hm-hover" type="checkbox" />
                Live-Hover
              </label>
              <span id="hm-status" class="hint"></span>
            </div>
            <div id="hm-info" class="insp-box" style="display:none;margin-top:6px"></div>

            <!-- =========================================================== -->
            <!-- Abschnitt: Event-Scanner                                   -->
            <!-- =========================================================== -->
            <h4 style="margin-top:16px">Event-Scanner</h4>
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <button class="insp-btn" id="t-scan">Scan starten</button>
              <button class="insp-btn" id="t-dl" disabled>Download MD</button>
              <span id="t-status" class="hint"></span>
            </div>
            <div id="t-result" class="insp-mono-box"></div>

            <!-- =========================================================== -->
            <!-- Abschnitt: Engine                                          -->
            <!-- =========================================================== -->
            <h4>Engine / Game</h4>
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <button class="insp-btn" id="t-ping">Engine Ping</button>
              <button class="insp-btn" id="t-reset">Welt zurücksetzen</button>
              <button class="insp-btn" id="t-hud">HUD neu laden</button>
              <button class="insp-btn" id="t-assets">Assets reload</button>
            </div>

            <!-- Logausgabe (klein) -->
            <div id="t-log" class="insp-mono-line"></div>
          </div>
        </div>
      </div>
    `;

    // -------------------------------------------------------------------------
    // [3] UI-Refs
    // -------------------------------------------------------------------------
    const ui={
      close  : host.querySelector('.insp-close'),

      // Hitmap
      hmToggle: host.querySelector('#hm-toggle'),
      hmHover : host.querySelector('#hm-hover'),
      hmStatus: host.querySelector('#hm-status'),
      hmInfo  : host.querySelector('#hm-info'),

      // Scanner
      scan  : host.querySelector('#t-scan'),
      dl    : host.querySelector('#t-dl'),
      stat  : host.querySelector('#t-status'),
      res   : host.querySelector('#t-result'),

      // Engine
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

    // =========================================================================
    // [4] Hitmap / Click-Profiler
    //    – zeigt Live-Box um das getroffene Element + Infos (tag, id, class,
    //      z-index, pointer-events, position, stacking context Heuristik)
    //    – Steuerung: Button (Start/Stop), optional Live-Hover
    // =========================================================================
    const hitmap=(function(){
      let on=false, hover=false, overlay, label, lastEl, clickCnt=0;
      const STYLE_ID='insp-hitmap-style';

      // Style nur einmal einfügen
      if(!document.getElementById(STYLE_ID)){
        const css=`
          .insp-hm-overlay{position:fixed;inset:0;pointer-events:none;z-index:2147483600;}
          .insp-hm-box{position:absolute;border:2px solid #60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,.2) inset;border-radius:6px;pointer-events:none;}
          .insp-hm-label{position:absolute;transform:translateY(-100%);margin:-4px 0 0 0;background:#111a;color:#eaeaea;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;border:1px solid #2a2a2e;border-radius:6px;padding:6px 8px;white-space:nowrap;pointer-events:none}
          .insp-mono-box{max-height:38vh;overflow:auto;border:1px solid #444;padding:6px;border-radius:6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap}
          .insp-mono-line{margin-top:10px;border:1px solid #444;border-radius:6px;padding:6px;min-height:32px;font-size:12px;opacity:.9;font-family:ui-monospace,Menlo,Consolas,monospace}
          .insp-box{border:1px solid #444;border-radius:6px;padding:6px;font-size:12px;opacity:.95;background:rgba(0,0,0,.25)}
        `;
        const s=document.createElement('style'); s.id=STYLE_ID; s.textContent=css;
        document.head.appendChild(s);
      }

      function ensureDOM(){
        if(overlay) return;
        overlay=el('div','insp-hm-overlay');
        const box = el('div','insp-hm-box');
        label = el('div','insp-hm-label','');
        overlay.appendChild(box);
        overlay.appendChild(label);
        document.body.appendChild(overlay);
        overlay._box=box;
      }

      function fmtEl(e){
        if(!e) return '(n/a)';
        const cs = getComputedStyle(e);
        const zi = cs.zIndex || 'auto';
        const pe = cs.pointerEvents || 'auto';
        const pos= cs.position || 'static';
        // heuristisch: eigener Stacking-Context?
        const ctx = (pos==='fixed'||pos==='sticky'||cs.transform!=='none'||cs.filter!=='none'||cs.willChange?.includes('transform')) ? 'yes' : 'no';
        const id = e.id ? `#${e.id}` : '';
        const cls = (e.className && typeof e.className==='string') ? '.'+e.className.trim().replace(/\s+/g,'.') : '';
        return {
          tag : e.tagName.toLowerCase()+id+cls,
          z   : zi, pe, pos, ctx
        };
      }

      function placeBoxFor(e){
        if(!e) return;
        const r = e.getBoundingClientRect();
        const box = overlay._box;
        box.style.left = Math.round(r.left)+'px';
        box.style.top  = Math.round(r.top)+'px';
        box.style.width  = Math.round(r.width)+'px';
        box.style.height = Math.round(r.height)+'px';

        const info = fmtEl(e);
        label.textContent = `${info.tag} — z:${info.z} pe:${info.pe} pos:${info.pos} ctx:${info.ctx}`;
        label.style.left = Math.round(r.left)+'px';
        label.style.top  = Math.round(r.top)+'px';
      }

      function onMove(e){
        if(!hover || !on) return;
        const t = document.elementFromPoint(e.clientX, e.clientY);
        if(t && t!==lastEl){
          lastEl=t;
          placeBoxFor(t);
          ui.hmInfo.style.display='block';
          ui.hmInfo.textContent = `Hover: ${fmtEl(t).tag}`;
        }
      }

      function onClick(e){
        if(!on) return;
        const t = document.elementFromPoint(e.clientX, e.clientY);
        clickCnt++;
        dispatchEvent(new CustomEvent('cb:tests:hitmap:click',{detail:{el:t}}));
        if(t){
          placeBoxFor(t);
          ui.hmInfo.style.display='block';
          const f = fmtEl(t);
          ui.hmInfo.innerHTML =
            `Treffer #${clickCnt}: <b>${f.tag}</b><br>`+
            `z-index: <b>${f.z}</b> &nbsp; pointer-events: <b>${f.pe}</b> &nbsp; position: <b>${f.pos}</b> &nbsp; ctx: <b>${f.ctx}</b>`;
        }
      }

      function start(){
        ensureDOM();
        hover = !!ui.hmHover.checked;
        overlay.style.display='block';
        document.addEventListener('mousemove', onMove, {passive:true});
        document.addEventListener('click', onClick, true);
        on=true; clickCnt=0;
        ui.hmToggle.textContent='Hitmap: AN';
        ui.hmStatus.textContent='(Klick oder Hover zeigt Box & Infos)';
        ui.hmStatus.style.color='#60a5fa';
        dispatchEvent(new Event('cb:tests:hitmap:start'));
      }

      function stop(){
        if(!overlay) return;
        overlay.style.display='none';
        document.removeEventListener('mousemove', onMove, {passive:true});
        document.removeEventListener('click', onClick, true);
        on=false;
        ui.hmToggle.textContent='Hitmap: AUS';
        ui.hmStatus.textContent='';
        ui.hmInfo.style.display='none';
        dispatchEvent(new Event('cb:tests:hitmap:stop'));
      }

      // Public API fürs Tab
      return {
        toggle(){ on ? stop() : start(); },
        stop
      };
    })();

    ui.hmToggle.addEventListener('click', ()=>hitmap.toggle());
    ui.hmHover.addEventListener('change', ()=>{ /* wirkt beim nächsten Start */ });

    // Wenn der Inspector geschlossen wird, stoppen wir die Hitmap sicherheitshalber
    window.addEventListener('cb:inspector:close', ()=>hitmap.stop(), {once:false});

    // =========================================================================
    // [5] Event-Scanner
    // =========================================================================
    ui.scan.addEventListener('click',async ()=>{
      if(!window.EventScan){
        WRN('EventScan nicht vorhanden');
        setLog('❌ EventScan-API fehlt','#f66');
        return;
      }

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

    // =========================================================================
    // [6] Engine-/Game-Tests
    // =========================================================================
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

    // =========================================================================
    // [7] Style-Ergänzungen (einmalig)
    // =========================================================================
    if (!document.getElementById('insp-tests-style')){
      const css=`
        #t-result pre{margin:0;white-space:pre-wrap;}
        #t-log{font-family:ui-monospace,Menlo,Consolas,monospace;}
        #t-status{min-width:160px;}
      `;
      const s=document.createElement('style'); s.id='insp-tests-style'; s.textContent=css;
      document.head.appendChild(s);
    }

    OK('bereit v25.10.29+ h itmap');
  });
})();
