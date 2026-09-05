import { runCr23aFreezeGate } from './cr-23a-freeze-gate.js';
const report = runCr23aFreezeGate();
console.log(`CR-23A PERSON / RESIDENT IDENTITY CONTRACT FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
