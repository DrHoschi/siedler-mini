import { runCr12cSelfTest } from './cr-12c-self-test.js';
const report=runCr12cSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-12C Obstacle-Aware Routing Integration: PASS / 0 BLOCKER');
