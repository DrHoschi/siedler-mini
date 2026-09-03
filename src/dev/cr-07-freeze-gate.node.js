import { runCr07FreezeGate } from './cr-07-freeze-gate.js';

const report=runCr07FreezeGate();
for(const result of report.results) console.log(`${result.pass?'PASS':'FAIL'} ${result.name}${result.error?` — ${result.error}`:''}`);
if(!report.pass){
  console.error(`❌ CR-07 Transport Completion & Settlement Freeze Gate FAILED / ${report.blockerCount} BLOCKER`);
  process.exitCode=1;
}else{
  console.log('✅ CR-07 Transport Completion & Settlement Freeze Gate PASS / 0 BLOCKER');
}
