import { runCr04aSelfTest } from './cr-04a-self-test.js';

const report = runCr04aSelfTest();

for (const result of report.results) {
  if (result.pass) {
    console.log(`✅ ${result.name}`);
  } else {
    console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
  }
}

if (!report.pass) {
  const blockers = report.results.filter(result => !result.pass).map(result => result.name);
  console.error(`\n❌ CR-04A contract tests FAILED / ${blockers.length} Blocker`);
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-04A contract tests PASS / 0 Blocker');
}
