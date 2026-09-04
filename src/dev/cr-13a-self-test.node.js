import { runCr13aSelfTest } from './cr-13a-self-test.js';

const report=runCr13aSelfTest();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-13A Route Validity Contract: FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-13A ROUTE VALIDITY CONTRACT: PASS / 0 BLOCKER');
