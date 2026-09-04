import { runCr17aSelfTest } from './cr-17a-self-test.js';
const report=runCr17aSelfTest();
console.log(`CR-17A YIELD RECOVERY INTENT CONTRACT: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const result of report.results.filter(x=>!x.pass)) console.error(result);process.exitCode=1;}
