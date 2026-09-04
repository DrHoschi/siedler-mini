import { runCr21aSelfTest } from './cr-21a-self-test.js';
const report=runCr21aSelfTest();
console.log(`CR-21A NEXT CELL RESERVATION INTENT CONTRACT: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
