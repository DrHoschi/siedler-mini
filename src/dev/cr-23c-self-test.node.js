import { runCr23cSelfTest } from './cr-23c-self-test.js';
const report = runCr23cSelfTest();
console.log(`CR-23C HOUSING CAPACITY & OCCUPANCY FOUNDATION: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
