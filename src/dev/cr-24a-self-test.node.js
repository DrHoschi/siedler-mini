import { runCr24aSelfTest } from './cr-24a-self-test.js';
const report = runCr24aSelfTest();
console.log(`CR-24A BUILDING CONSTRUCTION STATE CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
