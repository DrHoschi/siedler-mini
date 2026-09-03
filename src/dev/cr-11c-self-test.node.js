import { runCr11cSelfTest } from './cr-11c-self-test.js';
const report=runCr11cSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-11C Road-Preferred Routing Integration: PASS / 0 BLOCKER');
