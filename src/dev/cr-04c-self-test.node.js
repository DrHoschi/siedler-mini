import { runCr04cSelfTest } from './cr-04c-self-test.js';

const report = runCr04cSelfTest();
for (const result of report.results) {
  console.log(`${result.pass ? '✅' : '❌'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}
if (!report.pass) {
  console.error('❌ CR-04C lifecycle tests FAIL');
  process.exitCode = 1;
} else {
  console.log('✅ CR-04C lifecycle tests PASS / 0 Blocker');
}
