import { runCr08FreezeGate } from './cr-08-freeze-gate.js';

const report=runCr08FreezeGate();
for(const result of report.results){
  console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass){
  console.error(`CR-08 Carrier Movement Foundation FAIL / ${report.blockerCount} BLOCKER`);
  process.exitCode=1;
}else{
  console.log('CR-08 Carrier Movement Foundation PASS / 0 BLOCKER');
}
