import { runCr25cSelfTest } from './cr-25c-self-test.js';
const report = runCr25cSelfTest();
console.log(`CR-25C PRODUCTION -> BUILDINGSTOCK CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
