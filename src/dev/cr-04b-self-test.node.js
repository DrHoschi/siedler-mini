import { runCr04bSelfTest } from './cr-04b-self-test.js';

const report = runCr04bSelfTest();
for (const result of report.results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}
if (!report.pass) {
  console.error('CR-04B controlled creation FAIL');
  process.exit(1);
}
console.log('CR-04B controlled creation PASS / 0 Blocker');
