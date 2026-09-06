import { runCr27bSelfTest } from './cr-27b-self-test.js';

const report = runCr27bSelfTest();
console.log(`CR-27B WORKFORCE-AWARE TRANSPORT DISPATCH INTEGRATION: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
