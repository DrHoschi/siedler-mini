import { runCr17bSelfTest } from './cr-17b-self-test.js';
const report=runCr17bSelfTest();
console.log(`CR-17B DETERMINISTIC RECOVERY TARGET SELECTION: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const result of report.results.filter(x=>!x.pass)) console.error(result);process.exitCode=1;}
