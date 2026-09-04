import { runCr14bSelfTest } from './cr-14b-self-test.js';

const report=runCr14bSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-14B Deterministic Entry Arbitration FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-14B DETERMINISTIC ENTRY ARBITRATION: PASS / 0 BLOCKER');
