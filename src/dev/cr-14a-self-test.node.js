import { runCr14aSelfTest } from './cr-14a-self-test.js';

const report=runCr14aSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-14A Cell Occupancy Contract FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-14A CELL OCCUPANCY CONTRACT: PASS / 0 BLOCKER');
