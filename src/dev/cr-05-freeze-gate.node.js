import { runCr05FreezeGate } from './cr-05-freeze-gate.js';

const report = runCr05FreezeGate();
for (const result of report.results) {
  if (result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass) {
  console.error(`\n❌ CR-05 Carrier Assignment Foundation freeze gate FAILED / ${report.blockerCount} Blocker`);
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-05 Carrier Assignment Foundation FROZEN / PASS / 0 Blocker');
}
