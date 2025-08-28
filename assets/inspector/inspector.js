/* inspector.js  —  v16.1.9
 * ------------------------------------------------------------
 * Dein testbarer Inspector als Overlay:
 * - Toggle über globalen Button (unten rechts)
 * - Füllt gesamte Seite, Logs integriert
 * - Tools: Start-Kürzel, Cache-Booster, Log kopieren/Leeren, Dummy-Ressourcen
 * - Schlank, keine Abhängigkeiten – leicht zu patchen
 * ------------------------------------------------------------
 */
(function(){
  const VER = "v16.1.9";

  // Zentrales Log-Depot (auch von index nutzbar)
  window.__INSPECTOR_LOG__ = window.__INSPECTOR_LOG__ || [];

  // Utility: Zeile mit Zeit/Level formatieren
  function addLogLine(level, msg){
    const t = new Date().toTimeString().slice(0,8);
    const icon = level==="ok"?"✅ (ok)": level==="warn"?"⚠️ (warn)":"❌ (err)";
    const line = `[${t}] ${icon} ${msg}`;
    window.__INSPECTOR_LOG__.push(line);
    // live im Panel anzeigen
    const out = document.getElementById('inspLogOut');
    if (out){
      const div = document.createElement('div');
      div.textContent = line;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    }
    // auch in Console spiegeln
    console[level==="err"?"error":(level==="warn"?"warn":"log")](line);
  }

  // UI Grundgerüst erzeugen (einmalig)
  function ensureDOM(){
    const root = document.getElementById('inspectorRoot');
    if (!root) return;

    if (root.dataset.ready) return; // bereits gebaut
    root.dataset.ready = "1";

    root.innerHTML = `
      <style>
        #inspectorRoot{ display:none; }
        #inspOverlay{
          position:fixed; inset:0; z-index:60; display:flex; flex-direction:column;
          background:rgba(4,10,12,.72); backdrop-filter: blur(10px);
          color:#dff8ea; font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Arial;
        }
        #inspBar{
          display:flex; gap:10px; padding:14px; align-items:center;
          background:#0e1416; border-bottom:1px solid #21343a;
        }
        #inspTitle{font-weight:800; font-size:16px; margin-right:auto}
        .inspBtn{
          border:1px solid #2a3e3d; background:#142426; color:#e6fff3;
          padding:8px 12px; border-radius:10px; font-weight:700; cursor:pointer;
        }
        .inspGrid{
          display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:12px; padding:14px;
        }
        .inspCard{
          background:#0b1214; border:1px solid #203237; border-radius:12px; padding:12px;
        }
        .cardTitle{font-weight:800; margin-bottom:8px}
        #inspLogOut{
          height:40vh; overflow:auto; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
          background:#05090b; border:1px dashed #2b3f44; padding:10px; border-radius:10px;
        }
      </style>

      <div id="inspOverlay" role="dialog" aria-modal="true" aria-label="Inspector">
        <div id="inspBar">
          <div id="inspTitle">Inspector / Test-Cockpit <span style="opacity:.7">(inspector.js ${VER})</span></div>
          <button id="inspClearLog" class="inspBtn">Log leeren</button>
          <button id="inspCopyLog" class="inspBtn">Log kopieren</button>
          <button id="inspClose" class="inspBtn">Schließen</button>
        </div>

        <div class="inspGrid">
          <div class="inspCard">
            <div class="cardTitle">Start-Kürzel</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              <button data-map="./assets/maps/map-mini.json" class="inspBtn">Start map-mini.json</button>
              <button data-map="./assets/maps/map-pro.json" class="inspBtn">Start map-pro.json</button>
            </div>
            <div style="opacity:.7; font-size:13px; margin-top:8px">
              Hinweis: Inspector ist nur **Helfer** – kein Spiel-UI. Startet über GameLoader.start, falls vorhanden.
            </div>
          </div>

          <div class="inspCard">
            <div class="cardTitle">Tools</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              <button id="inspCache" class="inspBtn">Cache leeren</button>
              <button id="inspRes100" class="inspBtn">Ressourcen +100</button>
              <button id="inspRes1000" class="inspBtn">Ressourcen +1000</button>
              <button id="inspRes0" class="inspBtn">Ressourcen 0</button>
            </div>
            <div style="opacity:.7; font-size:13px; margin-top:8px">
              Diese Tools sind zum Testen gebündelt; Spieloberfläche bleibt frei.
            </div>
          </div>

          <div class="inspCard" style="grid-column:1/-1">
            <div class="cardTitle">Log</div>
            <div id="inspLogOut"></div>
          </div>
        </div>
      </div>
    `;

    // Buttons verdrahten
    document.getElementById('inspClose').addEventListener('click', ()=> window.Inspector.hide());
    document.getElementById('inspCopyLog').addEventListener('click', ()=>{
      const text = window.__INSPECTOR_LOG__.join('\n');
      navigator.clipboard?.writeText(text).then(()=> addLogLine("ok","Log in Zwischenablage"));
    });
    document.getElementById('inspClearLog').addEventListener('click', ()=>{
      window.__INSPECTOR_LOG__.length = 0;
      const out = document.getElementById('inspLogOut'); if(out) out.innerHTML="";
      addLogLine("ok","Log geleert");
    });

    // Cache-Booster (Duplikat zum Startfenster)
    document.getElementById('inspCache').addEventListener('click', async ()=>{
      try{
        if('caches' in window){
          const keys = await caches.keys();
          await Promise.all(keys.map(k=>caches.delete(k)));
        }
        localStorage.clear?.(); sessionStorage.clear?.();
        addLogLine("ok","Cache/Storage geleert – Seite ggf. neu laden");
      }catch(e){
        addLogLine("err","Cache/Storage konnte nicht geleert werden: "+e);
      }
    });

    // Ressourcen-Dummies (hier nur Log)
    document.getElementById('inspRes100').addEventListener('click', ()=> addLogLine("ok","Ressourcen: +100 (Dummy)"));
    document.getElementById('inspRes1000').addEventListener('click', ()=> addLogLine("ok","Ressourcen: +1000 (Dummy)"));
    document.getElementById('inspRes0').addEventListener('click', ()=> addLogLine("ok","Ressourcen: 0 (Dummy)"));

    // Start-Kürzel innerhalb des Inspectors
    root.querySelectorAll('[data-map]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const mapPath = btn.getAttribute('data-map');
        addLogLine("ok","Start gedrückt → " + mapPath);
        try{
          if (typeof window.GameLoader?.start === 'function'){
            await window.GameLoader.start(mapPath);
            addLogLine("ok","Game gestartet");
            // Hooks feuern (gewünscht)
            window.dispatchEvent(new CustomEvent('cb:game-started'));
            window.GameUI?.onGameStarted?.();
          }else{
            addLogLine("err","GameLoader.start ist nicht verfügbar – game.js / Engine noch nicht initialisiert?");
          }
        }catch(e){
          addLogLine("err","Start fehlgeschlagen: "+ e);
        }
      });
    });

    // Bisher angesammelte Logs anzeigen
    const out = document.getElementById('inspLogOut');
    window.__INSPECTOR_LOG__.forEach(line=>{
      const div = document.createElement('div'); div.textContent = line; out.appendChild(div);
    });
    out.scrollTop = out.scrollHeight;

    addLogLine("ok",`Inspector bereit (inspector.js ${VER})`);
  }

  // Öffnen/Schließen API nach außen
  window.Inspector = {
    show(){ ensureDOM(); const r=document.getElementById('inspectorRoot'); if(r) r.style.display='block';
            const b=document.getElementById('inspectorBtn'); if(b) b.setAttribute('aria-expanded','true'); },
    hide(){ const r=document.getElementById('inspectorRoot'); if(r) r.style.display='none';
            const b=document.getElementById('inspectorBtn'); if(b) b.setAttribute('aria-expanded','false'); },
    toggle(){ const r=document.getElementById('inspectorRoot'); if(!r||r.style.display!=='block') this.show(); else this.hide(); }
  };

  // Automatisch DOM vorbereiten, sobald Seite fertig:
  window.addEventListener('load', ensureDOM);
})();
