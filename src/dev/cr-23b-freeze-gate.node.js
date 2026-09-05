import { runCr23bFreezeGate } from './cr-23b-freeze-gate.js';
const report = runCr23bFreezeGate();
console.log(`CR-23B RESIDENT ↔ HOME ASSIGNMENT CONTRACT FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
