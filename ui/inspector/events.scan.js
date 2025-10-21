/* ============================================================================
 * Datei   : ui/inspector/events.scan.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-10-21)
 * Zweck   : Browserseitiger Event-Scanner (cb:/req:/emit:) als wiederverwendbare API
 * Exports : window.EventScan = { run(), toMD(rows), lastMD, download(md?) }
 * ========================================================================== */
(function(){
  'use strict';
  const RE = /(cb|req|emit):[a-z0-9\.\-\_:]+/gi;

  const esc  = s => String(s).replace(/[&<>"]/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
  const uniq = arr => [...new Set(arr)];

  function listScriptURLs(){
    const out = [];
    for(const s of document.scripts){ if(s.src) out.push(new URL(s.src, location.href).href); }
    return uniq(out);
  }
  async function fetchText(url){
    const res = await fetch(url, { cache:"no-cache" });
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  }

  async function run(progressCb){
    const urls = listScriptURLs();
    const rows = [];
    let i = 0;
    for(const url of urls){
      try{
        const code = await fetchText(url);
        const found = code.match(RE) || [];
        const file = url.replace(location.origin, "");
        for(const f of uniq(found)){ rows.push({ ev:f, file }); }
        progressCb?.(++i, urls.length, file, null);
      }catch(err){
        progressCb?.(++i, urls.length, url, err);
      }
      // kleines Yield für UI
      await new Promise(r=>setTimeout(r,5));
    }
    rows.sort((a,b)=> a.ev.localeCompare(b.ev) || a.file.localeCompare(b.file));
    last.rows = rows;
    last.md   = toMD(rows);
    return rows;
  }

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

  function download(md){
    const text = md || last.md || "# Event-Check\n\n(keine Treffer)";
    const blob = new Blob([text], { type:"text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "EVENTS_browser_scan.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const last = { rows:[], md:"" };
  window.EventScan = { run, toMD, get lastMD(){ return last.md; }, download };
  console.log("[EventScan] bereit");
})();
