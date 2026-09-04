import { runCr19cSelfTest } from './cr-19c-self-test.js';
const report=runCr19cSelfTest();
console.log(`CR-19C RESERVATION MOVEMENT INTEGRATION: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
