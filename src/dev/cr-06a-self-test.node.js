import { runCr06aSelfTest } from './cr-06a-self-test.js';

const report = runCr06aSelfTest();
for (const result of report.results) {
  if (result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass) {
  console.error('\n❌ CR-06A Transport Execution State Contract FAILED');
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-06A Transport Execution State Contract PASS');
}
