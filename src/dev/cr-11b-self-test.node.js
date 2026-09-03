import { runCr11bSelfTest } from './cr-11b-self-test.js';
const report=runCr11bSelfTest();
for(const result of report.results) console.log(result.pass?'PASS':'FAIL',result.name,result.error??'');
if(!report.pass) process.exitCode=1;
else console.log('CR-11B Traversal Classification Source: PASS / 0 BLOCKER');
