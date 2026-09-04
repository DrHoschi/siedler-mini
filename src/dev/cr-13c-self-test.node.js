import { runCr13cSelfTest } from './cr-13c-self-test.js';

const report=runCr13cSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-13C Controlled Reroute Integration FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-13C CONTROLLED REROUTE INTEGRATION: PASS / 0 BLOCKER');
