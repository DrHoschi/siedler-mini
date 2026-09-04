import { runCr15cSelfTest } from './cr-15c-self-test.js';

const report=runCr15cSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`CR-15C Waiting ↔ Entry Integration: FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('CR-15C WAITING ↔ ENTRY INTEGRATION: PASS / 0 BLOCKER');
