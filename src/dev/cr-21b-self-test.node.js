import { runCr21bSelfTest } from './cr-21b-self-test.js';
const report=runCr21bSelfTest();
console.log(`CR-21B DETERMINISTIC RESERVATION EXECUTION CYCLE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
