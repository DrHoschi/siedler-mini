import { runCr23cFreezeGate } from './cr-23c-freeze-gate.js';

const report = runCr23cFreezeGate();
console.log(`CR-23C HOUSING CAPACITY & OCCUPANCY FOUNDATION FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
