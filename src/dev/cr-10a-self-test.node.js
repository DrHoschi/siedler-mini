import { runCr10aSelfTest } from './cr-10a-self-test.js';
const report=runCr10aSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-10A Traversal Cost Contract: PASS / 0 BLOCKER');
