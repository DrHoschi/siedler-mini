import { runCr12bSelfTest } from './cr-12b-self-test.js';
const report=runCr12bSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-12B Blocked Cell Source: PASS / 0 BLOCKER');
