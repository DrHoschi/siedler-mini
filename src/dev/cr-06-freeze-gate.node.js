import { runCr06FreezeGate } from './cr-06-freeze-gate.js';

const report = runCr06FreezeGate();
for (const result of report.results) {
  if (result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

if (!report.pass) {
  console.error(`\n❌ CR-06 Transport Execution Foundation FREEZE GATE FAILED — ${report.blockerCount} BLOCKER`);
  process.exitCode = 1;
} else {
  console.log('\n✅ CR-06 Transport Execution Foundation FREEZE GATE PASS / 0 BLOCKER');
}
