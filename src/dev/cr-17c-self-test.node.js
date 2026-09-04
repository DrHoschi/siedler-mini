import { runCr17cSelfTest } from './cr-17c-self-test.js';
const report=runCr17cSelfTest();console.log(`CR-17C CONTROLLED RECOVERY MOVEMENT INTEGRATION: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
