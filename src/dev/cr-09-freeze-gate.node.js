import { runCr09FreezeGate } from './cr-09-freeze-gate.js';
const report=runCr09FreezeGate();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-09 Path / Route Foundation Freeze Gate: PASS / 0 BLOCKER');
