import { runCr24cSelfTest } from './cr-24c-self-test.js';
const report = runCr24cSelfTest();
console.log(`CR-24C CONSTRUCTION COMPLETION BOUNDARY: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
