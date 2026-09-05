import { runCr22cSelfTest } from './cr-22c-self-test.js';
const report = runCr22cSelfTest();
console.log(`CR-22C BUILDING REGISTRATION & WORLD OWNERSHIP INTEGRATION: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
