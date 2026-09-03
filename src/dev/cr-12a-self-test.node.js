import { runCr12aSelfTest } from './cr-12a-self-test.js';
const report=runCr12aSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-12A Traversability Contract: PASS / 0 BLOCKER');
