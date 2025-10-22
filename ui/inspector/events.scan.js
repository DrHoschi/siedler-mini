// ui/inspector/events.scan.js – v1.0
(function(){
  'use strict';
  const RE = /(cb|req|emit):[a-z0-9\.\-\_:]+/gi;
  const uniq = a=>[...new Set(a)];
  function urls(){ return uniq([...document.scripts].map(s=>s.src).filter(Boolean)); }
  async function fetchText(u){ const r=await fetch(u,{cache:'no-cache'}); if(!r.ok) throw new Error(r.statusText); return r.text(); }

  async function run(cb){
    const out=[]; const list=urls(); let i=0;
    for(const u of list){
      try{ const code=await fetchText(u); const f=(code.match(RE)||[]); for(const ev of uniq(f)) out.push({ev,file:u}); cb?.(++i,list.length,u,null); }
      catch(e){ cb?.(++i,list.length,u,e); }
      await new Promise(r=>setTimeout(r,5));
    }
    out.sort((a,b)=> a.ev.localeCompare(b.ev) || a.file.localeCompare(b.file));
    last.md = toMD(out); return out;
  }
  function toMD(rows){
    const byEv = rows.reduce((m,r)=>{ (m[r.ev] ||= []).push(r.file); return m; },{});
    const evs = Object.keys(byEv).sort(); let md = `# Event-Check (Browser-Scan)\n\n| Event | Dateien |\n|---|---|\n`;
    for(const ev of evs){ md += `| \`${ev}\` | ${uniq(byEv[ev]).map(f=>`\`${f}\``).join("<br>")} |\n`; }
    return md;
  }
  const last={md:''};
  window.EventScan={ run, toMD, get lastMD(){return last.md;}, download(md){ const blob=new Blob([md||last.md],{type:'text/markdown'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='EVENTS_browser_scan.md'; a.click(); URL.revokeObjectURL(a.href);} };
  console.log('[EventScan] bereit');
})();
