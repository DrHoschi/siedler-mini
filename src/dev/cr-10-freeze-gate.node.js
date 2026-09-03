import { runCr10FreezeGate } from './cr-10-freeze-gate.js';
const report=runCr10FreezeGate();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-10 Traversal Cost Foundation Freeze Gate: PASS / 0 BLOCKER');
