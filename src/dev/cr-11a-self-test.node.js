import { runCr11aSelfTest } from './cr-11a-self-test.js';
const report=runCr11aSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-11A Road Preference Cost Policy: PASS / 0 BLOCKER');
