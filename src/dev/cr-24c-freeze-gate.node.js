import { runCr24cFreezeGate } from './cr-24c-freeze-gate.js';
const report = runCr24cFreezeGate();
console.log(`CR-24C CONSTRUCTION COMPLETION BOUNDARY FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
