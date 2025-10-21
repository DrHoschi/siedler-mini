/* ============================================================================
 * Datei   : ui/inspector/inspector.tab.events.js
 * Projekt : Neue Siedler
 * Version : v1.2.0 (2025-10-21)
 * Zweck   : Inspector-Tab "Events" ODER Fallback-Float-Panel mit "Scan Now"
 *           – Browser-Scanner (cb:/req:/emit:) über geladene <script src=...>
 *           – Ergebnis als Tabelle + "Download MD"
 * ========================================================================== */
(function(){
  const TAB_ID   = "inspector-tab-events";
  const TAB_NAME = "Events";
  const SCAN_RE  = /(cb|req|emit):[a-z0-9\.\-\_:]+/gi;

  // ---------------- Mini-Utils ----------------
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
  const uniq = (arr)=>[...new Set(arr)];

  function toMD(rows){
    const byEv = rows.reduce((m,r)=>{ (m[r.ev] ||= []).push(r.file); return m; },{});
    const evs = Object.keys(byEv).sort();
    let md = `# Event-Check (Browser-Scan)\n\n> Stand: ${new Date().toISOString()}\n\n| Event | Dateien |\n|---|---|\n`;
    for(const ev of evs){
      const list = uniq(byEv[ev]).map(f=>`\`${f}\``).join("<br>");
      md += `| \`${ev}\` | ${list} |\n`;
    }
    return md;
  }

  function mdToHtml(md){
    // sehr einfache Darstellung: nur Tabelle & Code
    return esc(md)
      .replace(/`([^`]+)`/g,"<code>$1</code>")
      .replace(/^\|(.+)\|$/gm,(m)=>`<div class="mdrow">${m}</div>`)
      .replace(/\n/g,"<br>");
  }

  function listScriptURLs(){
    // nur externe Skripte mit src (keine Inline-Blocks)
    const out = [];
    for(const s of document.scripts){
      if(s.src) out.push(new URL(s.src, location.href).href);
    }
    return uniq(out);
  }

  async function fetchText(url){
    const res = await fetch(url, { cache:"no-cache" });
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  }

  async function scanNow(progress){
    const urls = listScriptURLs();
    const rows = [];
    let done = 0;
    for(const url of urls){
      try{
        const code = await fetchText(url);
        const found = code.match(SCAN_RE) || [];
        const file = url.replace(location.origin, "");
        for(const f of uniq(found)){
          rows.push({ ev: f, file });
        }
        progress?.(++done, urls.length, file);
      }catch(e){
        progress?.(++done, urls.length, url, e);
      }
      // kleine Luft lassen für UI
      await sleep(5);
    }
    rows.sort((a,b)=> a.ev.localeCompare(b.ev) || a.file.localeCompare(b.file));
    return rows;
  }

  function renderUI(container){
    container.innerHTML = `
      <div class="pad">
        <div class="toolbar">
          <button id="btn-scan">Scan now</button>
          <button id="btn-dl" disabled>Download MD</button>
          <span class="hint">Scannt geladene Skripte im Browser (cb:/req:/emit:)</span>
        </div>
        <div id="scan-status" class="hint"></div>
        <div id="scan-result" class="md"></div>
      </div>
    `;
    const $scan = container.querySelector("#btn-scan");
    const $dl   = container.querySelector("#btn-dl");
    const $st   = container.querySelector("#scan-status");
    const $res  = container.querySelector("#scan-result");

    let lastMD = "";

    $scan.addEventListener("click", async ()=>{
      $scan.disabled = true; $dl.disabled = true;
      $st.textContent = "Starte Scan …";
      $res.innerHTML = "";
      const rows = await scanNow((i,n,file,err)=>{
        $st.textContent = err
          ? `(${i}/${n}) Fehler bei ${file} – weiter …`
          : `(${i}/${n}) ${file}`;
      });
      lastMD = toMD(rows);
      $res.innerHTML = mdToHtml(lastMD);
      $st.textContent = `Fertig: ${rows.length} Treffer.`;
      $scan.disabled = false; $dl.disabled = !rows.length;
    });

    $dl.addEventListener("click", ()=>{
      const blob = new Blob([lastMD||"# Event-Check\n\n(keine Treffer)"], { type:"text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "EVENTS_browser_scan.md";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  // --------------- Integration in Inspector oder Fallback ----------------
  function getInspectorAPI(){
    const api = window.Inspector || window.__INSPECTOR__ || window.inspector;
    // unterstützen mehrere mögliche Methoden
    const registerTab = api?.registerTab || api?.addTab || api?.tabs?.register;
    return registerTab ? { api, registerTab } : null;
  }

  function registerInspectorTab(){
    const hit = getInspectorAPI();
    if(!hit) return false;
    const { api, registerTab } = hit;

    // generischer Aufruf – kapseln
    const callRegister = (def)=>{
      // normalize zu {id,title,icon,onShow}
      if(registerTab === api.registerTab) return api.registerTab(def);
      if(registerTab === api.addTab)      return api.addTab(def);
      if(registerTab === api.tabs?.register) return api.tabs.register(def);
    };

    callRegister({
      id: TAB_ID,
      title: TAB_NAME,
      icon: "📡",
      onShow: (el)=> renderUI(el)
    });
    console.log("[events-tab] Tab registriert");
    return true;
  }

  function mountFallbackPanel(){
    // kleines schwebenes Panel, falls es keinen Inspector-Hook gibt
    const btn = document.createElement("button");
    btn.textContent = "Events";
    Object.assign(btn.style,{
      position:"fixed", right:"14px", bottom:"86px", zIndex:99999,
      width:"44px", height:"44px", borderRadius:"8px", border:"0",
      boxShadow:"0 2px 8px rgba(0,0,0,.35)", fontWeight:"700", cursor:"pointer"
    });
    document.body.appendChild(btn);

    const wrap = document.createElement("div");
    Object.assign(wrap.style,{
      position:"fixed", right:"14px", bottom:"140px", width:"calc(min(92vw, 820px))",
      maxHeight:"70vh", overflow:"auto", background:"#1f1f1f", color:"#eee",
      border:"1px solid #444", borderRadius:"10px", padding:"6px", zIndex:99998,
      display:"none"
    });
    document.body.appendChild(wrap);

    renderUI(wrap);

    btn.addEventListener("click", ()=>{
      wrap.style.display = (wrap.style.display === "none") ? "block" : "none";
    });

    console.warn("[events-tab] Inspector-API nicht gefunden – Fallback-Panel aktiv.");
  }

  function start(){
    // 1) Versuch: direkt registrieren
    if(registerInspectorTab()) return;

    // 2) Warten auf mögliche Ready-Events des Inspectors
    let registered = false;
    ["inspector:ready","cb:inspector:ready","INSPECTOR_READY"].forEach(evt=>{
      window.addEventListener(evt, ()=>{
        if(!registered) registered = registerInspectorTab();
      }, { once:true });
    });

    // 3) Nach kurzer Frist Fallback anzeigen
    setTimeout(()=>{
      if(!registered && !getInspectorAPI()) mountFallbackPanel();
    }, 1200);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  }else{
    start();
  }
})();
