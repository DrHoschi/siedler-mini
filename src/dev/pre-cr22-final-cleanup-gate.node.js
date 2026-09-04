import { promises as fs } from 'fs';
import { runCr21FreezeGate } from './cr-21-freeze-gate.js';

const results=[];
const check=async(name,fn)=>{try{results.push({name,pass:!!(await fn())});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
const exists=async path=>{try{await fs.access(path);return true;}catch{return false;}};

await check('cr21-frozen-baseline-regression',()=>{const r=runCr21FreezeGate();return r.pass===true&&r.blockerCount===0;});
await check('active-modular-runtime-only',async()=>await exists('src/main.js')&&await exists('src/runtime/runtime.js')&&await exists('src/transport/reservation-controlled-step-movement-integration.js'));
await check('legacy-runtime-remains-removed',async()=>{
 for(const dir of ['core','data','demo','qa','schemas','ui']){
  const entries=(await fs.readdir(dir)).sort();
  if(entries.length!==1||entries[0]!=='LEGACY_REMOVED.md') return false;
 }
 return true;
});
await check('assets-preserved',async()=>{const entries=await fs.readdir('assets');return entries.length>0&&await exists('assets/Logo.PNG');});
await check('branch-extraction-evidence-present',async()=>await exists('docs/legacy/pre-cr22/BRANCH_EXTRACTION_SUMMARY.md')&&await exists('docs/legacy/pre-cr22/FINAL_BRANCH_DELETION_LIST.md'));
await check('roadmap-current-present',async()=>await exists('docs/ROADMAP_CURRENT.md'));
await check('workflow-records-branch-cleanup-pass',async()=>{const text=await fs.readFile('docs/DEVELOPMENT_WORKFLOW_CURRENT.md','utf8');return text.includes('Pre-CR22 branch classification / reduction | PASS / 0 BLOCKER')&&text.includes('CR-22 | LOCKED');});
await check('browser-status-awaits-device-gate',async()=>{const text=await fs.readFile('src/dev/pre-cr22-cleanup-browser-status.js','utf8');return text.includes('BRANCH CLEANUP PASS')&&text.includes('DEVICE VERIFICATION PENDING');});
await check('main-reference-only-rule-preserved',async()=>{const text=await fs.readFile('docs/DEVELOPMENT_WORKFLOW_CURRENT.md','utf8');return text.includes('functional parity or better, not code parity')&&text.includes('historical functional and visual old-game reference');});

const blockerCount=results.filter(r=>!r.pass).length;
console.log(`PRE-CR22 FINAL CLEANUP CANDIDATE GATE: ${blockerCount===0?'PASS':'FAIL'} / ${blockerCount} BLOCKER`);
for(const r of results) console.log(`${r.pass?'PASS':'FAIL'} ${r.name}${r.error?`: ${r.error}`:''}`);
if(blockerCount>0) process.exitCode=1;
