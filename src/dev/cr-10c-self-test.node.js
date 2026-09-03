import { runCr10cSelfTest } from './cr-10c-self-test.js';
const report=runCr10cSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-10C Traversal Type Cost Resolution: PASS / 0 BLOCKER');
