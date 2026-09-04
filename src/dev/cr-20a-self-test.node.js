import { runCr20aSelfTest } from './cr-20a-self-test.js';
const report=runCr20aSelfTest();
console.log(`CR-20A RESERVATION LIFECYCLE STATE CONTRACT: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
