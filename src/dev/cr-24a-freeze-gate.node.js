import { runCr24aFreezeGate } from './cr-24a-freeze-gate.js';

const report = runCr24aFreezeGate();
console.log(`CR-24A BUILDING CONSTRUCTION STATE CONTRACT FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
