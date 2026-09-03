import { runCr06bSelfTest } from './cr-06b-self-test.js';

const report = runCr06bSelfTest();
for (const result of report.results) {
  if (result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass) {
  console.error('\n❌ CR-06B Pickup Execution Foundation FAILED');
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-06B Pickup Execution Foundation PASS');
}
