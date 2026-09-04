import { runCr21cSelfTest } from './cr-21c-self-test.js';
const report=runCr21cSelfTest();
console.log(`CR-21C RESERVATION-CONTROLLED STEP MOVEMENT INTEGRATION: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
