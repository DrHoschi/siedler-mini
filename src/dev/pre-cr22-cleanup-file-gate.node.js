import { promises as fs } from 'fs';
import { runCr21FreezeGate } from './cr-21-freeze-gate.js';

const results=[];
const check=async(name,fn)=>{try{results.push({name,pass:!!(await fn())});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
const exists=async path=>{try{await fs.access(path);return true;}catch{return false;}};

await check('cr21-frozen-baseline-regression',()=>{const r=runCr21FreezeGate();return r.pass===true&&r.blockerCount===0;});
await check('active-modular-entrypoints-remain',async()=>await exists('src/main.js')&&await exists('src/ui/app.css')&&await exists('src/transport/reservation-controlled-step-movement-integration.js'));
await check('legacy-runtime-directories-contain-markers-only',async()=>{
 for(const dir of ['core','data','demo','qa','schemas','ui']){
  const entries=(await fs.readdir(dir)).sort();
  if(entries.length!==1||entries[0]!=='LEGACY_REMOVED.md') return false;
 }
 return true;
});
await check('legacy-root-snapshots-removed',async()=>!(await exists('filelist-audit.txt'))&&!(await exists('filelist.json'))&&!(await exists('filelist.txt')));
await check('legacy-root-docs-relocated',async()=>!(await exists('Projekt_Masterliste.md'))&&!(await exists('STRUKTUR_SPICKZETTEL.md'))&&!(await exists('STRUKTUR_SPICKZETTEL.mmd'))&&await exists('docs/legacy/Projekt_Masterliste.md')&&await exists('docs/legacy/STRUKTUR_SPICKZETTEL.md')&&await exists('docs/legacy/STRUKTUR_SPICKZETTEL.mmd'));
await check('visual-assets-preserved',async()=>{const entries=await fs.readdir('assets');return entries.length>0&&await exists('assets/Logo.PNG');});
await check('readme-describes-modular-not-legacy-runtime',async()=>{const text=(await fs.readFile('README.md','utf8')).toLowerCase();return text.includes('aktuelle modulare baseline')&&text.includes('src/runtime/')&&!text.includes('der inspector ist ein fester bestandteil des projekts');});
await check('workflow-keeps-cr22-locked-until-final-gate',async()=>{const text=await fs.readFile('docs/DEVELOPMENT_WORKFLOW_CURRENT.md','utf8');return text.includes('Pre-CR22 branch classification / reduction | PASS / 0 BLOCKER')&&text.includes('Pre-CR22 final cleanup / roadmap integration gate | ACTIVE / CI + DEVICE PENDING')&&text.includes('CR-22 | LOCKED');});

const blockerCount=results.filter(r=>!r.pass).length;
console.log(`PRE-CR22 FILE / ARCHITECTURE CLEANUP GATE: ${blockerCount===0?'PASS':'FAIL'} / ${blockerCount} BLOCKER`);
for(const r of results) console.log(`${r.pass?'PASS':'FAIL'} ${r.name}${r.error?`: ${r.error}`:''}`);
if(blockerCount>0) process.exitCode=1;
