import { runCr20cSelfTest } from './cr-20c-self-test.js';
const report=runCr20cSelfTest();
console.log(`CR-20C RESERVATION LIFECYCLE TRAFFIC INTEGRATION: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
