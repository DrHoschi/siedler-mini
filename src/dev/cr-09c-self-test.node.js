import { runCr09cSelfTest } from './cr-09c-self-test.js';
const report=runCr09cSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-09C Movement Route Integration: PASS / 0 BLOCKER');
