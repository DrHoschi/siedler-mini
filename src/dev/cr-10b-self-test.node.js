import { runCr10bSelfTest } from './cr-10b-self-test.js';
const report=runCr10bSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-10B Deterministic Cost-Aware Pathfinding: PASS / 0 BLOCKER');
