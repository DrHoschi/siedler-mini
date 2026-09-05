import { runCr22cFreezeGate } from './cr-22c-freeze-gate.js';
const report = runCr22cFreezeGate();
console.log(`CR-22C BUILDING REGISTRATION & WORLD OWNERSHIP INTEGRATION FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
