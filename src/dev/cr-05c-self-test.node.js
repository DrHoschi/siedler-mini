import { runCr05cSelfTest } from './cr-05c-self-test.js';

const report = runCr05cSelfTest();
for (const result of report.results) {
  if (result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass) {
  const blockers = report.results.filter(result => !result.pass).map(result => result.name);
  console.error(`\n❌ CR-05C carrier release tests FAILED / ${blockers.length} Blocker`);
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-05C carrier release tests PASS / 0 Blocker');
}
