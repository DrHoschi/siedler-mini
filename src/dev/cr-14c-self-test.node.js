import { runCr14cSelfTest } from './cr-14c-self-test.js';

const report=runCr14cSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-14C Occupancy-Aware Movement Integration FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-14C OCCUPANCY-AWARE MOVEMENT INTEGRATION: PASS / 0 BLOCKER');
