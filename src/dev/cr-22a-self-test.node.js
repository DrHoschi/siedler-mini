import { runCr22aSelfTest } from './cr-22a-self-test.js';

const report = runCr22aSelfTest();
console.log(`CR-22A BUILDING IDENTITY & OWNERSHIP CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(entry => !entry.pass)) console.error(result);
  process.exitCode = 1;
}
