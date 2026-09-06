import { runCr27aSelfTest } from './cr-27a-self-test.js';

const report = runCr27aSelfTest();
console.log(`CR-27A BUILDINGSTOCK TRANSPORT INTENT & RESERVATION BRIDGE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
