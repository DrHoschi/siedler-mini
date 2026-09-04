import { runCr20bSelfTest } from './cr-20b-self-test.js';
const report=runCr20bSelfTest();
console.log(`CR-20B DETERMINISTIC RESERVATION EXPIRY: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
