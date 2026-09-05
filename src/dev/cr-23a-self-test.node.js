import { runCr23aSelfTest } from './cr-23a-self-test.js';

const result = runCr23aSelfTest();
console.log(`CR-23A PERSON / RESIDENT IDENTITY CONTRACT: ${result.pass ? 'PASS' : 'FAIL'} / ${result.blockerCount} BLOCKER`);
for (const entry of result.results) {
  console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.name}${entry.error ? `: ${entry.error}` : ''}`);
}
if (!result.pass) process.exitCode = 1;
