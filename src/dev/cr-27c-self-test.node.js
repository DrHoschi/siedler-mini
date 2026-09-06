import { runCr27cSelfTest } from './cr-27c-self-test.js';

const report = runCr27cSelfTest();
for (const result of report.results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ` :: ${result.error}` : ''}`);
}
console.log(`CR-27C DIRECT SELF-TEST: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) process.exitCode = 1;
