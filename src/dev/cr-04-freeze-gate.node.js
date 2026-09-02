import { runCr04FreezeGate } from './cr-04-freeze-gate.js';

const report = runCr04FreezeGate();
for (const result of report.results) {
  console.log(`${result.pass ? '✅' : '❌'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass || report.blockerCount !== 0) {
  console.error(`\n❌ CR-04 Freeze Gate BLOCKED / ${report.blockerCount} Blocker`);
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-04 Transport Job Foundation FROZEN / PASS / 0 Blocker');
}
