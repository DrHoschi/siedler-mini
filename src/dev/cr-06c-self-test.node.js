import { runCr06cSelfTest } from './cr-06c-self-test.js';

const report = runCr06cSelfTest();
for (const result of report.results) {
  if (result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass) {
  console.error('\n❌ CR-06C Delivery Execution Foundation FAILED');
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-06C Delivery Execution Foundation PASS');
}
