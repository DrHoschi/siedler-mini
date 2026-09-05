import { runCr24bSelfTest } from './cr-24b-self-test.js';
const report = runCr24bSelfTest();
console.log(`CR-24B DETERMINISTIC CONSTRUCTION PROGRESS / TRANSITION CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
