import { runCr13bSelfTest } from './cr-13b-self-test.js';

const report=runCr13bSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-13B Route Validity Evaluation FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-13B ROUTE VALIDITY EVALUATION: PASS / 0 BLOCKER');
