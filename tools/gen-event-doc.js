/* ============================================================================
 * Datei   : tools/gen-event-doc.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-10-21)
 * Zweck   : Scannt alle JS-Dateien nach cb:-Events und erzeugt docs/EVENTS.md
 * Hinweis : Node >= 18; keine externen Abhängigkeiten.
 * ========================================================================== */
import { promises as fs } from "fs";
import { globby } from "globby"; // falls nicht installiert: `npm i globby`

const OUT = "docs/EVENTS.md";
const PATTERN = /cb:[a-z0-9\.\-\_:]+/gi;

function uniq(arr){ return [...new Set(arr)]; }
function rel(p){ return p.replace(process.cwd()+"/", ""); }

async function main(){
  const files = await globby(["**/*.js","!node_modules/**","!dist/**","!archive/**"]);
  const rows = [];
  for(const f of files){
    const txt = await fs.readFile(f,"utf8");
    const found = uniq((txt.match(PATTERN)||[]));
    if(found.length){
      for(const ev of found){ rows.push({file: rel(f), ev}); }
    }
  }
  rows.sort((a,b)=> a.ev.localeCompare(b.ev) || a.file.localeCompare(b.file));
  const grouped = rows.reduce((m,{file,ev})=>{
    (m[ev] ||= []).push(file); return m;
  },{});
  let md = `# Event-Referenz (auto-generiert)\n\n> Stand: ${new Date().toISOString()}\n\n| Event | Dateien |\n|---|---|\n`;
  for(const ev of Object.keys(grouped).sort()){
    const list = uniq(grouped[ev]).map(f=>`\`${f}\``).join("<br>");
    md += `| \`${ev}\` | ${list} |\n`;
  }
  await fs.mkdir("docs",{recursive:true});
  await fs.writeFile(OUT, md, "utf8");
  console.log(`[tools] EVENTS.md erzeugt → ${OUT}`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
