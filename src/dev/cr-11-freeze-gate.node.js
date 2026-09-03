import { runCr11FreezeGate } from './cr-11-freeze-gate.js';
const report=runCr11FreezeGate();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-11 Road Preference Foundation Freeze Gate: PASS / 0 BLOCKER');
