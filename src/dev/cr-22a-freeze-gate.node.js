import { runCr22aFreezeGate } from './cr-22a-freeze-gate.js';
const report = runCr22aFreezeGate();
console.log(`CR-22A BUILDING IDENTITY & OWNERSHIP CONTRACT FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
