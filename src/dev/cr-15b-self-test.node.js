import { runCr15bSelfTest } from './cr-15b-self-test.js';

const report=runCr15bSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`CR-15B Deterministic Wait Priority / Fairness Policy: FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('CR-15B DETERMINISTIC WAIT PRIORITY / FAIRNESS POLICY: PASS / 0 BLOCKER');
