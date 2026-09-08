import { runIm16aSelfTest } from './im-16a-self-test.js';

const report = runIm16aSelfTest();
console.log(`IM-16A AUTHORITATIVE CONSTRUCTION PLACEMENT CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(entry => !entry.pass)) console.error(result);
  process.exitCode = 1;
}
