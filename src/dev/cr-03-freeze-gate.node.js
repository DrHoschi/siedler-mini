import { runCr03FreezeGate } from './cr-03-freeze-gate.js';

const result = runCr03FreezeGate();
for (const entry of result.results) {
  console.log(`${entry.pass ? '✅' : '❌'} ${entry.name}${entry.error ? ` — ${entry.error}` : ''}`);
}
if (!result.pass) {
  console.error(`\n❌ CR-03 regression FAILED / ${result.blockerCount} Blocker`);
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-03 regression PASS / 0 Blocker');
}
