import { runCr24bFreezeGate } from './cr-24b-freeze-gate.js';
const report = runCr24bFreezeGate();
console.log(`CR-24B DETERMINISTIC CONSTRUCTION PROGRESS / TRANSITION CONTRACT FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
