import { runCr25aSelfTest } from './cr-25a-self-test.js';
const report = runCr25aSelfTest();
console.log(`CR-25A BUILDING STOCK CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
